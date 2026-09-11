// Camada de acesso a dado. Nenhuma outra parte do app toca indexedDB ou localStorage direto.
// Na fase 6 este é o único arquivo reescrito, trocando IndexedDB por Firestore.
const Banco = (function () {
  // Em origem opaca (arquivo aberto direto) o open() nunca lança nem dispara evento, então o
  // prazo é o único jeito de sair. Aparelho lento pode estourar o prazo e abrir depois: nesse
  // caso o banco é adotado em vez de descartado.
  const PRAZO_ABERTURA = 2500;
  const VERSAO = 5;
  const DEPOSITOS = ["exercicios", "sessoes", "registros", "ciclo", "fotos"];
  const TAMANHO_ID = 36;

  let db = null;

  function abrir(aoAbrirTarde) {
    return new Promise((resolver) => {
      let respondido = false;
      const responder = (aberto) => {
        if (respondido) return;
        respondido = true;
        clearTimeout(prazo);
        db = aberto;
        resolver(Boolean(aberto));
      };
      const prazo = setTimeout(() => responder(null), PRAZO_ABERTURA);

      let pedido;
      try {
        pedido = indexedDB.open("academia", VERSAO);
      } catch {
        return responder(null);
      }

      pedido.onupgradeneeded = (evento) => {
        const banco = pedido.result;
        const veioDa = evento.oldVersion;
        for (const nome of DEPOSITOS) {
          if (!banco.objectStoreNames.contains(nome)) banco.createObjectStore(nome);
        }
        // O progresso por posição na lista morreu com o id estável. A foto sobrevive: fica com
        // a chave velha e é remapeada no semear(), que é quem conhece a ordem dos exercícios.
        if (banco.objectStoreNames.contains("estado")) banco.deleteObjectStore("estado");

        // Da 3 para a 4 o exercício passou a dizer de quem ele é. Quem já tinha catálogo tinha o
        // da academia, que é do Sun e da Shine: sem esta linha eles apareceriam também no perfil
        // de exemplo, que nasce nesta mesma versão.
        if (veioDa > 0 && veioDa < 4 && pedido.transaction && banco.objectStoreNames.contains("exercicios")) {
          const alvo = pedido.transaction.objectStore("exercicios");
          const busca = alvo.openCursor();
          busca.onsuccess = () => {
            const cursor = busca.result;
            if (!cursor) return;
            if (!cursor.value?.perfis) alvo.put({ ...cursor.value, perfis: ["sun", "shine"] }, cursor.key);
            cursor.continue();
          };
        }

        // Da 4 para a 5, o treino do Sun e da Shine recomeça do zero: o que estava gravado eram
        // cargas de teste, escritas enquanto o app era construído, e elas iam para o ar como se
        // fossem treino de verdade. Só sessão e registro saem; foto e observação são do exercício,
        // e não do perfil, então ficam. O perfil de exemplo não é tocado.
        if (veioDa > 0 && veioDa < 5 && pedido.transaction) {
          for (const deposito of ["sessoes", "registros", "ciclo"]) {
            if (!banco.objectStoreNames.contains(deposito)) continue;
            const alvo = pedido.transaction.objectStore(deposito);
            for (const perfil of ["sun", "shine"]) {
              alvo.delete(deposito === "ciclo" ? perfil : IDBKeyRange.bound(`${perfil}:`, `${perfil}:￿`));
            }
          }
        }
      };
      pedido.onsuccess = () => {
        if (!respondido) return responder(pedido.result);
        db = pedido.result;
        aoAbrirTarde?.();
      };
      pedido.onerror = () => responder(null);
      pedido.onblocked = () => responder(null);
    });
  }

  const disponivel = () => db !== null;

  function ler(deposito, faixa) {
    if (!db) return Promise.resolve([]);
    return new Promise((resolver) => {
      const transacao = db.transaction(deposito, "readonly");
      const alvo = transacao.objectStore(deposito);
      const chaves = alvo.getAllKeys(faixa);
      const valores = alvo.getAll(faixa);
      valores.onsuccess = () => resolver(chaves.result.map((chave, i) => [chave, valores.result[i]]));
      // Sem estes dois, transação que falha deixa a promessa pendurada e a tela nunca monta.
      transacao.onerror = () => resolver([]);
      transacao.onabort = () => resolver([]);
    });
  }

  function pegar(deposito, chave) {
    if (!db) return Promise.resolve(undefined);
    return new Promise((resolver) => {
      const transacao = db.transaction(deposito, "readonly");
      const pedido = transacao.objectStore(deposito).get(chave);
      pedido.onsuccess = () => resolver(pedido.result);
      transacao.onerror = () => resolver(undefined);
      transacao.onabort = () => resolver(undefined);
    });
  }

  function gravar(deposito, chave, valor) {
    db?.transaction(deposito, "readwrite").objectStore(deposito).put(valor, chave);
  }

  function apagar(deposito, chave) {
    db?.transaction(deposito, "readwrite").objectStore(deposito).delete(chave);
  }

  // Uma transação para o lote inteiro, e a promessa espera o commit: quem grava 21 exercícios
  // e depois lê precisa que a leitura veja o que acabou de entrar.
  function gravarLote(deposito, pares) {
    if (!db || pares.length === 0) return Promise.resolve();
    return new Promise((resolver) => {
      const transacao = db.transaction(deposito, "readwrite");
      const alvo = transacao.objectStore(deposito);
      for (const [chave, valor] of pares) alvo.put(valor, chave);
      transacao.oncomplete = () => resolver();
      transacao.onerror = () => resolver();
      transacao.onabort = () => resolver();
    });
  }

  const doisDigitos = (numero) => String(numero).padStart(2, "0");

  // Data local, não UTC: o dia do treino é o dia de quem está na academia.
  function hoje() {
    const agora = new Date();
    return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
  }

  const chaveDaSessao = (perfil, letra) => `${perfil}:${hoje()}_${letra}`;
  const chaveDoRegistro = (sessao, exId) => `${sessao}:${exId}`;
  const registrosDa = (sessao) => IDBKeyRange.bound(`${sessao}:`, `${sessao}:\uffff`);

  // Escreve o que ainda não existe, e nunca por cima: exercício que já está no banco pode ter
  // observação, foto e edição, e a semente não é dona disso. Assim um catálogo novo, como o do
  // perfil de exemplo, chega a quem já usa o app, em vez de só a quem instala hoje.
  async function semear(treinos, perfis, arquivados = []) {
    if (!db) return;

    const existentes = new Set((await ler("exercicios")).map(([chave]) => chave));
    const pares = [];
    for (const [letra, exercicios] of Object.entries(treinos)) {
      exercicios.forEach((exercicio, ordem) => {
        if (!existentes.has(exercicio.id)) pares.push([exercicio.id, { ...exercicio, letra, ordem, perfis }]);
      });
    }
    arquivados.forEach((exercicio, posicao) => {
      if (!existentes.has(exercicio.id)) {
        pares.push([exercicio.id, { ...exercicio, ordem: 900 + posicao, perfis }]);
      }
    });

    await gravarLote("exercicios", pares);
    await migrarFotos(treinos);
  }

  // A chave nova é id mais vaga, e o id tem comprimento fixo. A velha era perfil mais posição
  // na lista, com prefixo curto. A posição do dois-pontos separa as duas gerações.
  const ehChaveNova = (chave) => chave.indexOf(":") === TAMANHO_ID;

  // A posição não sobrevive a exercício inserido no meio da lista, então a foto passou a ser
  // chaveada por id e vaga. Foto do mesmo exercício em dois perfis vira duas vagas do mesmo
  // exercício: a foto é da máquina física, e máquina não pertence a perfil.
  async function migrarFotos(treinos) {
    const antigas = (await ler("fotos")).filter(([chave]) => !ehChaveNova(chave));
    if (antigas.length === 0) return;

    const idPorPosicao = new Map();
    for (const [letra, exercicios] of Object.entries(treinos)) {
      exercicios.forEach((exercicio, indice) => idPorPosicao.set(`${letra}${indice}`, exercicio.id));
    }

    const proximaVaga = new Map();
    for (const [chave, foto] of antigas) {
      const exId = idPorPosicao.get(chave.slice(chave.indexOf(":") + 1));
      if (!exId) continue;
      const vaga = proximaVaga.get(exId) ?? 0;
      proximaVaga.set(exId, vaga + 1);
      gravar("fotos", `${exId}:${vaga}`, foto);
      apagar("fotos", chave);
    }
  }

  // Catálogo sem dono é de todo mundo: registro antigo que a migração não alcançou continua
  // aparecendo, em vez de sumir da tela de quem o usa.
  const ehDono = (exercicio, perfil) => !perfil || !exercicio.perfis || exercicio.perfis.includes(perfil);

  async function listarExercicios(letra, perfil) {
    const todos = await ler("exercicios");
    return todos
      .map(([, exercicio]) => exercicio)
      .filter((exercicio) => exercicio.letra === letra && !exercicio.arquivado && ehDono(exercicio, perfil))
      .sort((a, b) => a.ordem - b.ordem);
  }

  // O estado do treino de hoje é o próprio registro do histórico. Não são duas coisas, então
  // não existe passo de salvar sessão no fim.
  async function lerSessaoDeHoje(perfil, letra) {
    const sessao = chaveDaSessao(perfil, letra);
    const registros = new Map();
    for (const [chave, registro] of await ler("registros", registrosDa(sessao))) {
      registros.set(chave.slice(sessao.length + 1), registro);
    }
    return { sessao: (await pegar("sessoes", sessao)) ?? null, registros };
  }

  async function garantirSessao(perfil, letra) {
    const sessao = chaveDaSessao(perfil, letra);
    if (!(await pegar("sessoes", sessao))) {
      gravar("sessoes", sessao, { perfil, letra, data: hoje(), iniciadoEm: Date.now(), concluidoEm: null });
    }
    return sessao;
  }

  async function salvarSerie(perfil, letra, exId, restantes) {
    if (!db) return;
    const sessao = await garantirSessao(perfil, letra);
    const chave = chaveDoRegistro(sessao, exId);
    // Escreve por cima do que já existe em vez de substituir o registro: as fases seguintes
    // acrescentam campo aqui, o peso entre eles.
    const anterior = (await pegar("registros", chave)) ?? {};
    gravar("registros", chave, { ...anterior, exId, restantes, atualizadoEm: Date.now() });
  }

  // Os dois números digitados do exercício, no mesmo registro das séries: `carga` é o peso da
  // máquina, ou a velocidade da esteira, ou o nível da bicicleta, e `minutos` é o tempo do
  // aeróbico. Mesma escrita por cima do salvarSerie, por outro campo. Digitar antes de baixar
  // série cria o registro, e ele nasce com o treino inteiro pela frente.
  const CAMPOS_DIGITADOS = ["carga", "minutos"];

  async function salvarValor(perfil, letra, exId, campo, valor) {
    if (!db || !CAMPOS_DIGITADOS.includes(campo)) return;
    const sessao = await garantirSessao(perfil, letra);
    const chave = chaveDoRegistro(sessao, exId);
    const anterior = (await pegar("registros", chave))
      ?? { exId, restantes: (await pegar("exercicios", exId))?.series ?? null };
    gravar("registros", chave, { ...anterior, exId, [campo]: valor, atualizadoEm: Date.now() });
  }

  // Tira só o campo, e não o registro: as séries daquele dia continuam sendo histórico.
  async function apagarValor(perfil, letra, exId, campo) {
    if (!db || !CAMPOS_DIGITADOS.includes(campo)) return;
    const chave = chaveDoRegistro(await garantirSessao(perfil, letra), exId);
    const anterior = await pegar("registros", chave);
    if (!anterior) return;
    const sobrando = { ...anterior };
    delete sobrando[campo];
    gravar("registros", chave, { ...sobrando, atualizadoEm: Date.now() });
  }

  // Varre os registros de um perfil e agrupa a carga por exercício, da mais nova para a mais
  // velha. É a base das duas leituras de carga que existem: a herança no cartão e a aba
  // Histórico.
  async function cargasPorExercicio(perfil, semHoje) {
    const dia = hoje();
    const porExercicio = new Map();

    for (const [chave, registro] of await ler("registros", IDBKeyRange.bound(`${perfil}:`, `${perfil}:￿`))) {
      if (registro?.carga == null && registro?.minutos == null) continue;
      // A chave é perfil, data, letra e id. A data vai do primeiro dois-pontos ao sublinhado, e
      // nome de treino pode ter sublinhado, mas a data não tem nenhum.
      const data = chave.slice(perfil.length + 1, chave.indexOf("_"));
      if (semHoje && data === dia) continue;
      porExercicio.set(registro.exId, [...(porExercicio.get(registro.exId) ?? []),
        { data, carga: registro.carga, minutos: registro.minutos }]);
    }

    for (const lista of porExercicio.values()) lista.sort((a, b) => (a.data < b.data ? 1 : -1));
    return porExercicio;
  }

  // A de hoje fica de fora: ela vive na sessão de hoje, que o app lê junto com as séries.
  async function cargasAnteriores(perfil, letra) {
    const daLetra = new Set((await listarExercicios(letra, perfil)).map((exercicio) => exercicio.id));
    const todas = await cargasPorExercicio(perfil, true);
    return new Map([...todas].filter(([exId]) => daLetra.has(exId)));
  }

  // O que a aba Histórico precisa, num pedido só: o catálogo inteiro, cada exercício com as
  // cargas daquele perfil. Exercício que nunca teve carga vem com a lista vazia e aparece na
  // tela do mesmo jeito: a aba mostra o treino da pessoa, e não só o que ela anotou.
  async function historico(perfil) {
    const cargas = await cargasPorExercicio(perfil, false);
    return (await ler("exercicios"))
      .map(([, exercicio]) => exercicio)
      .filter((exercicio) => ehDono(exercicio, perfil))
      .map((exercicio) => ({ exercicio, cargas: cargas.get(exercicio.id) ?? [] }))
      .sort((a, b) => a.exercicio.ordem - b.exercicio.ordem);
  }

  // Tira o exercício da lista do dia sem apagar nada: o que foi levantado continua no histórico,
  // e voltar é só desfazer esta marca. É o caminho que a fase 4 usa no lugar de remover.
  async function arquivarExercicio(exId, quando = Date.now()) {
    const exercicio = await pegar("exercicios", exId);
    if (exercicio) gravar("exercicios", exId, { ...exercicio, arquivado: true, arquivadoEm: quando });
  }

  // Reativar escolhe em qual treino ele volta, e ele entra no fim daquele treino: a posição
  // antiga não quer dizer nada depois que a lista andou.
  async function reativarExercicio(exId, letra, perfil) {
    const exercicio = await pegar("exercicios", exId);
    if (!exercicio) return;
    const doTreino = await listarExercicios(letra, perfil);
    const ultimaOrdem = doTreino.length === 0 ? -1 : Math.max(...doTreino.map((outro) => outro.ordem));
    const { arquivado, arquivadoEm, ...ativo } = exercicio;
    gravar("exercicios", exId, { ...ativo, letra, ordem: ultimaOrdem + 1 });
  }

  async function encerrarSessao(perfil, letra) {
    if (!db) return;
    const sessao = await garantirSessao(perfil, letra);
    const { registros } = await lerSessaoDeHoje(perfil, letra);
    const agora = Date.now();

    // Exercício sem registro entra com tudo restante. Pular é informação: revela abandono
    // recorrente, e o histórico precisa dizer que o dia passou sem ele.
    const pulados = (await listarExercicios(letra, perfil))
      .filter((exercicio) => !registros.has(exercicio.id))
      .map((exercicio) => [
        chaveDoRegistro(sessao, exercicio.id),
        { exId: exercicio.id, restantes: exercicio.series, atualizadoEm: agora }
      ]);
    await gravarLote("registros", pulados);

    gravar("sessoes", sessao, { ...(await pegar("sessoes", sessao)), concluidoEm: agora });
  }

  // Reset é escrita nova, nunca exclusão: o registro é histórico, e histórico é append-only.
  // O iniciadoEm volta para agora porque a sessão recomeça, e é isso que a mantém dentro do
  // ciclo corrente quando o reset vem logo depois de recomeçar o ciclo.
  async function resetarTreino(perfil, letra) {
    if (!db) return;
    const sessao = await garantirSessao(perfil, letra);
    const agora = Date.now();
    // A carga do dia sobrevive: resetar é refazer o treino, não desdizer o peso que estava na
    // máquina. Sem espalhar o registro de volta, o reset apagava o campo.
    const { registros } = await lerSessaoDeHoje(perfil, letra);
    const totais = (await listarExercicios(letra, perfil)).map((exercicio) => [
      chaveDoRegistro(sessao, exercicio.id),
      { ...registros.get(exercicio.id), exId: exercicio.id, restantes: exercicio.series, atualizadoEm: agora }
    ]);
    await gravarLote("registros", totais);
    gravar("sessoes", sessao, { ...(await pegar("sessoes", sessao)), iniciadoEm: agora, concluidoEm: null });
  }

  // Semanas de treino já feitas, para o perfil de exemplo abrir com o histórico cheio. Escreve
  // uma vez só, e nunca em perfil que já tem sessão: ninguém quer dado inventado por cima do seu.
  async function semearHistorico(perfil, treinos, arquivados) {
    if (!db) return;
    const existentes = await ler("sessoes", IDBKeyRange.bound(`${perfil}:`, `${perfil}:￿`));
    if (existentes.length > 0) return;

    const sessoes = [];
    const registros = [];
    const passoDe = (exercicio) => (ehDeTempo(exercicio) ? 5 : 2.5);
    const inicioDe = (exercicio, posicao) => (ehDeTempo(exercicio) ? 15 : 10 + posicao * 5);

    // De trás para a frente, uma semana por vez, com o peso subindo de degrau em degrau e um
    // platô no meio: histórico que só sobe não se parece com o de ninguém.
    for (let semana = SEMANAS_DE_EXEMPLO; semana >= 1; semana--) {
      const feitas = SEMANAS_DE_EXEMPLO - semana;
      for (const [letra, exercicios] of Object.entries(treinos)) {
        const data = diaDeTras(semana * 7 - Object.keys(treinos).indexOf(letra) * 2);
        const sessao = `${perfil}:${data}_${letra}`;
        const quando = Date.now() - semana * 7 * 24 * 3600 * 1000;
        sessoes.push([sessao, { perfil, letra, data, iniciadoEm: quando, concluidoEm: quando + 3600000 }]);

        exercicios.forEach((exercicio, posicao) => {
          const degraus = Math.floor(feitas / 2);
          const valor = inicioDe(exercicio, posicao) + degraus * passoDe(exercicio);
          // Flexão e abdominal não têm peso, então o registro deles é só o de ter sido feito.
          const medida = exercicio.tipo === "corpo" ? {}
            : ehDeTempo(exercicio) ? { minutos: valor, carga: 5 + degraus }
              : { carga: valor };
          registros.push([chaveDoRegistro(sessao, exercicio.id),
            { exId: exercicio.id, restantes: 0, ...medida, atualizadoEm: quando }]);
        });
      }
    }

    // O arquivado só tem peso nas semanas mais antigas: ele saiu do treino em algum momento, e a
    // data em que saiu é o dia seguinte ao último em que foi feito.
    const ULTIMA_SEMANA_DELES = SEMANAS_DE_EXEMPLO - 2;
    arquivados.forEach((exercicio, posicao) => {
      arquivarExercicio(exercicio.id, Date.now() - (ULTIMA_SEMANA_DELES * 7 - 1) * 24 * 3600 * 1000);
      for (let semana = SEMANAS_DE_EXEMPLO; semana >= ULTIMA_SEMANA_DELES; semana--) {
        const data = diaDeTras(semana * 7);
        const sessao = `${perfil}:${data}_${exercicio.letra}`;
        const quando = Date.now() - semana * 7 * 24 * 3600 * 1000;
        const degraus = SEMANAS_DE_EXEMPLO - semana;
        registros.push([chaveDoRegistro(sessao, exercicio.id), {
          exId: exercicio.id,
          restantes: 0,
          ...(ehDeTempo(exercicio) ? { minutos: 20 + degraus * 5, carga: 4 + degraus } : { carga: 30 + degraus * 2.5 }),
          atualizadoEm: quando
        }]);
        if (posicao === 0) {
          sessoes.push([sessao, { perfil, letra: exercicio.letra, data, iniciadoEm: quando, concluidoEm: quando + 3600000 }]);
        }
      }
    });

    await gravarLote("sessoes", sessoes);
    await gravarLote("registros", registros);
    // O ciclo começa agora: sem isto as semanas passadas contariam como concluídas no ciclo
    // corrente, e o app abriria dizendo que já está tudo feito.
    gravar("ciclo", perfil, { iniciadoEm: Date.now() });
  }

  const SEMANAS_DE_EXEMPLO = 8;
  const ehDeTempo = (exercicio) => exercicio.tipo === "tempo";

  function diaDeTras(quantos) {
    const dia = new Date();
    dia.setDate(dia.getDate() - quantos);
    return `${dia.getFullYear()}-${doisDigitos(dia.getMonth() + 1)}-${doisDigitos(dia.getDate())}`;
  }

  const lerCiclo = async (perfil) => (await pegar("ciclo", perfil)) ?? { iniciadoEm: 0 };

  const iniciarCiclo = (perfil) => gravar("ciclo", perfil, { iniciadoEm: Date.now() });

  // Treino feito é sessão concluída depois do início do ciclo. O ciclo é só esse cursor, e é
  // por isso que recomeçar não apaga sessão nenhuma.
  async function letrasConcluidas(perfil) {
    const { iniciadoEm } = await lerCiclo(perfil);
    const feitas = new Set();
    for (const [, sessao] of await ler("sessoes")) {
      if (sessao.perfil === perfil && sessao.concluidoEm && sessao.iniciadoEm >= iniciadoEm) {
        feitas.add(sessao.letra);
      }
    }
    return feitas;
  }

  // A foto é da máquina, não do perfil, então não há perfil na chave. Devolve as vagas por
  // exercício para o app nunca precisar montar chave de depósito.
  async function lerFotos() {
    const porExercicio = new Map();
    for (const [chave, foto] of await ler("fotos")) {
      if (!ehChaveNova(chave)) continue;
      const exId = chave.slice(0, TAMANHO_ID);
      const vagas = porExercicio.get(exId) ?? [];
      vagas[Number(chave.slice(TAMANHO_ID + 1))] = foto;
      porExercicio.set(exId, vagas);
    }
    return porExercicio;
  }

  const salvarFoto = (exId, vaga, foto) => gravar("fotos", `${exId}:${vaga}`, foto);

  const apagarFoto = (exId, vaga) => apagar("fotos", `${exId}:${vaga}`);

  // Só o campo, por cima do exercício que já existe: o editor da fase 4 vai escrever os outros
  // campos do mesmo registro, e substituir o objeto inteiro apagaria o que ele gravou.
  async function salvarObservacao(exId, observacao) {
    if (!db) return;
    const anterior = await pegar("exercicios", exId);
    if (!anterior) return;
    gravar("exercicios", exId, { ...anterior, observacao });
  }

  // Safari lança ao tocar em localStorage numa origem opaca, e o Chrome não. Daí o try.
  function lerPreferencia(chave) {
    try {
      return localStorage.getItem(chave);
    } catch {
      return null;
    }
  }

  function gravarPreferencia(chave, valor) {
    try {
      localStorage.setItem(chave, valor);
    } catch {
      /* sem armazenamento nesta origem */
    }
  }

  return {
    abrir, disponivel, semear,
    listarExercicios, lerSessaoDeHoje, salvarSerie, salvarValor, apagarValor,
    cargasAnteriores, historico, arquivarExercicio, reativarExercicio, semearHistorico,
    encerrarSessao, resetarTreino,
    lerCiclo, iniciarCiclo, letrasConcluidas,
    lerFotos, salvarFoto, apagarFoto, salvarObservacao,
    lerPreferencia, gravarPreferencia
  };
})();

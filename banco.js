// Camada de acesso a dado. Nenhuma outra parte do app toca indexedDB ou localStorage direto.
// Na fase 6 este é o único arquivo reescrito, trocando IndexedDB por Firestore.
const Banco = (function () {
  // Em origem opaca (arquivo aberto direto) o open() nunca lança nem dispara evento, então o
  // prazo é o único jeito de sair. Aparelho lento pode estourar o prazo e abrir depois: nesse
  // caso o banco é adotado em vez de descartado.
  const PRAZO_ABERTURA = 2500;
  const VERSAO = 3;
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

      pedido.onupgradeneeded = () => {
        const banco = pedido.result;
        for (const nome of DEPOSITOS) {
          if (!banco.objectStoreNames.contains(nome)) banco.createObjectStore(nome);
        }
        // O progresso por posição na lista morreu com o id estável. A foto sobrevive: fica com
        // a chave velha e é remapeada no semear(), que é quem conhece a ordem dos exercícios.
        if (banco.objectStoreNames.contains("estado")) banco.deleteObjectStore("estado");
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

  async function semear(treinos) {
    if (!db) return;

    if ((await ler("exercicios")).length === 0) {
      const pares = [];
      for (const [letra, exercicios] of Object.entries(treinos)) {
        exercicios.forEach((exercicio, ordem) => pares.push([exercicio.id, { ...exercicio, letra, ordem }]));
      }
      await gravarLote("exercicios", pares);
    }
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

  async function listarExercicios(letra) {
    const todos = await ler("exercicios");
    return todos
      .map(([, exercicio]) => exercicio)
      .filter((exercicio) => exercicio.letra === letra)
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

  async function encerrarSessao(perfil, letra) {
    if (!db) return;
    const sessao = await garantirSessao(perfil, letra);
    const { registros } = await lerSessaoDeHoje(perfil, letra);
    const agora = Date.now();

    // Exercício sem registro entra com tudo restante. Pular é informação: revela abandono
    // recorrente, e o histórico precisa dizer que o dia passou sem ele.
    const pulados = (await listarExercicios(letra))
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
    const totais = (await listarExercicios(letra)).map((exercicio) => [
      chaveDoRegistro(sessao, exercicio.id),
      { exId: exercicio.id, restantes: exercicio.series, atualizadoEm: agora }
    ]);
    await gravarLote("registros", totais);
    gravar("sessoes", sessao, { ...(await pegar("sessoes", sessao)), iniciadoEm: agora, concluidoEm: null });
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
    listarExercicios, lerSessaoDeHoje, salvarSerie, encerrarSessao, resetarTreino,
    lerCiclo, iniciarCiclo, letrasConcluidas,
    lerFotos, salvarFoto, apagarFoto,
    lerPreferencia, gravarPreferencia
  };
})();

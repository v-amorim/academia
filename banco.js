// Camada de acesso a dado. Nenhuma outra parte do app toca indexedDB, localStorage ou Firebase.
//
// Dois motores atrás da mesma API. O local é IndexedDB e guarda o perfil de exemplo e as fotos,
// que nunca sobem. O da nuvem é o Firestore, um branch por perfil, e responde leitura por um
// espelho em memória alimentado por onSnapshot: com sinal ruim, um get() esperaria o servidor
// por segundos antes de cair para o cache, e a tela ficaria parada.
const Banco = (function () {
  // Em origem opaca (arquivo aberto direto) o open() nunca lança nem dispara evento, então o
  // prazo é o único jeito de sair. Aparelho lento pode estourar o prazo e abrir depois: nesse
  // caso o banco é adotado em vez de descartado.
  const PRAZO_ABERTURA = 2500;
  const VERSAO = 8;
  const DEPOSITOS = ["treinos", "exercicios", "sessoes", "registros", "ciclo", "circulo", "fotos"];
  const TAMANHO_ID = 36;

  // Identificador do projeto, não segredo: quem protege é a regra do Firestore mais o login.
  const FIREBASE = {
    apiKey: "AIzaSyBT7Nr5VeqRcSZZiRAptjw-tqf6wbqCEFQ",
    authDomain: "academia-f31b3.firebaseapp.com",
    projectId: "academia-f31b3",
    storageBucket: "academia-f31b3.firebasestorage.app",
    messagingSenderId: "1010277815534",
    appId: "1:1010277815534:web:1bcb0648c39f5a6894cfff"
  };
  // O Firebase exige e-mail, e ninguém aqui tem caixa: a conta é o usuário mais este domínio,
  // e a tela só mostra o que vem antes do arroba.
  const DOMINIO_DAS_CONTAS = "academia.local";
  const NA_NUVEM = ["treinos", "exercicios", "sessoes", "registros", "ciclo", "circulo"];
  // Depósitos de um documento só por perfil: o ciclo em curso e o círculo em que ele está.
  const DOCUMENTO_UNICO = new Set(["ciclo", "circulo"]);
  // Quanto a abertura espera o primeiro snapshot de cada coleção, que vem do cache quando há
  // um, e quanto o seed espera pelo servidor antes de desistir.
  const PRAZO_ESPELHO = 2500;
  const PRAZO_SERVIDOR = 4000;

  let db = null;
  let auth = null;
  let firestore = null;

  function abrir(aoAbrirTarde) {
    iniciarFirebase();
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

      // A versão 6 recomeçou o aparelho do zero: o Sun e a Shine passaram para a nuvem, e o que
      // havia antes era treino de teste. Dali em diante, subir de versão só cria o depósito que
      // falta: a 7 trouxe os treinos como dado, e a 8 o círculo.
      pedido.onupgradeneeded = (evento) => {
        const banco = pedido.result;
        if (evento.oldVersion < 6) for (const nome of [...banco.objectStoreNames]) banco.deleteObjectStore(nome);
        for (const nome of DEPOSITOS) {
          if (!banco.objectStoreNames.contains(nome)) banco.createObjectStore(nome);
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

  // Faixa de chave em forma neutra, inclusiva nas duas pontas. O motor local a traduz para
  // IDBKeyRange; o da nuvem filtra o espelho com ela.
  const faixaLocal = (faixa) => (faixa ? IDBKeyRange.bound(faixa.de, faixa.ate) : undefined);
  const dentro = (chave, faixa) => !faixa || (chave >= faixa.de && chave <= faixa.ate);
  const doPerfil = (perfil) => ({ de: `${perfil}:`, ate: `${perfil}:￿` });

  // O primeiro argumento é o perfil, que o motor local ignora: a chave dele já carrega o perfil.
  const Local = {
    ler(_, deposito, faixa) {
      if (!db) return Promise.resolve([]);
      return new Promise((resolver) => {
        const transacao = db.transaction(deposito, "readonly");
        const alvo = transacao.objectStore(deposito);
        const chaves = alvo.getAllKeys(faixaLocal(faixa));
        const valores = alvo.getAll(faixaLocal(faixa));
        valores.onsuccess = () => resolver(chaves.result.map((chave, i) => [chave, valores.result[i]]));
        // Sem estes dois, transação que falha deixa a promessa pendurada e a tela nunca monta.
        transacao.onerror = () => resolver([]);
        transacao.onabort = () => resolver([]);
      });
    },

    pegar(_, deposito, chave) {
      if (!db) return Promise.resolve(undefined);
      return new Promise((resolver) => {
        const transacao = db.transaction(deposito, "readonly");
        const pedido = transacao.objectStore(deposito).get(chave);
        pedido.onsuccess = () => resolver(pedido.result);
        transacao.onerror = () => resolver(undefined);
        transacao.onabort = () => resolver(undefined);
      });
    },

    gravar(_, deposito, chave, valor) {
      db?.transaction(deposito, "readwrite").objectStore(deposito).put(valor, chave);
    },

    apagar(_, deposito, chave) {
      db?.transaction(deposito, "readwrite").objectStore(deposito).delete(chave);
    },

    // Uma transação para o lote inteiro, e a promessa espera o commit: quem grava 21 exercícios
    // e depois lê precisa que a leitura veja o que acabou de entrar.
    gravarLote(_, deposito, pares) {
      if (!db || pares.length === 0) return Promise.resolve();
      return new Promise((resolver) => {
        const transacao = db.transaction(deposito, "readwrite");
        const alvo = transacao.objectStore(deposito);
        for (const [chave, valor] of pares) alvo.put(valor, chave);
        transacao.oncomplete = () => resolver();
        transacao.onerror = () => resolver();
        transacao.onabort = () => resolver();
      });
    },

    confiavel: () => Promise.resolve(true)
  };

  function iniciarFirebase() {
    // Em file:// não há origem, e o Auth e a persistência do Firestore recusam trabalhar.
    if (typeof firebase === "undefined" || !/^https?:$/.test(location.protocol)) return;
    try {
      firebase.initializeApp(FIREBASE);
      auth = firebase.auth();
      firestore = firebase.firestore();
      firestore.settings({ ignoreUndefinedProperties: true, merge: true });
      firestore.enablePersistence({ synchronizeTabs: true }).catch(() => { /* aba dupla ou navegador sem suporte */ });
    } catch {
      auth = null;
      firestore = null;
    }
  }

  // perfil -> { uid, espelho por depósito, e as duas promessas: a do primeiro snapshot de cada
  // coleção, venha de onde vier, e a do primeiro que veio do servidor }
  const branches = new Map();

  // A chave do espelho é a mesma do IndexedDB, para a lógica lá embaixo ler os dois motores do
  // mesmo jeito. No id do documento o perfil sai, porque o branch já o carrega.
  const idDoDocumento = (perfil, deposito, chave) =>
    DOCUMENTO_UNICO.has(deposito) ? "atual" : deposito === "exercicios" ? chave : chave.slice(perfil.length + 1);
  const chaveDoEspelho = (perfil, deposito, id) =>
    DOCUMENTO_UNICO.has(deposito) ? perfil : deposito === "exercicios" ? id : `${perfil}:${id}`;

  const colecao = (branch, deposito) => firestore.collection(`perfis/${branch.uid}/${deposito}`);

  const comPrazo = (promessa, prazo) =>
    Promise.race([promessa.then(() => true), new Promise((pronto) => setTimeout(() => pronto(false), prazo))]);

  // Liga um perfil ao branch de um usuário e passa a espelhá-lo. Resolve quando cada coleção
  // respondeu uma vez, ou no prazo: offline com cache vazio, o snapshot vem vazio e na hora.
  function ligarNuvem(perfil, uid) {
    if (!firestore) return Promise.resolve(false);
    if (branches.has(perfil)) return Promise.resolve(true);
    assinarFotos();

    const branch = { uid, espelho: Object.fromEntries(NA_NUVEM.map((deposito) => [deposito, new Map()])) };
    const primeiras = [];
    const doServidor = [];
    for (const deposito of NA_NUVEM) {
      let chegou;
      let veioDoServidor;
      primeiras.push(new Promise((pronto) => { chegou = pronto; }));
      doServidor.push(new Promise((pronto) => { veioDoServidor = pronto; }));

      colecao(branch, deposito).onSnapshot({ includeMetadataChanges: true }, (foto) => {
        for (const mudanca of foto.docChanges()) {
          const chave = chaveDoEspelho(perfil, deposito, mudanca.doc.id);
          if (mudanca.type === "removed") branch.espelho[deposito].delete(chave);
          else branch.espelho[deposito].set(chave, mudanca.doc.data());
        }
        chegou();
        if (!foto.metadata.fromCache) veioDoServidor();
      }, chegou);
    }
    branch.confiavel = comPrazo(Promise.all(doServidor), PRAZO_SERVIDOR);
    branches.set(perfil, branch);
    return comPrazo(Promise.all(primeiras), PRAZO_ESPELHO);
  }

  const desligarNuvem = () => branches.clear();

  const escritaFalhou = (falha) => console.warn("escrita recusada pela nuvem", falha?.code ?? falha);

  // Escreve no espelho antes de mandar: quem grava e lê em seguida vê o que gravou, como no
  // IndexedDB. Se a regra recusar, o SDK desfaz no cache e o snapshot tira do espelho.
  const Nuvem = {
    ler(perfil, deposito, faixa) {
      const pares = [...branches.get(perfil).espelho[deposito]].filter(([chave]) => dentro(chave, faixa));
      return Promise.resolve(pares.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    },

    pegar: (perfil, deposito, chave) => Promise.resolve(branches.get(perfil).espelho[deposito].get(chave)),

    gravar(perfil, deposito, chave, valor) {
      const branch = branches.get(perfil);
      branch.espelho[deposito].set(chave, valor);
      colecao(branch, deposito).doc(idDoDocumento(perfil, deposito, chave)).set(valor).catch(escritaFalhou);
    },

    apagar(perfil, deposito, chave) {
      const branch = branches.get(perfil);
      branch.espelho[deposito].delete(chave);
      colecao(branch, deposito).doc(idDoDocumento(perfil, deposito, chave)).delete().catch(escritaFalhou);
    },

    gravarLote(perfil, deposito, pares) {
      if (pares.length === 0) return Promise.resolve();
      const branch = branches.get(perfil);
      const lote = firestore.batch();
      for (const [chave, valor] of pares) {
        branch.espelho[deposito].set(chave, valor);
        lote.set(colecao(branch, deposito).doc(idDoDocumento(perfil, deposito, chave)), valor);
      }
      lote.commit().catch(escritaFalhou);
      return Promise.resolve();
    },

    // Fazer o seed por cima de um espelho que só viu o cache escreveria o seed por cima de edição
    // que ainda não chegou. Falso quer dizer: sem seed nesta abertura.
    confiavel: (perfil) => branches.get(perfil).confiavel
  };

  const motorDe = (perfil) => (branches.has(perfil) ? Nuvem : Local);

  const ler = (perfil, deposito, faixa) => motorDe(perfil).ler(perfil, deposito, faixa);
  const pegar = (perfil, deposito, chave) => motorDe(perfil).pegar(perfil, deposito, chave);
  const gravar = (perfil, deposito, chave, valor) => motorDe(perfil).gravar(perfil, deposito, chave, valor);
  const gravarLote = (perfil, deposito, pares) => motorDe(perfil).gravarLote(perfil, deposito, pares);
  const apagar = (perfil, deposito, chave) => motorDe(perfil).apagar(perfil, deposito, chave);

  // Em minúsculas: o teclado do celular capitaliza a primeira letra, e a conta é `sun`, não `Sun`.
  const conta = (usuario) => `${usuario.trim().toLowerCase()}@${DOMINIO_DAS_CONTAS}`;

  async function entrar(usuario, senha) {
    const { user } = await auth.signInWithEmailAndPassword(conta(usuario), senha);
    return user.uid;
  }

  function sair() {
    desligarNuvem();
    return auth ? auth.signOut() : Promise.resolve();
  }

  // Chama com o uid de quem está logado, ou null. Sem Firebase, chama uma vez com null.
  function aoMudarUsuario(reagir) {
    if (!auth) return reagir(null);
    auth.onAuthStateChanged((usuario) => reagir(usuario?.uid ?? null));
  }

  const doisDigitos = (numero) => String(numero).padStart(2, "0");

  // Data local, não UTC: o dia do treino é o dia de quem está na academia.
  function hoje() {
    const agora = new Date();
    return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
  }

  const chaveDaSessao = (perfil, letra) => `${perfil}:${hoje()}_${letra}`;
  const chaveDoTreino = (perfil, id) => `${perfil}:${id}`;
  const chaveDoRegistro = (sessao, exId) => `${sessao}:${exId}`;
  const registrosDa = (sessao) => ({ de: `${sessao}:`, ate: `${sessao}:￿` });

  // Escreve o que ainda não existe, e nunca por cima: exercício que já está no banco pode ter
  // observação, foto e edição, e o seed não é dono disso. Assim um catálogo novo, como o do
  // perfil de exemplo, chega a quem já usa o app, em vez de só a quem instala hoje.
  //
  // Um perfil por vez, porque na nuvem cada um tem o seu branch. No local os dois dividem o mesmo
  // depósito, e a segunda volta já encontra tudo escrito.
  async function seed(treinos, perfis, arquivados = []) {
    if (!db && branches.size === 0) return;

    for (const perfil of perfis) {
      if (!(await motorDe(perfil).confiavel(perfil))) continue;
      // Os treinos da ficha viram documentos com o nome igual ao id: "A" se chama "A" até alguém
      // renomear no editor. Treino que já existe não é tocado, pelo mesmo motivo do exercício.
      const treinosExistentes = new Set((await ler(perfil, "treinos", doPerfil(perfil))).map(([, treino]) => treino.id));
      await gravarLote(perfil, "treinos", Object.keys(treinos)
        .filter((letra) => !treinosExistentes.has(letra))
        .map((letra, ordem) => [chaveDoTreino(perfil, letra), { id: letra, nome: letra, ordem }]));

      const existentes = new Set((await ler(perfil, "exercicios")).map(([chave]) => chave));
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
      await gravarLote(perfil, "exercicios", pares);
    }
  }

  // Na nuvem o dono é o branch, e o campo `perfis` do documento não manda em nada: um catálogo
  // gravado com o rótulo errado continuaria sendo de quem está naquele branch. No local o campo
  // é o que separa o exemplo do resto, e catálogo sem dono é de todo mundo.
  const ehDono = (exercicio, perfil) =>
    branches.has(perfil) || !perfil || !exercicio.perfis || exercicio.perfis.includes(perfil);

  // Exercício de ficha alheia que entrou neste branch por engano (o seed compartilhado de antes
  // de cada perfil ter a sua) sai: apagado se nunca foi treinado, arquivado se tem registro, para
  // o histórico não mentir. Só com resposta do servidor, pelo mesmo motivo do seed.
  async function tirarIntrusos(perfil, idsAlheios) {
    if (semMotor(perfil) || !(await motorDe(perfil).confiavel(perfil))) return;
    const alheios = new Set(idsAlheios);
    const intrusos = (await ler(perfil, "exercicios")).filter(([id]) => alheios.has(id));
    if (intrusos.length === 0) return;
    const treinados = new Set((await ler(perfil, "registros", doPerfil(perfil))).map(([, registro]) => registro.exId));
    for (const [id] of intrusos) {
      if (treinados.has(id)) await arquivarExercicio(perfil, id);
      else apagar(perfil, "exercicios", id);
    }
  }

  // Os treinos de um perfil, na ordem das abas. O id do treino é o que as sessões e os exercícios
  // guardam em `letra`; o nome é o que a aba mostra. Treino arquivado sai da fileira e deixa as
  // sessões dele em paz no histórico.
  async function listarTreinos(perfil) {
    const treinos = (await ler(perfil, "treinos", doPerfil(perfil)))
      .map(([, treino]) => treino)
      .filter((treino) => !treino.arquivado)
      .sort((a, b) => a.ordem - b.ordem);
    if (treinos.length > 0) return treinos;
    // Branch de antes dos treinos virarem dado: a fileira sai das letras que os exercícios têm.
    const letras = [...new Set((await ler(perfil, "exercicios")).map(([, exercicio]) => exercicio.letra).filter(Boolean))].sort();
    return letras.map((letra, ordem) => ({ id: letra, nome: letra, ordem }));
  }

  async function criarTreino(perfil, nome) {
    const existentes = await listarTreinos(perfil);
    const treino = { id: crypto.randomUUID(), nome, ordem: existentes.length === 0 ? 0 : Math.max(...existentes.map((outro) => outro.ordem)) + 1 };
    gravar(perfil, "treinos", chaveDoTreino(perfil, treino.id), treino);
    return treino;
  }

  async function salvarCampoDoTreino(perfil, id, campo, valor) {
    const anterior = await pegar(perfil, "treinos", chaveDoTreino(perfil, id));
    if (!anterior) return;
    gravar(perfil, "treinos", chaveDoTreino(perfil, id), { ...anterior, [campo]: valor });
  }

  const renomearTreino = (perfil, id, nome) => salvarCampoDoTreino(perfil, id, "nome", nome);
  // Arquivar, nunca apagar: as sessões guardam o id, e o histórico continua sabendo mostrá-las.
  const arquivarTreino = (perfil, id) => salvarCampoDoTreino(perfil, id, "arquivado", true);

  async function reordenarTreinos(perfil, ids) {
    for (const [ordem, id] of ids.entries()) await salvarCampoDoTreino(perfil, id, "ordem", ordem);
  }

  // Exercício novo nasce no fim do treino escolhido, com id sorteado: aqui um aparelho cria e a
  // nuvem sincroniza, então não há o risco de dois seeds com ids diferentes.
  async function criarExercicio(perfil, letra, dados) {
    const doTreino = await listarExercicios(letra, perfil);
    const ordem = doTreino.length === 0 ? 0 : Math.max(...doTreino.map((outro) => outro.ordem)) + 1;
    const exercicio = { ...dados, id: crypto.randomUUID(), letra, ordem, perfis: [perfil] };
    gravar(perfil, "exercicios", exercicio.id, exercicio);
    return exercicio;
  }

  // Mudar de treino é entrar no fim do outro, como reativar: a posição antiga era da lista antiga.
  const moverExercicio = (exId, letra, perfil) => reativarExercicio(exId, letra, perfil);

  async function reordenarExercicios(perfil, ids) {
    for (const [ordem, exId] of ids.entries()) await salvarCampoDoExercicio(perfil, exId, "ordem", ordem);
  }

  async function listarExercicios(letra, perfil) {
    const todos = await ler(perfil, "exercicios");
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
    for (const [chave, registro] of await ler(perfil, "registros", registrosDa(sessao))) {
      registros.set(chave.slice(sessao.length + 1), registro);
    }
    return { sessao: (await pegar(perfil, "sessoes", sessao)) ?? null, registros };
  }

  async function garantirSessao(perfil, letra) {
    const sessao = chaveDaSessao(perfil, letra);
    if (!(await pegar(perfil, "sessoes", sessao))) {
      gravar(perfil, "sessoes", sessao, { perfil, letra, data: hoje(), iniciadoEm: Date.now(), concluidoEm: null });
    }
    return sessao;
  }

  const semMotor = (perfil) => !db && !branches.has(perfil);

  async function salvarSerie(perfil, letra, exId, restantes) {
    if (semMotor(perfil)) return;
    const sessao = await garantirSessao(perfil, letra);
    const chave = chaveDoRegistro(sessao, exId);
    // Escreve por cima do que já existe em vez de substituir o registro: as fases seguintes
    // acrescentam campo aqui, o peso entre eles.
    const anterior = (await pegar(perfil, "registros", chave)) ?? {};
    gravar(perfil, "registros", chave, { ...anterior, exId, restantes, atualizadoEm: Date.now() });
  }

  // Os dois números digitados do exercício, no mesmo registro das séries: `carga` é o peso da
  // máquina, ou a velocidade da esteira, ou o nível da bicicleta, e `minutos` é o tempo do
  // aeróbico. Mesma escrita por cima do salvarSerie, por outro campo. Digitar antes de baixar
  // série cria o registro, e ele nasce com o treino inteiro pela frente.
  const CAMPOS_DIGITADOS = ["carga", "minutos"];

  async function salvarValor(perfil, letra, exId, campo, valor) {
    if (semMotor(perfil) || !CAMPOS_DIGITADOS.includes(campo)) return;
    const sessao = await garantirSessao(perfil, letra);
    const chave = chaveDoRegistro(sessao, exId);
    const anterior = (await pegar(perfil, "registros", chave))
      ?? { exId, restantes: (await pegar(perfil, "exercicios", exId))?.series ?? null };
    gravar(perfil, "registros", chave, { ...anterior, exId, [campo]: valor, atualizadoEm: Date.now() });
  }

  // Tira só o campo, e não o registro: as séries daquele dia continuam sendo histórico.
  async function apagarValor(perfil, letra, exId, campo) {
    if (semMotor(perfil) || !CAMPOS_DIGITADOS.includes(campo)) return;
    const chave = chaveDoRegistro(await garantirSessao(perfil, letra), exId);
    const anterior = await pegar(perfil, "registros", chave);
    if (!anterior) return;
    const sobrando = { ...anterior };
    delete sobrando[campo];
    gravar(perfil, "registros", chave, { ...sobrando, atualizadoEm: Date.now() });
  }

  // Varre os registros de um perfil e agrupa a carga por exercício, da mais nova para a mais
  // velha. É a base das duas leituras de carga que existem: a herança no cartão e a aba
  // Histórico.
  async function cargasPorExercicio(perfil, semHoje) {
    const dia = hoje();
    const porExercicio = new Map();

    for (const [chave, registro] of await ler(perfil, "registros", doPerfil(perfil))) {
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
    return (await ler(perfil, "exercicios"))
      .map(([, exercicio]) => exercicio)
      .filter((exercicio) => ehDono(exercicio, perfil))
      .map((exercicio) => ({ exercicio, cargas: cargas.get(exercicio.id) ?? [] }))
      .sort((a, b) => a.exercicio.ordem - b.exercicio.ordem);
  }

  // Tira o exercício da lista do dia sem apagar nada: o que foi levantado continua no histórico,
  // e voltar é só desfazer esta marca. É o caminho que a fase 4 usa no lugar de remover.
  async function arquivarExercicio(perfil, exId, quando = Date.now()) {
    const exercicio = await pegar(perfil, "exercicios", exId);
    if (exercicio) gravar(perfil, "exercicios", exId, { ...exercicio, arquivado: true, arquivadoEm: quando });
  }

  // Reativar escolhe em qual treino ele volta, e ele entra no fim daquele treino: a posição
  // antiga não quer dizer nada depois que a lista andou.
  async function reativarExercicio(exId, letra, perfil) {
    const exercicio = await pegar(perfil, "exercicios", exId);
    if (!exercicio) return;
    const doTreino = await listarExercicios(letra, perfil);
    const ultimaOrdem = doTreino.length === 0 ? -1 : Math.max(...doTreino.map((outro) => outro.ordem));
    const { arquivado, arquivadoEm, ...ativo } = exercicio;
    gravar(perfil, "exercicios", exId, { ...ativo, letra, ordem: ultimaOrdem + 1 });
  }

  async function encerrarSessao(perfil, letra) {
    if (semMotor(perfil)) return;
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
    await gravarLote(perfil, "registros", pulados);

    gravar(perfil, "sessoes", sessao, { ...(await pegar(perfil, "sessoes", sessao)), concluidoEm: agora });
  }

  // Reset é escrita nova, nunca exclusão: o registro é histórico, e histórico é append-only.
  // O iniciadoEm volta para agora porque a sessão recomeça, e é isso que a mantém dentro do
  // ciclo corrente quando o reset vem logo depois de recomeçar o ciclo.
  async function resetarTreino(perfil, letra) {
    if (semMotor(perfil)) return;
    const sessao = await garantirSessao(perfil, letra);
    const agora = Date.now();
    // A carga do dia sobrevive: resetar é refazer o treino, não desdizer o peso que estava na
    // máquina. Sem espalhar o registro de volta, o reset apagava o campo.
    const { registros } = await lerSessaoDeHoje(perfil, letra);
    const totais = (await listarExercicios(letra, perfil)).map((exercicio) => [
      chaveDoRegistro(sessao, exercicio.id),
      { ...registros.get(exercicio.id), exId: exercicio.id, restantes: exercicio.series, atualizadoEm: agora }
    ]);
    await gravarLote(perfil, "registros", totais);
    gravar(perfil, "sessoes", sessao, { ...(await pegar(perfil, "sessoes", sessao)), iniciadoEm: agora, concluidoEm: null });
  }

  // Semanas de treino já feitas, para o perfil de exemplo abrir com o histórico cheio. Escreve
  // uma vez só, e nunca em perfil que já tem sessão: ninguém quer dado inventado por cima do seu.
  async function seedHistorico(perfil, treinos, arquivados) {
    if (semMotor(perfil)) return;
    const existentes = await ler(perfil, "sessoes", doPerfil(perfil));
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
      arquivarExercicio(perfil, exercicio.id, Date.now() - (ULTIMA_SEMANA_DELES * 7 - 1) * 24 * 3600 * 1000);
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

    await gravarLote(perfil, "sessoes", sessoes);
    await gravarLote(perfil, "registros", registros);
    // O ciclo começa agora: sem isto as semanas passadas contariam como concluídas no ciclo
    // corrente, e o app abriria dizendo que já está tudo feito.
    gravar(perfil, "ciclo", perfil, { iniciadoEm: Date.now() });
  }

  const SEMANAS_DE_EXEMPLO = 8;
  const ehDeTempo = (exercicio) => exercicio.tipo === "tempo";

  function diaDeTras(quantos) {
    const dia = new Date();
    dia.setDate(dia.getDate() - quantos);
    return `${dia.getFullYear()}-${doisDigitos(dia.getMonth() + 1)}-${doisDigitos(dia.getDate())}`;
  }

  const lerCiclo = async (perfil) => (await pegar(perfil, "ciclo", perfil)) ?? { iniciadoEm: 0 };

  const iniciarCiclo = (perfil) => gravar(perfil, "ciclo", perfil, { iniciadoEm: Date.now() });

  // Um círculo é um código de convite e quem entrou com ele. Cada membro escreve só o próprio
  // documento em `circulos/{codigo}/membros/{uid}` e guarda o código no próprio branch, então
  // ninguém escreve no documento de ninguém, e a regra deixa ler o branch de quem divide o código.
  // Só existe na nuvem: o exemplo e o visitante não têm com quem dividir.
  const LETRAS_DO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const TAMANHO_DO_CODIGO = 6;
  const gerarCodigo = () => Array.from(crypto.getRandomValues(new Uint8Array(TAMANHO_DO_CODIGO)),
    (byte) => LETRAS_DO_CODIGO[byte % LETRAS_DO_CODIGO.length]).join("");
  const membrosDe = (codigo) => firestore.collection(`circulos/${codigo}/membros`);

  const lerCirculo = async (perfil) => (await pegar(perfil, "circulo", perfil))?.codigo ?? null;

  function entrarNoCirculo(perfil, codigo, nome) {
    const branch = branches.get(perfil);
    if (!branch) return Promise.resolve(null);
    const limpo = codigo.trim().toUpperCase();
    membrosDe(limpo).doc(branch.uid).set({ nome, entrouEm: Date.now() }).catch(escritaFalhou);
    gravar(perfil, "circulo", perfil, { codigo: limpo });
    return Promise.resolve(limpo);
  }

  const criarCirculo = (perfil, nome) => entrarNoCirculo(perfil, gerarCodigo(), nome);

  async function sairDoCirculo(perfil) {
    const codigo = await lerCirculo(perfil);
    if (codigo === null) return;
    membrosDe(codigo).doc(branches.get(perfil).uid).delete().catch(escritaFalhou);
    apagar(perfil, "circulo", perfil);
  }

  // codigo -> { membros: uid -> dados, pronto }. Espelho como o do branch: assina uma vez e
  // responde no primeiro snapshot ou no prazo.
  const circulos = new Map();

  function lerMembros(codigo) {
    if (!firestore) return Promise.resolve([]);
    if (!circulos.has(codigo)) {
      const membros = new Map();
      const primeiro = new Promise((chegou) => {
        membrosDe(codigo).onSnapshot({ includeMetadataChanges: true }, (foto) => {
          for (const mudanca of foto.docChanges()) {
            if (mudanca.type === "removed") membros.delete(mudanca.doc.id);
            else membros.set(mudanca.doc.id, mudanca.doc.data());
          }
          chegou();
        }, chegou);
      });
      circulos.set(codigo, { membros, pronto: comPrazo(primeiro, PRAZO_ESPELHO) });
    }
    const circulo = circulos.get(codigo);
    return circulo.pronto.then(() => [...circulo.membros].map(([uid, dados]) => ({ uid, ...dados })));
  }

  // Treino feito é sessão concluída depois do início do ciclo. O ciclo é só esse cursor, e é
  // por isso que recomeçar não apaga sessão nenhuma.
  async function letrasConcluidas(perfil) {
    const { iniciadoEm } = await lerCiclo(perfil);
    const feitas = new Set();
    for (const [, sessao] of await ler(perfil, "sessoes")) {
      if (sessao.perfil === perfil && sessao.concluidoEm && sessao.iniciadoEm >= iniciadoEm) {
        feitas.add(sessao.letra);
      }
    }
    return feitas;
  }

  // A foto é da máquina, não do perfil, então não há perfil na chave, e ela nunca sobe: fica no
  // aparelho, sempre no motor local. Devolve as vagas por exercício para o app nunca precisar
  // montar chave de depósito.
  // A foto é da máquina, e a máquina é a mesma nas duas fichas: a chave é o código do vídeo, que
  // a academia dá por exercício e que se repete entre os perfis. Exercício sem código (criado no
  // editor) fica com o próprio id.
  const chaveDaFoto = (exercicio) => (exercicio.cod > 0 ? `cod-${exercicio.cod}` : exercicio.id);
  const chaveDaVaga = (chave, vaga) => `${chave}:${vaga}`;
  const separarVaga = (chaveComVaga) => {
    const corte = chaveComVaga.lastIndexOf(":");
    return [chaveComVaga.slice(0, corte), Number(chaveComVaga.slice(corte + 1))];
  };

  // Foto sobe para uma coleção que os dois leem, `fotos`, fora dos branches: a regra libera para
  // quem está logado, menos o exemplo. Vai em base64 dentro do documento, porque o Storage
  // exige plano pago e a foto já sai reduzida a 800px. O IndexedDB continua como cópia local.
  const fotosNuvem = new Map();
  let fotosAssinadas = false;
  let fotosDoServidor = null;

  function assinarFotos() {
    if (!firestore || fotosAssinadas) return;
    fotosAssinadas = true;
    fotosDoServidor = new Promise((pronto) => {
      firestore.collection("fotos").onSnapshot({ includeMetadataChanges: true }, (foto) => {
        for (const mudanca of foto.docChanges()) {
          if (mudanca.type === "removed") fotosNuvem.delete(mudanca.doc.id);
          else fotosNuvem.set(mudanca.doc.id, mudanca.doc.data());
        }
        if (!foto.metadata.fromCache) pronto(true);
      }, () => pronto(false));
    });
  }

  const paraBase64 = (foto) => new Promise((pronto) => {
    const leitor = new FileReader();
    leitor.onload = () => pronto(String(leitor.result).split(",")[1]);
    leitor.readAsDataURL(foto);
  });
  const deBase64 = ({ dados, tipo }) => new Blob([Uint8Array.from(atob(dados), (c) => c.charCodeAt(0))], { type: tipo });

  // A cópia da nuvem vence a local: é a que os dois aparelhos veem.
  async function lerFotos() {
    const porChave = new Map();
    const guardar = (chaveComVaga, foto) => {
      const [chave, vaga] = separarVaga(chaveComVaga);
      const vagas = porChave.get(chave) ?? [];
      vagas[vaga] = foto;
      porChave.set(chave, vagas);
    };
    for (const [chaveComVaga, foto] of await Local.ler(null, "fotos")) guardar(chaveComVaga, foto);
    if (fotosAssinadas) for (const [chaveComVaga, doc] of fotosNuvem) guardar(chaveComVaga, deBase64(doc));
    return porChave;
  }

  async function salvarFoto(chave, vaga, foto) {
    Local.gravar(null, "fotos", chaveDaVaga(chave, vaga), foto);
    if (!fotosAssinadas) return;
    const doc = { dados: await paraBase64(foto), tipo: foto.type || "image/jpeg", atualizadoEm: Date.now() };
    fotosNuvem.set(chaveDaVaga(chave, vaga), doc);
    firestore.collection("fotos").doc(chaveDaVaga(chave, vaga)).set(doc).catch(escritaFalhou);
  }

  function apagarFoto(chave, vaga) {
    Local.apagar(null, "fotos", chaveDaVaga(chave, vaga));
    if (!fotosAssinadas) return;
    fotosNuvem.delete(chaveDaVaga(chave, vaga));
    firestore.collection("fotos").doc(chaveDaVaga(chave, vaga)).delete().catch(escritaFalhou);
  }

  // Foto gravada antes da chave por código, ainda sob o id do exercício, passa para a chave nova.
  async function migrarChavesDeFoto(exercicios) {
    const porId = new Map(exercicios.map((exercicio) => [exercicio.id, exercicio]));
    for (const [chaveComVaga, foto] of await Local.ler(null, "fotos")) {
      const [chave, vaga] = separarVaga(chaveComVaga);
      const exercicio = porId.get(chave);
      if (!exercicio || chaveDaFoto(exercicio) === chave) continue;
      Local.gravar(null, "fotos", chaveDaVaga(chaveDaFoto(exercicio), vaga), foto);
      Local.apagar(null, "fotos", chaveComVaga);
    }
  }

  // Foto tirada antes da nuvem, ou sem sinal, sobe na primeira abertura em que o servidor
  // respondeu: o que já existe lá não é tocado.
  async function sincronizarFotos() {
    if (!fotosAssinadas || !(await comPrazo(fotosDoServidor, PRAZO_SERVIDOR))) return;
    for (const [chaveComVaga, foto] of await Local.ler(null, "fotos")) {
      if (fotosNuvem.has(chaveComVaga)) continue;
      const [chave, vaga] = separarVaga(chaveComVaga);
      await salvarFoto(chave, vaga, foto);
    }
  }

  // Só o campo, por cima do exercício que já existe: o editor da fase 4 vai escrever os outros
  // campos do mesmo registro, e substituir o objeto inteiro apagaria o que ele gravou.
  async function salvarCampoDoExercicio(perfil, exId, campo, valor) {
    if (semMotor(perfil)) return;
    const anterior = await pegar(perfil, "exercicios", exId);
    if (!anterior) return;
    gravar(perfil, "exercicios", exId, { ...anterior, [campo]: valor });
  }

  const salvarObservacao = (perfil, exId, observacao) => salvarCampoDoExercicio(perfil, exId, "observacao", observacao);
  const salvarRepeticoes = (perfil, exId, reps) => salvarCampoDoExercicio(perfil, exId, "reps", reps);

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
    abrir, disponivel, seed, tirarIntrusos,
    ligarNuvem, entrar, sair, aoMudarUsuario,
    listarTreinos, criarTreino, renomearTreino, arquivarTreino, reordenarTreinos,
    criarExercicio, moverExercicio, reordenarExercicios,
    listarExercicios, lerSessaoDeHoje, salvarSerie, salvarValor, apagarValor,
    cargasAnteriores, historico, arquivarExercicio, reativarExercicio, seedHistorico,
    encerrarSessao, resetarTreino,
    lerCiclo, iniciarCiclo, letrasConcluidas,
    lerCirculo, criarCirculo, entrarNoCirculo, sairDoCirculo, lerMembros,
    chaveDaFoto, lerFotos, salvarFoto, apagarFoto, migrarChavesDeFoto, sincronizarFotos,
    salvarObservacao, salvarRepeticoes,
    lerPreferencia, gravarPreferencia
  };
})();

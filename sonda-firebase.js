// Firebase de mentira, só para a sonda. Substitui o global `firebase` do SDK vendorizado antes
// do banco.js rodar, e a suíte nunca fala com o projeto de verdade.
//
// Emula o que o banco.js usa e nada mais: initializeApp, auth com e-mail e senha, e um Firestore
// de coleções planas com onSnapshot, set, delete e batch. Os dados ficam no localStorage, porque
// os casos de dois carregamentos preparam numa página e conferem na outra. O primeiro snapshot
// vem do servidor, a não ser que a sonda ligue `firebase.soCache` antes de assinar.
//
// A página já nasce logada como admin, que é quem vê o app inteiro. Os casos que precisam
// começar de fora estão em DESLOGADOS.
window.firebase = (function () {
  const SENHAS = { sun: "sol", shine: "lua", admin: "chave" };
  const CONTAS_FALSAS = Object.fromEntries(
    Object.entries(CONTAS).map(([papel, uid]) => [`${papel}@academia.local`, { senha: SENHAS[papel], uid }])
  );
  const DESLOGADOS = new Set(["nuvem", "visitante", "circulo"]);
  const GUARDADO = "sonda-firestore";

  const caso = new URLSearchParams(location.search).get("caso") ?? "";
  // caminho completo do documento -> valor
  const dados = new Map(Object.entries(JSON.parse(localStorage.getItem(GUARDADO) ?? "{}")));
  // caminho da coleção -> ouvintes
  const ouvintes = new Map();
  let usuario = DESLOGADOS.has(caso) ? null : { uid: CONTAS.admin, email: "admin@academia.local" };
  const reagemAoUsuario = [];
  const estado = { soCache: false };

  const guardar = () => localStorage.setItem(GUARDADO, JSON.stringify(Object.fromEntries(dados)));
  const colecaoDe = (caminho) => caminho.slice(0, caminho.lastIndexOf("/"));
  const idDe = (caminho) => caminho.slice(caminho.lastIndexOf("/") + 1);

  const foto = (mudancas) => ({
    docChanges: () => mudancas,
    metadata: { fromCache: estado.soCache, hasPendingWrites: false }
  });
  const mudanca = (type, caminho, valor) => ({ type, doc: { id: idDe(caminho), data: () => valor } });

  function avisar(caminho, tipo, valor) {
    for (const ouvinte of ouvintes.get(colecaoDe(caminho)) ?? []) {
      queueMicrotask(() => ouvinte(foto([mudanca(tipo, caminho, valor)])));
    }
  }

  function escrever(caminho, valor) {
    const tipo = dados.has(caminho) ? "modified" : "added";
    dados.set(caminho, structuredClone(valor));
    guardar();
    avisar(caminho, tipo, structuredClone(valor));
  }

  function remover(caminho) {
    if (!dados.has(caminho)) return;
    const valor = dados.get(caminho);
    dados.delete(caminho);
    guardar();
    avisar(caminho, "removed", valor);
  }

  const documento = (caminho) => ({
    caminho,
    set: (valor) => { escrever(caminho, valor); return Promise.resolve(); },
    delete: () => { remover(caminho); return Promise.resolve(); }
  });

  const colecao = (caminho) => ({
    doc: (id) => documento(`${caminho}/${id}`),
    onSnapshot(_, aoChegar) {
      ouvintes.set(caminho, [...(ouvintes.get(caminho) ?? []), aoChegar]);
      const existentes = [...dados]
        .filter(([outro]) => colecaoDe(outro) === caminho)
        .map(([outro, valor]) => mudanca("added", outro, structuredClone(valor)));
      queueMicrotask(() => aoChegar(foto(existentes)));
      return () => ouvintes.set(caminho, ouvintes.get(caminho).filter((o) => o !== aoChegar));
    }
  });

  const firestore = {
    collection: colecao,
    settings() {},
    enablePersistence: () => Promise.resolve(),
    batch() {
      const pendentes = [];
      return {
        set: (ref, valor) => pendentes.push(() => escrever(ref.caminho, valor)),
        delete: (ref) => pendentes.push(() => remover(ref.caminho)),
        commit() { pendentes.forEach((executar) => executar()); return Promise.resolve(); }
      };
    }
  };

  const auth = {
    get currentUser() { return usuario; },
    signInWithEmailAndPassword(email, senha) {
      const conta = CONTAS_FALSAS[email];
      if (!conta || conta.senha !== senha) {
        return Promise.reject(Object.assign(new Error("credencial inválida"), { code: "auth/invalid-credential" }));
      }
      usuario = { uid: conta.uid, email };
      reagemAoUsuario.forEach((reagir) => reagir(usuario));
      return Promise.resolve({ user: usuario });
    },
    signOut() {
      usuario = null;
      reagemAoUsuario.forEach((reagir) => reagir(null));
      return Promise.resolve();
    },
    onAuthStateChanged(reagir) {
      reagemAoUsuario.push(reagir);
      queueMicrotask(() => reagir(usuario));
    }
  };

  return {
    initializeApp: () => ({}),
    auth: () => auth,
    firestore: () => firestore,
    // Portas para a sonda: o que está gravado, uma escrita vinda "do outro aparelho", e o modo
    // em que o servidor nunca responde.
    dados,
    deFora: escrever,
    get soCache() { return estado.soCache; },
    set soCache(valor) { estado.soCache = valor; }
  };
})();

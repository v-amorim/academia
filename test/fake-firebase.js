// Fake Firebase, for the probe only. Replaces the vendored SDK's global `firebase` before store.js
// runs, and the suite never talks to the real project.
//
// Emulates what store.js uses and nothing more: initializeApp, auth with e-mail and password, and a
// Firestore of flat collections with onSnapshot, get, set, delete and batch. Data lives in
// localStorage, because two-load cases prepare on one page and check on the next. The first
// snapshot comes from the server, unless the probe turns `firebase.cacheOnly` on before subscribing.
//
// The page is born signed in as admin, who sees the whole app. Cases that need to start signed
// out are listed in SIGNED_OUT.
window.firebase = (function () {
  const PASSWORDS = { sun: "sol", shine: "lua", admin: "chave" };
  const FAKE_ACCOUNTS = Object.fromEntries(
    Object.entries(ACCOUNTS).map(([role, uid]) => [`${role}@academia.local`, { password: PASSWORDS[role], uid }])
  );
  const SIGNED_OUT = new Set(["cloud", "visitor", "circle", "migration"]);
  const STORAGE_KEY = "sonda-firestore";

  const testCase = new URLSearchParams(location.search).get("caso") ?? "";
  // full document path to value
  const docs = new Map(Object.entries(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")));
  // collection path to listeners
  const listeners = new Map();
  let user = SIGNED_OUT.has(testCase) ? null : { uid: ACCOUNTS.admin, email: "admin@academia.local" };
  const userListeners = [];
  const state = { cacheOnly: false };

  const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(docs)));
  const collectionOf = (path) => path.slice(0, path.lastIndexOf("/"));
  const idOf = (path) => path.slice(path.lastIndexOf("/") + 1);

  const snapshot = (changes) => ({
    docChanges: () => changes,
    metadata: { fromCache: state.cacheOnly, hasPendingWrites: false }
  });
  const change = (type, path, value) => ({ type, doc: { id: idOf(path), data: () => value } });

  function notify(path, type, value) {
    for (const listener of listeners.get(collectionOf(path)) ?? []) {
      queueMicrotask(() => listener(snapshot([change(type, path, value)])));
    }
  }

  function write(path, value) {
    const type = docs.has(path) ? "modified" : "added";
    docs.set(path, structuredClone(value));
    persist();
    notify(path, type, structuredClone(value));
  }

  function erase(path) {
    if (!docs.has(path)) return;
    const value = docs.get(path);
    docs.delete(path);
    persist();
    notify(path, "removed", value);
  }

  const document = (path) => ({
    path,
    set: (value) => { write(path, value); return Promise.resolve(); },
    delete: () => { erase(path); return Promise.resolve(); },
    get: () => Promise.resolve({ exists: docs.has(path), data: () => structuredClone(docs.get(path)) })
  });

  const collection = (path) => ({
    doc: (id) => document(`${path}/${id}`),
    get() {
      const matching = [...docs]
        .filter(([other]) => collectionOf(other) === path)
        .map(([other, value]) => ({ id: idOf(other), data: () => structuredClone(value) }));
      return Promise.resolve({ empty: matching.length === 0, docs: matching, forEach: (each) => matching.forEach(each) });
    },
    onSnapshot(_, onArrive) {
      listeners.set(path, [...(listeners.get(path) ?? []), onArrive]);
      const existing = [...docs]
        .filter(([other]) => collectionOf(other) === path)
        .map(([other, value]) => change("added", other, structuredClone(value)));
      queueMicrotask(() => onArrive(snapshot(existing)));
      return () => listeners.set(path, listeners.get(path).filter((l) => l !== onArrive));
    }
  });

  const firestore = {
    collection: collection,
    doc: document,
    settings() {},
    enablePersistence: () => Promise.resolve(),
    batch() {
      const pending = [];
      return {
        set: (ref, value) => pending.push(() => write(ref.path, value)),
        delete: (ref) => pending.push(() => erase(ref.path)),
        commit() { pending.forEach((execute) => execute()); return Promise.resolve(); }
      };
    }
  };

  const auth = {
    get currentUser() { return user; },
    signInWithEmailAndPassword(email, password) {
      const account = FAKE_ACCOUNTS[email];
      if (!account || account.password !== password) {
        return Promise.reject(Object.assign(new Error("credencial inválida"), { code: "auth/invalid-credential" }));
      }
      user = { uid: account.uid, email };
      userListeners.forEach((react) => react(user));
      return Promise.resolve({ user: user });
    },
    signOut() {
      user = null;
      userListeners.forEach((react) => react(null));
      return Promise.resolve();
    },
    onAuthStateChanged(react) {
      userListeners.push(react);
      queueMicrotask(() => react(user));
    }
  };

  return {
    initializeApp: () => ({}),
    auth: () => auth,
    firestore: () => firestore,
    // Doors for the probe: what is stored, a write coming "from the other device", and the mode in
    // which the server never answers.
    docs: docs,
    fromOutside: write,
    get cacheOnly() { return state.cacheOnly; },
    set cacheOnly(value) { state.cacheOnly = value; }
  };
})();

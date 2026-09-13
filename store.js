// Data access layer. No other part of the app touches indexedDB, localStorage or Firebase.
//
// Two engines behind one API. The local one is IndexedDB and holds the example profile and the
// photos, which never leave the device. The cloud one is Firestore, one branch per profile, and
// answers reads from an in-memory mirror fed by onSnapshot: on a weak signal a get() would wait
// seconds for the server before falling back to the cache, and the screen would freeze.
const Store = (function () {
  // On an opaque origin (file opened directly) open() neither throws nor fires, so the timeout
  // is the only way out. A slow device may miss it and open later: then the database is adopted
  // instead of discarded.
  const OPEN_TIMEOUT = 2500;
  const VERSION = 9;
  const STORES = ["workouts", "exercises", "sessions", "records", "cycle", "circle", "photos"];

  // Project identifier, not a secret: the Firestore rules plus the login are what protect it.
  const FIREBASE = {
    apiKey: "AIzaSyBT7Nr5VeqRcSZZiRAptjw-tqf6wbqCEFQ",
    authDomain: "academia-f31b3.firebaseapp.com",
    projectId: "academia-f31b3",
    storageBucket: "academia-f31b3.firebasestorage.app",
    messagingSenderId: "1010277815534",
    appId: "1:1010277815534:web:1bcb0648c39f5a6894cfff"
  };
  // Firebase demands an e-mail and nobody here has a mailbox: the account is the username plus
  // this domain, and the screen shows only what comes before the at sign.
  const ACCOUNT_DOMAIN = "academia.local";
  const IN_CLOUD = ["workouts", "exercises", "sessions", "records", "cycle", "circle"];
  // Single-document stores per profile: the running cycle and the circle the profile is in.
  const SINGLE_DOCUMENT = new Set(["cycle", "circle"]);
  // How long opening waits for the first snapshot of each collection (served from cache when
  // there is one), and how long the seed waits for the server before giving up.
  const MIRROR_TIMEOUT = 2500;
  const SERVER_TIMEOUT = 4000;

  let db = null;
  let auth = null;
  let firestore = null;

  // Everything was written in Portuguese until version 9 (2026-09). These maps translate what
  // is still on disk and in the cloud; the app itself only ever sees the new names.
  const LEGACY_STORES = {
    treinos: "workouts", exercicios: "exercises", sessoes: "sessions", registros: "records",
    ciclo: "cycle", circulo: "circle", fotos: "photos"
  };
  const LEGACY_FIELDS = {
    exercises: {
      nome: "name", aparelho: "station", equipamento: "equipment", series: "sets", cod: "videoCode",
      grupos: "muscles", tipo: "kind", unidade: "unit", ordem: "order", letra: "workout",
      observacao: "note", arquivado: "archived", arquivadoEm: "archivedAt", perfis: "profiles",
      acessorio: "accessory"
    },
    workouts: { nome: "name", ordem: "order", arquivado: "archived" },
    sessions: { perfil: "profile", letra: "workout", data: "date", iniciadoEm: "startedAt", concluidoEm: "finishedAt" },
    records: { exId: "exerciseId", restantes: "remaining", carga: "load", minutos: "minutes", atualizadoEm: "updatedAt" },
    cycle: { iniciadoEm: "startedAt" },
    circle: { codigo: "code" },
    members: { nome: "name", entrouEm: "joinedAt" },
    photos: { dados: "data", tipo: "type", atualizadoEm: "updatedAt" }
  };
  const LEGACY_VALUES = {
    kind: { corpo: "bodyweight", tempo: "time" },
    equipment: { maquina: "machine", halteres: "dumbbells", cabo: "cable", anilha: "plate", livre: "free" },
    muscles: {
      costas: "back", biceps: "biceps", ombro: "shoulders", peito: "chest", triceps: "triceps",
      quadriceps: "quads", posterior: "hamstrings", gluteo: "glutes", adutor: "adductors",
      panturrilha: "calves", lombar: "lower-back", abdomen: "abs"
    },
    accessory: {
      "barra-reta-curta": "short-straight-bar", "barra-reta-longa": "long-straight-bar",
      "barra-curva-longa": "long-curved-bar", "barra-w": "ez-bar", "barra-v": "v-bar", "corda": "rope",
      "estribo-ferro": "iron-stirrup", "estribo-nylon": "nylon-stirrup", "romano": "roman-handle",
      "triangulo": "triangle", "mag-fechada-neutra": "mag-close-neutral",
      "mag-fechada-pronada": "mag-close-pronated", "mag-media": "mag-medium", "mag-larga": "mag-wide",
      "mag-extra-larga": "mag-extra-wide", "tornozeleira": "ankle-strap", "halter": "dumbbell",
      "barra-livre": "free-bar", "barra-w-livre": "free-ez-bar", "kettlebell": "kettlebell", "anilha": "plate"
    }
  };

  const translateValue = (field, value) => {
    const map = LEGACY_VALUES[field];
    if (!map || value == null) return value;
    return Array.isArray(value) ? value.map((item) => map[item] ?? item) : map[value] ?? value;
  };

  // Plain objects only: a photo in IndexedDB is a Blob and goes through untouched.
  function translateRecord(store, record) {
    if (Object.getPrototypeOf(record ?? null) !== Object.prototype) return record;
    const fields = LEGACY_FIELDS[store] ?? {};
    const translated = {};
    for (const [key, value] of Object.entries(record)) {
      const field = fields[key] ?? key;
      translated[field] = translateValue(field, value);
    }
    return translated;
  }

  // Photo keys carried the Portuguese prefix for the video code.
  const translateKey = (store, key) =>
    store === "photos" && typeof key === "string" ? key.replace(/^cod-/, "video-") : key;

  // Copies every legacy store into its new name inside the upgrade transaction and drops the old
  // one. The requests keep the transaction alive until the last callback runs.
  function migrateLegacyStores(database, transaction) {
    for (const [legacy, current] of Object.entries(LEGACY_STORES)) {
      if (!database.objectStoreNames.contains(legacy)) continue;
      const source = transaction.objectStore(legacy);
      const keys = source.getAllKeys();
      const values = source.getAll();
      values.onsuccess = () => {
        const target = transaction.objectStore(current);
        keys.result.forEach((key, i) => target.put(translateRecord(current, values.result[i]), translateKey(current, key)));
        database.deleteObjectStore(legacy);
      };
    }
  }

  function open(onLateOpen) {
    startFirebase();
    return new Promise((resolve) => {
      let answered = false;
      const answer = (opened) => {
        if (answered) return;
        answered = true;
        clearTimeout(timeout);
        db = opened;
        resolve(Boolean(opened));
      };
      const timeout = setTimeout(() => answer(null), OPEN_TIMEOUT);

      let request;
      try {
        request = indexedDB.open("academia", VERSION);
      } catch {
        return answer(null);
      }

      // Version 6 restarted the device from scratch: Sun and Shine had moved to the cloud, and
      // what came before was test data. Version 9 renamed every store and field to English.
      request.onupgradeneeded = (event) => {
        const database = request.result;
        if (event.oldVersion < 6) for (const name of [...database.objectStoreNames]) database.deleteObjectStore(name);
        for (const name of STORES) {
          if (!database.objectStoreNames.contains(name)) database.createObjectStore(name);
        }
        if (event.oldVersion >= 6 && event.oldVersion < 9) migrateLegacyStores(database, request.transaction);
      };
      request.onsuccess = () => {
        if (!answered) return answer(request.result);
        db = request.result;
        onLateOpen?.();
      };
      request.onerror = () => answer(null);
      request.onblocked = () => answer(null);
    });
  }

  const isAvailable = () => db !== null;

  // Key range in a neutral shape, inclusive on both ends. The local engine turns it into an
  // IDBKeyRange; the cloud engine filters the mirror with it.
  const localRange = (range) => (range ? IDBKeyRange.bound(range.from, range.to) : undefined);
  const within = (key, range) => !range || (key >= range.from && key <= range.to);
  const ofProfile = (profile) => ({ from: `${profile}:`, to: `${profile}:￿` });

  // The first argument is the profile, which the local engine ignores: its keys already carry it.
  const Local = {
    list(_, store, range) {
      if (!db) return Promise.resolve([]);
      return new Promise((resolve) => {
        const transaction = db.transaction(store, "readonly");
        const target = transaction.objectStore(store);
        const keys = target.getAllKeys(localRange(range));
        const values = target.getAll(localRange(range));
        values.onsuccess = () => resolve(keys.result.map((key, i) => [key, values.result[i]]));
        // Without these two a failing transaction leaves the promise hanging and the screen never mounts.
        transaction.onerror = () => resolve([]);
        transaction.onabort = () => resolve([]);
      });
    },

    get(_, store, key) {
      if (!db) return Promise.resolve(undefined);
      return new Promise((resolve) => {
        const transaction = db.transaction(store, "readonly");
        const request = transaction.objectStore(store).get(key);
        request.onsuccess = () => resolve(request.result);
        transaction.onerror = () => resolve(undefined);
        transaction.onabort = () => resolve(undefined);
      });
    },

    put(_, store, key, value) {
      db?.transaction(store, "readwrite").objectStore(store).put(value, key);
    },

    remove(_, store, key) {
      db?.transaction(store, "readwrite").objectStore(store).delete(key);
    },

    // One transaction for the whole batch, and the promise waits for the commit: whoever writes a
    // catalog and reads right after needs the read to see what just went in.
    putMany(_, store, pairs) {
      if (!db || pairs.length === 0) return Promise.resolve();
      return new Promise((resolve) => {
        const transaction = db.transaction(store, "readwrite");
        const target = transaction.objectStore(store);
        for (const [key, value] of pairs) target.put(value, key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
        transaction.onabort = () => resolve();
      });
    },

    trusted: () => Promise.resolve(true)
  };

  function startFirebase() {
    // On file:// there is no origin, and Auth and Firestore persistence refuse to work.
    if (typeof firebase === "undefined" || !/^https?:$/.test(location.protocol)) return;
    try {
      firebase.initializeApp(FIREBASE);
      auth = firebase.auth();
      firestore = firebase.firestore();
      firestore.settings({ ignoreUndefinedProperties: true, merge: true });
      firestore.enablePersistence({ synchronizeTabs: true }).catch(() => { /* second tab or unsupported browser */ });
    } catch {
      auth = null;
      firestore = null;
    }
  }

  // profile -> { uid, mirror per store, and two promises: the first snapshot of every collection
  // from wherever it came, and the first one that came from the server }
  const branches = new Map();

  // The mirror key equals the IndexedDB key so the logic below reads both engines the same way.
  // The document id drops the profile, because the branch already carries it.
  const documentId = (profile, store, key) =>
    SINGLE_DOCUMENT.has(store) ? "current" : store === "exercises" ? key : key.slice(profile.length + 1);
  const mirrorKey = (profile, store, id) =>
    SINGLE_DOCUMENT.has(store) ? profile : store === "exercises" ? id : `${profile}:${id}`;

  const collection = (branch, store) => firestore.collection(`profiles/${branch.uid}/${store}`);

  const withTimeout = (promise, timeout) =>
    Promise.race([promise.then(() => true), new Promise((done) => setTimeout(() => done(false), timeout))]);

  // Binds a profile to a user's branch and starts mirroring it. Resolves once every collection
  // answered once, or on timeout: offline with an empty cache the snapshot is empty and instant.
  async function connectCloud(profile, uid) {
    if (!firestore) return false;
    if (branches.has(profile)) return true;
    subscribePhotos();

    const branch = { uid, mirror: Object.fromEntries(IN_CLOUD.map((store) => [store, new Map()])) };
    const firsts = [];
    const fromServer = [];
    for (const store of IN_CLOUD) {
      let arrived;
      let cameFromServer;
      firsts.push(new Promise((done) => { arrived = done; }));
      fromServer.push(new Promise((done) => { cameFromServer = done; }));

      collection(branch, store).onSnapshot({ includeMetadataChanges: true }, (snapshot) => {
        for (const change of snapshot.docChanges()) {
          const key = mirrorKey(profile, store, change.doc.id);
          if (change.type === "removed") branch.mirror[store].delete(key);
          else branch.mirror[store].set(key, change.doc.data());
        }
        arrived();
        if (!snapshot.metadata.fromCache) cameFromServer();
      }, arrived);
    }
    branch.trusted = withTimeout(Promise.all(fromServer), SERVER_TIMEOUT);
    branches.set(profile, branch);
    const ready = await withTimeout(Promise.all(firsts), MIRROR_TIMEOUT);
    await migrateBranch(branch);
    return ready;
  }

  const disconnectCloud = () => branches.clear();

  const writeFailed = (error) => console.warn("write refused by the cloud", error?.code ?? error);

  // Firestore caps a batch at 500 writes, and months of records go past that.
  const BATCH_SIZE = 400;
  const MIGRATED_FLAG = (uid) => `migrated:${uid}`;

  async function commitInBatches(writes) {
    for (let start = 0; start < writes.length; start += BATCH_SIZE) {
      const batch = firestore.batch();
      for (const [reference, value] of writes.slice(start, start + BATCH_SIZE)) batch.set(reference, value);
      await batch.commit();
    }
  }

  // Copies the legacy `perfis/{uid}` branch into `profiles/{uid}` with the new names, once per
  // account, and only when the server answered: seeding an empty new branch before the copy
  // would bring back exercises the owner had removed. The old documents stay until deleted by
  // hand from the console, so there is a way back.
  async function migrateBranch(branch) {
    if (readPreference(MIGRATED_FLAG(branch.uid)) === "done") return;
    if (!(await branch.trusted)) return;
    const marker = firestore.doc(`profiles/${branch.uid}/meta/migration`);
    try {
      if (!(await marker.get()).exists) {
        for (const [legacy, current] of Object.entries(LEGACY_STORES)) {
          if (!IN_CLOUD.includes(current)) continue;
          const snapshot = await firestore.collection(`perfis/${branch.uid}/${legacy}`).get();
          const writes = [];
          snapshot.forEach((doc) => writes.push([collection(branch, current).doc(SINGLE_DOCUMENT.has(current) ? "current" : doc.id), translateRecord(current, doc.data())]));
          await commitInBatches(writes);
        }
        await migrateMembership(branch);
        await migratePhotos();
        await marker.set({ done: true, at: Date.now() });
      }
      savePreference(MIGRATED_FLAG(branch.uid), "done");
    } catch (error) {
      console.warn("migration postponed", error?.code ?? error);
    }
  }

  // Each member owns only their own membership document, so each account moves its own.
  async function migrateMembership(branch) {
    const legacy = await firestore.doc(`perfis/${branch.uid}/circulo/atual`).get();
    const code = legacy.exists ? legacy.data().codigo : null;
    if (!code) return;
    const member = await firestore.doc(`circulos/${code}/membros/${branch.uid}`).get();
    if (!member.exists) return;
    await membersOf(code).doc(branch.uid).set(translateRecord("members", member.data()));
  }

  // Photos are shared, so whoever migrates first carries them; a photo already in the new
  // collection is newer than the copy and is left alone.
  async function migratePhotos() {
    const [legacy, current] = await Promise.all([
      firestore.collection("fotos").get(),
      firestore.collection("photos").get()
    ]);
    const present = new Set();
    current.forEach((doc) => present.add(doc.id));
    const writes = [];
    legacy.forEach((doc) => {
      const id = translateKey("photos", doc.id);
      if (!present.has(id)) writes.push([firestore.collection("photos").doc(id), translateRecord("photos", doc.data())]);
    });
    await commitInBatches(writes);
  }

  // Writes to the mirror before sending: whoever writes and reads right after sees the write, as
  // in IndexedDB. If the rules refuse, the SDK rolls the cache back and the snapshot drops it.
  const Cloud = {
    list(profile, store, range) {
      const pairs = [...branches.get(profile).mirror[store]].filter(([key]) => within(key, range));
      return Promise.resolve(pairs.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    },

    get: (profile, store, key) => Promise.resolve(branches.get(profile).mirror[store].get(key)),

    put(profile, store, key, value) {
      const branch = branches.get(profile);
      branch.mirror[store].set(key, value);
      collection(branch, store).doc(documentId(profile, store, key)).set(value).catch(writeFailed);
    },

    remove(profile, store, key) {
      const branch = branches.get(profile);
      branch.mirror[store].delete(key);
      collection(branch, store).doc(documentId(profile, store, key)).delete().catch(writeFailed);
    },

    putMany(profile, store, pairs) {
      if (pairs.length === 0) return Promise.resolve();
      const branch = branches.get(profile);
      const batch = firestore.batch();
      for (const [key, value] of pairs) {
        branch.mirror[store].set(key, value);
        batch.set(collection(branch, store).doc(documentId(profile, store, key)), value);
      }
      batch.commit().catch(writeFailed);
      return Promise.resolve();
    },

    // Seeding over a mirror that only saw the cache would write the seed over an edit that has
    // not arrived yet. False means: no seed on this opening.
    trusted: (profile) => branches.get(profile).trusted
  };

  const engineOf = (profile) => (branches.has(profile) ? Cloud : Local);

  const list = (profile, store, range) => engineOf(profile).list(profile, store, range);
  const get = (profile, store, key) => engineOf(profile).get(profile, store, key);
  const put = (profile, store, key, value) => engineOf(profile).put(profile, store, key, value);
  const putMany = (profile, store, pairs) => engineOf(profile).putMany(profile, store, pairs);
  const remove = (profile, store, key) => engineOf(profile).remove(profile, store, key);

  // Lowercase: the phone keyboard capitalizes the first letter, and the account is `sun`, not `Sun`.
  const accountOf = (username) => `${username.trim().toLowerCase()}@${ACCOUNT_DOMAIN}`;

  async function signIn(username, password) {
    const { user } = await auth.signInWithEmailAndPassword(accountOf(username), password);
    return user.uid;
  }

  function signOut() {
    disconnectCloud();
    return auth ? auth.signOut() : Promise.resolve();
  }

  // Calls back with the uid of whoever is signed in, or null. Without Firebase, calls once with null.
  function onUserChange(react) {
    if (!auth) return react(null);
    auth.onAuthStateChanged((user) => react(user?.uid ?? null));
  }

  const twoDigits = (number) => String(number).padStart(2, "0");

  // Local date, not UTC: the workout day is the day of whoever is at the gym.
  function today() {
    const now = new Date();
    return `${now.getFullYear()}-${twoDigits(now.getMonth() + 1)}-${twoDigits(now.getDate())}`;
  }

  const sessionKey = (profile, workout) => `${profile}:${today()}_${workout}`;
  const workoutKey = (profile, id) => `${profile}:${id}`;
  const recordKey = (session, exerciseId) => `${session}:${exerciseId}`;
  const recordsOf = (session) => ({ from: `${session}:`, to: `${session}:￿` });

  // Writes what does not exist yet, never over: an exercise already stored may carry a note, a
  // photo and edits, and the seed does not own those. That way a new catalog, like the example
  // profile's, reaches whoever already uses the app instead of only whoever installs today.
  //
  // One profile at a time, because in the cloud each has its own branch. Locally both share the
  // same store, and the second pass finds everything already written.
  async function seed(workouts, profiles, archived = []) {
    if (!db && branches.size === 0) return;

    for (const profile of profiles) {
      if (!(await engineOf(profile).trusted(profile))) continue;
      // Plan workouts become documents named after their id: "A" is called "A" until someone
      // renames it in the editor. An existing workout is not touched, as with exercises.
      const existingWorkouts = new Set((await list(profile, "workouts", ofProfile(profile))).map(([, workout]) => workout.id));
      await putMany(profile, "workouts", Object.keys(workouts)
        .filter((id) => !existingWorkouts.has(id))
        .map((id, order) => [workoutKey(profile, id), { id, name: id, order }]));

      const existing = new Set((await list(profile, "exercises")).map(([key]) => key));
      const pairs = [];
      for (const [workout, exercises] of Object.entries(workouts)) {
        exercises.forEach((exercise, order) => {
          if (!existing.has(exercise.id)) pairs.push([exercise.id, { ...exercise, workout, order, profiles }]);
        });
      }
      archived.forEach((exercise, position) => {
        if (!existing.has(exercise.id)) {
          pairs.push([exercise.id, { ...exercise, order: 900 + position, profiles }]);
        }
      });
      await putMany(profile, "exercises", pairs);
    }
  }

  // In the cloud the branch is the owner, and the document's `profiles` field decides nothing: a
  // catalog stored with the wrong label would still belong to whoever owns that branch. Locally
  // the field is what separates the example from the rest, and a catalog without an owner is everyone's.
  const isOwner = (exercise, profile) =>
    branches.has(profile) || !profile || !exercise.profiles || exercise.profiles.includes(profile);

  // An exercise from someone else's plan that landed in this branch by mistake (the shared seed
  // from before each profile had its own) goes: deleted if never trained, archived if it has
  // records, so the history does not lie. Only with a server answer, for the same reason as the seed.
  async function removeStrays(profile, foreignIds) {
    if (noEngine(profile) || !(await engineOf(profile).trusted(profile))) return;
    const foreign = new Set(foreignIds);
    const strays = (await list(profile, "exercises")).filter(([id]) => foreign.has(id));
    if (strays.length === 0) return;
    const trained = new Set((await list(profile, "records", ofProfile(profile))).map(([, record]) => record.exerciseId));
    for (const [id] of strays) {
      if (trained.has(id)) await archiveExercise(profile, id);
      else remove(profile, "exercises", id);
    }
  }

  // A profile's workouts in tab order. The workout id is what sessions and exercises store in
  // `workout`; the name is what the tab shows. An archived workout leaves the row and leaves its
  // sessions alone in the history.
  async function listWorkouts(profile) {
    const workouts = (await list(profile, "workouts", ofProfile(profile)))
      .map(([, workout]) => workout)
      .filter((workout) => !workout.archived)
      .sort((a, b) => a.order - b.order);
    if (workouts.length > 0) return workouts;
    // Branch from before workouts became data: the row comes from the ids the exercises carry.
    const ids = [...new Set((await list(profile, "exercises")).map(([, exercise]) => exercise.workout).filter(Boolean))].sort();
    return ids.map((id, order) => ({ id, name: id, order }));
  }

  async function createWorkout(profile, name) {
    const existing = await listWorkouts(profile);
    const workout = { id: crypto.randomUUID(), name, order: existing.length === 0 ? 0 : Math.max(...existing.map((other) => other.order)) + 1 };
    put(profile, "workouts", workoutKey(profile, workout.id), workout);
    return workout;
  }

  async function saveWorkoutField(profile, id, field, value) {
    const previous = await get(profile, "workouts", workoutKey(profile, id));
    if (!previous) return;
    put(profile, "workouts", workoutKey(profile, id), { ...previous, [field]: value });
  }

  const renameWorkout = (profile, id, name) => saveWorkoutField(profile, id, "name", name);
  // Archive, never delete: sessions keep the id, and the history still knows how to show them.
  const archiveWorkout = (profile, id) => saveWorkoutField(profile, id, "archived", true);

  async function reorderWorkouts(profile, ids) {
    for (const [order, id] of ids.entries()) await saveWorkoutField(profile, id, "order", order);
  }

  // A new exercise is born at the end of the chosen workout with a random id: here one device
  // creates and the cloud syncs, so there is no risk of two seeds with different ids.
  async function createExercise(profile, workout, fields) {
    const inWorkout = await listExercises(workout, profile);
    const order = inWorkout.length === 0 ? 0 : Math.max(...inWorkout.map((other) => other.order)) + 1;
    const exercise = { ...fields, id: crypto.randomUUID(), workout, order, profiles: [profile] };
    put(profile, "exercises", exercise.id, exercise);
    return exercise;
  }

  // Changing workout is joining the end of the other one, like restoring: the old position
  // belonged to the old list.
  const moveExercise = (exerciseId, workout, profile) => restoreExercise(exerciseId, workout, profile);

  async function reorderExercises(profile, ids) {
    for (const [order, exerciseId] of ids.entries()) await saveExerciseField(profile, exerciseId, "order", order);
  }

  async function listExercises(workout, profile) {
    const all = await list(profile, "exercises");
    return all
      .map(([, exercise]) => exercise)
      .filter((exercise) => exercise.workout === workout && !exercise.archived && isOwner(exercise, profile))
      .sort((a, b) => a.order - b.order);
  }

  // Today's workout state is the history record itself. They are not two things, so there is no
  // "save session" step at the end.
  async function readTodaySession(profile, workout) {
    const session = sessionKey(profile, workout);
    const records = new Map();
    for (const [key, record] of await list(profile, "records", recordsOf(session))) {
      records.set(key.slice(session.length + 1), record);
    }
    return { session: (await get(profile, "sessions", session)) ?? null, records };
  }

  async function ensureSession(profile, workout) {
    const session = sessionKey(profile, workout);
    if (!(await get(profile, "sessions", session))) {
      put(profile, "sessions", session, { profile, workout, date: today(), startedAt: Date.now(), finishedAt: null });
    }
    return session;
  }

  const noEngine = (profile) => !db && !branches.has(profile);

  async function saveSet(profile, workout, exerciseId, remaining) {
    if (noEngine(profile)) return;
    const session = await ensureSession(profile, workout);
    const key = recordKey(session, exerciseId);
    // Writes over what exists instead of replacing the record: the typed fields live here too.
    const previous = (await get(profile, "records", key)) ?? {};
    put(profile, "records", key, { ...previous, exerciseId, remaining, updatedAt: Date.now() });
  }

  // The two typed numbers of an exercise, in the same record as the sets: `load` is the machine
  // weight, or the treadmill speed, or the bike level, and `minutes` is the cardio time. Typing
  // before ticking a set creates the record, born with the whole workout ahead.
  const TYPED_FIELDS = ["load", "minutes"];

  async function saveValue(profile, workout, exerciseId, field, value) {
    if (noEngine(profile) || !TYPED_FIELDS.includes(field)) return;
    const session = await ensureSession(profile, workout);
    const key = recordKey(session, exerciseId);
    const previous = (await get(profile, "records", key))
      ?? { exerciseId, remaining: (await get(profile, "exercises", exerciseId))?.sets ?? null };
    put(profile, "records", key, { ...previous, exerciseId, [field]: value, updatedAt: Date.now() });
  }

  // Removes only the field, not the record: that day's sets are still history.
  async function deleteValue(profile, workout, exerciseId, field) {
    if (noEngine(profile) || !TYPED_FIELDS.includes(field)) return;
    const key = recordKey(await ensureSession(profile, workout), exerciseId);
    const previous = await get(profile, "records", key);
    if (!previous) return;
    const remaining = { ...previous };
    delete remaining[field];
    put(profile, "records", key, { ...remaining, updatedAt: Date.now() });
  }

  // Sweeps a profile's records and groups the load per exercise, newest first. It is the base
  // of both load readings: the inheritance on the card and the History view.
  async function loadsPerExercise(profile, skipToday) {
    const day = today();
    const perExercise = new Map();

    for (const [key, record] of await list(profile, "records", ofProfile(profile))) {
      if (record?.load == null && record?.minutes == null) continue;
      // The key is profile, date, workout and id. The date runs from the first colon to the
      // underscore; a workout name may contain an underscore, but a date never does.
      const date = key.slice(profile.length + 1, key.indexOf("_"));
      if (skipToday && date === day) continue;
      perExercise.set(record.exerciseId, [...(perExercise.get(record.exerciseId) ?? []),
        { date, load: record.load, minutes: record.minutes }]);
    }

    for (const entries of perExercise.values()) entries.sort((a, b) => (a.date < b.date ? 1 : -1));
    return perExercise;
  }

  // Today's stays out: it lives in today's session, which the app reads along with the sets.
  async function previousLoads(profile, workout) {
    const inWorkout = new Set((await listExercises(workout, profile)).map((exercise) => exercise.id));
    const all = await loadsPerExercise(profile, true);
    return new Map([...all].filter(([exerciseId]) => inWorkout.has(exerciseId)));
  }

  // What the History view needs in one request: the whole catalog, each exercise with that
  // profile's loads. An exercise that never had a load comes with an empty list and still shows:
  // the view shows the person's plan, not only what they wrote down.
  async function history(profile) {
    const loads = await loadsPerExercise(profile, false);
    return (await list(profile, "exercises"))
      .map(([, exercise]) => exercise)
      .filter((exercise) => isOwner(exercise, profile))
      .map((exercise) => ({ exercise, loads: loads.get(exercise.id) ?? [] }))
      .sort((a, b) => a.exercise.order - b.exercise.order);
  }

  // Takes the exercise off the day's list without deleting anything: what was lifted stays in
  // the history, and coming back is just undoing this mark.
  async function archiveExercise(profile, exerciseId, when = Date.now()) {
    const exercise = await get(profile, "exercises", exerciseId);
    if (exercise) put(profile, "exercises", exerciseId, { ...exercise, archived: true, archivedAt: when });
  }

  // Restoring picks which workout it returns to, and it joins the end of that workout: the old
  // position means nothing after the list moved on.
  async function restoreExercise(exerciseId, workout, profile) {
    const exercise = await get(profile, "exercises", exerciseId);
    if (!exercise) return;
    const inWorkout = await listExercises(workout, profile);
    const lastOrder = inWorkout.length === 0 ? -1 : Math.max(...inWorkout.map((other) => other.order));
    const { archived, archivedAt, ...active } = exercise;
    put(profile, "exercises", exerciseId, { ...active, workout, order: lastOrder + 1 });
  }

  async function finishSession(profile, workout) {
    if (noEngine(profile)) return;
    const session = await ensureSession(profile, workout);
    const { records } = await readTodaySession(profile, workout);
    const now = Date.now();

    // An exercise without a record goes in with everything remaining. Skipping is information:
    // it reveals recurring abandonment, and the history has to say the day went by without it.
    const skipped = (await listExercises(workout, profile))
      .filter((exercise) => !records.has(exercise.id))
      .map((exercise) => [
        recordKey(session, exercise.id),
        { exerciseId: exercise.id, remaining: exercise.sets, updatedAt: now }
      ]);
    await putMany(profile, "records", skipped);

    put(profile, "sessions", session, { ...(await get(profile, "sessions", session)), finishedAt: now });
  }

  // Reset is a new write, never a deletion: the record is history, and history is append-only.
  // `startedAt` moves to now because the session restarts, and that is what keeps it inside the
  // current cycle when the reset comes right after restarting the cycle.
  async function resetWorkout(profile, workout) {
    if (noEngine(profile)) return;
    const session = await ensureSession(profile, workout);
    const now = Date.now();
    // Today's load survives: resetting is redoing the workout, not unsaying the weight that was
    // on the machine. Without spreading the record back, the reset erased the field.
    const { records } = await readTodaySession(profile, workout);
    const full = (await listExercises(workout, profile)).map((exercise) => [
      recordKey(session, exercise.id),
      { ...records.get(exercise.id), exerciseId: exercise.id, remaining: exercise.sets, updatedAt: now }
    ]);
    await putMany(profile, "records", full);
    put(profile, "sessions", session, { ...(await get(profile, "sessions", session)), startedAt: now, finishedAt: null });
  }

  // Weeks of training already done, so the example profile opens with a full history. Writes
  // once only, and never on a profile that already has a session: nobody wants invented data over theirs.
  async function seedHistory(profile, workouts, archived) {
    if (noEngine(profile)) return;
    const existing = await list(profile, "sessions", ofProfile(profile));
    if (existing.length > 0) return;

    const sessions = [];
    const records = [];
    const stepOf = (exercise) => (isTimed(exercise) ? 5 : 2.5);
    const startOf = (exercise, position) => (isTimed(exercise) ? 15 : 10 + position * 5);

    // Backwards, one week at a time, with the weight climbing step by step and a plateau in the
    // middle: a history that only climbs looks like nobody's.
    for (let week = EXAMPLE_WEEKS; week >= 1; week--) {
      const done = EXAMPLE_WEEKS - week;
      for (const [workout, exercises] of Object.entries(workouts)) {
        const date = daysAgo(week * 7 - Object.keys(workouts).indexOf(workout) * 2);
        const session = `${profile}:${date}_${workout}`;
        const when = Date.now() - week * 7 * 24 * 3600 * 1000;
        sessions.push([session, { profile, workout, date, startedAt: when, finishedAt: when + 3600000 }]);

        exercises.forEach((exercise, position) => {
          const steps = Math.floor(done / 2);
          const value = startOf(exercise, position) + steps * stepOf(exercise);
          // Push-ups and crunches have no weight, so their record is only that they were done.
          const measure = exercise.kind === "bodyweight" ? {}
            : isTimed(exercise) ? { minutes: value, load: 5 + steps }
              : { load: value };
          records.push([recordKey(session, exercise.id),
            { exerciseId: exercise.id, remaining: 0, ...measure, updatedAt: when }]);
        });
      }
    }

    // The archived ones only have weight in the oldest weeks: they left the plan at some point,
    // and the day they left is the day after the last one they were done.
    const THEIR_LAST_WEEK = EXAMPLE_WEEKS - 2;
    archived.forEach((exercise, position) => {
      archiveExercise(profile, exercise.id, Date.now() - (THEIR_LAST_WEEK * 7 - 1) * 24 * 3600 * 1000);
      for (let week = EXAMPLE_WEEKS; week >= THEIR_LAST_WEEK; week--) {
        const date = daysAgo(week * 7);
        const session = `${profile}:${date}_${exercise.workout}`;
        const when = Date.now() - week * 7 * 24 * 3600 * 1000;
        const steps = EXAMPLE_WEEKS - week;
        records.push([recordKey(session, exercise.id), {
          exerciseId: exercise.id,
          remaining: 0,
          ...(isTimed(exercise) ? { minutes: 20 + steps * 5, load: 4 + steps } : { load: 30 + steps * 2.5 }),
          updatedAt: when
        }]);
        if (position === 0) {
          sessions.push([session, { profile, workout: exercise.workout, date, startedAt: when, finishedAt: when + 3600000 }]);
        }
      }
    });

    await putMany(profile, "sessions", sessions);
    await putMany(profile, "records", records);
    // The cycle starts now: otherwise the past weeks would count as finished in the current
    // cycle, and the app would open saying everything is already done.
    put(profile, "cycle", profile, { startedAt: Date.now() });
  }

  const EXAMPLE_WEEKS = 8;
  const isTimed = (exercise) => exercise.kind === "time";

  function daysAgo(count) {
    const day = new Date();
    day.setDate(day.getDate() - count);
    return `${day.getFullYear()}-${twoDigits(day.getMonth() + 1)}-${twoDigits(day.getDate())}`;
  }

  const readCycle = async (profile) => (await get(profile, "cycle", profile)) ?? { startedAt: 0 };

  const startCycle = (profile) => put(profile, "cycle", profile, { startedAt: Date.now() });

  // A circle is an invite code and whoever joined with it. Each member writes only their own
  // document at `circles/{code}/members/{uid}` and keeps the code in their own branch, so nobody
  // writes in anybody else's document, and the rules let members read each other's branch.
  // Cloud only: the example and the visitor have nobody to share with.
  const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const CODE_LENGTH = 6;
  const generateCode = () => Array.from(crypto.getRandomValues(new Uint8Array(CODE_LENGTH)),
    (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
  const membersOf = (code) => firestore.collection(`circles/${code}/members`);

  const readCircle = async (profile) => (await get(profile, "circle", profile))?.code ?? null;

  function joinCircle(profile, code, name) {
    const branch = branches.get(profile);
    if (!branch) return Promise.resolve(null);
    const clean = code.trim().toUpperCase();
    membersOf(clean).doc(branch.uid).set({ name, joinedAt: Date.now() }).catch(writeFailed);
    put(profile, "circle", profile, { code: clean });
    return Promise.resolve(clean);
  }

  const createCircle = (profile, name) => joinCircle(profile, generateCode(), name);

  async function leaveCircle(profile) {
    const code = await readCircle(profile);
    if (code === null) return;
    membersOf(code).doc(branches.get(profile).uid).delete().catch(writeFailed);
    remove(profile, "circle", profile);
  }

  // code -> { members: uid -> data, ready }. A mirror like the branch's: subscribes once and
  // answers on the first snapshot or on timeout.
  const circles = new Map();

  function readMembers(code) {
    if (!firestore) return Promise.resolve([]);
    if (!circles.has(code)) {
      const members = new Map();
      const first = new Promise((arrived) => {
        membersOf(code).onSnapshot({ includeMetadataChanges: true }, (snapshot) => {
          for (const change of snapshot.docChanges()) {
            if (change.type === "removed") members.delete(change.doc.id);
            else members.set(change.doc.id, change.doc.data());
          }
          arrived();
        }, arrived);
      });
      circles.set(code, { members, ready: withTimeout(first, MIRROR_TIMEOUT) });
    }
    const circle = circles.get(code);
    return circle.ready.then(() => [...circle.members].map(([uid, data]) => ({ uid, ...data })));
  }

  // A done workout is a session finished after the cycle started. The cycle is only that cursor,
  // which is why restarting deletes no session.
  async function finishedWorkouts(profile) {
    const { startedAt } = await readCycle(profile);
    const done = new Set();
    for (const [, session] of await list(profile, "sessions")) {
      if (session.profile === profile && session.finishedAt && session.startedAt >= startedAt) {
        done.add(session.workout);
      }
    }
    return done;
  }

  // The photo belongs to the machine, and the machine is the same in both plans: the key is the
  // video code the gym assigns per exercise, which repeats across profiles. An exercise without a
  // code (created in the editor) keeps its own id.
  const photoKey = (exercise) => (exercise.videoCode > 0 ? `video-${exercise.videoCode}` : exercise.id);
  const slotKey = (key, slot) => `${key}:${slot}`;
  const splitSlot = (keyWithSlot) => {
    const cut = keyWithSlot.lastIndexOf(":");
    return [keyWithSlot.slice(0, cut), Number(keyWithSlot.slice(cut + 1))];
  };

  // Photos go up to a collection both read, `photos`, outside the branches: the rules open it to
  // anyone signed in except the example. Base64 inside the document, because Storage requires a
  // paid plan and the photo is already shrunk to 800px. IndexedDB stays as the local copy.
  const cloudPhotos = new Map();
  let photosSubscribed = false;
  let photosFromServer = null;

  function subscribePhotos() {
    if (!firestore || photosSubscribed) return;
    photosSubscribed = true;
    photosFromServer = new Promise((done) => {
      firestore.collection("photos").onSnapshot({ includeMetadataChanges: true }, (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === "removed") cloudPhotos.delete(change.doc.id);
          else cloudPhotos.set(change.doc.id, change.doc.data());
        }
        if (!snapshot.metadata.fromCache) done(true);
      }, () => done(false));
    });
  }

  const toBase64 = (photo) => new Promise((done) => {
    const reader = new FileReader();
    reader.onload = () => done(String(reader.result).split(",")[1]);
    reader.readAsDataURL(photo);
  });
  const fromBase64 = ({ data, type }) => new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], { type });

  // The cloud copy wins over the local one: it is the one both devices see.
  async function readPhotos() {
    const perKey = new Map();
    const keep = (keyWithSlot, photo) => {
      const [key, slot] = splitSlot(keyWithSlot);
      const slots = perKey.get(key) ?? [];
      slots[slot] = photo;
      perKey.set(key, slots);
    };
    for (const [keyWithSlot, photo] of await Local.list(null, "photos")) keep(keyWithSlot, photo);
    if (photosSubscribed) for (const [keyWithSlot, doc] of cloudPhotos) keep(keyWithSlot, fromBase64(doc));
    return perKey;
  }

  async function savePhoto(key, slot, photo) {
    Local.put(null, "photos", slotKey(key, slot), photo);
    if (!photosSubscribed) return;
    const doc = { data: await toBase64(photo), type: photo.type || "image/jpeg", updatedAt: Date.now() };
    cloudPhotos.set(slotKey(key, slot), doc);
    firestore.collection("photos").doc(slotKey(key, slot)).set(doc).catch(writeFailed);
  }

  function deletePhoto(key, slot) {
    Local.remove(null, "photos", slotKey(key, slot));
    if (!photosSubscribed) return;
    cloudPhotos.delete(slotKey(key, slot));
    firestore.collection("photos").doc(slotKey(key, slot)).delete().catch(writeFailed);
  }

  // A photo stored before keys were by video code, still under the exercise id, moves to the new key.
  async function migratePhotoKeys(exercises) {
    const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
    for (const [keyWithSlot, photo] of await Local.list(null, "photos")) {
      const [key, slot] = splitSlot(keyWithSlot);
      const exercise = byId.get(key);
      if (!exercise || photoKey(exercise) === key) continue;
      Local.put(null, "photos", slotKey(photoKey(exercise), slot), photo);
      Local.remove(null, "photos", keyWithSlot);
    }
  }

  // A photo taken before the cloud, or without signal, goes up on the first opening in which the
  // server answered: what is already there is not touched.
  async function syncPhotos() {
    if (!photosSubscribed || !(await withTimeout(photosFromServer, SERVER_TIMEOUT))) return;
    for (const [keyWithSlot, photo] of await Local.list(null, "photos")) {
      if (cloudPhotos.has(keyWithSlot)) continue;
      const [key, slot] = splitSlot(keyWithSlot);
      await savePhoto(key, slot, photo);
    }
  }

  // Only the field, over the exercise that already exists: the editor writes other fields of the
  // same record, and replacing the whole object would erase what it saved.
  async function saveExerciseField(profile, exerciseId, field, value) {
    if (noEngine(profile)) return;
    const previous = await get(profile, "exercises", exerciseId);
    if (!previous) return;
    put(profile, "exercises", exerciseId, { ...previous, [field]: value });
  }

  const saveNote = (profile, exerciseId, note) => saveExerciseField(profile, exerciseId, "note", note);
  const saveReps = (profile, exerciseId, reps) => saveExerciseField(profile, exerciseId, "reps", reps);

  // Edit from the editor: several fields at once, over what is there, without touching id,
  // workout, order, note or archiving, which are not the form's.
  async function editExercise(profile, exerciseId, fields) {
    if (noEngine(profile)) return;
    const previous = await get(profile, "exercises", exerciseId);
    if (!previous) return;
    put(profile, "exercises", exerciseId, { ...previous, ...fields });
  }

  // Fills a field the stored exercise does not have yet, and only that case: the seed does not
  // write over edits, so a new plan field needs this path to reach whoever already opened the app.
  async function fillMissingField(profile, exerciseId, field, value) {
    if (noEngine(profile)) return;
    const previous = await get(profile, "exercises", exerciseId);
    if (!previous || previous[field] !== undefined) return;
    put(profile, "exercises", exerciseId, { ...previous, [field]: value });
  }

  // Safari throws on touching localStorage from an opaque origin, and Chrome does not. Hence the try.
  function readPreference(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function savePreference(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* no storage on this origin */
    }
  }

  return {
    open, isAvailable, seed, removeStrays,
    connectCloud, signIn, signOut, onUserChange,
    listWorkouts, createWorkout, renameWorkout, archiveWorkout, reorderWorkouts,
    createExercise, moveExercise, reorderExercises,
    listExercises, readTodaySession, saveSet, saveValue, deleteValue,
    previousLoads, history, archiveExercise, restoreExercise, seedHistory,
    finishSession, resetWorkout,
    readCycle, startCycle, finishedWorkouts,
    readCircle, createCircle, joinCircle, leaveCircle, readMembers,
    photoKey, readPhotos, savePhoto, deletePhoto, migratePhotoKeys, syncPhotos,
    saveNote, saveReps, editExercise, fillMissingField,
    readPreference, savePreference
  };
})();

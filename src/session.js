// Without a store the screen is born from the seed and the counter works in memory only. The amber
// notice at the top says nothing will be saved; disabling the counter would hide the app from
// whoever opens the file.
const catalogOf = (profile) => PLAN_OF[profile] ?? SUN_WORKOUTS;
const exercisesOf = (workoutId) =>
  Store.isAvailable() ? Store.listExercises(workoutId, activeProfile) : Promise.resolve(catalogOf(activeProfile)[workoutId] ?? []);

// Only the catalog of whoever is on screen: in the cloud each profile has its own, and non-admins
// cannot write to the others. The example history comes along, first time only.
async function seedProfile(profile) {
  if (profile === "example") {
    await Store.seed(EXAMPLE_WORKOUTS, EXAMPLE_OWNER, EXAMPLE_ARCHIVED);
    await Store.seedHistory("example", EXAMPLE_WORKOUTS, EXAMPLE_ARCHIVED);
    await Store.seed(EUROPA_WORKOUTS, ["europa"]);
    // The example is a showcase, not someone's plan: a new plan field reaches whoever already opened
    // it, without waiting for a new catalog. Only fills what the stored record lacks.
    for (const exercise of [...Object.values(EXAMPLE_WORKOUTS).flat(), ...EXAMPLE_ARCHIVED]) {
      if (exercise.accessory) await Store.fillMissingField("example", exercise.id, "accessory", exercise.accessory);
    }
  } else {
    await Store.seed(catalogOf(profile), [profile]);
  }
  await Store.removeStrays(profile, idsOfOtherPlans(profile));
}

// The fixed ids of the other profiles' plans: one of them in this branch came from the shared seed
// from before each profile had its own plan.
const idsOfOtherPlans = (profile) => Object.entries(PLAN_OF)
  .filter(([owner]) => owner !== profile)
  .flatMap(([, plan]) => Object.values(plan).flat().map((exercise) => exercise.id));

// Whoever signed in decides what the screen shows. No login is the example. Sun and Shine open on
// their own workout. Only the admin sees the profile footer: for anyone else the others do not exist.
const ROLE_BY_UID = Object.fromEntries(Object.entries(ACCOUNTS).map(([role, uid]) => [uid, role]));
let username = null;

async function applyUser(uid) {
  username = ROLE_BY_UID[uid] ?? null;
  const allowed = username === "admin" ? Object.keys(PROFILES) : username ? [username] : ["example"];
  for (const profile of allowed.filter((other) => other !== "example")) {
    await Store.connectCloud(profile, ACCOUNTS[profile]);
  }
  profiles.hidden = username !== "admin";
  // Easter eggs: the logo gets a heart when Shine signed in, and a sun when it is Sun.
  document.getElementById("open-menu").classList.toggle("with-heart", username === "shine");
  document.getElementById("open-menu").classList.toggle("with-sun", username === "sun");
  const remembered = Store.readPreference("perfil");
  activeProfile = allowed.includes(remembered) ? remembered : allowed[0];
  profiles.querySelector(`input[value="${activeProfile}"]`).checked = true;

  await seedProfile(activeProfile);
  finished = await Store.finishedWorkouts(activeProfile);
  await loadCircle();
  await loadWorkouts();
  goTo(WORKOUT_IDS.find((workoutId) => !isWorkoutDone(workoutId)) ?? WORKOUT_IDS[0], false);
  updateMenu();
  askForNewCycle();
}

// Opening the app with every workout finished asks once whether to restart. "Cancelar" leaves
// everything as it is, so something can still be fixed before the cards clear.
let askedForNewCycle = false;
function askForNewCycle() {
  if (askedForNewCycle || WORKOUT_IDS.length === 0 || !WORKOUT_IDS.every(isWorkoutDone)) return;
  askedForNewCycle = true;
  restartDialog.returnValue = "";
  restartDialog.showModal();
}

// What the user ticked while the store was still opening beats what was stored, and is written over it.
async function adoptStore() {
  const pending = new Map(remaining);
  await seedProfile(activeProfile);

  for (const workoutId of WORKOUT_IDS) {
    for (const exercise of await exercisesOf(workoutId)) {
      if (pending.has(exercise.id)) {
        await Store.saveSet(activeProfile, workoutId, exercise.id, pending.get(exercise.id));
      }
    }
  }

  finished = await Store.finishedWorkouts(activeProfile);
  document.getElementById("no-store").hidden = true;
  await loadWorkouts();
}

const menu = document.getElementById("menu");
const signedInAs = document.getElementById("menu-who");
const signInButton = document.getElementById("menu-sign-in");
const signOutButton = document.getElementById("menu-sign-out");
const login = document.getElementById("login");
const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const loginConfirm = document.getElementById("login-confirm");

const userDisplayName = () => PROFILES[username] ?? "Admin";
const ORNAMENT = { shine: " ♥", sun: " ☀" };

function updateMenu() {
  signedInAs.textContent = username
    ? `Você entrou como ${userDisplayName()}${ORNAMENT[username] ?? ""}.`
    : "Sem login. Este é o perfil de exemplo, salvo só neste aparelho.";
  signInButton.hidden = Boolean(username);
  signOutButton.hidden = !username;
  document.getElementById("menu-circle").hidden = !hasCircle();
}

document.getElementById("open-menu").onclick = () => {
  updateMenu();
  menu.showModal();
};
document.getElementById("menu-history").onclick = () => {
  menu.close();
  openHistory();
};

// Pulling the footer up also opens the history, like a drawer: the handle above the tabs is the

signInButton.onclick = () => {
  menu.close();
  login.querySelector("form").reset();
  loginError.hidden = true;
  revealPassword(false);
  login.showModal();
};

// The eye shows the password while it is pressed on; the dialog always opens with it hidden.
const loginReveal = document.getElementById("login-reveal");
function revealPassword(shown) {
  loginPassword.type = shown ? "text" : "password";
  loginReveal.setAttribute("aria-pressed", String(shown));
  loginReveal.setAttribute("aria-label", shown ? "Ocultar senha" : "Mostrar senha");
}
loginReveal.onclick = () => revealPassword(loginPassword.type === "password");
signOutButton.onclick = async () => {
  menu.close();
  await Store.signOut();
  notice.textContent = "Você saiu. De volta ao perfil de exemplo.";
};
document.getElementById("login-cancel").onclick = () => login.close();

// Firebase returns codes, and the screen returns one sentence for a wrong credential: saying whether
// the username or the password failed is help for whoever is guessing.
login.querySelector("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.hidden = true;
  loginConfirm.disabled = true;
  try {
    await Store.signIn(loginUsername.value.trim(), loginPassword.value);
    login.close();
    notice.textContent = `Você entrou como ${userDisplayName()}.`;
  } catch (error) {
    loginError.textContent = error?.code === "auth/network-request-failed"
      ? "Sem conexão para entrar. Tente com sinal."
      : "Usuário ou senha errados.";
    loginError.hidden = false;
  } finally {
    loginConfirm.disabled = false;
  }
});

// Tapping outside closes any dialog, and closing that way is always cancel: close() with no argument
// leaves returnValue empty, and every close listener treats empty as cancelled.
//
// Both conditions are needed. The target alone is not enough because the dialog's empty padding is
// the element itself, and tapping it would close. The coordinate alone is not enough because the
// click Enter generates on a focused button arrives at 0,0, outside the box: without the target,
// the keyboard lost the ability to confirm any dialog.
for (const box of document.querySelectorAll("dialog")) {
  box.addEventListener("click", (event) => {
    if (event.target !== box) return;
    const area = box.getBoundingClientRect();
    const inside = event.clientX >= area.left && event.clientX <= area.right
      && event.clientY >= area.top && event.clientY <= area.bottom;
    if (!inside) box.close();
  });
}

(async () => {
  const hasStore = await Store.open(adoptStore);

  document.getElementById("no-store").hidden = hasStore;
  profiles.append(...Object.entries(PROFILES).map(createProfileOption));
  navigator.storage?.persist?.();
  // Two platform APIs outside store.js, both here and both ignoring the result. Registration fails
  // silently on file://, which has no secure origin, and that is expected: opened as a file the app
  // runs without saving anything, service worker included.
  navigator.serviceWorker?.register("sw.js").catch(() => { /* no secure origin */ });
  // The screen only mounts after Firebase said who is signed in. Signing in and out go through the
  // same path: each user change remounts the screen for the right profile.
  await new Promise((ready) => Store.onUserChange((uid) => ready(applyUser(uid))));
})();

// 1.5px stroke because the icon sits next to weight-400 text, and currentColor because an SVG is
// only recolored by state, never swapped for another file.
const ICON_CAMERA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1.5 1.5 0 0 0 1.2-.6l.9-1.2a1.5 1.5 0 0 1 1.2-.6h4a1.5 1.5 0 0 1 1.2.6l.9 1.2a1.5 1.5 0 0 0 1.2.6h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z"/><circle cx="12" cy="13" r="3.5"/></svg>`;
// The camera's three siblings, same stroke: gallery, trash and zoom. They live over the viewer photo.
const ICON_GALLERY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1.5"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 15-4.5-4.5L8 19"/></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7M6 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h7.4a1.5 1.5 0 0 0 1.5-1.4L18 7M10 11v6M14 11v6"/></svg>`;
const ICON_ZOOM = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 4h5v5M9 20H4v-5M20 4l-6 6M4 20l6-6"/></svg>`;

// Stroke 2 because the icon is 13px: at 1.5 the line vanishes next to the weight-700 number. Same
// vocabulary as the camera icon, currentColor and no file per state.
const stroke = (inner) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const ICON_UP = stroke(`<path d="M3 17 9.5 10.5 14 15 21 8"/><path d="M15 8h6v6"/>`);
const ICON_DOWN = stroke(`<path d="M3 7 9.5 13.5 14 9 21 16"/><path d="M15 16h6v-6"/>`);
const ICON_FLAT = stroke(`<path d="M5 9h14"/><path d="M5 15h14"/>`);

// The edit-mode toolbar, in the thin stroke of the photo icons: up, down, edit, change workout and
// remove. Removing is archiving, so it is a box and not a trash can.
const thin = (inner) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICON_MOVE_UP = thin(`<path d="m6 14 6-6 6 6"/>`);
const ICON_MOVE_DOWN = thin(`<path d="m6 10 6 6 6-6"/>`);
const ICON_EDIT = thin(`<path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z"/><path d="m13.5 6.5 4 4"/>`);
const ICON_MOVE = thin(`<path d="M13 5h5.5A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5H13"/><path d="M3 12h11"/><path d="m10 8 4 4-4 4"/>`);
const ICON_ARCHIVE = thin(`<path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5V8H3Z"/><path d="M4 8v10.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V8"/><path d="M12 11v6"/><path d="m9 14 3 3 3-3"/>`);

// The attachments, drawn with Vinicius on 2026-09-13 from photos of his gym. Pulley ones hang from
// the same hook, eye and rod, with only a one-line silhouette below. Nylon and rope are dashed;
// an anatomical grip is a filled drop. Free ones have no hook. The exercise's `accessory` field
// holds the key; empty means none.
const PULLEY_HOOK = `<circle cx="24" cy="4.5" r="2.5"/><path d="M24 7v4"/>`;
const DASHED = `stroke-dasharray="2 1.5"`;
const filledDot = (x, y) => `<circle cx="${x}" cy="${y}" r="2.5" fill="currentColor" stroke="none"/>`;
const filledDrop = (x, y, side) => `<ellipse cx="${x}" cy="${y}" rx="1.9" ry="3" transform="rotate(${side * 28} ${x} ${y})" fill="currentColor" stroke="none"/>`;
const magGrip = (half, height, flat, rise) => {
  const x = 24 - half;
  const y = 11 + height;
  return `<path d="M24 11L${x} ${y}h-${flat}v-${rise}M24 11L${48 - x} ${y}h${flat}v-${rise}"/>`
    + filledDrop(x - flat, y - rise - 2, -1) + filledDrop(48 - x + flat, y - rise - 2, 1);
};
const BAR_PLATES = `<rect x="9" y="8" width="5" height="16" rx="1.5"/><rect x="34" y="8" width="5" height="16" rx="1.5"/><path d="M15.5 13v6M32.5 13v6"/>`;
const ACCESSORIES = {
  "short-straight-bar": { name: "Barra reta curta", pulley: true, drawing: `<path d="M14 11h20"/>` },
  "long-straight-bar": { name: "Barra reta longa", pulley: true, drawing: `<path d="M3 11h42"/>` },
  "long-curved-bar": { name: "Barra curva longa", pulley: true, drawing: `<path d="M3 18l7-7h28l7 7"/>` },
  "ez-bar": { name: "Barra W", pulley: true, drawing: `<path d="M3 11l8 6 8-6h10l8 6 8-6"/>` },
  "v-bar": { name: "Barra V", pulley: true, drawing: `<path d="M24 11l-9 12M24 11l9 12"/><path d="M15 23h-6M33 23h6" stroke-width="3"/>` },
  "rope": { name: "Corda", pulley: true, drawing: `<path d="M24 11c-9 3-12 8-12 13M24 11c9 3 12 8 12 13" ${DASHED}/>${filledDot(12, 26.5)}${filledDot(36, 26.5)}` },
  "iron-stirrup": { name: "Estribo de ferro", pulley: true, drawing: `<path d="M13 26v-4a11 11 0 0 1 22 0v4"/><path d="M11 26h26" stroke-width="3"/>` },
  "nylon-stirrup": { name: "Estribo de nylon", pulley: true, drawing: `<path d="M24 11l-10 15M24 11l10 15" ${DASHED}/><path d="M12 26h24" stroke-width="3"/>` },
  "roman-handle": { name: "Puxador romano", pulley: true, drawing: `<path d="M17 11h14"/><rect x="3" y="7.5" width="14" height="7" rx="1"/><rect x="31" y="7.5" width="14" height="7" rx="1"/><path d="M8 7.5v7M12 7.5v7M36 7.5v7M40 7.5v7" stroke-width="1"/>` },
  "triangle": { name: "Triângulo", pulley: true, drawing: `<path d="M24 11l-11 12M24 11l11 12"/>${filledDot(13, 23)}${filledDot(35, 23)}` },
  "mag-close-neutral": { name: "Mag grip fechada neutra", pulley: true, drawing: magGrip(5, 6, 3, 5) },
  "mag-close-pronated": { name: "Mag grip fechada pronada", pulley: true, drawing: magGrip(7, 5, 4, 4) },
  "mag-medium": { name: "Mag grip média", pulley: true, drawing: magGrip(10, 7, 5, 4) },
  "mag-wide": { name: "Mag grip larga", pulley: true, drawing: magGrip(13, 8, 6, 4) },
  "mag-extra-wide": { name: "Mag grip extra larga", pulley: true, drawing: magGrip(16, 9, 6, 4) },
  "ankle-strap": { name: "Tornozeleira", pulley: true, drawing: `<path d="M24 11l-9 11M24 11l9 11" ${DASHED}/><path d="M15 22q9 8 18 0" stroke-width="3"/>` },
  "dumbbell": { name: "Halter", pulley: false, drawing: `<path d="M17 16h14"/><rect x="9" y="10" width="7" height="12" rx="1.5"/><rect x="32" y="10" width="7" height="12" rx="1.5"/><path d="M6 13v6M42 13v6"/>` },
  "free-bar": { name: "Barra livre", pulley: false, drawing: `<path d="M3 16h6M14 16h20M39 16h6"/>${BAR_PLATES}` },
  "free-ez-bar": { name: "Barra W livre", pulley: false, drawing: `<path d="M3 16h6M39 16h6"/><path d="M14 16h3l3.5-4 3.5 4 3.5-4 3.5 4h3"/>${BAR_PLATES}` },
  "kettlebell": { name: "Kettlebell", pulley: false, drawing: `<path d="M18 13a6 6 0 0 1 12 0"/><circle cx="24" cy="20" r="8"/>` },
  "plate": { name: "Anilha", pulley: false, drawing: `<circle cx="24" cy="16" r="11"/><circle cx="24" cy="16" r="3"/>` }
};
const accessorySvg = (key) => {
  const accessory = ACCESSORIES[key];
  if (!accessory) return "";
  return `<svg viewBox="0 0 48 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${accessory.pulley ? PULLEY_HOOK : ""}${accessory.drawing}</svg>`;
};
const accessoryName = (key) => ACCESSORIES[key]?.name ?? "";

// Data holds the raw key; the screen shows the word as a native speaker writes it, with full
// diacritics and a capital.
const MUSCLE_NAME = {
  chest: "Peito", back: "Costas", shoulders: "Ombro", biceps: "Bíceps", triceps: "Tríceps",
  quads: "Quadríceps", hamstrings: "Posterior", glutes: "Glúteo", adductors: "Adutor",
  calves: "Panturrilha", "lower-back": "Lombar", abs: "Abdômen"
};

// Workouts come from the store on every load, and the plan is only a fallback without one. The
// workout id is what sessions and exercises store; the name is what the tab shows.
let WORKOUT_IDS = Object.keys(SUN_WORKOUTS);
let workouts = WORKOUT_IDS.map((workoutId, order) => ({ id: workoutId, name: workoutId, order: order }));
const workoutName = (workoutId) => workouts.find((workout) => workout.id === workoutId)?.name ?? workoutId;
// "Treino A" for a short name, and the name alone when it is already a word ("Pernas").
const workoutTitle = (workoutId) => {
  const name = workoutName(workoutId);
  return name.length <= 2 ? `Treino ${name}` : name;
};
const LONG_PRESS_DELAY = 400;
// Below this the finger is still: it is the tremor of holding, not a gesture.
const FINGER_SLACK = 10;
// The photo lives in slot 0 since the days of three per exercise. The setting slots left on
// 2026-09-12 because the strip crowded the viewer; setting details go in the note. The key stayed.
const MACHINE_SLOT = 0;

const remaining = new Map();
// Exercise id to today's typed load, and exercise id to the loads of other days, newest first.
// Today's comes from the session; the others, from the history.
const todayLoads = new Map();
const todayMinutes = new Map();
const loadHistory = new Map();
// Exercise id to a list of object URLs per slot. Sparse: a slot without a photo is a hole.
const photos = new Map();
let activeProfile = Store.readPreference("perfil") ?? "sun";
let activeWorkoutId = WORKOUT_IDS[0];
let finished = new Set();
const exercisesByWorkoutId = new Map();
const cardById = new Map();
let viewerTarget = null;
let exerciseTarget = null;
let workoutTarget = null;

const profiles = document.getElementById("profiles");
const tabs = document.getElementById("tabs");
const mainElement = document.querySelector("main");
const carousel = document.getElementById("carousel");
const cycleSection = document.getElementById("cycle");
const notice = document.getElementById("notice");
const galleryPicker = document.getElementById("photo-gallery");
const cameraPicker = document.getElementById("photo-camera");
const viewer = document.getElementById("viewer");
const viewerTitle = document.getElementById("viewer-title");
const viewerMeta = document.getElementById("viewer-meta");
const viewerCircle = document.getElementById("viewer-circle");
const viewerFrame = document.getElementById("viewer-frame");
const note = document.getElementById("note");
const repsField = document.getElementById("reps-field");
const repsFieldLabel = document.getElementById("reps-field-label");
const deleteDialog = document.getElementById("delete-dialog");
const fullscreen = document.getElementById("fullscreen");
const fullscreenTitle = document.getElementById("fullscreen-title");
const zoom = document.getElementById("zoom");
const zoomImg = zoom.querySelector("img");
const restartDialog = document.getElementById("restart-dialog");
const exerciseDialog = document.getElementById("exercise-dialog");
const workoutDialog = document.getElementById("workout-dialog");

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

// After the exercises and before the cards: the photo key is the exercise's video code, so migrating
// old keys and uploading what stayed on the device both need the catalog.
async function loadPhotos() {
  await Store.migratePhotoKeys([...exercisesByWorkoutId.values()].flat());
  await Store.syncPhotos();
  photos.clear();
  for (const [key, bySlot] of await Store.readPhotos()) {
    photos.set(key, bySlot.map((photo) => URL.createObjectURL(photo)));
  }
}

const photoOf = (exercise, slot) => photos.get(Store.photoKey(exercise))?.[slot];
const coverOf = (exercise) => photoOf(exercise, MACHINE_SLOT);

const setsLeft = (exercise) => remaining.get(exercise.id) ?? exercise.sets;

// The load is for the whole exercise, not per set: in a 3×12 all three use the same weight. What is
// on screen is today's if there is one, otherwise the last time's, which is what the person repeats.
// The number is what is written on the machine, no mental math.
// The last time that number was written down, which is not the last session: the day the load came
// in may not be the day the time did.
const lastOf = (exercise, field) =>
  loadHistory.get(exercise.id)?.find((entry) => entry[field] != null);

const lastLoad = (exercise) => lastOf(exercise, "load");
const loadOf = (exercise) => todayLoads.get(exercise.id) ?? lastLoad(exercise)?.load;
const minutesOf = (exercise) => todayMinutes.get(exercise.id) ?? lastOf(exercise, "minutes")?.minutes;

// Not every exercise is measured in kilos: the treadmill in km/h, the bike in levels, and cardio
// time in minutes. The unit lives in the exercise, and the default is machine weight.
const unitOf = (exercise) => exercise.unit ?? "kg";
const isCardio = (exercise) => exercise.kind === "time";
const isBodyweight = (exercise) => exercise.kind === "bodyweight";

// Comma, as spoken. No decimal when the number is round, because a 14 dumbbell is 14.
const formatNumber = (value) => String(Math.round(value * 100) / 100).replace(".", ",");
const asMeasure = (value, unit) => `${formatNumber(value)} ${unit}`;

// The unit goes uppercase through CSS, and the text stays natural in code. In lowercase the k rises
// and the g drops, and next to tabular digits the pair looks crooked.
//
// Number and unit come out as one node on purpose: loose inside a flex container they become two
// items, centered alignment lifts the unit, and "30 kg" reads as "30 to the power of kg".
function withText(content, unit) {
  const block = Object.assign(document.createElement("span"), { className: "kilos" });
  block.append(text(content),
    Object.assign(document.createElement("span"), { className: "unit", textContent: unit }));
  return block;
}

const withUnit = (value, unit) => withText(formatNumber(value), unit);

// Text that exists only for the screen reader, where the screen is happy with an icon.
const visuallyHidden = (content) =>
  Object.assign(document.createElement("span"), { className: "visually-hidden", textContent: content });
const asDayMonth = (date) => `${date.slice(8)}/${date.slice(5, 7)}`;
const asNumber = (text) => {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(value) && value >= 0 && value < 1000 ? value : null;
};
const isWorkoutDone = (workoutId) => finished.has(workoutId);
const label = (missing, reps) => (missing === 0 ? "feito" : `${missing}×${reps}`);

// Muscles only. The equipment lives inside the exercise name, where it is part of how the person
// calls the movement, not a catalog label next to it.
const labelsOf = (exercise) =>
  exercise.muscles.map((muscle) => MUSCLE_NAME[muscle]).join(" · ");

// Sets left are the big number, reps the small line below.
// Multiplication sign, not the letter x: it is what a native reads as "twelve times".
// The brand's dumbbell, same geometry as icone.svg in 24 units: "done" takes the two-line shape of
// "3 × 12 rep", with the icon where the number was. The text stays below, because an icon alone
// carries no meaning.
const ICON_DUMBBELL = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="11.05" width="12" height="1.9" rx="0.95"/><rect x="3.9" y="8.4" width="2.75" height="7.2" rx="1.2"/><rect x="17.35" y="8.4" width="2.75" height="7.2" rx="1.2"/><rect x="1.9" y="9.9" width="1.6" height="4.2" rx="0.8"/><rect x="20.5" y="9.9" width="1.6" height="4.2" rx="0.8"/></svg>`;

const counterLabel = (missing, reps) =>
  missing === 0
    ? `<span class="sets done">${ICON_DUMBBELL}</span><span class="reps"><span class="unit">Feito</span></span>`
    : `<span class="sets">${missing}<span class="times">×</span></span><span class="reps">${reps}<span class="unit">rep</span></span>`;

function refresh() {
  cardById.forEach((card) => card.update());
  updateTabs();
  updateCycle();
}

async function setRemaining(exercise, value) {
  if (value === setsLeft(exercise)) return;

  remaining.set(exercise.id, value);
  // The workout id comes from the exercise, not from the visible tab: with all panels mounted at once,
  // what is on screen no longer says which one is being touched.
  Store.saveSet(activeProfile, exercise.workout, exercise.id, value);

  // The inherited chip belongs to the screen, and only becomes a record when a set goes down. Without
  // this, an opened and abandoned workout would record weight on an exercise nobody did, and the
  // history trend would lie. Raising the set back does not count: nothing was lifted.
  if (value < exercise.sets && !todayLoads.has(exercise.id) && lastLoad(exercise)) {
    saveTyped(exercise, "load", lastLoad(exercise).load);
  }

  const workoutId = exercise.workout;
  cardById.get(exercise.id)?.update({ animate: true });
  notice.textContent = `${exercise.name}: ${label(value, exercise.reps)}.`;

  if ((exercisesByWorkoutId.get(workoutId) ?? []).every((other) => setsLeft(other) === 0)) {
    await finish(workoutId);
    notice.textContent = `${exercise.name}: feito. ${workoutTitle(workoutId)} completo e gravado no histórico.`;
  }
  updateTabs();
  updateCycle();
}

async function finish(workoutId) {
  finished.add(workoutId);
  await Store.finishSession(activeProfile, workoutId);
  if (workoutId === activeWorkoutId) refresh();
  else {
    updateTabs();
    updateCycle();
  }
}

async function resetWorkoutProgress(workoutId) {
  await Store.resetWorkout(activeProfile, workoutId);
  finished.delete(workoutId);
  for (const exercise of await exercisesOf(workoutId)) remaining.set(exercise.id, exercise.sets);
}

function bindLongPress(element, onHold) {
  let timer;
  let fired = false;
  let origin = null;

  element.addEventListener("pointerdown", (event) => {
    fired = false;
    origin = { x: event.clientX, y: event.clientY };
    timer = setTimeout(() => { fired = true; onHold(); }, LONG_PRESS_DELAY);
  });
  // A moving finger is a scroll or a workout switch, and neither may become a long press.
  element.addEventListener("pointermove", (event) => {
    if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > FINGER_SLACK) {
      clearTimeout(timer);
    }
  });
  for (const event of ["pointerup", "pointercancel", "pointerleave"]) {
    element.addEventListener(event, () => clearTimeout(timer));
  }
  element.addEventListener("contextmenu", (event) => event.preventDefault());

  // Consumes the flag on read. Otherwise it would stay on until the next pointerdown, and the Enter
  // click, which has no pointerdown, would be swallowed forever after a long press.
  return () => {
    const hadFired = fired;
    fired = false;
    return hadFired;
  };
}

function createProfileOption([value, name]) {
  const profileLabel = document.createElement("label");
  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "profile";
  radio.value = value;
  radio.className = "visually-hidden";
  radio.checked = value === activeProfile;
  radio.onchange = () => switchProfile(value);
  profileLabel.append(radio, name);
  return profileLabel;
}

async function switchProfile(value) {
  activeProfile = value;
  Store.savePreference("perfil", value);
  remaining.clear();
  await seedProfile(value);
  finished = await Store.finishedWorkouts(value);
  await loadWorkouts();
  goTo(WORKOUT_IDS.find((workoutId) => !isWorkoutDone(workoutId)) ?? WORKOUT_IDS[0], false);
  notice.textContent = `Treino de ${PROFILES[value]}.`;
}

function createTab(workoutId, position) {
  const button = document.createElement("button");
  button.type = "button";
  button.id = `tab-${workoutId}`;
  button.className = "tab";
  button.setAttribute("role", "tab");
  button.setAttribute("aria-controls", "lista");

  // While editing, the active tab opens the workout's own options (name, order, remove); otherwise
  // the day's (finish, reset).
  const openOptions = () => (editing ? openEditWorkout(workoutId) : openWorkoutMenu(workoutId));
  const held = bindLongPress(button, openOptions);
  button.onclick = () => {
    if (held()) return;
    if (workoutId === activeWorkoutId) openOptions();
    else goTo(workoutId);
  };

  button.onkeydown = async (event) => {
    const steps = { ArrowRight: 1, ArrowLeft: -1, Home: -position, End: WORKOUT_IDS.length - 1 - position };
    const step = steps[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const destination = (position + step + WORKOUT_IDS.length) % WORKOUT_IDS.length;
    goTo(WORKOUT_IDS[destination]);
    tabs.children[destination].focus();
  };
  return button;
}

function updateTabs() {
  WORKOUT_IDS.forEach((workoutId, position) => {
    const button = tabs.children[position];
    const active = workoutId === activeWorkoutId;
    const completed = isWorkoutDone(workoutId);
    button.setAttribute("aria-selected", active);
    button.classList.toggle("near", active);
    button.tabIndex = active ? 0 : -1;
    // The active tab's underline is not positioned here: it follows the carousel scroll, frame by frame.
    button.replaceChildren(workoutName(workoutId));
    button.classList.toggle("completed", completed);
    button.setAttribute("aria-label", [
      `${workoutTitle(workoutId)}`,
      completed ? ", concluído" : "",
      active ? ". Ativar de novo abre as opções do treino." : ""
    ].join(""));
  });
}

function updateCycle() {
  cycleSection.hidden = !WORKOUT_IDS.every(isWorkoutDone);
}

// Loads every workout at once and mounts one panel each. It used to be one workout at a time, with
// a generation guard for the finger switching tabs mid-read; with all mounted, that race is gone.
async function loadWorkouts() {
  exercisesByWorkoutId.clear();
  remaining.clear();
  todayLoads.clear();
  todayMinutes.clear();
  loadHistory.clear();

  if (Store.isAvailable()) {
    workouts = await Store.listWorkouts(activeProfile);
  } else {
    workouts = Object.keys(catalogOf(activeProfile)).map((workoutId, order) => ({ id: workoutId, name: workoutId, order: order }));
  }
  WORKOUT_IDS = workouts.map((workout) => workout.id);
  if (!WORKOUT_IDS.includes(activeWorkoutId)) activeWorkoutId = WORKOUT_IDS[0];
  tabs.replaceChildren(...WORKOUT_IDS.map(createTab));
  tabs.style.setProperty("--count", WORKOUT_IDS.length);

  for (const workoutId of WORKOUT_IDS) {
    exercisesByWorkoutId.set(workoutId, await exercisesOf(workoutId));

    const { records: records } = await Store.readTodaySession(activeProfile, workoutId);
    for (const [exerciseId, record] of records) {
      remaining.set(exerciseId, record.remaining);
      if (record.load != null) todayLoads.set(exerciseId, record.load);
      if (record.minutes != null) todayMinutes.set(exerciseId, record.minutes);
    }

    for (const [exerciseId, loads] of await Store.previousLoads(activeProfile, workoutId)) {
      loadHistory.set(exerciseId, loads);
    }
  }

  await loadPhotos();
  buildPanels();
  updateTabs();
  updateCycle();
}

function buildPanels() {
  cardById.clear();
  carousel.replaceChildren(...WORKOUT_IDS.map((workoutId) => {
    const panel = document.createElement("section");
    panel.className = "panel";
    panel.id = `panel-${workoutId}`;
    panel.dataset.workoutId = workoutId;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `tab-${workoutId}`);

    const list = document.createElement("ul");
    list.className = "list";
    list.append(...(exercisesByWorkoutId.get(workoutId) ?? []).map((exercise, position) => {
      const card = createCard(exercise, position);
      cardById.set(exercise.id, card);
      return card.item;
    }));

    panel.append(list);
    return panel;
  }));

  goTo(activeWorkoutId, false);
}

// Scroll to the panel. The browser animates when it can; under reduced motion it jumps, which is
// what the person asked for by turning the preference on.
function goTo(workoutId, smooth = true) {
  const panel = document.getElementById(`panel-${workoutId}`);
  if (!panel) return;
  // Smooth scrolling takes frames to arrive, and midway the carousel still rests on the panel it
  // left. Without remembering where it is going, the late landing of that animation undoes the
  // choice the finger just made on the next tab.
  //
  // Already there, there is no scroll at all, and marking a destination here would leave it marked
  // forever: with no scroll event to clear it, every following gesture would be discarded.
  const alreadyThere = Math.abs(carousel.scrollLeft - panel.offsetLeft) < 1;
  scrollDestination = alreadyThere ? null : workoutId;
  clearTimeout(forgetDestination);
  // Safety net: a scroll that never arrives, hidden screen or background tab, cannot lock the switch.
  if (!alreadyThere) forgetDestination = setTimeout(() => { scrollDestination = null; }, DESTINATION_TIMEOUT);
  carousel.scrollTo({ left: panel.offsetLeft, behavior: smooth ? "smooth" : "instant" });
  activate(workoutId);
}

// Where the carousel stopped rules the active tab. Calling again with the same id does nothing, so
// the tab click and the snap event can both arrive without repeated work.
function activate(workoutId, announce = false) {
  if (workoutId === activeWorkoutId || !WORKOUT_IDS.includes(workoutId)) return;
  activeWorkoutId = workoutId;
  updateTabs();
  updateCycle();
  if (announce) notice.textContent = `${workoutTitle(workoutId)}.`;
}

// The active tab's underline moves with the scroll, in panel fractions: that is what makes the
// indicator follow the finger instead of jumping when the gesture ends. Passive on purpose, this
// runs every frame.
// Only a real gesture announces the workout switch. A scroll the app itself asked for already has
// its message, and announcing again would erase the "cycle restarted" just written.
let carouselGesture = false;
for (const name of ["pointerdown", "wheel", "touchstart"]) {
  carousel.addEventListener(name, () => { carouselGesture = true; }, { passive: true });
}

carousel.addEventListener("scroll", () => {
  if (carousel.clientWidth > 0) {
    const fraction = carousel.scrollLeft / carousel.clientWidth;
    tabs.style.setProperty("--active", fraction);
    // The tab text switches halfway, together with the underline. Waiting for the landing made the
    // name arrive late, and the color transition on top looked slow.
    highlightTab(Math.round(fraction));
  }
  scheduleLanding();
}, { passive: true });

function highlightTab(position) {
  [...tabs.children].forEach((tab, i) => tab.classList.toggle("near", i === position));
}

// `scrollsnapchange` is the right event, and says by itself which panel the gesture landed on.
// Where it does not exist, the same work comes from a scroll that went quiet.
if ("onscrollsnapchange" in carousel) {
  carousel.addEventListener("scrollsnapchange", (event) => {
    const workoutId = event.snapTargetInline?.dataset.workoutId;
    if (workoutId) landOn(workoutId);
  });
}

// A scroll the app asked for leaves snap events behind. Without this guard, the late snap of the
// previous scroll undoes the tab the app just chose.
function landOn(workoutId) {
  if (scrollDestination !== null && workoutId !== scrollDestination) return;
  scrollDestination = null;
  activate(workoutId, carouselGesture);
  carouselGesture = false;
}

const ESPERA_POUSO = 120;
const DESTINATION_TIMEOUT = 1000;
let landing;
let forgetDestination;
let scrollDestination = null;

function scheduleLanding() {
  clearTimeout(landing);
  landing = setTimeout(() => {
    const width = carousel.clientWidth;
    if (width === 0) return;
    // The scroll went quiet, so where it stopped is the truth, whether from a gesture or an animation.
    // The destination does not enter here: an animation interrupted midway by the finger would leave
    // the guard rejecting the panel where the person actually stopped.
    scrollDestination = null;
    activate(WORKOUT_IDS[Math.round(carousel.scrollLeft / width)], carouselGesture);
    carouselGesture = false;
  }, ESPERA_POUSO);
}

// On desktop the browser does not drag content with the mouse, so the swipe between workouts is
// done by hand for it only: the finger keeps native scroll snap. Snap turns off during the drag,
// otherwise it pulls the panel back every frame, and returns after the animated landing ends. A
// drag that starts on the counter does not count, because there the gesture is the sets adjustment.
const DRAG = { originX: 0, originScroll: 0, dragging: false, dragged: false };
let snapRestore;

carousel.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse" || event.button !== 0 || event.target.closest(".counter")) return;
  DRAG.originX = event.clientX;
  DRAG.originScroll = carousel.scrollLeft;
  DRAG.dragging = false;
  DRAG.dragged = false;
});

carousel.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse" || !(event.buttons & 1)) return;
  const distance = event.clientX - DRAG.originX;
  if (!DRAG.dragging) {
    if (Math.abs(distance) <= FINGER_SLACK) return;
    DRAG.dragging = true;
    DRAG.dragged = true;
    clearTimeout(snapRestore);
    carousel.classList.add("dragging");
    try { carousel.setPointerCapture(event.pointerId); } catch { /* synthetic pointer */ }
  }
  carousel.scrollLeft = DRAG.originScroll - distance;
});

function releaseDrag() {
  if (!DRAG.dragging) return;
  DRAG.dragging = false;
  const width = carousel.clientWidth;
  if (width > 0) goTo(WORKOUT_IDS[Math.min(WORKOUT_IDS.length - 1, Math.max(0, Math.round(carousel.scrollLeft / width)))]);
  // Snap only returns after the scroll landed, otherwise it cuts the animation and the panel jumps.
  const restore = () => {
    carousel.classList.remove("dragging");
    carousel.removeEventListener("scrollend", restore);
  };
  carousel.addEventListener("scrollend", restore);
  snapRestore = setTimeout(restore, DESTINATION_TIMEOUT);
}
carousel.addEventListener("pointerup", releaseDrag);
carousel.addEventListener("pointercancel", releaseDrag);

// Releasing the mouse after a drag still fires a click on whatever is below, and it would tick a
// set or open the viewer. The flag is consumed here, in capture, before everyone else.
carousel.addEventListener("click", (event) => {
  if (!DRAG.dragged) return;
  DRAG.dragged = false;
  event.stopPropagation();
  event.preventDefault();
}, { capture: true });

// Tapping the treadmill means "done". The time in the box becomes the day's record, and tapping
// again undoes it: with no set to tick, the tap is what opens and closes the exercise. Undoing does
// not erase the time, just as raising a set does not erase the load: the second tap used to lose
// what the tape had chosen.
function finishCardio(exercise) {
  const done = setsLeft(exercise) === 0;
  if (!done) {
    const minutes = minutesOf(exercise);
    if (minutes !== undefined) saveTyped(exercise, "minutes", minutes);
  }
  setRemaining(exercise, done ? exercise.sets: 0);
  notice.textContent = done
    ? `${exercise.name}: desfeito.`
    : `${exercise.name}: feito, ${asMeasure(minutesOf(exercise) ?? 0, "min")}.`;
}

function createField(exercise, which) {
  const field = document.createElement("input");
  field.type = "text";
  // decimal, not number: the numeric field refuses commas and brings spinners nobody uses.
  field.inputMode = "decimal";
  field.className = "load-field";
  field.hidden = true;
  field.setAttribute("aria-label", `Carga de ${exercise.name}, em ${unitOf(exercise)}`);
  return field;
}

function createCard(exercise, position) {
  const item = document.createElement("li");
  item.className = "exercise";
  // Only feeds the entrance stagger: it gives each card its delay.
  item.style.setProperty("--position", position);

  const counter = document.createElement("button");
  counter.type = "button";
  counter.className = "counter";

  // On the treadmill there is no set to tick: the top box becomes the time. Tapping marks done with
  // the time already there, and holding opens the same tape as the counter, in minutes.
  if (isCardio(exercise)) bindTime(counter, exercise);
  else bindCounter(counter, exercise);

  const middle = document.createElement("button");
  middle.type = "button";
  middle.className = "description";
  // A short tap on the body does the same as on the counter: ticks a set. Holding opens the exercise
  // menu, and the contextmenu event is the same path for mouse and keyboard. The viewer opens only
  // through the photo, since 2026-09-13.
  const heldName = bindLongPress(middle, () => openExerciseMenu(exercise));
  middle.onclick = () => {
    if (heldName()) return;
    counter.click();
  };
  middle.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    if (!exerciseMenu.open) openExerciseMenu(exercise);
  });
  const name = document.createElement("div");
  name.className = "name";
  name.textContent = exercise.name;

  const muscles = document.createElement("div");
  muscles.className = "muscles";
  muscles.textContent = labelsOf(exercise);
  // The attachment goes at the end of the muscle line, icon only: its name lives in the viewer.
  if (exercise.accessory && ACCESSORIES[exercise.accessory]) {
    const badge = document.createElement("span");
    badge.className = "accessory-badge";
    badge.title = accessoryName(exercise.accessory);
    badge.innerHTML = accessorySvg(exercise.accessory);
    muscles.append(" ", badge);
  }

  middle.append(name, muscles);

  // Someone in the circle does the same exercise: their initial, in a badge in the corner. Initial and
  // not just color, because color alone carries no meaning in this app.
  const together = shared.get(exercise.videoCode) ?? [];
  middle.setAttribute("aria-label", `${exercise.name}. ${labelsOf(exercise)}.`
    + (exercise.accessory && ACCESSORIES[exercise.accessory] ? ` Com ${accessoryName(exercise.accessory).toLowerCase()}.` : "")
    + (together.length > 0 ? ` Também no treino de ${together.map((other) => other.name).join(" e ")}.` : "")
    + " Tocar baixa uma série. Segurar, ou a tecla de menu, abre o menu do exercício.");
  if (together.length > 0) {
    const badge = document.createElement("span");
    badge.className = "together";
    badge.setAttribute("aria-hidden", "true");
    badge.textContent = together.map((other) => other.name[0]).join("");
    item.append(badge);
  }

  const photo = document.createElement("button");
  photo.type = "button";
  photo.className = "photo";
  photo.onclick = () => openViewer(exercise);

  // Load and sets share one box, split by a line: standing at the machine they are the same question,
  // and reading one in the card corner and the other below makes the eye travel.
  const block = document.createElement("div");
  block.className = "block";

  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "load-value";

  const field = createField(exercise, "load");
  // Tapping the load opens the field directly. It used to be "hold opens, tap ticks a set", and he
  // asked for the simple tap back on 2026-09-13: whoever taps the number wants to change the number.
  chip.onclick = () => openLoadField(exercise, chip, field);
  bindLoadField(exercise, chip, field);

  block.append(counter);
  // Push-ups and crunches have no machine weight, so the bottom box disappears instead of waiting for
  // a number that never comes.
  if (!isBodyweight(exercise)) block.append(chip, field);

  const card = {
    item,
    // Only what changed animates, and only when it changed: mounting the whole list with an entrance
    // would be a loading animation, which says nothing.
    update({ animate = false } = {}) {
      const missing = setsLeft(exercise);
      item.classList.toggle("done", missing === 0);
      counter.dataset.done = missing === 0 ? "1" : "0";

      if (isCardio(exercise)) {
        const minutes = minutesOf(exercise);
        // Same drawing as the sets counter: the big number on top and the unit on the line below, where
        // the other cards show "12 rep".
        counter.innerHTML = minutes === undefined
          ? `<span class="sets">+</span><span class="reps"><span class="unit">min</span></span>`
          : `<span class="sets">${shortTime(minutes)}</span><span class="reps"><span class="unit">${timeUnit(minutes)}</span></span>`;
        counter.dataset.empty = minutes === undefined ? "1" : "0";
        counter.style.setProperty("--progress", "0%");
        counter.setAttribute("aria-label", minutes === undefined
          ? `Anotar o tempo de ${exercise.name}. Segurar para escolher os minutos.`
          : `${exercise.name}: ${asMeasure(minutes, "min")}. Tocar marca feito, segurar ajusta o tempo, setas mudam de cinco em cinco.`);
      } else {
        counter.innerHTML = counterLabel(missing, exercise.reps);
        if (animate) counter.querySelector(".sets").classList.add("entering");
        // The fill rises with what was done, not with what is left.
        counter.style.setProperty("--progress", `${((exercise.sets - missing) / exercise.sets) * 100}%`);
        counter.setAttribute("aria-label",
          missing === 0
            ? `${exercise.name}: feito. Use as setas para ajustar.`
            : `${exercise.name}: ${label(missing, exercise.reps)} restantes. Tocar para baixar uma série, setas para ajustar.`);
      }

      const cover = coverOf(exercise);
      photo.innerHTML = cover ? `<img src="${cover}" alt="">` : ICON_CAMERA;
      photo.setAttribute("aria-label", cover
        ? `Fotos do equipamento de ${exercise.name}`
        : `Fotos do equipamento de ${exercise.name}, nenhuma ainda`);

      if (isBodyweight(exercise)) return;
      const load = loadOf(exercise);
      const direction = loadDirection(exercise);
      const unit = unitOf(exercise);
      chip.dataset.empty = load === undefined ? "1" : "0";
      // The icon only shows when the load changed today. How much lives in the history: this box fits
      // the direction, and direction is what you want to know standing at the machine.
      chip.innerHTML = direction === 0 ? "" : direction > 0 ? ICON_UP : ICON_DOWN;
      chip.classList.toggle("load-gain", direction > 0);
      chip.classList.toggle("load-drop", direction < 0);
      chip.append(load === undefined ? withText("+", unit) : withUnit(load, unit));
      chip.setAttribute("aria-label", loadLabel(exercise, load, direction));
    }
  };

  card.update();
  item.append(block, middle, photo, editActions(exercise));
  return card;
}

// The edit-mode toolbar, present on every card and visible only while editing: up, down, change
// workout and remove. Removing is archiving, and the history is the way back.
function editActions(exercise) {
  const toolbar = document.createElement("div");
  toolbar.className = "edit-actions";
  // Icon and accessible name, no visible text: five words side by side did not fit in 390px, and
  // data-action is what the suite reads.
  const button = (action, icon, label, act) => {
    const element = document.createElement("button");
    element.type = "button";
    element.className = "icon";
    element.dataset.action = action;
    element.innerHTML = icon;
    element.setAttribute("aria-label", `${label}: ${exercise.name}`);
    element.onclick = act;
    return element;
  };
  const moveUp = button("up", ICON_MOVE_UP, "Subir", () => shiftExercise(exercise, -1));
  const moveDown = button("down", ICON_MOVE_DOWN, "Descer", () => shiftExercise(exercise, 1));
  const list = exercisesByWorkoutId.get(exercise.workout) ?? [];
  moveUp.disabled = list[0]?.id === exercise.id;
  moveDown.disabled = list[list.length - 1]?.id === exercise.id;
  toolbar.append(
    moveUp,
    moveDown,
    button("edit", ICON_EDIT, "Editar", () => openExerciseEdit(exercise)),
    button("move", ICON_MOVE, "Mudar de treino", () => openWorkoutChoice(exercise, "move")),
    button("remove", ICON_ARCHIVE, "Tirar do treino", () => removeExercise(exercise))
  );
  return toolbar;
}

// The badge states the direction three times: icon, color and the number's sign. So it stays
// readable for whoever cannot tell the two colors apart, and pretty for whoever can.
function badge(difference, unit) {
  const mark = document.createElement("span");
  const wentUp = difference > 0;
  mark.className = `badge ${difference === 0 ? "badge-neutral" : wentUp ? "badge-gain" : "badge-drop"}`;
  mark.innerHTML = difference === 0 ? ICON_FLAT : wentUp ? ICON_UP : ICON_DOWN;
  // No word when nothing changed: the equals sign says it all, and the word beside it was noise. The
  // screen reader still hears it, because the icon is mute.
  if (difference === 0) mark.append(visuallyHidden("sem mudança"));
  else mark.append(withText(withSign(difference), unit));
  return mark;
}

const neutralBadge = (word) => {
  const mark = document.createElement("span");
  mark.className = "badge badge-neutral";
  mark.textContent = word;
  return mark;
};

// Up, down or level, comparing what was typed today with the last time. A load that is only
// inherited has no direction: it is the last time's, and nothing changed.
function loadDirection(exercise) {
  const previous = lastLoad(exercise);
  const today = todayLoads.get(exercise.id);
  if (today === undefined || !previous) return 0;
  return Math.sign(differenceBetween(today, previous.load));
}

// The icon decorates what the label already spells out: the screen reader user hears the
// difference in kilos, which would not fit in the box.
function loadLabel(exercise, load, direction) {
  if (load === undefined) return `Carga de ${exercise.name}: nenhuma. Segurar para digitar.`;
  const previous = lastLoad(exercise);
  const comparison = direction === 0 ? ""
    : ` ${withSign(differenceBetween(todayLoads.get(exercise.id), previous.load))} ${unitOf(exercise)} desde ${asDayMonth(previous.date)}.`;
  return `Carga de ${exercise.name}: ${asMeasure(load, unitOf(exercise))}.${comparison} Tocar para mudar.`;
}

const text = (content) => document.createTextNode(content);

// The two numbers typed on a card. The box does not know where they live: it receives how to read
// today's, what to show when there is nothing today, and how to save and erase.
const TYPED = {
  load: {
    ofToday: (exercise) => todayLoads.get(exercise.id),
    show: loadOf,
    keep: (exercise, value) => todayLoads.set(exercise.id, value),
    forget: (exercise) => todayLoads.delete(exercise.id),
    unit: unitOf,
    onDelete: (exercise) => `Carga de ${exercise.name} apagada.`
  },
  minutes: {
    ofToday: (exercise) => todayMinutes.get(exercise.id),
    show: minutesOf,
    keep: (exercise, value) => todayMinutes.set(exercise.id, value),
    forget: (exercise) => todayMinutes.delete(exercise.id),
    unit: () => "min",
    onDelete: (exercise) => `Tempo de ${exercise.name} apagado.`
  }
};

function openLoadField(exercise, chip, field, which = "load") {
  const value = TYPED[which].show(exercise);
  field.value = value === undefined ? "" : String(value).replace(".", ",");
  chip.hidden = true;
  field.hidden = false;
  field.focus();
  field.select();
}

function bindLoadField(exercise, chip, field, which = "load") {
  const closeDialog = () => {
    field.hidden = true;
    chip.hidden = false;
  };

  let gaveUp = false;

  // Leaving the field commits. Enter and tapping outside both come through here, and on the phone
  // Enter is what closes the keyboard. An emptied field erases the day's load, and the chip goes back
  // to showing the last time's. An impossible number saves nothing and leaves everything as it was.
  field.addEventListener("blur", () => {
    closeDialog();
    if (gaveUp) {
      gaveUp = false;
      return;
    }

    const announce = (text) => {
      cardById.get(exercise.id)?.update();
      notice.textContent = text;
    };

    const owner = TYPED[which];

    if (field.value.trim() === "") {
      if (owner.ofToday(exercise) === undefined) return;
      owner.forget(exercise);
      Store.deleteValue(activeProfile, exercise.workout, exercise.id, which);
      return announce(owner.onDelete(exercise));
    }

    const value = asNumber(field.value);
    if (value === null || value === owner.ofToday(exercise)) return;
    saveTyped(exercise, which, value);
    // Writing the time is what completes cardio: there is no set to tick on a treadmill.
    announce(`${exercise.name}: ${asMeasure(value, owner.unit(exercise))}.`);
  });

  field.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== "Escape") return;
    event.preventDefault();
    // Read before blur, because the listener there consumes the flag on its way through.
    const cancelled = event.key === "Escape";
    gaveUp = cancelled;
    field.blur();
    if (cancelled) chip.focus();
  });
}

const saveTyped = (exercise, which, value) => {
  TYPED[which].keep(exercise, value);
  Store.saveValue(activeProfile, exercise.workout, exercise.id, which, value);
};

// Holding the counter and dragging changes the value in place, like the phone's time picker. The
// number tape is born inside the counter itself, covering it, and follows the finger. Not a dialog:
// the adjustment happens where the finger is, and releasing confirms.
// The same gesture serves the sets counter and the cardio time: tap does, hold opens the tape and
// drags, arrows step. What changes is the option list and what to do with the chosen one, and
// that comes from outside.
function bindAdjustment(counter, { options, current, apply, onTap }) {
  let adjustment = null;
  let timer;
  let adjusted = false;
  let origin = 0;

  const giveUp = () => clearTimeout(timer);
  const last = () => options().length - 1;

  counter.addEventListener("pointerdown", (event) => {
    origin = event.clientY;
    adjusted = false;
    timer = setTimeout(() => {
      adjustment = { origin, initial: current(), value: current() };
      // A synthetic pointer does not exist for the browser, and capturing it throws.
      try { counter.setPointerCapture(event.pointerId); } catch { /* gesture without capture */ }
      openTape(counter, options(), adjustment.value);
      navigator.vibrate?.(10);
    }, LONG_PRESS_DELAY);
  });

  counter.addEventListener("pointermove", (event) => {
    // Before the gesture takes, a moving finger is a list scroll, not an adjustment.
    if (!adjustment) {
      if (Math.abs(event.clientY - origin) > FINGER_SLACK) giveUp();
      return;
    }
    const continuous = Math.min(last(),
      Math.max(0, adjustment.initial + (adjustment.origin - event.clientY) / ADJUST_STEP));
    adjustment.value = Math.round(continuous);
    moveTape(continuous, adjustment.value);
  });

  const release = () => {
    giveUp();
    if (!adjustment) return;
    const value = adjustment.value;
    adjustment = null;
    adjusted = true;
    closeTape(counter);
    apply(value);
  };
  counter.addEventListener("pointerup", release);
  counter.addEventListener("pointercancel", release);
  counter.addEventListener("pointerleave", giveUp);
  counter.addEventListener("contextmenu", (event) => event.preventDefault());

  // The gesture's pointerup still generates a click. Without this guard the adjustment would be
  // followed by one set less. The flag is consumed on read, or the Enter click would die afterwards.
  counter.addEventListener("click", () => {
    if (adjusted) {
      adjusted = false;
      return;
    }
    onTap();
  });

  counter.addEventListener("keydown", (event) => {
    const steps = { ArrowDown: -1, ArrowLeft: -1, ArrowUp: 1, ArrowRight: 1 };
    const step = steps[event.key];
    if (step === undefined) return;
    event.preventDefault();
    apply(Math.min(last(), Math.max(0, current() + step)));
  });
}

function bindCounter(counter, exercise) {
  bindAdjustment(counter, {
    options: () => [{ text: "Feito", done: true },
      ...Array.from({ length: exercise.sets }, (_, i) => ({ text: String(i + 1) }))],
    current: () => setsLeft(exercise),
    apply: (value) => setRemaining(exercise, value),
    onTap: () => setRemaining(exercise, Math.max(0, setsLeft(exercise) - 1))
  });
}

// Time steps by 5 up to the hour, and by 15 up to three hours: nobody runs 23 minutes on a
// treadmill, and the tape has to fit under a thumb. Whoever wants 1h30 drags there.
const MINUTE_OPTIONS = [...Array.from({ length: 12 }, (_, i) => (i + 1) * 5), ...Array.from({ length: 8 }, (_, i) => 75 + i * 15)];
const timeIndex = (minutes) => {
  const target = minutes ?? 30;
  return MINUTE_OPTIONS.reduce((best, option, i) => (Math.abs(option - target) < Math.abs(MINUTE_OPTIONS[best] - target) ? i : best), 0);
};
// Up to 59 it is "30" over "min"; from the hour on it becomes "1:30" over "h", like a clock.
const shortTime = (minutes) => (minutes < 60 ? String(minutes) : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`);
const timeUnit = (minutes) => (minutes < 60 ? "min" : "h");

function bindTime(counter, exercise) {
  bindAdjustment(counter, {
    options: () => MINUTE_OPTIONS.map((minutes) => ({ text: shortTime(minutes) })),
    current: () => timeIndex(minutesOf(exercise)),
    apply: (index) => {
      const minutes = MINUTE_OPTIONS[index];
      saveTyped(exercise, "minutes", minutes);
      cardById.get(exercise.id)?.update();
      notice.textContent = `${exercise.name}: ${asMeasure(minutes, "min")}.`;
    },
    onTap: () => finishCardio(exercise)
  });
}

// One tape row per unit, and the finger moves with it: 44px of drag changes the value by one.
const ADJUST_STEP = 44;
let tape = null;

function openTape(counter, options, value) {
  tape = document.createElement("div");
  tape.className = "tape";
  // The counter keeps the accessibility label, and the tape is the drawing of the same number.
  tape.setAttribute("aria-hidden", "true");

  const column = document.createElement("div");
  column.className = "tape-column";
  column.append(...options.map((option) => {
    const row = document.createElement("span");
    row.className = option.done ? "tape-value done" : "tape-value";
    row.textContent = option.text;
    return row;
  }));

  tape.append(column);
  counter.classList.add("adjusting");
  counter.append(tape);
  moveTape(value, value);
}

function moveTape(continuous, chosen) {
  const column = tape?.firstElementChild;
  if (!column) return;
  column.style.setProperty("--shift", `${-continuous * ADJUST_STEP}px`);
  [...column.children].forEach((row, option) => row.classList.toggle("chosen", option === chosen));
}

function closeTape(counter) {
  counter.classList.remove("adjusting");
  tape?.remove();
  tape = null;
}

function openExerciseReset(exercise) {
  exerciseTarget = exercise;
  document.getElementById("exercise-body").textContent =
    `${exercise.name} volta para ${exercise.sets}x${exercise.reps}.`;
  exerciseDialog.returnValue = "";
  exerciseDialog.showModal();
}

exerciseDialog.addEventListener("close", () => {
  if (exerciseDialog.returnValue !== "reset") return;
  setRemaining(exerciseTarget, exerciseTarget.sets);
});

// The exercise menu: hold the card body. Fine adjustment of sets and load, one step per tap, and
// the reset. Cardio has no sets to adjust, and bodyweight has no load.
const exerciseMenu = document.getElementById("exercise-menu");
const setsAdjustment = document.getElementById("sets-adjustment");
const loadAdjustment = document.getElementById("load-adjustment");
const setsValue = document.getElementById("sets-value");
const menuLoadValue = document.getElementById("menu-load-value");
let menuTarget = null;

// Half a kilo is the smallest plate step; level and speed go one by one.
const loadStep = (exercise) => (unitOf(exercise) === "kg" ? 2.5 : 1);

function renderExerciseMenu() {
  const exercise = menuTarget;
  document.getElementById("exercise-menu-title").textContent = exercise.name;
  setsAdjustment.hidden = isCardio(exercise);
  loadAdjustment.hidden = isBodyweight(exercise);
  setsValue.textContent = `${exercise.sets - setsLeft(exercise)} de ${exercise.sets}`;
  const load = loadOf(exercise);
  menuLoadValue.textContent = load === undefined ? "sem carga" : asMeasure(load, unitOf(exercise));
}

function openExerciseMenu(exercise) {
  menuTarget = exercise;
  renderExerciseMenu();
  exerciseMenu.showModal();
  exerciseMenu.focus();
}

const changeSets = (step) => {
  setRemaining(menuTarget, Math.min(menuTarget.sets, Math.max(0, setsLeft(menuTarget) - step)));
  renderExerciseMenu();
};
document.getElementById("sets-plus").onclick = () => changeSets(1);
document.getElementById("sets-minus").onclick = () => changeSets(-1);

const changeLoad = (delta) => {
  const current = loadOf(menuTarget) ?? 0;
  const updated = Math.max(0, Math.round((current + delta * loadStep(menuTarget)) * 100) / 100);
  saveTyped(menuTarget, "load", updated);
  cardById.get(menuTarget.id)?.update();
  notice.textContent = `${menuTarget.name}: ${asMeasure(updated, unitOf(menuTarget))}.`;
  renderExerciseMenu();
};
document.getElementById("load-plus").onclick = () => changeLoad(1);
document.getElementById("load-minus").onclick = () => changeLoad(-1);

document.getElementById("exercise-menu-reset").onclick = () => {
  exerciseMenu.close();
  openExerciseReset(menuTarget);
};
document.getElementById("exercise-menu-close").onclick = () => exerciseMenu.close();

function openWorkoutMenu(workoutId) {
  workoutTarget = workoutId;
  document.getElementById("workout-title").textContent = `${workoutTitle(workoutId)}`;
  workoutDialog.returnValue = "";
  workoutDialog.showModal();
}

workoutDialog.addEventListener("close", async () => {
  const workoutId = workoutTarget;
  if (workoutDialog.returnValue === "finish") {
    await finish(workoutId);
    notice.textContent = `${workoutTitle(workoutId)} encerrado e gravado no histórico.`;
  }
  if (workoutDialog.returnValue === "reset") {
    await resetWorkoutProgress(workoutId);
    if (workoutId === activeWorkoutId) refresh();
    else {
      updateTabs();
      updateCycle();
    }
    notice.textContent = `Progresso do treino ${workoutId} resetado.`;
  }
});

// The empty frame also opens the viewer, not the camera directly: the video number lives here, and
// it has to be within reach precisely where there is no photo yet.
function openViewer(exercise) {
  viewerTarget = exercise;
  viewerTitle.textContent = exercise.name;
  buildMeta(exercise);
  note.value = exercise.note ?? "";
  // Cardio has no reps: the field disappears instead of sitting empty waiting for a number.
  repsField.value = exercise.reps ?? "";
  repsField.hidden = isCardio(exercise);
  repsFieldLabel.hidden = isCardio(exercise);
  renderViewer();
  viewer.showModal();
  // Without this the focus lands on the reps field, and the phone opens the keyboard just for opening the viewer.
  viewer.focus();
}

// Reps per set vary by exercise, and the gym's plan changes now and then. Saves only the field,
// over the exercise, like the note.
repsField.addEventListener("change", () => {
  const exercise = viewerTarget;
  const value = Number.parseInt(repsField.value, 10);
  if (!Number.isInteger(value) || value < 1 || value > 99) {
    repsField.value = exercise.reps ?? "";
    return;
  }
  exercise.reps = value;
  Store.saveReps(activeProfile, exercise.id, value);
  cardById.get(exercise.id)?.update();
  notice.textContent = `${exercise.name}: ${value} repetições por série.`;
});
repsField.addEventListener("keydown", (event) => {
  if (event.key === "Enter") repsField.blur();
});

// Reference information, not execution, which is why it lives in the viewer. Values become chips
// and the label is dimmed: whoever opened this came for the number, not the word.
const valueChip = (text) =>
  Object.assign(document.createElement("b"), { className: "value", textContent: text });

// `16/25` at the source means two stations where the same exercise can be done, so the screen
// writes "ou". Built by node, not innerHTML: this text comes from the editor.
function buildMeta(exercise) {
  const parts = [document.createTextNode("Aparelho ")];
  exercise.station.split("/").forEach((value, position) => {
    if (position) parts.push(document.createTextNode(" ou "));
    parts.push(valueChip(value.trim()));
  });
  parts.push(document.createTextNode(" · Vídeo "), valueChip(exercise.videoCode));
  if (exercise.accessory && ACCESSORIES[exercise.accessory]) {
    const chip = valueChip(accessoryName(exercise.accessory));
    chip.classList.add("value-accessory");
    chip.insertAdjacentHTML("afterbegin", accessorySvg(exercise.accessory));
    parts.push(document.createTextNode(" · "), chip);
  }
  viewerMeta.replaceChildren(...parts);
}

function renderViewer() {
  const exercise = viewerTarget;
  const current = photoOf(exercise, MACHINE_SLOT);

  // The photo is the button: tapping it shows the actions over the image itself, and the empty frame
  // does the same. A text button under everything was what crowded the viewer.
  viewerFrame.innerHTML = `<button type="button" class="touch-frame" aria-expanded="false" aria-label="${current ? "Ações da foto" : "Nenhuma foto ainda. Ações da foto"}">`
    + (current ? `<img src="${current}" alt="">` : `${ICON_CAMERA}<span>Nenhuma foto ainda</span>`)
    + "</button>"
    + `<div class="photo-actions" hidden>`
    + (current ? `<button type="button" class="icon" data-action="zoom" aria-label="Ampliar a foto">${ICON_ZOOM}</button>` : "")
    + `<button type="button" class="icon" data-action="camera" aria-label="Tirar foto">${ICON_CAMERA}</button>`
    + `<button type="button" class="icon" data-action="gallery" aria-label="Escolher da galeria">${ICON_GALLERY}</button>`
    + (current ? `<button type="button" class="icon" data-action="delete" aria-label="Apagar foto">${ICON_TRASH}</button>` : "")
    + "</div>";

  const tap = viewerFrame.querySelector(".touch-frame");
  const actions = viewerFrame.querySelector(".photo-actions");
  tap.onclick = () => {
    actions.hidden = !actions.hidden;
    tap.setAttribute("aria-expanded", String(!actions.hidden));
  };
  const byAction = {
    zoom: () => openFullscreen(exercise, MACHINE_SLOT),
    camera: () => pickPhoto(exercise, MACHINE_SLOT, cameraPicker),
    gallery: () => pickPhoto(exercise, MACHINE_SLOT, galleryPicker),
    delete: () => askDeletePhoto(exercise)
  };
  for (const button of actions.querySelectorAll(".icon")) button.onclick = byAction[button.dataset.action];

  const together = shared.get(exercise.videoCode) ?? [];
  viewerCircle.hidden = together.length === 0;
  viewerCircle.textContent = together
    .map((other) => `${other.name} faz ${other.kind === "time" ? "por tempo" : `${other.sets} × ${other.reps}`} no treino ${other.workout}.`)
    .join(" ");
}

const refreshViewer = (exercise) => {
  if (viewer.open && viewerTarget === exercise) renderViewer();
};

function openFullscreen(exercise, slot) {
  fullscreenTitle.textContent = exercise.name;
  zoomImg.src = photoOf(exercise, slot);
  resetZoom();
  fullscreen.showModal();
}

document.getElementById("fullscreen-close").onclick = () => fullscreen.close();

// Pinch, drag and double tap by hand, through pointer events. Native pinch will not do: it zooms
// the whole page, dialog included. The point under the fingers stays put: the translation is
// recomputed from where that point was on the image when the gesture started.
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_INTERVAL = 300;
let scale = 1;
let offset = { x: 0, y: 0 };
const pointers = new Map();
let gesture = null;
let lastTap = { at: 0, x: 0, y: 0 };

function resetZoom() {
  scale = 1;
  offset = { x: 0, y: 0 };
  pointers.clear();
  gesture = null;
  applyZoom();
}

function applyZoom() {
  // Zoomed in, the image may not leave an empty edge mid-screen; at scale 1 it stays centered.
  const area = zoom.getBoundingClientRect();
  const slackX = Math.max(0, (zoomImg.offsetWidth * scale - area.width) / 2);
  const slackY = Math.max(0, (zoomImg.offsetHeight * scale - area.height) / 2);
  offset.x = Math.min(slackX, Math.max(-slackX, offset.x));
  offset.y = Math.min(slackY, Math.max(-slackY, offset.y));
  zoomImg.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
}

const areaCenter = () => {
  const area = zoom.getBoundingClientRect();
  return { x: area.left + area.width / 2, y: area.top + area.height / 2 };
};

// Screen point to image point, at the current scale and offset.
function imagePoint(point) {
  const center = areaCenter();
  return { x: (point.x - center.x - offset.x) / scale, y: (point.y - center.y - offset.y) / scale };
}

// Picks the new scale and shifts so that `anchor` on the image stays under `point` on the screen.
function zoomAt(point, anchor, nextScale) {
  const center = areaCenter();
  scale = Math.min(MAX_SCALE, Math.max(1, nextScale));
  offset = { x: point.x - center.x - anchor.x * scale, y: point.y - center.y - anchor.y * scale };
  applyZoom();
}

const midpointOf = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distanceBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function startGesture() {
  const fingers = [...pointers.values()];
  if (fingers.length >= 2) {
    const middle = midpointOf(fingers[0], fingers[1]);
    gesture = { distance: distanceBetween(fingers[0], fingers[1]), scale, anchor: imagePoint(middle) };
  } else if (fingers.length === 1) {
    gesture = { origin: fingers[0], offset: { ...offset } };
  } else {
    gesture = null;
  }
}

zoom.addEventListener("pointerdown", (event) => {
  zoom.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  startGesture();
});

zoom.addEventListener("pointermove", (event) => {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const fingers = [...pointers.values()];
  if (fingers.length >= 2 && gesture?.distance) {
    const middle = midpointOf(fingers[0], fingers[1]);
    zoomAt(middle, gesture.anchor, gesture.scale * (distanceBetween(fingers[0], fingers[1]) / gesture.distance));
  } else if (fingers.length === 1 && gesture?.origin && scale > 1) {
    offset = {
      x: gesture.offset.x + fingers[0].x - gesture.origin.x,
      y: gesture.offset.y + fingers[0].y - gesture.origin.y
    };
    applyZoom();
  }
});

function release(event) {
  const finger = pointers.get(event.pointerId);
  pointers.delete(event.pointerId);

  // A tap is a finger that went down and up almost in the same place; a drag does not count.
  const now = Date.now();
  const wasTap = event.type === "pointerup" && finger && pointers.size === 0 && gesture?.origin
    && distanceBetween(finger, gesture.origin) < 10;
  if (wasTap && now - lastTap.at < DOUBLE_TAP_INTERVAL && distanceBetween(finger, lastTap) < 30) {
    zoomAt(finger, imagePoint(finger), scale > 1 ? 1 : DOUBLE_TAP_SCALE);
    lastTap = { at: 0, x: 0, y: 0 };
  } else if (wasTap) {
    lastTap = { at: now, ...finger };
  }

  // No pinch left and almost at natural size: snaps to 1, otherwise a leftover zoom that cannot be
  // seen only gets in the way of dragging.
  if (pointers.size === 0 && scale < 1.05) {
    scale = 1;
    offset = { x: 0, y: 0 };
    applyZoom();
  }
  startGesture();
}
zoom.addEventListener("pointerup", release);
zoom.addEventListener("pointercancel", release);

zoom.addEventListener("wheel", (event) => {
  event.preventDefault();
  const point = { x: event.clientX, y: event.clientY };
  zoomAt(point, imagePoint(point), scale * Math.exp(-event.deltaY * 0.002));
}, { passive: false });

document.getElementById("viewer-close").onclick = () => viewer.close();

function askDeletePhoto(exercise) {
  document.getElementById("delete-body").textContent = `A foto de ${exercise.name} sai deste aparelho.`;
  deleteDialog.returnValue = "";
  deleteDialog.showModal();
}

deleteDialog.addEventListener("close", () => {
  if (deleteDialog.returnValue !== "delete") return;
  const exercise = viewerTarget;
  const slot = MACHINE_SLOT;
  Store.deletePhoto(Store.photoKey(exercise), slot);
  const bySlot = photos.get(Store.photoKey(exercise)) ?? [];
  URL.revokeObjectURL(bySlot[slot]);
  delete bySlot[slot];
  cardById.get(exercise.id)?.update();
  refreshViewer(exercise);
  notice.textContent = `Foto de ${exercise.name} apagada.`;
});

// Saves on leaving the field. Enter finishes instead of breaking the line: a note is "banco 4,
// pino 7", not running text, and on the phone it is what closes the keyboard.
note.addEventListener("change", () => {
  const exercise = viewerTarget;
  const text = note.value.trim();
  exercise.note = text;
  Store.saveNote(activeProfile, exercise.id, text);
  notice.textContent = text
    ? `Observação de ${exercise.name} salva.`
    : `Observação de ${exercise.name} apagada.`;
});
note.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey) return;
  event.preventDefault();
  note.blur();
});

function pickPhoto(exercise, slot, picker) {
  picker.value = "";
  picker.onchange = async () => {
    const file = picker.files[0];
    if (!file) return;
    const shrunk = await shrink(file);
    Store.savePhoto(Store.photoKey(exercise), slot, shrunk);
    const bySlot = photos.get(Store.photoKey(exercise)) ?? [];
    if (bySlot[slot]) URL.revokeObjectURL(bySlot[slot]);
    bySlot[slot] = URL.createObjectURL(shrunk);
    photos.set(Store.photoKey(exercise), bySlot);
    cardById.get(exercise.id)?.update();
    refreshViewer(exercise);
    notice.textContent = `Foto de ${exercise.name} salva.`;
  };
  picker.click();
}

// A raw phone photo runs past several MB and blows the IndexedDB quota in a few machines.
async function shrink(file, side = 800) {
  const image = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, side / Math.max(image.width, image.height));
  const screen = document.createElement("canvas");
  screen.width = Math.round(image.width * scale);
  screen.height = Math.round(image.height * scale);
  screen.getContext("2d").drawImage(image, 0, 0, screen.width, screen.height);
  image.close();
  return new Promise((resolve) => screen.toBlob(resolve, "image/jpeg", 0.8));
}

document.getElementById("open-restart").onclick = () => {
  restartDialog.returnValue = "";
  restartDialog.showModal();
};

restartDialog.addEventListener("close", async () => {
  if (restartDialog.returnValue !== "restart") return;

  // The cycle cursor first. Resetting afterwards is what puts today's sessions inside the new cycle,
  // because the reset moves their startedAt to now.
  Store.startCycle(activeProfile);
  for (const workoutId of WORKOUT_IDS) await resetWorkoutProgress(workoutId);
  await loadWorkouts();
  goTo(WORKOUT_IDS[0], false);
  notice.textContent = `Ciclo de ${PROFILES[activeProfile]} recomeçado. Treino A liberado.`;
});

// The History view. Opens by exercise, not by day: the question asked standing at the machine is
// "how much did I pull last time", and that is what the first screen answers. The day stays in the
// data, inside each exercise's progression.
//
// Shows the whole workout, grouped as it is, including the exercise that never had a load. Finding
// your own workout cannot depend on typing its name: search is a shortcut, not a toll.
const historyPanel = document.getElementById("history");
const historySearch = document.getElementById("history-search");
const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");

let historyRows = [];

// Accent-insensitive search: whoever types "biceps" on the phone wants "Bíceps", and nobody stops
// the workout to reach the tilde.
const withoutAccents = (text) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

async function openHistory() {
  historyRows = await Store.history(activeProfile);
  historySearch.value = "";
  document.querySelector('input[name="history-view"][value="workout"]').checked = true;
  renderHistory();
  historyPanel.showModal();
  // As in the viewer: focus stays on the sheet, not on the first button, which would get an unasked ring.
  historyPanel.focus();
}

function filterHistory() {
  const query = withoutAccents(historySearch.value.trim());
  if (!query) return historyRows;
  return historyRows.filter(({ exercise: exercise }) =>
    withoutAccents(exercise.name).includes(query) || withoutAccents(labelsOf(exercise)).includes(query));
}

// Two views, one at a time: what is in the workout, grouped by workout, and what left it. An
// exercise that left still counts, because the weight was lifted and erasing that from the screen
// would make the history lie. It just stopped sharing the list with today's, on 2026-09-13.
const historyView = () => document.querySelector('input[name="history-view"]:checked').value;

function renderHistory() {
  const rows = filterHistory();
  const blocks = [];
  const outside = historyView() === "out";

  const title = (word) => Object.assign(document.createElement("h3"), {
    className: "history-workout",
    textContent: word
  });

  const visible = rows.filter(({ exercise: exercise }) => isOutOfWorkout(exercise) === outside);
  if (outside) {
    blocks.push(...visible.map(historyRow));
  } else {
    // One heading per workout, in the order the workouts exist. Without it a long run of exercises
    // becomes a wall, and finding today's needs the search again.
    for (const workoutId of WORKOUT_IDS) {
      const inWorkout = visible.filter(({ exercise: exercise }) => exercise.workout === workoutId);
      if (inWorkout.length === 0) continue;
      blocks.push(title(`${workoutTitle(workoutId)}`), ...inWorkout.map(historyRow));
    }
  }

  historyList.replaceChildren(...blocks);
  const query = historySearch.value.trim();
  historyEmpty.hidden = visible.length > 0;
  historyEmpty.textContent = visible.length > 0 ? ""
    : query ? `Nada encontrado para "${query}".`
      : outside ? "Nada saiu do treino até agora." : "Nada no treino ainda.";
}

document.getElementById("history-view").addEventListener("change", renderHistory);

// Archived is what the editor does instead of deleting. A workout id outside the row covers the
// other path: a workout that stopped existing took its exercises along.
const isOutOfWorkout = (exercise) => Boolean(exercise.archived) || !WORKOUT_IDS.includes(exercise.workout);

// With no load at all the exercise does not become a <details>: there is no progression to open,
// and a triangle that opens onto nothing promises what does not exist.
function historyRow({ exercise: exercise, loads: loads }) {
  // What the history tracks changes with the exercise: machine weight, and minutes for cardio, which
  // is where a runner's progression is.
  const field = isCardio(exercise) ? "minutes" : "load";
  const unit = isCardio(exercise) ? "min" : unitOf(exercise);
  const series = loads
    .filter((entry) => entry[field] != null)
    .map((entry) => ({ date: entry.date, value: entry[field] }));

  const block = document.createElement(series.length > 0 ? "details" : "div");
  block.className = "history-row";

  const summary = document.createElement(series.length > 0 ? "summary" : "div");
  summary.className = "history-summary";
  const name = Object.assign(document.createElement("span"), { className: "history-name", textContent: exercise.name });
  const muscles = Object.assign(document.createElement("span"), { className: "history-muscles", textContent: labelsOf(exercise) });
  const now = document.createElement("span");
  now.className = series.length > 0 ? "history-now" : "history-now history-none";
  if (series.length > 0) now.append(withUnit(series[0].value, unit));
  // Push-ups never had a load, and saying "sem carga" on them sounds like something is missing. What
  // is missing and what does not apply are different things, and the history may not confuse them.
  else if (isBodyweight(exercise)) now.textContent = "peso do corpo";
  else now.textContent = isCardio(exercise) ? "sem tempo" : "sem carga";

  summary.append(name, muscles, now);
  if (series.length > 0) {
    summary.append(trendOf(series, unit));
    block.append(summary, progressionOf(series, unit));
  } else {
    block.append(summary);
  }

  // Out of the workout, the row gets the way back. Inside it does not: removing belongs to edit mode,
  // and a remove button hidden in the history would be the worst possible door for that.
  if (isOutOfWorkout(exercise)) {
    block.classList.add("history-out");
    block.append(backToWorkout(exercise, series));
  }
  return block;
}

function backToWorkout(exercise, series) {
  const row = document.createElement("div");
  row.className = "history-actions";

  // When it left, and there is not always an answer: a workout that stopped existing took its
  // exercises along without anyone archiving. Then the last day it was done is closest to the truth.
  const leftOn = exercise.archivedAt
    ? `Saiu do treino em ${asDayMonth(asDate(exercise.archivedAt))}`
    : series[0] ? `Sem treino desde ${asDayMonth(series[0].date)}` : "Fora de todos os treinos";
  row.append(Object.assign(document.createElement("span"), { className: "history-left", textContent: leftOn }));

  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary";
  button.textContent = "Voltar ao treino";
  button.onclick = () => openWorkoutChoice(exercise, "restore");
  row.append(button);
  return row;
}

// Clock instant to local day, in the same format as the dates the store keeps.
function asDate(when) {
  const day = new Date(when);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}

let restoreTarget = null;
let chosenWorkoutId = WORKOUT_IDS[0];

// The same dialog picks the workout for two destinations: returning from the history and changing
// workout in the editor. What changes is the title and what happens on confirm.
let choiceMode = "restore";

function openWorkoutChoice(exercise, mode) {
  choiceMode = mode;
  document.getElementById("restore-title").textContent = mode === "move" ? "Mudar de treino" : "Voltar para o treino";
  document.getElementById("restore-confirm").textContent = mode === "move" ? "Mover" : "Voltar para o treino";
  openRestore(exercise, mode === "move"
    ? `${exercise.name} sai deste treino e entra no fim do escolhido, com o histórico que já tem.`
    : `${exercise.name} volta para a lista do dia, com o histórico que já tem.`);
}

function openRestore(exercise, body) {
  restoreTarget = exercise;
  chosenWorkoutId = WORKOUT_IDS.includes(exercise.workout) ? exercise.workout: WORKOUT_IDS[0];
  document.getElementById("restore-body").textContent = body;
  renderWorkoutChoice();
  const dialog = document.getElementById("restore-dialog");
  dialog.returnValue = "";
  dialog.showModal();
}

// A row of real radios, not buttons: picking one workout out of three is exactly what a radio group
// is, and keyboard arrows plus the "1 of 3" announcement come for free.
function renderWorkoutChoice() {
  document.getElementById("restore-workouts").replaceChildren(...WORKOUT_IDS.map((workoutId) => {
    const workoutIdLabel = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "restore-workout";
    radio.value = workoutId;
    radio.className = "visually-hidden";
    radio.checked = workoutId === chosenWorkoutId;
    radio.onchange = () => { chosenWorkoutId = workoutId; };
    workoutIdLabel.append(radio, `${workoutTitle(workoutId)}`);
    return workoutIdLabel;
  }));
}

document.getElementById("restore-dialog").addEventListener("close", async (event) => {
  if (event.target.returnValue !== "restore") return;
  const exercise = restoreTarget;
  if (choiceMode === "move") {
    await Store.moveExercise(exercise.id, chosenWorkoutId, activeProfile);
    await loadWorkouts();
    notice.textContent = `${exercise.name} agora está no ${workoutTitle(chosenWorkoutId)}.`;
    return;
  }
  await Store.restoreExercise(exercise.id, chosenWorkoutId, activeProfile);
  historyRows = await Store.history(activeProfile);
  renderHistory();
  await loadWorkouts();
  notice.textContent = `${exercise.name} voltou para o ${workoutTitle(chosenWorkoutId)}.`;
});

// Edit mode. Turned on from the logo menu, off with "Concluir". While it lasts, the footer swaps the
// profile picker for the edit bar, the active tab opens the workout options, and every card shows
// the up, down, move and remove toolbar. Every change saves at once and remounts the screen: there
// is no "save" at the end, as in the rest of the app.
let editing = false;
const editBar = document.getElementById("editing");
const workoutNameDialog = document.getElementById("workout-name-dialog");
const workoutNameField = document.getElementById("workout-name");
const editWorkoutDialog = document.getElementById("edit-workout-dialog");
const newExerciseDialog = document.getElementById("new-exercise-dialog");
let workoutBeingEdited = null;

function toggleEditing(on) {
  editing = on;
  document.body.classList.toggle("editing", on);
  editBar.hidden = !on;
  profiles.hidden = on || username !== "admin";
  notice.textContent = on ? "Modo de edição. Toque na aba ativa para mexer no treino." : "Edição concluída.";
}

document.getElementById("menu-edit").onclick = () => {
  menu.close();
  toggleEditing(true);
};
document.getElementById("editing-done").onclick = () => toggleEditing(false);

// One dialog for both a new name and a rename: what changes is the title and what to do on save.
let onSaveName = null;
function askName(title, current, save) {
  document.getElementById("workout-name-title").textContent = title;
  workoutNameField.value = current;
  onSaveName = save;
  workoutNameDialog.returnValue = "";
  workoutNameDialog.showModal();
  workoutNameField.select();
}
workoutNameDialog.addEventListener("close", async () => {
  if (workoutNameDialog.returnValue !== "save") return;
  const name = workoutNameField.value.trim();
  if (!name) return;
  await onSaveName(name);
});

document.getElementById("editing-workout").onclick = () => askName("Novo treino", "", async (name) => {
  const workout = await Store.createWorkout(activeProfile, name);
  await loadWorkouts();
  goTo(workout.id, false);
  notice.textContent = `${workoutTitle(workout.id)} criado.`;
});

function openEditWorkout(workoutId) {
  workoutBeingEdited = workoutId;
  document.getElementById("edit-workout-title").textContent = workoutTitle(workoutId);
  const position = WORKOUT_IDS.indexOf(workoutId);
  editWorkoutDialog.querySelector('[value="before"]').disabled = position === 0;
  editWorkoutDialog.querySelector('[value="after"]').disabled = position === WORKOUT_IDS.length - 1;
  // The last workout does not go: with none, the screen has nowhere to be.
  editWorkoutDialog.querySelector('[value="remove"]').disabled = WORKOUT_IDS.length === 1;
  editWorkoutDialog.returnValue = "";
  editWorkoutDialog.showModal();
}

editWorkoutDialog.addEventListener("close", async () => {
  const workoutId = workoutBeingEdited;
  const action = editWorkoutDialog.returnValue;
  if (action === "rename") {
    return askName("Renomear treino", workoutName(workoutId), async (name) => {
      await Store.renameWorkout(activeProfile, workoutId, name);
      await loadWorkouts();
      notice.textContent = `Treino renomeado para ${name}.`;
    });
  }
  if (action === "before" || action === "after") {
    const order = [...WORKOUT_IDS];
    const from = order.indexOf(workoutId);
    const to = action === "before" ? from - 1 : from + 1;
    [order[from], order[to]] = [order[to], order[from]];
    await Store.reorderWorkouts(activeProfile, order);
    await loadWorkouts();
    goTo(workoutId, false);
    notice.textContent = `${workoutTitle(workoutId)} agora é o ${to + 1}º.`;
  }
  if (action === "remove") {
    await Store.archiveWorkout(activeProfile, workoutId);
    await loadWorkouts();
    goTo(WORKOUT_IDS[0], false);
    notice.textContent = `${workoutTitle(workoutId)} saiu da fileira. Os dias dele continuam no histórico.`;
  }
});

async function shiftExercise(exercise, step) {
  const ids = (exercisesByWorkoutId.get(exercise.workout) ?? []).map((other) => other.id);
  const from = ids.indexOf(exercise.id);
  const to = from + step;
  if (to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  await Store.reorderExercises(activeProfile, ids);
  await loadWorkouts();
  notice.textContent = `${exercise.name} agora é o ${to + 1}º do treino.`;
}

// Removing asks for confirmation, like deleting a photo: it is reversible through the history, but
// a tap on the wrong icon mid-edit made the exercise vanish from the list without warning.
const removeDialog = document.getElementById("remove-dialog");
let removeTarget = null;

function removeExercise(exercise) {
  removeTarget = exercise;
  document.getElementById("remove-body").textContent =
    `${exercise.name} sai da lista de hoje. Continua no histórico, e volta por lá.`;
  removeDialog.returnValue = "";
  removeDialog.showModal();
}

removeDialog.addEventListener("close", async () => {
  if (removeDialog.returnValue !== "remove") return;
  await Store.archiveExercise(activeProfile, removeTarget.id);
  await loadWorkouts();
  notice.textContent = `${removeTarget.name} saiu do treino. Continua no histórico, e volta por lá.`;
});

// The new exercise form. Muscles come from the same map the screen uses to write them.
const newMuscles = document.getElementById("new-muscles");
newMuscles.append(...Object.entries(MUSCLE_NAME).map(([value, name]) => {
  const muscleLabel = document.createElement("label");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.name = "new-muscle";
  box.value = value;
  box.className = "visually-hidden";
  muscleLabel.append(box, name);
  return muscleLabel;
}));
// The attachment: "Nenhum" first and checked, then pulley ones and free ones, each with icon and
// name. Radio, because an exercise uses one attachment only.
const newAccessory = document.getElementById("new-accessory");
newAccessory.append(...[["", { name: "Nenhum" }], ...Object.entries(ACCESSORIES)].map(([key, accessory]) => {
  const accessoryLabel = document.createElement("label");
  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "new-accessory";
  radio.value = key;
  radio.className = "visually-hidden";
  radio.defaultChecked = key === "";
  accessoryLabel.innerHTML = accessorySvg(key);
  accessoryLabel.prepend(radio);
  accessoryLabel.append(accessory.name);
  return accessoryLabel;
}));
const chosenAccessory = () => newExerciseDialog.querySelector('input[name="new-accessory"]:checked')?.value ?? "";
const newKind = () => newExerciseDialog.querySelector('input[name="new-kind"]:checked').value;
for (const radio of newExerciseDialog.querySelectorAll('input[name="new-kind"]')) {
  radio.onchange = () => {
    const cardio = newKind() === "time";
    document.getElementById("new-unit").hidden = !cardio;
    document.getElementById("new-unit-label").hidden = !cardio;
  };
}

// While the name is typed, whatever already exists with a similar name shows below, and a tap
// fills the form with it: same machine, same video, and therefore the same photo. Without this an
// "Adbução na máquina" is born next to the "Abdução" that already had everything.
const newSimilarList = document.getElementById("new-similar");
const newNameField = document.getElementById("new-name");

const wordsOf = (text) => withoutAccents(text).split(/[^a-z0-9]+/).filter((word) => word.length >= 3);

// Edit distance, so "adbucao" finds "abducao": two swapped letters is a person typing, not another exercise.
function distance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

const wordsAlike = (a, b) =>
  a === b || (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a)))
  || (a.length >= 5 && b.length >= 5 && distance(a, b) <= 2);

// Everything known: every profile's plan plus the catalog of whoever is on screen, one per video
// code, because the code is what ties machine and photo.
function knownExercises() {
  const all = [...Object.values(PLAN_OF).flatMap((plan) => Object.values(plan).flat()), ...[...exercisesByWorkoutId.values()].flat()];
  const byKey = new Map();
  for (const exercise of all) if (!byKey.has(Store.photoKey(exercise))) byKey.set(Store.photoKey(exercise), exercise);
  return [...byKey.values()];
}

function similarTo(name) {
  const typedWords = wordsOf(name);
  if (typedWords.length === 0) return [];
  return knownExercises()
    .map((exercise) => ({ exercise: exercise, score: wordsOf(exercise.name).filter((word) => typedWords.some((another) => wordsAlike(word, another))).length }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ exercise: exercise }) => exercise);
}

function fillNewWith(exercise) {
  newNameField.value = exercise.name;
  document.getElementById("new-station").value = exercise.station ?? "";
  document.getElementById("new-video-code").value = exercise.videoCode || "";
  document.getElementById("new-sets").value = exercise.sets ?? 3;
  document.getElementById("new-reps").value = exercise.reps ?? "";
  const kind = newExerciseDialog.querySelector(`input[name="new-kind"][value="${exercise.kind ?? ""}"]`);
  kind.checked = true;
  kind.dispatchEvent(new Event("change"));
  document.getElementById("new-unit").value = exercise.unit ?? "";
  for (const box of newMuscles.querySelectorAll("input")) box.checked = (exercise.muscles ?? []).includes(box.value);
  const accessory = newAccessory.querySelector(`input[value="${exercise.accessory ?? ""}"]`) ?? newAccessory.querySelector('input[value=""]');
  accessory.checked = true;
  newSimilarList.hidden = true;
}

newNameField.addEventListener("input", () => {
  const similar = similarTo(newNameField.value);
  newSimilarList.replaceChildren(...similar.map((exercise) => {
    const button = document.createElement("button");
    button.type = "button";
    const detail = document.createElement("span");
    detail.textContent = [exercise.station ? `Aparelho ${exercise.station}` : "", exercise.videoCode ? `Vídeo ${exercise.videoCode}` : "", coverOf(exercise) ? "Com foto" : ""].filter(Boolean).join(" · ");
    button.append(exercise.name, detail);
    button.setAttribute("aria-label", `Usar ${exercise.name}, que já existe`);
    button.onclick = () => fillNewWith(exercise);
    return button;
  }));
  newSimilarList.hidden = similar.length === 0;
});

// The same form creates and edits: with a target it opens filled and saves over. Name, station and
// video of an existing exercise were what the editor lacked.
let editTarget = null;
const newTitle = document.getElementById("new-exercise-title");
const confirmNew = newExerciseDialog.querySelector('[value="create"]');

document.getElementById("editing-exercise").onclick = () => {
  editTarget = null;
  newExerciseDialog.querySelector("form").reset();
  document.getElementById("new-unit").hidden = true;
  document.getElementById("new-unit-label").hidden = true;
  newSimilarList.hidden = true;
  newTitle.textContent = "Novo exercício";
  confirmNew.textContent = "Adicionar";
  newExerciseDialog.returnValue = "";
  newExerciseDialog.showModal();
};

function openExerciseEdit(exercise) {
  editTarget = exercise;
  newExerciseDialog.querySelector("form").reset();
  fillNewWith(exercise);
  newTitle.textContent = "Editar exercício";
  confirmNew.textContent = "Salvar";
  newExerciseDialog.returnValue = "";
  newExerciseDialog.showModal();
}

newExerciseDialog.addEventListener("close", async () => {
  if (newExerciseDialog.returnValue !== "create") return;
  const value = (id) => document.getElementById(id).value.trim();
  const number = (id, fallback) => {
    const parsed = Number.parseInt(value(id), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  };
  const kind = newKind();
  const data = {
    name: value("new-name"),
    station: value("new-station") || "livre",
    equipment: "machine",
    sets: kind === "time" ? 1 : number("new-sets", 3),
    reps: kind === "time" ? null : number("new-reps", 12),
    videoCode: number("new-video-code", 0),
    muscles: [...newMuscles.querySelectorAll("input:checked")].map((box) => box.value),
    accessory: chosenAccessory() || null
  };
  if (kind) data.kind = kind;
  if (kind === "time") data.unit = value("new-unit") || "km/h";
  if (!data.name) return;
  if (editTarget) {
    // A kind that left (bodyweight became weight) has to vanish from the document, not just stop coming.
    if (!kind) data.kind = null;
    if (kind !== "time") data.unit = null;
    // The form has no equipment; what the plan says (dumbbells, cable) stays as is.
    delete data.equipment;
    await Store.editExercise(activeProfile, editTarget.id, data);
    await loadWorkouts();
    notice.textContent = `${data.name} salvo.`;
    return;
  }
  const exercise = await Store.createExercise(activeProfile, activeWorkoutId, data);
  await loadWorkouts();
  cardById.get(exercise.id)?.item.scrollIntoView({ block: "nearest" });
  notice.textContent = `${exercise.name} entrou no ${workoutTitle(activeWorkoutId)}.`;
});

function trendOf(series, unit) {
  const range = document.createElement("span");
  range.className = "history-trend";
  range.append(
    Object.assign(document.createElement("span"), { className: "trend-day", textContent: asDayMonth(series[0].date) }),
    series[1] ? badge(differenceBetween(series[0].value, series[1].value), unit) : neutralBadge("primeira")
  );
  return range;
}

const withSign = (value) => `${value > 0 ? "+" : ""}${String(value).replace(".", ",")}`;
const differenceBetween = (fresh, old) => Math.round((fresh - old) * 100) / 100;

// The bar is proportional to the exercise's range, not to zero: between 40 and 45 the difference
// vanishes if the bar starts from the floor, and that difference is exactly what matters.
function progressionOf(series, unit) {
  const highest = Math.max(...series.map(({ value }) => value));
  const lowest = Math.min(...series.map(({ value }) => value));
  const range = highest - lowest;
  const first = series[series.length - 1];
  const sinceStart = differenceBetween(series[0].value, first.value);

  const block = document.createElement("div");
  block.className = "progression-block";

  // Answers at once the two questions the row alone does not: since when you do this exercise, and
  // how much it moved in that time.
  const summary = Object.assign(document.createElement("p"), { className: "progression-summary" });
  summary.textContent = series.length === 1
    ? `Primeira vez em ${asDayMonth(first.date)}, com ${asMeasure(first.value, unit)}.`
    : `Desde ${asDayMonth(first.date)}, ${sinceStart === 0 ? "sem mudança" : `${withSign(sinceStart)} ${unit}`} em ${series.length} treinos.`;

  const list = document.createElement("ol");
  list.className = "progression";
  list.append(...series.map(({ date: date, value }, position) => {
    const item = document.createElement("li");
    const day = Object.assign(document.createElement("span"), { className: "progression-day", textContent: asDayMonth(date) });
    const bar = document.createElement("span");
    bar.className = "progression-bar";
    bar.setAttribute("aria-hidden", "true");
    bar.style.setProperty("--part", `${range === 0 ? 100 : 25 + ((value - lowest) / range) * 75}%`);
    const readout = Object.assign(document.createElement("span"), { className: "progression-load" });
    readout.append(withUnit(value, unit));

    // That day's step, against the previous workout. The oldest has nothing to compare to.
    // Here the badge becomes text with icon, no pill: ten stacked pills turn into confetti.
    const previous = series[position + 1];
    const step = Object.assign(document.createElement("span"), { className: "progression-step" });
    const difference = previous ? differenceBetween(value, previous.value) : null;

    if (difference === null) step.textContent = "primeira";
    else if (difference === 0) {
      step.innerHTML = ICON_FLAT;
      step.append(visuallyHidden("sem mudança"));
    } else {
      step.classList.add(difference > 0 ? "step-gain" : "step-drop");
      step.innerHTML = difference > 0 ? ICON_UP : ICON_DOWN;
      step.append(text(withSign(difference)));
    }

    item.append(day, bar, readout, step);
    return item;
  }));

  block.append(summary, list);
  return block;
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
// hint. A finger moving less than this is a tab tap, and a finger going down is nothing.
const DRAWER_PULL = 40;
const footer = document.querySelector("footer");
let pull = null;
footer.addEventListener("pointerdown", (event) => { pull = { y: event.clientY, opened: false }; });
footer.addEventListener("pointermove", (event) => {
  if (!pull || pull.opened || pull.y - event.clientY < DRAWER_PULL) return;
  pull.opened = true;
  openHistory();
});
// The finger that pulled releases over a tab, and the click born from that may not switch workout.
footer.addEventListener("click", (event) => {
  if (!pull?.opened) return;
  event.stopPropagation();
  event.preventDefault();
  pull = null;
}, { capture: true });
for (const name of ["pointerup", "pointercancel"]) {
  footer.addEventListener(name, () => { if (!pull?.opened) pull = null; });
}

// Circle: whoever shares the code sees the other's plan, read only. Only for those with their own
// branch: the visitor has nobody to share with, and the admin is a member of nothing, they already see all.
const circle = document.getElementById("circle");
const circleBody = document.getElementById("circle-body");
const circleJoin = document.getElementById("circle-join");
const circleCode = document.getElementById("circle-code");
const circleError = document.getElementById("circle-error");
const circleMembers = document.getElementById("circle-members");
const circleLeave = document.getElementById("circle-leave");
const plan = document.getElementById("plan");
const planTitle = document.getElementById("plan-title");
const planList = document.getElementById("plan-list");
const planEmpty = document.getElementById("plan-empty");

const hasCircle = () => Boolean(username) && username !== "admin";
const memberProfile = (uid) => `membro:${uid}`;

// Video code to who in the circle does the exercise, and how. The code is what matches the same
// machine across plans, as it already matches the photos.
const shared = new Map();

async function loadCircle() {
  shared.clear();
  if (!hasCircle()) return;
  const code = await Store.readCircle(activeProfile);
  if (code === null) return;
  const others = (await Store.readMembers(code)).filter((member) => member.uid !== ACCOUNTS[username]);
  for (const member of others) {
    const profile = memberProfile(member.uid);
    await Store.connectCloud(profile, member.uid);
    for (const workout of await Store.listWorkouts(profile)) {
      for (const exercise of await Store.listExercises(workout.id, profile)) {
        if (!(exercise.videoCode > 0)) continue;
        const list = shared.get(exercise.videoCode) ?? [];
        list.push({ name: member.name, workout: workout.name, sets: exercise.sets, reps: exercise.reps, kind: exercise.kind });
        shared.set(exercise.videoCode, list);
      }
    }
  }
}

// Joining, leaving or someone new in the circle changes the card badges: remount the list.
async function updateCircle() {
  await loadCircle();
  await loadWorkouts();
}

async function renderCircle() {
  await updateCircle();
  const code = await Store.readCircle(activeProfile);
  circleJoin.hidden = code !== null;
  circleLeave.hidden = code === null;
  circleMembers.hidden = code === null;
  circleError.hidden = true;
  if (code === null) {
    circleBody.textContent = "Quem entra com o mesmo código vê o treino dos outros, sem poder mexer.";
    return;
  }
  circleBody.textContent = `Código do convite: ${code}. Passe para quem treina com você.`;
  const others = (await Store.readMembers(code)).filter((member) => member.uid !== ACCOUNTS[username]);
  circleMembers.replaceChildren(...others.map((member) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";
    button.textContent = `Treino de ${member.name}`;
    button.onclick = () => openPlan(member);
    return button;
  }));
  if (others.length === 0) {
    circleMembers.append(Object.assign(document.createElement("p"), { className: "circle-empty", textContent: "Ninguém entrou ainda." }));
  }
}

document.getElementById("menu-circle").onclick = async () => {
  menu.close();
  circleCode.value = "";
  await renderCircle();
  circle.showModal();
  // As in the viewer: without this the focus lands on the code field and the phone opens the keyboard.
  circle.focus();
};

document.getElementById("circle-create").onclick = async () => {
  const code = await Store.createCircle(activeProfile, userDisplayName());
  await renderCircle();
  notice.textContent = `Círculo criado. Código ${code}.`;
};

circleJoin.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = circleCode.value.trim().toUpperCase();
  if (code.length !== 6) {
    circleError.textContent = "O código tem seis letras.";
    circleError.hidden = false;
    return;
  }
  await Store.joinCircle(activeProfile, code, userDisplayName());
  await renderCircle();
  notice.textContent = `Você entrou no círculo ${code}.`;
});

circleLeave.onclick = async () => {
  await Store.leaveCircle(activeProfile);
  await renderCircle();
  notice.textContent = "Você saiu do círculo.";
};
document.getElementById("circle-close").onclick = () => circle.close();
document.getElementById("plan-close").onclick = () => plan.close();

// The other's plan reuses the history rows: name, muscles and the "3 × 12" in place of the load.
// No <details>, no button: there is nothing to open or touch.
async function openPlan(member) {
  const profile = memberProfile(member.uid);
  await Store.connectCloud(profile, member.uid);
  const workouts = await Store.listWorkouts(profile);
  const blocks = [];
  for (const workout of workouts) {
    const exercises = await Store.listExercises(workout.id, profile);
    if (exercises.length === 0) continue;
    blocks.push(Object.assign(document.createElement("h3"), { className: "history-workout", textContent: `Treino ${workout.name}` }));
    blocks.push(...exercises.map(planRow));
  }
  planTitle.textContent = `Treino de ${member.name}`;
  planList.replaceChildren(...blocks);
  planEmpty.hidden = blocks.length > 0;
  circle.close();
  plan.showModal();
  plan.focus();
}

function planRow(exercise) {
  const row = document.createElement("div");
  row.className = "history-row";
  const summary = document.createElement("div");
  summary.className = "history-summary";
  const setsLabel = isCardio(exercise) ? "tempo" : `${exercise.sets} × ${exercise.reps}`;
  // Name and sets on the first line, muscles on the second: the history grid has two columns.
  summary.append(
    Object.assign(document.createElement("span"), { className: "history-name", textContent: exercise.name }),
    Object.assign(document.createElement("span"), { className: "history-now", textContent: setsLabel }),
    Object.assign(document.createElement("span"), { className: "history-muscles", textContent: labelsOf(exercise) })
  );
  row.append(summary);
  return row;
}

signInButton.onclick = () => {
  menu.close();
  login.querySelector("form").reset();
  loginError.hidden = true;
  login.showModal();
};
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

document.getElementById("history-close").onclick = () => historyPanel.close();
historySearch.addEventListener("input", renderHistory);

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

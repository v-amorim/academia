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

// Multiplication sign, not the letter x: it is what a native reads as "twelve times".
// The brand's dumbbell, same geometry as icone.svg in 24 units: "done" takes the two-line shape of
// "3 × 12 rep", with the icon where the number was. The text stays below, because an icon alone
// carries no meaning.
const ICON_DUMBBELL = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="11.05" width="12" height="1.9" rx="0.95"/><rect x="3.9" y="8.4" width="2.75" height="7.2" rx="1.2"/><rect x="17.35" y="8.4" width="2.75" height="7.2" rx="1.2"/><rect x="1.9" y="9.9" width="1.6" height="4.2" rx="0.8"/><rect x="20.5" y="9.9" width="1.6" height="4.2" rx="0.8"/></svg>`;

const counterLabel = (missing, reps) =>
  missing === 0
    ? `<span class="sets done">${ICON_DUMBBELL}</span><span class="reps"><span class="unit">Feito</span></span>`
    : `<span class="sets">${missing}<span class="times">×</span></span><span class="reps">${reps}<span class="unit">rep</span></span>`;

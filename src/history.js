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

// Dragging the drawer's top edge down closes it, the way pulling the footer up opened it. The sheet
// follows the finger; past the threshold it slides the rest of the way and closes, short of it it
// snaps back. Escape and tapping outside stay as the keyboard and mouse paths.
const DRAWER_DROP = 80;
function bindDrawer(panel) {
  const top = panel.querySelector(".history-top");
  let drop = null;
  top.addEventListener("pointerdown", (event) => {
    drop = { y: event.clientY, moved: 0 };
    panel.classList.add("dragging");
    try { top.setPointerCapture(event.pointerId); } catch { /* synthetic pointer */ }
  });
  top.addEventListener("pointermove", (event) => {
    if (!drop) return;
    drop.moved = Math.max(0, event.clientY - drop.y);
    panel.style.translate = `0 ${drop.moved}px`;
  });
  function release() {
    if (!drop) return;
    const far = drop.moved > DRAWER_DROP;
    drop = null;
    panel.classList.remove("dragging");
    if (!far) {
      panel.style.translate = "";
      return;
    }
    const finish = () => { panel.style.translate = ""; panel.close(); };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return finish();
    panel.style.translate = "0 100%";
    // transitionend can be missed when the tab is hidden; the timer is the safety net.
    const timer = setTimeout(finish, 400);
    panel.addEventListener("transitionend", () => { clearTimeout(timer); finish(); }, { once: true });
  }
  top.addEventListener("pointerup", release);
  top.addEventListener("pointercancel", release);
}
bindDrawer(historyPanel);
historySearch.addEventListener("input", renderHistory);

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
  editWorkoutDialog.focus();
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

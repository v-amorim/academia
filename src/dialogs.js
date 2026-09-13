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

// Cardio has no sets to adjust, and bodyweight has no load.
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

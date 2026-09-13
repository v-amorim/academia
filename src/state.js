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
const todayLoads = new Map();
const todayMinutes = new Map();
const loadHistory = new Map();
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

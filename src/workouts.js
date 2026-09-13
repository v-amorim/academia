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

    const { records } = await Store.readCurrentSession(activeProfile, workoutId);
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
  mainElement.removeAttribute("aria-busy");
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

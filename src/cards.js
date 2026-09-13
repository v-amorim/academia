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

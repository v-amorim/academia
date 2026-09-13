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

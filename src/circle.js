// Circle: whoever shares the code sees the other's plan, read only. The admin is a member of nothing,
// they already see all. The visitor gets the fixed example circle, Luna and Europa, so the feature
// shows without an account.
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

const hasCircle = () => username !== "admin";
const inExampleCircle = () => username === null;
const memberProfile = (uid) => `membro:${uid}`;

// The members other than whoever is on screen, each with the profile their plan is read from: a
// cloud branch for real members, the local profile for Europa.
async function otherMembers() {
  if (inExampleCircle()) {
    return EXAMPLE_CIRCLE.members.filter((member) => member.profile !== activeProfile);
  }
  const code = await Store.readCircle(activeProfile);
  if (code === null) return [];
  const members = (await Store.readMembers(code)).filter((member) => member.uid !== ACCOUNTS[username]);
  for (const member of members) {
    member.profile = memberProfile(member.uid);
    await Store.connectCloud(member.profile, member.uid);
  }
  return members;
}

// Video code to who in the circle does the exercise, and how. The code is what matches the same
// machine across plans, as it already matches the photos.
const shared = new Map();

async function loadCircle() {
  shared.clear();
  if (!hasCircle()) return;
  for (const member of await otherMembers()) {
    const { profile } = member;
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
  const code = inExampleCircle() ? EXAMPLE_CIRCLE.code : await Store.readCircle(activeProfile);
  circleJoin.hidden = code !== null;
  circleLeave.hidden = code === null || inExampleCircle();
  circleMembers.hidden = code === null;
  circleError.hidden = true;
  if (code === null) {
    circleBody.textContent = "Quem entra com o mesmo código vê o treino dos outros, sem poder mexer.";
    return;
  }
  circleBody.textContent = inExampleCircle()
    ? "Luna e Europa dividem o código SELENE: cada uma vê o treino da outra, sem poder mexer. Entre para ter o seu."
    : `Código do convite: ${code}. Passe para quem treina com você.`;
  const others = await otherMembers();
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
  const { profile } = member;
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

// Assertions that only run with the app mounted in a real browser. verify.mjs injects this file
// into the index.html served over HTTP and waits for the result to come back by fetch.
const Probe = (function () {
  const results = [];
  const check = (name, condition, detail = "") =>
    results.push({ passed: Boolean(condition), name, detail: String(detail) });

  const pause = (ms = 150) => new Promise((ready) => setTimeout(ready, ms));

  async function waitFor(condition, label, attempts = 40) {
    for (let i = 0; i < attempts; i++) {
      if (condition()) return true;
      await pause(100);
    }
    check(`esperou por ${label}`, false, "estourou o prazo");
    return false;
  }

  // How many workouts exist and what they are called comes from the seed. The suite accepts ABC,
  // ABCD or a single workout, and the app has to accept them too.
  //
  // The guard exists because the `prepareLoads` step runs on a page without the app: there is no
  // SUN_WORKOUTS there, and reading it directly would crash the whole file before `run` is called.
  const CATALOG = typeof SUN_WORKOUTS === "undefined" ? {} : SUN_WORKOUTS;
  const NAMES = Object.keys(CATALOG);
  const FIRST = NAMES[0];
  const SECOND = NAMES[1];
  const LAST = NAMES[NAMES.length - 1];
  const exerciseCount = () => NAMES.reduce((total, workoutId) => total + CATALOG[workoutId].length, 0);
  const IN_FIRST = CATALOG[FIRST]?.length ?? 0;
  // Each exercise's full label comes from the seed itself: not every workout is 3x12.
  const fullOf = (workoutId) => CATALOG[workoutId].map((exercise) => `${exercise.sets}×${exercise.reps}`);
  const firstFull = () => fullOf(FIRST)[0];
  const oneLess = () => `${CATALOG[FIRST][0].sets - 1}×${CATALOG[FIRST][0].reps}`;

  // All panels stay mounted at once, so "the cards" are those of the panel the carousel rests on,
  // not every card on the page.
  const activePanel = () => document.getElementById(`panel-${activeWorkoutId}`);
  const cards = () => [...(activePanel()?.querySelectorAll(".exercise") ?? [])];

  // The counter has the remaining number on top and the reps below, so the label is rebuilt from
  // both parts. That way the probe checks that both render, not only the button text.
  // The second line writes "12 rep" on screen; here it goes back to "3×12", which is how the plan
  // and the notice speak. In cardio the second line is only the unit, and comes out as is.
  function labelOf(item) {
    const counter = item.querySelector(".counter");
    const reps = counter.querySelector(".reps");
    if (!reps) return counter.textContent;
    const number = reps.textContent.replace(reps.querySelector(".unit")?.textContent ?? "", "");
    const unit = reps.querySelector(".unit")?.textContent ?? "";
    const series = counter.querySelector(".sets").textContent.replace("×", "");
    return number ? `${series}×${number}` : `${series}${unit}`;
  }

  const counters = () => cards().map(labelOf);
  const tabOf = (workoutId) => document.getElementById(`tab-${workoutId}`);
  const menu = () => document.getElementById("workout-dialog");
  const noticeSays = (snippet) => document.getElementById("notice").textContent.includes(snippet);

  // The logo opens the menu, and the history is one of its items.
  async function openViaMenu() {
    document.getElementById("open-menu").click();
    await pause(150);
    document.getElementById("menu-history").click();
  }

  async function tickDownTo(item, target) {
    while (labelOf(item) !== target) {
      item.querySelector(".counter").click();
      await pause(80);
    }
  }

  async function viaTab(workoutId, value) {
    tabOf(workoutId).click();
    // The second tap only opens the menu if the tab is already active, and switching tabs is now a
    // scroll that takes frames. Waiting for the state, not for a delay, is what removes the race.
    await waitFor(() => activeWorkoutId === workoutId, `a aba ${workoutId} ficar ativa`);
    tabOf(workoutId).click();
    await pause();
    menu().querySelector(`[value="${value}"]`).click();
    await pause(250);
  }

  async function behavior() {
    if (!(await waitFor(() => cards().length === IN_FIRST, "os cartões do primeiro treino"))) return;

    check("banco disponível por http", document.getElementById("no-store").hidden);
    check("o catálogo inteiro vem do seed",
      (await Promise.all(NAMES.map((l) => Store.listExercises(l, "sun"))))
        .reduce((total, list) => total + list.length, 0) === exerciseCount());
    check("a primeira aba nasce ativa", tabOf(FIRST).getAttribute("aria-selected") === "true");
    check("nenhuma aba concluída", !document.querySelector(".tab.completed"));
    check("treino e perfil ficam juntos no rodapé",
      Boolean(document.getElementById("tabs").closest("footer") && document.getElementById("profiles").closest("footer")));
    check("a marca fica no topo", Boolean(document.querySelector("header .logo")));
    // The panel scrolls, never the page: with the body growing along with the list, the vertical
    // gesture over the cards went nowhere on Android.
    check("a página não cresce com a lista", document.documentElement.scrollHeight <= innerHeight,
      `${document.documentElement.scrollHeight} > ${innerHeight}`);

    cards()[0].querySelector(".counter").click();
    await pause();
    check("um toque desce uma série", counters()[0] === oneLess(), counters()[0]);
    check("a série baixada é anunciada", noticeSays(oneLess()));

    await tickDownTo(cards()[0], "Feito");
    check("zerado mostra feito", counters()[0] === "Feito", counters()[0]);
    check("cartão zerado ganha a classe feito", cards()[0].classList.contains("done"));
    check("uma aba não conclui por um exercício", !tabOf(FIRST).classList.contains("completed"));

    for (const item of cards().slice(1)) await tickDownTo(item, "Feito");
    await pause(250);
    check("zerar o último encerra o treino", Boolean(tabOf(FIRST).classList.contains("completed")));
    check("o encerramento automático é anunciado", noticeSays("completo e gravado"),
      document.getElementById("notice").textContent);
    check(SECOND ? "o ciclo ainda não completou" : "com um treino só, concluí-lo fecha o ciclo",
      document.getElementById("cycle").hidden === Boolean(SECOND));

    const full = await Store.readTodaySession("sun", FIRST);
    check("sessão fica concluída no banco", full.session?.finishedAt > 0);
    check("todo exercício do treino fica gravado", full.records.size === IN_FIRST, full.records.size);
    check("a primeira letra entra nas concluídas", (await Store.finishedWorkouts("sun")).has(FIRST));

    // Only makes sense with two workouts or more. With one, there is nowhere to switch to.
    if (SECOND) {
      tabOf(SECOND).click();
      await pause(250);
      check("trocar de aba carrega o outro treino",
        cards()[0].querySelector(".name").textContent === CATALOG[SECOND][0].name);
      check("treino não começado nasce cheio", counters().join() === fullOf(SECOND).join(), counters().join());

      tabOf(FIRST).click();
      await pause(250);
      check("voltar para a primeira mantém o feito", counters().every((text) => text === "Feito"));
    }

    tabOf(FIRST).click();
    await pause();
    check("a aba ativa abre o menu", menu().open);
    check("o rótulo novo está no menu",
      menu().querySelector('[value="finish"]').textContent === "Encerrar treino aqui");
    check("o rótulo antigo morreu", !menu().querySelector('[value="feito"]'));
    menu().querySelector('[value="reset"]').click();
    await pause(250);

    check("reset volta ao total", counters().join() === fullOf(FIRST).join(), counters().join());
    check("reset tira o visto da aba", !tabOf(FIRST).classList.contains("completed"));
    check("reset não apaga registro", (await Store.readTodaySession("sun", FIRST)).records.size === IN_FIRST);

    // Partial workout: one exercise goes down, the rest is abandoned.
    cards()[0].querySelector(".counter").click();
    await pause();
    await viaTab(FIRST, "finish");
    check("encerrar marca a aba", Boolean(tabOf(FIRST).classList.contains("completed")));
    check("o encerramento manual é anunciado", noticeSays("encerrado e gravado"));
    check("encerrar não mexe no que está na tela", counters()[0] === oneLess(), counters()[0]);

    const partial = await Store.readTodaySession("sun", FIRST);
    const exercisesA = await Store.listExercises(FIRST, "sun");
    check("treino parcial grava o treino inteiro", partial.records.size === IN_FIRST, partial.records.size);
    check("o executado guarda o que sobrou",
      partial.records.get(exercisesA[0].id).remaining === CATALOG[FIRST][0].sets - 1);
    check("o pulado guarda o total",
      partial.records.get(exercisesA[1].id).remaining === CATALOG[FIRST][1].sets);

    for (const workoutId of NAMES.slice(1)) await viaTab(workoutId, "finish");
    check("todas as abas concluem",
      document.querySelectorAll(".tab.completed").length === NAMES.length,
      document.querySelectorAll(".tab.completed").length);
    check("o ciclo completo aparece", !document.getElementById("cycle").hidden);

    document.getElementById("open-restart").click();
    await pause();
    const restart = document.getElementById("restart-dialog");
    check("o diálogo de recomeçar abre", restart.open);
    restart.querySelector('[value="restart"]').click();
    await pause(400);

    check("recomeçar limpa os vistos", document.querySelectorAll(".tab.completed").length === 0);
    check("recomeçar esconde a seção do ciclo", document.getElementById("cycle").hidden);
    check("recomeçar volta para a primeira", tabOf(FIRST).getAttribute("aria-selected") === "true");
    check("recomeçar zera os contadores", counters().join() === fullOf(FIRST).join(), counters().join());
    check("recomeçar é anunciado", noticeSays("recomeçado"));
    check("recomeçar não apaga sessão", (await Store.readTodaySession("sun", FIRST)).records.size === IN_FIRST);
    check("nada fica concluído depois do recomeço", (await Store.finishedWorkouts("sun")).size === 0);

    cards()[0].querySelector(".counter").click();
    await pause();
    document.querySelector('input[value="shine"]').click();
    await pause(300);
    check("o outro perfil nasce cheio", counters().join() === fullOf(FIRST).join(), counters().join());
    check("a troca de perfil é anunciada", noticeSays("Shine"));
    document.querySelector('input[value="sun"]').click();
    await pause(300);
    check("cada perfil volta com o próprio progresso", counters()[0] === oneLess(), counters()[0]);

    const database = await new Promise((ready) => {
      const request = indexedDB.open("academia");
      request.onsuccess = () => {
        const info = { version: request.result.version, stores: [...request.result.objectStoreNames] };
        request.result.close();
        ready(info);
      };
    });
    check("banco na versão 9", database.version === 9, database.version);
    check("o depósito estado morreu", !database.stores.includes("estado"), database.stores.join(","));

    // Finishing again on the same day, after restarting the cycle. The tab's check comes from memory
    // and would show anyway; what exposes a session outside the cycle is the store.
    for (const item of cards()) await tickDownTo(item, "Feito");
    await pause(300);
    check("concluída de novo aparece na tela", Boolean(tabOf(FIRST).classList.contains("completed")));
    check("concluída de novo entra no ciclo corrente",
      (await Store.finishedWorkouts("sun")).has(FIRST));

    // Reps per set change in the viewer, and the card and the store follow.
    // A done card does not show the ×12, so the target is one that still has sets ahead.
    const repsTarget = cards().find((item) => !item.classList.contains("done")) ?? cards()[0];
    if (repsTarget.classList.contains("done")) {
      repsTarget.querySelector(".counter").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
      await pause();
    }
    const targetName = repsTarget.querySelector(".name").textContent;
    const repsInStore = async () => (await Store.listExercises(FIRST, "sun")).find((exercise) => exercise.name === targetName).reps;
    const repsDaFicha = CATALOG[FIRST].find((exercise) => exercise.name === targetName).reps;
    repsTarget.querySelector(".photo").click();
    await pause();
    const repsInput = document.getElementById("reps-field");
    check("o visor mostra as repetições do exercício", repsInput.value === String(repsDaFicha), repsInput.value);
    repsInput.value = "10";
    repsInput.dispatchEvent(new Event("change", { bubbles: true }));
    await pause();
    check("mudar as repetições atualiza o cartão", labelOf(repsTarget).endsWith("×10"), labelOf(repsTarget));
    check("as repetições novas vão para o banco", (await repsInStore()) === 10, await repsInStore());
    repsInput.value = "abc";
    repsInput.dispatchEvent(new Event("change", { bubbles: true }));
    await pause();
    check("repetição inválida não grava", repsInput.value === "10" && (await repsInStore()) === 10, repsInput.value);
    document.getElementById("viewer-close").click();
    await pause();

    await installation();
  }

  // What makes the app open without signal at the gym. Cutting the network from inside the page is
  // not possible, so this checks what is left: the active worker and the cached files. The real
  // offline test is manual, through DevTools or the phone.
  async function installation() {
    const activeOne = await Promise.race([
      navigator.serviceWorker?.ready.then(() => true),
      pause(8000).then(() => false)
    ]);
    check("o service worker ativa", activeOne === true);
    if (!activeOne) return;

    const names = await caches.keys();
    check("existe um cache só, com a versão no nome", names.length === 1 && names[0].startsWith("academia-"),
      names.join(","));

    const cache = await caches.open(names[0]);
    const cached = (await cache.keys()).map((request) => new URL(request.url).pathname);
    const missing = ["/index.html", "/styles.css", "/app.js", "/store.js", "/plans.js", "/mulish.woff2", "/manifest.json"]
      .filter((file) => !cached.includes(file));
    check("o cache guarda o app inteiro, fonte e manifest", missing.length === 0, missing.join(","));

    const manifest = await (await fetch("manifest.json")).json();
    check("o manifest declara nome, escopo e tela cheia",
      manifest.name === "Sunshine" && manifest.display === "standalone" && manifest.start_url === ".");
    check("o manifest traz ícone comum e mascarável",
      manifest.icons.some((icon) => icon.purpose === "any" && icon.sizes === "512x512")
        && manifest.icons.some((icon) => icon.purpose === "maskable"));
  }

  async function keyboard() {
    if (!(await waitFor(() => cards().length === IN_FIRST, "os cartões do primeiro treino"))) return;
    const pressKey = (target, key) =>
      target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

    tabOf(FIRST).focus();

    // Moving between tabs needs somewhere to go. With a single workout the row does not even show.
    if (SECOND) {
      check("só a aba ativa é tabulável", tabOf(FIRST).tabIndex === 0 && tabOf(SECOND).tabIndex === -1);

      pressKey(tabOf(FIRST), "ArrowRight");
      await pause(250);
      check("seta direita seleciona a próxima", tabOf(SECOND).getAttribute("aria-selected") === "true");
      check("seta direita leva o foco junto", document.activeElement === tabOf(SECOND));
      check("o painel aponta para a aba certa",
        activePanel().getAttribute("aria-labelledby") === `tab-${SECOND}`);

      pressKey(tabOf(SECOND), "End");
      await pause(250);
      check("End vai para a última", tabOf(LAST).getAttribute("aria-selected") === "true" && document.activeElement === tabOf(LAST));
      pressKey(tabOf(LAST), "Home");
      await pause(250);
      check("Home volta para a primeira", tabOf(FIRST).getAttribute("aria-selected") === "true" && document.activeElement === tabOf(FIRST));

      // The swipe belongs to the browser now: a track with one panel per workout and scroll snap. What
      // is checked here is what the app does with the result, not the physics, which is no longer ours.
      const carousel = document.getElementById("carousel");
      const panelOf = (workoutId) => document.getElementById(`panel-${workoutId}`);
      const scrollUntil = async (workoutId) => {
        carousel.scrollLeft = panelOf(workoutId).offsetLeft;
        carousel.dispatchEvent(new Event("scroll"));
        await pause(300);
      };

      check("existe um painel por treino",
        document.querySelectorAll(".panel").length === NAMES.length,
        document.querySelectorAll(".panel").length);
      check("os painéis ficam todos montados ao mesmo tempo",
        Boolean(panelOf(SECOND)?.querySelector(".exercise")));
      check("o trilho encaixa em cada painel",
        getComputedStyle(carousel).scrollSnapType.includes("mandatory"),
        getComputedStyle(carousel).scrollSnapType);
      check("um lance rápido anda um treino só, e não atravessa a fileira",
        getComputedStyle(panelOf(FIRST)).scrollSnapStop === "always");

      await scrollUntil(SECOND);
      check("parar no painel seguinte troca o treino ativo", activeWorkoutId === SECOND, activeWorkoutId);
      check("a aba acompanha o painel", tabOf(SECOND).getAttribute("aria-selected") === "true");

      await scrollUntil(FIRST);
      check("voltar ao painel anterior devolve o treino", activeWorkoutId === FIRST, activeWorkoutId);

      // The pill is positioned by the scroll, in panel fractions: that is what makes it follow the
      // finger mid-gesture. The midway fraction cannot be simulated from here, because mandatory snap
      // pulls any hand-written scrollLeft back to the snap point. What is checked is the wiring, which
      // is what can break without anyone seeing.
      const pill = () => Number(document.getElementById("tabs").style.getPropertyValue("--active"));
      await scrollUntil(SECOND);
      check("a pílula segue a rolagem", pill() === 1, pill());
      await scrollUntil(FIRST);
      check("a pílula volta com ela", pill() === 0, pill());

    } else {
      check("com um treino só, a fileira de abas some da tela",
        document.getElementById("tabs").offsetParent === null);
    }

    const counter = cards()[0].querySelector(".counter");
    counter.focus();
    pressKey(counter, "ArrowDown");
    await pause();
    check("seta baixo desce uma série", counters()[0] === oneLess(), counters()[0]);
    pressKey(counter, "ArrowUp");
    await pause();
    check("seta cima sobe uma série", counters()[0] === firstFull(), counters()[0]);
    pressKey(counter, "ArrowUp");
    await pause();
    check("o contador não passa do total", counters()[0] === firstFull(), counters()[0]);

    // Through the real gesture: hold, drag, release. It is the only test that goes through the long press.
    const target = cards()[0].querySelector(".counter");
    const PASSO = 44;
    const tape = () => target.querySelector(".tape");
    const chosen = () => tape()?.querySelector(".chosen")?.textContent;

    const hold = (y = 300) => target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: y }));
    const drag = (y) => target.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientY: y }));
    // The click the browser fires after the gesture is simulated too, otherwise the guard that
    // swallows it would never be exercised.
    const release = (y) => {
      target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: y }));
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    };

    hold();
    await pause(600);
    check("segurar o contador abre a fita de ajuste", Boolean(tape()));
    check("a fita traz uma linha por valor", tape().firstElementChild.children.length === 4,
      tape().firstElementChild.children.length);
    check("as linhas vão de feito até o total",
      [...tape().firstElementChild.children].map((l) => l.textContent).join(",") === "Feito,1,2,3");
    check("a fita nasce no valor de agora", chosen() === "3", chosen());
    check("a fita fica em cima do contador, e não no meio da tela",
      Math.abs(tape().getBoundingClientRect().left - target.getBoundingClientRect().left) < 2);

    // Dragging down decreases: the column follows the finger, and the smaller values are above.
    drag(300 + PASSO);
    await pause(50);
    check("arrastar para baixo baixa o valor", chosen() === "2", chosen());
    check("o contador só muda ao soltar", counters()[0] === firstFull(), counters()[0]);
    drag(300 + 2 * PASSO);
    await pause(50);
    check("arrastar mais baixa mais", chosen() === "1", chosen());
    drag(300 + PASSO);
    await pause(50);
    check("voltar para cima sobe o valor", chosen() === "2", chosen());
    drag(300 - 5 * PASSO);
    await pause(50);
    check("a fita não passa do total", chosen() === "3", chosen());
    drag(300 + 9 * PASSO);
    await pause(50);
    check("a fita para em feito", chosen() === "Feito", chosen());

    drag(300 + 2 * PASSO);
    release(300 + 2 * PASSO);
    await pause(250);
    check("soltar fecha a fita", !tape());
    // The click the browser generates after the gesture comes out in release(): if the guard failed,
    // the value here would be one set less.
    check("soltar grava o valor, e o clique do gesto é engolido", counters()[0] === `1×${CATALOG[FIRST][0].reps}`, counters()[0]);

    // A finger moving before 400ms is a list scroll, and may not become an adjustment.
    hold(300);
    drag(340);
    await pause(600);
    check("mover antes do tempo não abre a fita", !tape());
    release(340);
    await pause(250);

    tabOf(FIRST).click();
    await pause();
    tabOf(FIRST).click();
    await pause(250);
    check("o menu do treino abre", menu().open);
    // A click at 0,0 lands outside the box of any centered dialog.
    menu().dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 0, clientY: 0 }));
    await pause(250);
    check("tocar fora fecha o menu do treino", !menu().open);
    check("fechar o menu não encerra nem reseta", !tabOf(FIRST).classList.contains("completed"));

    // Since 2026-09-13 the card body ticks a set, like the counter, and the viewer opens only through
    // the photo. The card arrives here done from the tests above: one arrow raises a set so there is
    // something to tick.
    if (!counters()[0].includes("×")) {
      cards()[0].querySelector(".counter").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
      await pause();
    }
    const beforeTap = counters()[0];
    cards()[0].querySelector(".description").click();
    await pause();
    check("o meio do cartão baixa uma série", counters()[0] !== beforeTap && !document.getElementById("viewer").open, counters()[0]);
    cards()[0].querySelector(".photo").click();
    await pause();
    const details = document.getElementById("viewer");
    check("a foto abre o visor", details.open);
    check("o aparelho aparece no visor e não no cartão",
      document.getElementById("viewer-meta").textContent.includes(`Aparelho ${CATALOG[FIRST][0].station}`)
        && !cards()[0].querySelector(".description").textContent.includes(String(CATALOG[FIRST][0].station)));

    // Photo actions live over the photo and only show on tapping it: the viewer without a photo has
    // only close as a text button.
    const photoActions = () => details.querySelector(".photo-actions");
    check("as ações da foto nascem escondidas", photoActions().hidden && getComputedStyle(photoActions()).display === "none");
    check("só o fechar sobra como botão de texto no visor", [...details.querySelectorAll("button.secondary, button.primary")].map((b) => b.textContent).join() === "Fechar");
    details.querySelector(".touch-frame").click();
    await pause();
    check("tocar no quadro mostra câmera e galeria, e sem foto nem ampliar nem apagar",
      !photoActions().hidden && [...photoActions().querySelectorAll(".icon")].map((b) => b.dataset.action).join() === "camera,gallery",
      [...photoActions().querySelectorAll(".icon")].map((b) => b.dataset.action).join());
    check("cada ícone tem nome para o leitor de tela", [...photoActions().querySelectorAll(".icon")].every((b) => b.getAttribute("aria-label")));
    details.querySelector(".touch-frame").click();
    await pause();
    check("tocar de novo esconde as ações", photoActions().hidden);

    details.close();
    await pause();

    // The exercise menu: hold the body, or the contextmenu event, which is the mouse and keyboard path.
    // Adjusts sets and load one step per tap, and is where the reset lives now.
    const exerciseMenuDialog = document.getElementById("exercise-menu");
    // One set of slack, so the menu's "plus" has somewhere to go.
    cards()[0].querySelector(".counter").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await pause();
    cards()[0].querySelector(".description").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    await pause();
    check("o menu de contexto abre o menu do exercício", exerciseMenuDialog.open);
    const doneWorkouts = () => document.getElementById("sets-value").textContent;
    const menuLoad = () => document.getElementById("menu-load-value").textContent;
    const total = CATALOG[FIRST][0].sets;
    const doneOnCard = () => (counters()[0].includes("×") ? total - Number(counters()[0].split("×")[0]) : total);
    const doneBefore = doneOnCard();
    check("o menu diz quantas séries foram feitas", doneWorkouts() === `${doneBefore} de ${total}`, `${doneWorkouts()} / ${counters()[0]}`);
    document.getElementById("sets-plus").click();
    await pause();
    check("mais uma série no menu baixa o contador", doneWorkouts() === `${doneBefore + 1} de ${total}` && doneOnCard() === doneBefore + 1, `${doneWorkouts()} ${counters()[0]}`);
    document.getElementById("sets-minus").click();
    await pause();
    check("uma série a menos volta o contador", doneWorkouts() === `${doneBefore} de ${total}` && doneOnCard() === doneBefore, doneWorkouts());
    const loadBefore = menuLoad();
    document.getElementById("load-plus").click();
    await pause();
    check("mais carga anda meio degrau de anilha e grava no chip", menuLoad() !== loadBefore
      && cards()[0].querySelector(".load-value").textContent.replace(/\s/g, "") === menuLoad().replace(/\s/g, ""), `${loadBefore} -> ${menuLoad()} / ${cards()[0].querySelector(".load-value").textContent}`);
    document.getElementById("load-minus").click();
    await pause();
    // With no load at all, the step back stops at zero, not at "sem carga": zero is a stored number.
    check("menos carga desfaz o passo", menuLoad() === (loadBefore === "sem carga" ? "0 kg" : loadBefore), menuLoad());

    document.getElementById("exercise-menu-reset").click();
    await pause();
    const dialog = document.getElementById("exercise-dialog");
    check("o reset tem caminho sem toque longo, pelo menu do exercício", dialog.open && !exerciseMenuDialog.open);
    dialog.querySelector('[value="reset"]').click();
    await pause(250);
    check("resetar pelo menu volta ao total", counters()[0] === firstFull(), counters()[0]);

    const middle = cards()[0].querySelector(".description");
    middle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await pause(600);
    middle.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    middle.click();
    await pause(250);
    check("o toque longo no meio abre o menu do exercício, e o clique que vem junto não baixa série",
      exerciseMenuDialog.open && !details.open && counters()[0] === firstFull(), counters()[0]);
    exerciseMenuDialog.close();
    await pause();

    // The accessible name comes from aria-label, the text, or the label wrapping the control.
    const nameless = [...document.querySelectorAll("button, input, [tabindex]")]
      .filter((element) => !element.closest("dialog") && !element.hidden && element.tabIndex !== -1)
      .filter((element) => !element.getAttribute("aria-label")
        && !element.textContent.trim()
        && !element.closest("label")?.textContent.trim());
    check("todo controle alcançável tem nome acessível", nameless.length === 0,
      nameless.map((element) => element.id || element.tagName).join(","));
  }

  // Two workouts from past days, so the load has somewhere to inherit from and something to compare
  // to. Writes straight into the fake Firestore, in Sun's branch, with the document ids store.js
  // builds: it is the only way for a past to exist before the app opens, and the format is covered
  // by the Cloud case assertions.
  const daysAgo = (howMany) => {
    const day = new Date();
    day.setDate(day.getDate() - howMany);
    const twoDigits = (number) => String(number).padStart(2, "0");
    return `${day.getFullYear()}-${twoDigits(day.getMonth() + 1)}-${twoDigits(day.getDate())}`;
  };

  const THREE_DAYS_AGO = daysAgo(3);
  const LAST_WEEK = daysAgo(7);
  const asDayMonth = (date) => `${date.slice(8)}/${date.slice(5, 7)}`;

  async function prepareLoads() {
    const database = firebase.firestore();
    const branch = `profiles/${ACCOUNTS.sun}`;
    const first = CATALOG[FIRST][0].id;
    const second = CATALOG[FIRST][1].id;

    // The cycle starts now, otherwise last week's workouts count as finished in the current cycle and
    // the app opens on the next workout instead of the first.
    await database.collection(`${branch}/cycle`).doc("atual").set({ startedAt: Date.now() });

    for (const [date, load] of [[LAST_WEEK, 40], [THREE_DAYS_AGO, 45]]) {
      const session = `${date}_${FIRST}`;
      await database.collection(`${branch}/sessions`).doc(session)
        .set({ profile: "sun", workout: FIRST, date, startedAt: 1, finishedAt: 2 });
      await database.collection(`${branch}/records`).doc(`${session}:${first}`)
        .set({ exerciseId: first, remaining: 0, load: load, updatedAt: 2 });
      // The second exercise went both days without a load: it proves the card without history keeps
      // inviting instead of inheriting from its neighbor.
      await database.collection(`${branch}/records`).doc(`${session}:${second}`)
        .set({ exerciseId: second, remaining: 0, updatedAt: 2 });
    }
    check("dois treinos passados preparados", firebase.docs.size === 7, firebase.docs.size);
  }

  // What both phones and IndexedDB stored before version 9, in Portuguese. The next page opens the
  // app on top of this and the `migration` step checks that everything came back translated.
  const LEGACY = {
    exercise: {
      "id": SUN_WORKOUTS[FIRST][0].id, "nome": "Puxada frontal aberta no cabo", "aparelho": "4", "equipamento": "cabo",
      "series": 3, "reps": 12, "cod": 541, "grupos": ["costas"], "letra": FIRST, "ordem": 0, "perfis": ["sun"],
      "observacao": "antiga", "acessorio": "barra-curva-longa"
    },
    cardio: {
      "id": SUN_WORKOUTS[FIRST][1].id, "nome": "Esteira", "tipo": "tempo", "unidade": "km/h", "series": 1, "reps": null,
      "aparelho": "livre", "equipamento": "livre", "cod": 0, "grupos": ["quadriceps", "panturrilha"], "letra": FIRST, "ordem": 1, "perfis": ["sun"]
    },
    code: "ABCDEF"
  };
  const LOCAL_EXAMPLE = {
    "id": EXAMPLE_WORKOUTS[Object.keys(EXAMPLE_WORKOUTS)[0]][0].id, "nome": "Puxada frontal no cabo", "aparelho": "4", "series": 3,
    "reps": 12, "cod": 541, "grupos": ["costas"], "acessorio": "barra-curva-longa", "letra": Object.keys(EXAMPLE_WORKOUTS)[0],
    "ordem": 0, "perfis": ["example"], "observacao": "local antiga"
  };

  async function prepareMigration() {
    const database = firebase.firestore();
    const branch = `perfis/${ACCOUNTS.sun}`;
    const session = `2026-01-05_${FIRST}`;
    await database.collection(`${branch}/exercicios`).doc(LEGACY.exercise.id).set(LEGACY.exercise);
    await database.collection(`${branch}/exercicios`).doc(LEGACY.cardio.id).set(LEGACY.cardio);
    await database.collection(`${branch}/treinos`).doc(FIRST).set({ "id": FIRST, "nome": "Pernas", "ordem": 0 });
    await database.collection(`${branch}/sessoes`).doc(session).set({ "perfil": "sun", "letra": FIRST, "data": "2026-01-05", "iniciadoEm": 1, "concluidoEm": 2 });
    await database.collection(`${branch}/registros`).doc(`${session}:${LEGACY.exercise.id}`).set({ "exId": LEGACY.exercise.id, "restantes": 0, "carga": 40, "minutos": 10, "atualizadoEm": 2 });
    await database.collection(`${branch}/ciclo`).doc("atual").set({ "iniciadoEm": 1 });
    await database.collection(`${branch}/circulo`).doc("atual").set({ "codigo": LEGACY.code });
    await database.collection(`circulos/${LEGACY.code}/membros`).doc(ACCOUNTS.sun).set({ "nome": "Sun", "entrouEm": 1 });
    await database.collection("fotos").doc("cod-541:0").set({ "dados": "Zm90bw==", "tipo": "image/jpeg", "atualizadoEm": 1 });
    check("a nuvem antiga está preparada", firebase.docs.size === 9, firebase.docs.size);

    const wrote = await new Promise((ready) => {
      const request = indexedDB.open("academia", 8);
      request.onupgradeneeded = () => {
        for (const name of ["treinos", "exercicios", "sessoes", "registros", "ciclo", "circulo", "fotos"]) request.result.createObjectStore(name);
      };
      request.onsuccess = () => {
        const transaction = request.result.transaction(["exercicios", "fotos"], "readwrite");
        transaction.objectStore("exercicios").put(LOCAL_EXAMPLE, LOCAL_EXAMPLE.id);
        transaction.objectStore("fotos").put(new Blob(["foto"], { type: "image/jpeg" }), "cod-541:0");
        transaction.oncomplete = () => { request.result.close(); ready(true); };
        transaction.onerror = () => ready(false);
      };
      request.onerror = () => ready(false);
    });
    check("o banco local antigo está preparado", wrote);
  }

  async function migration() {
    if (!(await waitFor(() => cards().length > 0, "os cartões do exemplo"))) return;
    const exampleWorkoutId = Object.keys(EXAMPLE_WORKOUTS)[0];

    const localInfo = await new Promise((ready) => {
      const request = indexedDB.open("academia");
      request.onsuccess = () => {
        const info = { version: request.result.version, stores: [...request.result.objectStoreNames] };
        request.result.close();
        ready(info);
      };
    });
    check("o banco local subiu para a versão 9 só com depósitos novos", localInfo.version === 9
      && !localInfo.stores.includes("exercicios") && localInfo.stores.includes("exercises"), localInfo.stores.join(","));
    const ofExample = (await Store.listExercises(exampleWorkoutId, "example")).find((e) => e.id === LOCAL_EXAMPLE.id);
    check("o exercício local voltou traduzido, com a edição antiga preservada",
      ofExample?.name === "Puxada frontal no cabo" && ofExample.sets === 3 && ofExample.videoCode === 541
      && ofExample.muscles.join() === "back" && ofExample.accessory === "long-curved-bar" && ofExample.note === "local antiga"
      && !("nome" in ofExample) && ofExample.workout === exampleWorkoutId, JSON.stringify(ofExample));
    const photos = await Store.readPhotos();
    check("a foto local mudou de chave", photos.get("video-541")?.[0]?.size === 4 && !photos.has("cod-541"), [...photos.keys()].join());

    const uid = await Store.signIn("sun", "sol");
    await Store.connectCloud("sun", uid);
    await pause(300);
    const branch = `profiles/${ACCOUNTS.sun}`;
    const exercise = firebase.docs.get(`${branch}/exercises/${LEGACY.exercise.id}`);
    check("o exercício da nuvem voltou com campos e valores em inglês",
      exercise?.name === LEGACY.exercise["nome"] && exercise.station === "4" && exercise.equipment === "cable"
      && exercise.sets === 3 && exercise.videoCode === 541 && exercise.muscles.join() === "back"
      && exercise.workout === FIRST && exercise.order === 0 && exercise.profiles.join() === "sun"
      && exercise.note === "antiga" && exercise.accessory === "long-curved-bar" && !("nome" in exercise), JSON.stringify(exercise));
    const cardio = firebase.docs.get(`${branch}/exercises/${LEGACY.cardio.id}`);
    check("tipo e músculos viram os valores novos", cardio?.kind === "time" && cardio.unit === "km/h"
      && cardio.muscles.join() === "quads,calves" && cardio.equipment === "free", JSON.stringify(cardio));
    check("o treino renomeado mantém o nome", firebase.docs.get(`${branch}/workouts/${FIRST}`)?.name === "Pernas");
    const session = firebase.docs.get(`${branch}/sessions/2026-01-05_${FIRST}`);
    check("a sessão vem com os campos novos", session?.profile === "sun" && session.workout === FIRST
      && session.date === "2026-01-05" && session.startedAt === 1 && session.finishedAt === 2, JSON.stringify(session));
    const record = firebase.docs.get(`${branch}/records/2026-01-05_${FIRST}:${LEGACY.exercise.id}`);
    check("o registro guarda carga e minutos nos campos novos", record?.exerciseId === LEGACY.exercise.id
      && record.remaining === 0 && record.load === 40 && record.minutes === 10 && record.updatedAt === 2, JSON.stringify(record));
    check("ciclo e círculo mudam de documento", firebase.docs.get(`${branch}/cycle/current`)?.startedAt === 1
      && firebase.docs.get(`${branch}/circle/current`)?.code === LEGACY.code);
    const member = firebase.docs.get(`circles/${LEGACY.code}/members/${ACCOUNTS.sun}`);
    check("o documento de membro segue o dono", member?.name === "Sun" && member.joinedAt === 1, JSON.stringify(member));
    const photo = firebase.docs.get("photos/video-541:0");
    check("a foto compartilhada muda de coleção e de chave", photo?.data === "Zm90bw==" && photo.type === "image/jpeg" && photo.updatedAt === 1, JSON.stringify(photo));
    check("a migração fica marcada como feita", firebase.docs.get(`${branch}/meta/migration`)?.done === true);
    check("os documentos antigos continuam lá para dar volta", firebase.docs.has(`perfis/${ACCOUNTS.sun}/exercicios/${LEGACY.exercise.id}`)
      && firebase.docs.has("fotos/cod-541:0"));

    const ofSun = await Store.listExercises(FIRST, "sun");
    check("a leitura do Sun sai do branch novo já traduzida", ofSun.some((e) => e.id === LEGACY.exercise.id && e.note === "antiga"), ofSun.length);
    const historyEntry = (await Store.history("sun")).find((row) => row.exercise.id === LEGACY.exercise.id);
    check("o histórico do Sun lê a carga migrada", historyEntry?.loads[0]?.load === 40, JSON.stringify(historyEntry?.loads));
  }

  // Every workout finished on earlier days of the cycle, nothing today. The next page opens on top
  // of it: cards stay "Feito" with their weights, and the app asks whether to start a new cycle.
  async function prepareCycle() {
    const database = firebase.firestore();
    const branch = `profiles/${ACCOUNTS.sun}`;
    await database.collection(`${branch}/cycle`).doc("current").set({ startedAt: 1000 });
    NAMES.forEach((workoutId, position) => {
      const date = daysAgo(NAMES.length - position);
      const session = `${date}_${workoutId}`;
      database.collection(`${branch}/sessions`).doc(session)
        .set({ profile: "sun", workout: workoutId, date, startedAt: 2000 + position, finishedAt: 3000 + position });
      CATALOG[workoutId].forEach((exercise) => {
        database.collection(`${branch}/records`).doc(`${session}:${exercise.id}`)
          .set({ exerciseId: exercise.id, remaining: 0, load: 30 + position, updatedAt: 3000 });
      });
    });
    check("um ciclo inteiro de dias passados preparado", firebase.docs.size === 1 + NAMES.length + exerciseCount(), firebase.docs.size);
  }

  async function cycle() {
    if (!(await waitFor(() => cards().length === IN_FIRST, "os cartões do primeiro treino"))) return;
    await pause(300);
    const restart = document.getElementById("restart-dialog");
    const chipOf = (position) => cards()[position].querySelector(".load-value");
    check("com tudo concluído, abrir pergunta se recomeça o ciclo", restart.open);
    check("os treinos de dias passados continuam marcados", NAMES.every((workoutId) => tabOf(workoutId).classList.contains("completed")));
    check("os cartões do treino de anteontem continuam feitos", counters().every((label) => label === "Feito"), counters().join());
    check("o peso daquele dia continua no cartão", chipOf(0).textContent === "30kg", chipOf(0).textContent);

    restart.querySelector('[value="cancel"]').click();
    await pause(300);
    check("cancelar deixa tudo como estava", !restart.open && counters().every((label) => label === "Feito")
      && tabOf(FIRST).classList.contains("completed"));

    // Repeating a finished workout is allowed: resetting it starts today's session in its place.
    await viaTab(FIRST, "reset");
    await pause(400);
    check("resetar um treino feito noutro dia recomeça só ele hoje", counters().join() === fullOf(FIRST).join(), counters().join());
    check("o treino resetado sai de concluído, os outros ficam", !tabOf(FIRST).classList.contains("completed") && tabOf(LAST).classList.contains("completed"));

    check("a seção do ciclo só oferece recomeçar com tudo concluído", document.getElementById("cycle").hidden);
    await Store.finishSession("sun", FIRST);
    await pause(200);
    document.getElementById("open-restart").click();
    await pause(300);
    restart.querySelector('[value="restart"]').click();
    await pause(600);
    check("recomeçar limpa os cartões de todos os treinos", counters().join() === fullOf(FIRST).join(), counters().join());
    check("recomeçar tira o visto de todas as abas", NAMES.every((workoutId) => !tabOf(workoutId).classList.contains("completed")));
    check("o peso do ciclo anterior volta herdado", chipOf(0).textContent === "30kg", chipOf(0).textContent);
  }

  async function loads() {
    if (!(await waitFor(() => cards().length === IN_FIRST, "os cartões do primeiro treino"))) return;

    const chipOf = (position) => cards()[position].querySelector(".load-value");
    const fieldOf = (position) => cards()[position].querySelector(".load-field");
    const inStore = async (position) => {
      const { records: records } = await Store.readTodaySession("sun", FIRST);
      return records.get(CATALOG[FIRST][position].id)?.load;
    };

    check("o app abre no primeiro treino, e não no seguinte",
      tabOf(FIRST).getAttribute("aria-selected") === "true");
    check("a carga da última vez aparece no cartão", chipOf(0).textContent === "45kg", chipOf(0).textContent);
    check("carga só herdada não finge ter mudado hoje",
      !chipOf(0).classList.contains("load-gain") && !chipOf(0).classList.contains("load-drop"),
      chipOf(0).className);
    check("a carga divide a caixa com as séries",
      chipOf(0).closest(".block")?.querySelector(".counter") !== null);
    check("exercício sem histórico continua convidando",
      chipOf(1).textContent === "+kg", chipOf(1).textContent);
    check("herdar é da tela, e não grava nada sozinho", (await inStore(0)) === undefined, await inStore(0));

    // Ticking a set is what turns the inherited value into a record: the day now has a workout.
    cards()[0].querySelector(".counter").click();
    await pause(300);
    check("baixar uma série grava a carga herdada", (await inStore(0)) === 45, await inStore(0));
    check("exercício intocado segue sem carga no banco", (await inStore(1)) === undefined, await inStore(1));

    // Tapping the chip opens the field directly, no holding, and leaves the set alone. Asked on
    // 2026-09-13, after a season in which tapping ticked a set and only holding opened the field.
    const beforeTap = counters()[0];
    chipOf(0).dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await pause();
    check("tocar no chip abre o campo da carga sem baixar série", !fieldOf(0).hidden && document.activeElement === fieldOf(0) && counters()[0] === beforeTap, counters()[0]);
    fieldOf(0).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await pause();
    chipOf(0).click();
    await pause();
    check("pelo teclado o chip abre o campo", !fieldOf(0).hidden && document.activeElement === fieldOf(0));
    // hidden does not hide an element with an author-declared display, and without the rule that fixes
    // that the chip stays on screen next to the field, with the box gaining an extra band.
    check("o chip some enquanto o campo está aberto",
      getComputedStyle(chipOf(0)).display === "none", getComputedStyle(chipOf(0)).display);
    check("a caixa não ganha faixa nenhuma ao editar",
      cards()[0].querySelectorAll(".block > :not([hidden])").length === 2,
      cards()[0].querySelectorAll(".block > :not([hidden])").length);
    check("o campo abre com a carga de agora", fieldOf(0).value === "45", fieldOf(0).value);
    check("o campo pede teclado decimal", fieldOf(0).inputMode === "decimal", fieldOf(0).inputMode);

    fieldOf(0).value = "52,5";
    fieldOf(0).blur();
    await pause(300);
    check("a vírgula vira meio quilo", (await inStore(0)) === 52.5, await inStore(0));
    check("o chip mostra a carga com vírgula", chipOf(0).textContent === "52,5kg", chipOf(0).textContent);
    check("o cartão mostra que a carga subiu hoje",
      chipOf(0).classList.contains("load-gain") && Boolean(chipOf(0).querySelector("svg")),
      chipOf(0).className);
    check("o quanto subiu fica no rótulo, que é onde cabe",
      chipOf(0).getAttribute("aria-label").includes(`+7,5 kg desde ${asDayMonth(THREE_DAYS_AGO)}`),
      chipOf(0).getAttribute("aria-label"));
    check("a carga é anunciada", noticeSays("52,5 kg"));

    chipOf(0).click();
    await pause();
    fieldOf(0).value = "nada disso";
    fieldOf(0).blur();
    await pause(300);
    check("número impossível não grava", (await inStore(0)) === 52.5, await inStore(0));

    // Escape gives up, and giving up may not be confused with erasing.
    chipOf(0).click();
    await pause();
    fieldOf(0).value = "";
    fieldOf(0).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await pause(300);
    check("escapar fecha o campo sem apagar", (await inStore(0)) === 52.5, await inStore(0));
    check("escapar devolve o foco para o chip", document.activeElement === chipOf(0));

    chipOf(0).click();
    await pause();
    fieldOf(0).value = "";
    fieldOf(0).blur();
    await pause(300);
    check("campo apagado apaga a carga do dia", (await inStore(0)) === undefined, await inStore(0));
    check("apagar a de hoje devolve a da última vez",
      chipOf(0).textContent === "45kg", chipOf(0).textContent);
    check("o registro do dia sobrevive à carga apagada",
      (await Store.readTodaySession("sun", FIRST)).records.has(CATALOG[FIRST][0].id));
    check("apagar é anunciado", noticeSays("apagada"));

    chipOf(0).click();
    await pause();
    fieldOf(0).value = "52,5";
    fieldOf(0).blur();
    await pause(300);

    // Resetting is redoing the workout, not unsaying the weight that was on the machine.
    await viaTab(FIRST, "reset");
    check("o reset devolve as séries", counters()[0] === firstFull(), counters()[0]);
    check("o reset não apaga a carga do dia", (await inStore(0)) === 52.5, await inStore(0));
    check("a carga continua na tela depois do reset", chipOf(0).textContent === "52,5kg", chipOf(0).textContent);

    if (SECOND) {
      tabOf(SECOND).click();
      await pause(300);
      check("treino sem carga nenhuma não herda do outro",
        chipOf(0).textContent === "+kg", chipOf(0).textContent);
      tabOf(FIRST).click();
      await pause(300);
      check("voltar traz a carga de volta", chipOf(0).textContent === "52,5kg", chipOf(0).textContent);
    }

    await historyTab();

    document.querySelector('input[value="shine"]').click();
    await pause(400);
    check("a carga é de quem treinou, e não da máquina",
      chipOf(0).textContent === "+kg", chipOf(0).textContent);

    await openViaMenu();
    await pause(300);
    check("o histórico segue o perfil de quem está treinando",
      document.querySelectorAll(".history-row .history-none").length
        === document.querySelectorAll(".history-row").length,
      document.querySelectorAll(".history-row .history-none").length);
    document.getElementById("history-close").click();
    await pause(250);

    // The drawer: pulling the footer up opens the history, and the click born from the finger releasing
    // over a tab does not switch workout.
    const footer = document.querySelector("footer");
    const tabBefore = document.querySelector('.tab[aria-selected="true"]').textContent;
    const targetTab = [...document.querySelectorAll(".tab")].find((tab) => tab.getAttribute("aria-selected") !== "true");
    check("a alça da gaveta está acima das abas", getComputedStyle(document.querySelector(".handle")).display !== "none");
    targetTab.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: 800 }));
    targetTab.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientY: 780 }));
    await pause();
    check("puxada curta não abre nada", !document.getElementById("history").open);
    targetTab.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientY: 740 }));
    targetTab.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: 740 }));
    targetTab.click();
    await pause(300);
    check("puxar o rodapé para cima abre o histórico", document.getElementById("history").open);
    check("o dedo que puxou não troca de treino ao soltar", document.querySelector('.tab[aria-selected="true"]').textContent === tabBefore);
    document.getElementById("history-close").click();
    await pause(250);
    targetTab.click();
    await pause(300);
    check("a aba volta a funcionar no toque seguinte", document.querySelector('.tab[aria-selected="true"]').textContent === targetTab.textContent);
  }

  async function historyTab() {
    const panel = document.getElementById("history");
    const rows = () => [...document.querySelectorAll(".history-row")];
    const names = () => rows().map((row) => row.querySelector(".history-name").textContent);
    const searchInput = document.getElementById("history-search");
    const typeInto = async (text) => {
      searchInput.value = text;
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      await pause(150);
    };

    check("o histórico nasce fechado", !panel.open);
    await openViaMenu();
    await pause(300);
    check("a marca do topo abre o histórico", panel.open);

    const first = CATALOG[FIRST][0];
    const howManyExercises = NAMES.reduce((total, workoutId) => total + CATALOG[workoutId].length, 0);
    check("o histórico traz o treino inteiro, e não só o que tem carga",
      rows().length === howManyExercises, rows().length);
    check("cada treino ganha seu título",
      document.querySelectorAll(".history-workout").length === NAMES.length,
      document.querySelectorAll(".history-workout").length);
    check("exercício sem carga aparece dizendo que não tem",
      rows()[1].querySelector(".history-none")?.textContent === "sem carga",
      rows()[1].querySelector(".history-now")?.textContent);
    check("exercício sem carga não promete progressão", rows()[1].tagName !== "DETAILS", rows()[1].tagName);
    check("o histórico abre pelo exercício", names()[0] === first.name, names()[0]);
    check("a carga de agora aparece na linha",
      rows()[0].querySelector(".history-now").textContent === "52,5kg",
      rows()[0].querySelector(".history-now").textContent);
    check("a linha compara com a vez anterior",
      rows()[0].querySelector(".history-trend").textContent.includes("+7,5"),
      rows()[0].querySelector(".history-trend").textContent);

    check("a progressão nasce recolhida", !rows()[0].open);
    rows()[0].open = true;
    await pause(150);
    const days = [...rows()[0].querySelectorAll(".progression li")]
      .map((item) => item.querySelector(".progression-load").textContent);
    check("a progressão traz os três dias, do mais novo para o mais velho",
      days.join(" ") === "52,5kg 45kg 40kg", days.join(" "));

    // Search is a shortcut, not a toll: it filters what was already all on screen.
    await typeInto("biceps");
    const withBiceps = CATALOG[FIRST].filter((exercise) => exercise.muscles.includes("biceps")).length;
    check("busca sem acento acha o grupo com acento", rows().length >= withBiceps && rows().length < howManyExercises,
      `${rows().length} de ${howManyExercises}`);
    await typeInto("costas");
    check("busca por grupo acha o exercício", names().includes(first.name), names().join(","));
    await typeInto("PUXADA");
    check("busca não liga para maiúscula", names()[0] === first.name, names().join(","));
    await typeInto("jacaré");
    check("busca sem resultado diz o que foi procurado",
      document.getElementById("history-empty").textContent.includes("jacaré"),
      document.getElementById("history-empty").textContent);
    await typeInto("");
    check("limpar a busca traz tudo de volta", rows().length === howManyExercises, rows().length);

    document.getElementById("history-close").click();
    await pause(250);
    check("fechar o histórico volta para o treino", !panel.open);
  }

  // The example profile is born with its own workout, weeks of history and two exercises out of the
  // workout. It is the only place where returning to the workout can be exercised without inventing data.
  async function example() {
    if (!(await waitFor(() => cards().length === IN_FIRST, "os cartões do primeiro treino"))) return;

    const ofExample = typeof EXAMPLE_WORKOUTS === "undefined" ? {} : EXAMPLE_WORKOUTS;
    const exampleWorkoutIds = Object.keys(ofExample);
    const names = () => cards().map((item) => item.querySelector(".name").textContent);

    check("o perfil de exemplo existe no rodapé", Boolean(document.querySelector('input[value="example"]')));
    check("o catálogo da academia não sabe do exemplo",
      !names().some((name) => ofExample[exampleWorkoutIds[0]].some((other) => other.name === name)),
      names().join(","));

    document.querySelector('input[value="example"]').click();
    await pause(500);
    check("o exemplo tem o treino dele",
      names().join() === ofExample[exampleWorkoutIds[0]].map((exercise) => exercise.name).join(),
      names().join());
    // Cardio draws like the counter: number on top and "min" on the ×12 line.
    const treadmill = cards().find((item) => item.querySelector(".counter .reps")?.textContent === "min");
    check("o tempo do aeróbico fica em duas linhas, com min embaixo",
      Boolean(treadmill) && treadmill.querySelector(".counter .sets") !== null,
      cards().map(labelOf).join(","));
    if (treadmill) {
      const [cardioSeries, cardioReps] = [".sets", ".reps"].map((s) => getComputedStyle(treadmill.querySelector(`.counter ${s}`)).fontSize);
      const [weightSeries, weightReps] = [".sets", ".reps"].map((s) => getComputedStyle(cards()[0].querySelector(`.counter ${s}`)).fontSize);
      check("o min tem a fonte do ×12, e o número a do contador", cardioSeries === weightSeries && cardioReps === weightReps, `${cardioSeries} ${cardioReps}`);
    }

    // The example has all three kinds in the same list, and is where a different height would show.
    const heights = cards().map((item) => Math.round(item.getBoundingClientRect().height));
    check("cartão sem carga tem a mesma altura dos outros", new Set(heights).size === 1, heights.join(","));
    const ends = cards().map((item) => `${Math.round(item.querySelector(".block").getBoundingClientRect().width)}=${Math.round(item.querySelector(".photo").getBoundingClientRect().width)}`);
    check("as duas pontas do cartão têm a mesma largura",
      ends.every((pair) => { const [a, b] = pair.split("="); return a === b; }), ends.join(" "));
    check("o exemplo abre com carga herdada das semanas passadas",
      cards()[0].querySelector(".load-value").dataset.empty === "0",
      cards()[0].querySelector(".load-value").textContent);
    // A seed that invents weight on push-ups is a wrong seed, and would go unnoticed on screen.
    const bodyweightIndex = ofExample[exampleWorkoutIds[0]].findIndex((exercise) => exercise.kind === "bodyweight");
    check("exercício de peso do corpo não ganha carga inventada",
      bodyweightIndex < 0 || !cards()[bodyweightIndex].querySelector(".load-value"),
      cards()[bodyweightIndex]?.querySelector(".load-value")?.textContent);

    // The example shows the attachment out of the box: it is what a visitor sees without editing anything.
    const withAccessory = ofExample[exampleWorkoutIds[0]].findIndex((exercise) => exercise.accessory);
    check("o exemplo traz exercício com acessório, e o cartão mostra o ícone",
      withAccessory >= 0 && Boolean(cards()[withAccessory].querySelector(".accessory-badge svg")),
      ofExample[exampleWorkoutIds[0]][withAccessory]?.accessory);

    // The treadmill: tap does, hold opens the minutes tape, as on the sets counter.
    const treadmillIndex = ofExample[exampleWorkoutIds[0]].findIndex((exercise) => exercise.kind === "time");
    if (treadmillIndex >= 0) {
      const treadmillCard = () => cards()[treadmillIndex];
      const box = () => treadmillCard().querySelector(".counter");
      const treadmillId = ofExample[exampleWorkoutIds[0]][treadmillIndex].id;
      check("o aeróbico nasce por fazer", !treadmillCard().classList.contains("done"));

      box().click();
      await pause(300);
      check("tocar no tempo marca o aeróbico como feito", treadmillCard().classList.contains("done"));
      check("tocar no tempo não abre teclado nenhum", !treadmillCard().querySelector("input:not([hidden])"));

      // Hold and drag seven steps up: from 30 minutes to 1h15, and the screen switches to the clock drawing.
      box().dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: 400 }));
      await pause(600);
      check("segurar o tempo abre a fita", Boolean(box().querySelector(".tape")));
      box().dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientY: 400 - 7 * 44 }));
      box().dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: 400 - 7 * 44 }));
      await pause(300);
      check("soltar grava o tempo escolhido", (await Store.readTodaySession("example", exampleWorkoutIds[0])).records.get(treadmillId)?.minutes === 75);
      check("da hora em diante o tempo vira relógio", box().querySelector(".sets").textContent === "1:15"
        && box().querySelector(".reps").textContent === "h", labelOf(treadmillCard()));
      check("a fita fecha ao soltar", !box().querySelector(".tape"));

      // Undoing and redoing may not lose the time: that is how the treadmill zeroed on Android.
      // A whole tap, not just click: the synthetic pointerup above did not generate the click that
      // consumes the adjustment guard, and pointerdown is what re-arms it.
      const tapOn = () => {
        box().dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: 400 }));
        box().dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: 400 }));
        box().click();
      };
      tapOn();
      await pause(300);
      check("tocar de novo desfaz o aeróbico", !treadmillCard().classList.contains("done"));
      check("desfazer mantém o tempo do dia", (await Store.readTodaySession("example", exampleWorkoutIds[0])).records.get(treadmillId)?.minutes === 75
        && box().querySelector(".sets").textContent === "1:15", labelOf(treadmillCard()));
      tapOn();
      await pause(300);
      check("refazer volta feito com o mesmo tempo", treadmillCard().classList.contains("done")
        && box().querySelector(".sets").textContent === "1:15", labelOf(treadmillCard()));
    }

    await openViaMenu();
    await pause(400);
    // Two views: what left the workout no longer shares the list with today's, it lives in the second.
    const rowsWithReturn = () => [...document.querySelectorAll(".history-row")].filter((row) => row.querySelector(".history-actions"));
    check("o histórico abre na vista do treino, sem nada do que saiu",
      document.querySelector('input[name="history-view"]:checked').value === "workout" && rowsWithReturn().length === 0
        && document.querySelectorAll(".history-workout").length === NAMES.length,
      `${rowsWithReturn().length} / ${document.querySelectorAll(".history-workout").length}`);
    document.querySelector('input[name="history-view"][value="out"]').click();
    await pause(200);
    const archivedList = rowsWithReturn();
    check("a vista de fora do treino lista só o que saiu, sem título de treino",
      archivedList.length === (typeof EXAMPLE_ARCHIVED === "undefined" ? 0 : EXAMPLE_ARCHIVED.length)
        && archivedList.length === document.querySelectorAll(".history-row").length
        && document.querySelectorAll(".history-workout").length === 0,
      `${archivedList.length} de ${document.querySelectorAll(".history-row").length}`);
    if (archivedList.length === 0) return;

    check("a linha de fora do treino afunda no fundo da página",
      getComputedStyle(archivedList[0]).backgroundColor === getComputedStyle(document.body).backgroundColor,
      getComputedStyle(archivedList[0]).backgroundColor);
    check("a linha diz quando o exercício saiu do treino",
      /Saiu do treino em \d\d\/\d\d/.test(archivedList[0].querySelector(".history-left").textContent),
      archivedList[0].querySelector(".history-left").textContent);

    const whatReturns = archivedList[0].querySelector(".history-name").textContent;
    archivedList[0].querySelector(".history-actions button").click();
    await pause(300);
    const dialog = document.getElementById("restore-dialog");
    check("voltar para o treino pergunta em qual treino", dialog.open);
    check("a escolha do treino tem uma opção por treino",
      dialog.querySelectorAll('input[name="restore-workout"]').length === NAMES.length);

    const target = NAMES[NAMES.length - 1];
    dialog.querySelector(`input[value="${target}"]`).click();
    dialog.querySelector('[value="restore"]').click();
    await pause(500);

    check("o exercício sai do grupo de fora do treino",
      ![...document.querySelectorAll(".history-row")]
        .filter((row) => row.querySelector(".history-actions"))
        .some((row) => row.querySelector(".history-name").textContent === whatReturns));
    check("a volta é anunciada", noticeSays("voltou para o"), document.getElementById("notice").textContent);

    document.getElementById("history-close").click();
    await pause(250);
    tabOf(target).click();
    await pause(400);
    check("o exercício reativado aparece no fim do treino escolhido",
      names()[names().length - 1] === whatReturns, names().join());
    check("o histórico dele sobreviveu à volta",
      (await Store.history("example")).find((row) => row.exercise.name === whatReturns).loads.length > 0);
  }

  // The cloud engine, over the fake Firebase of fake-firebase.js. The app already opened on the local
  // engine; here Sun is bound to his branch and everything he writes has to land there, and only there.
  async function cloud() {
    // The page opens without login, so what is on screen is the example, on the local engine.
    if (!(await waitFor(() => cards().length > 0, "os cartões do exemplo"))) return;

    const now = new Date();
    const two = (n) => String(n).padStart(2, "0");
    const TODAY = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
    const stored = (prefix) => [...firebase.docs.keys()].filter((path) => path.startsWith(prefix) && !path.includes("/meta/"));
    const branch = `profiles/${ACCOUNTS.sun}`;
    const first = CATALOG[FIRST][0];

    const refusal = await Store.signIn("sun", "errada").then(() => null, (error) => error.code);
    check("senha errada é recusada com o código do Auth", refusal === "auth/invalid-credential", refusal);
    const uid = await Store.signIn("sun", "sol");
    check("entrar devolve o uid da conta", uid === ACCOUNTS.sun, uid);

    check("ligar o perfil ao branch espera o espelho", (await Store.connectCloud("sun", uid)) === true);
    await Store.seed(SUN_WORKOUTS, ["sun"]);
    check("o seed vai para o branch do Sun",
      stored(`${branch}/exercises/`).length === exerciseCount(), stored(`${branch}/exercises/`).length);
    check("e não abre branch para ninguém mais",
      stored("profiles/").every((path) => path.startsWith(branch)),
      stored("profiles/").filter((path) => !path.startsWith(branch)).join(" "));
    check("a leitura do Sun sai do espelho, com o catálogo inteiro",
      (await Store.listExercises(FIRST, "sun")).length === IN_FIRST);

    await Store.saveSet("sun", FIRST, first.id, 2);
    const record = firebase.docs.get(`${branch}/records/${TODAY}_${FIRST}:${first.id}`);
    check("a série vira documento no branch, sem o perfil no id", record?.remaining === 2, JSON.stringify(record));
    check("a sessão nasce junto", Boolean(firebase.docs.get(`${branch}/sessions/${TODAY}_${FIRST}`)));
    check("a leitura vê a escrita na hora",
      (await Store.readTodaySession("sun", FIRST)).records.get(first.id)?.remaining === 2);

    await Store.saveValue("sun", FIRST, first.id, "load", 40);
    const fromHistory = (await Store.history("sun")).find((row) => row.exercise.id === first.id);
    check("a carga entra no histórico do Sun", fromHistory?.loads[0]?.load === 40, JSON.stringify(fromHistory?.loads));

    await Store.finishSession("sun", FIRST);
    check("encerrar conclui a letra pelo espelho", (await Store.finishedWorkouts("sun")).has(FIRST));
    // The mirror answers within the same millisecond, and the cycle has to start after the session.
    await pause(5);
    Store.startCycle("sun");
    check("o ciclo é um documento fixo", Boolean(firebase.docs.get(`${branch}/cycle/current`)));
    check("recomeçar o ciclo tira a letra", (await Store.finishedWorkouts("sun")).size === 0);

    // Someone else's plan in the branch: what was never trained goes, what has records gets archived.
    const [newStray, trainedStray] = SHINE_WORKOUTS.A;
    firebase.fromOutside(`${branch}/exercises/${newStray.id}`, { ...newStray, workout: "A", order: 50, profiles: ["sun"] });
    firebase.fromOutside(`${branch}/exercises/${trainedStray.id}`, { ...trainedStray, workout: "A", order: 51, profiles: ["sun"] });
    firebase.fromOutside(`${branch}/records/2026-01-05_A:${trainedStray.id}`, { exerciseId: trainedStray.id, remaining: 0, load: 20, updatedAt: 1 });
    await pause(50);
    await Store.removeStrays("sun", Object.values(SHINE_WORKOUTS).flat().map((e) => e.id));
    await pause(50);
    check("intruso nunca treinado é apagado", !firebase.docs.has(`${branch}/exercises/${newStray.id}`));
    check("intruso com registro fica arquivado", firebase.docs.get(`${branch}/exercises/${trainedStray.id}`)?.archived === true);
    check("a ficha do Sun não é tocada", (await Store.listExercises(FIRST, "sun")).length === IN_FIRST);

    // Photo: the key is the video code, the same in both plans, and it goes up in base64 to the shared
    // collection. Leg press exists for Sun and Shine with the same code.
    const legPressSun = Object.values(SUN_WORKOUTS).flat().find((e) => e.videoCode === 59);
    const legPressShine = Object.values(SHINE_WORKOUTS).flat().find((e) => e.videoCode === 59);
    check("máquina igual em fichas diferentes tem a mesma chave de foto",
      Store.photoKey(legPressSun) === Store.photoKey(legPressShine) && legPressSun.id !== legPressShine.id);
    await Store.savePhoto(Store.photoKey(legPressSun), 0, new Blob(["foto"], { type: "image/jpeg" }));
    await pause(50);
    const cloudPhoto = firebase.docs.get("photos/video-59:0");
    check("a foto sobe em base64 para a coleção compartilhada", cloudPhoto?.data === "Zm90bw==" && cloudPhoto.type === "image/jpeg", JSON.stringify(cloudPhoto));
    const photosRead = await Store.readPhotos();
    check("a foto volta como blob pela chave", photosRead.get("video-59")?.[0]?.size === 4);
    Store.deletePhoto("video-59", 0);
    await pause(50);
    check("apagar tira a foto da nuvem", !firebase.docs.has("photos/video-59:0"));

    // The other device wrote a note: it has to arrive through the snapshot, without reloading.
    firebase.fromOutside(`${branch}/exercises/${first.id}`, { ...firebase.docs.get(`${branch}/exercises/${first.id}`), note: "do outro aparelho" });
    await pause(50);
    check("escrita de fora chega ao espelho",
      (await Store.listExercises(FIRST, "sun"))[0].note === "do outro aparelho");

    check("a Shine não está em lugar nenhum deste aparelho", (await Store.listExercises(FIRST, "shine")).length === 0
      && stored(`profiles/${ACCOUNTS.shine}`).length === 0);

    // Circle: Sun creates, Shine joins with the code from the other device, and Sun starts reading her
    // plan through a read-only branch. Each one writes only their own membership document.
    check("sem círculo, o perfil não tem código", (await Store.readCircle("sun")) === null);
    const code = await Store.createCircle("sun", "Sun");
    await pause(50);
    check("criar gera um código de seis letras sem ambiguidade", /^[A-HJ-NP-Z2-9]{6}$/.test(code), code);
    check("o criador vira membro pelo próprio documento",
      firebase.docs.get(`circles/${code}/members/${ACCOUNTS.sun}`)?.name === "Sun");
    check("o código fica no branch do dono", firebase.docs.get(`${branch}/circle/current`)?.code === code
      && (await Store.readCircle("sun")) === code);
    check("ninguém escreveu fora do próprio documento",
      stored("circles/").every((path) => path === `circles/${code}/members/${ACCOUNTS.sun}`));

    firebase.fromOutside(`circles/${code}/members/${ACCOUNTS.shine}`, { name: "Shine", joinedAt: 2 });
    const members = await Store.readMembers(code);
    check("os membros chegam com uid e nome", members.length === 2
      && members.some((m) => m.uid === ACCOUNTS.shine && m.name === "Shine"), JSON.stringify(members));

    const ofShine = SHINE_WORKOUTS.A[2];
    firebase.fromOutside(`profiles/${ACCOUNTS.shine}/exercises/${ofShine.id}`, { ...ofShine, workout: "A", order: 0, profiles: ["shine"] });
    check("o branch de um membro abre só para ler", (await Store.connectCloud("membro:shine", ACCOUNTS.shine)) === true);
    check("a ficha do membro sai do espelho dele, e não da do Sun",
      (await Store.listExercises("A", "membro:shine")).map((e) => e.id).join() === ofShine.id
      && (await Store.listExercises(FIRST, "sun")).every((e) => e.id !== ofShine.id));

    await Store.leaveCircle("sun");
    await pause(50);
    check("sair apaga o próprio documento de membro e o código do branch",
      !firebase.docs.has(`circles/${code}/members/${ACCOUNTS.sun}`) && (await Store.readCircle("sun")) === null);
    check("sair não toca no documento do outro membro", firebase.docs.has(`circles/${code}/members/${ACCOUNTS.shine}`));
    // What was put from outside into Shine's branch leaves here, so the serverless seed below measures an empty branch.
    firebase.docs.delete(`profiles/${ACCOUNTS.shine}/exercises/${ofShine.id}`);

    // A mirror that only saw the cache is no base for the seed: it could write over an edit that has
    // not arrived from the server yet.
    firebase.cacheOnly = true;
    await Store.connectCloud("shine", ACCOUNTS.shine);
    await Store.seed(SUN_WORKOUTS, ["shine"]);
    check("sem resposta do servidor o seed não roda", stored(`profiles/${ACCOUNTS.shine}`).length === 0, stored(`profiles/${ACCOUNTS.shine}`).length);

    await Store.signOut();
    check("sair desliga a nuvem: sem login não sobra nada do Sun no aparelho",
      (await Store.listExercises(FIRST, "sun")).length === 0);
  }

  // Whoever opens the link without signing in sees the example and no other profile. Signing in as
  // Sun switches to his workout without showing the footer; only the admin gets the picker.
  async function visitor() {
    const ofExample = EXAMPLE_WORKOUTS[Object.keys(EXAMPLE_WORKOUTS)[0]];
    const exampleNames = ofExample.map((exercise) => exercise.name).join();
    const names = () => cards().map((item) => item.querySelector(".name").textContent);
    const footer = document.getElementById("profiles");
    const footerVisible = () => getComputedStyle(footer).display !== "none";
    const dialog = document.getElementById("login");
    const errorText = document.getElementById("login-error");
    const who = () => document.getElementById("menu-who").textContent;
    const openMenu = async () => { document.getElementById("open-menu").click(); await pause(150); };
    const logIn = async (username, password) => {
      document.getElementById("login-username").value = username;
      document.getElementById("login-password").value = password;
      document.getElementById("login-confirm").click();
      await pause(300);
    };

    if (!(await waitFor(() => cards().length === ofExample.length, "os cartões do exemplo"))) return;
    check("sem login a tela é o exemplo", names().join() === exampleNames, names().join());
    check("sem login o rodapé de perfis não aparece", !footerVisible());

    await openMenu();
    check("o menu diz que não há login", who().includes("Sem login"), who());
    check("o menu oferece entrar, e não sair",
      !document.getElementById("menu-sign-in").hidden && document.getElementById("menu-sign-out").hidden);
    document.getElementById("menu-sign-in").click();
    await pause(150);
    check("entrar abre o diálogo de login", dialog.open);

    await logIn("sun", "errada");
    check("senha errada avisa e não fecha", !errorText.hidden && dialog.open, errorText.textContent);
    await logIn("sun", "sol");
    if (!(await waitFor(() => cards().length === IN_FIRST && !dialog.open, "o treino do Sun"))) return;
    check("a Sun abre no próprio treino", names()[0] === CATALOG[FIRST][0].name, names()[0]);
    check("a entrada é anunciada", noticeSays("Sun"), document.getElementById("notice").textContent);
    check("a Sun não vê o rodapé de perfis", !footerVisible());
    const heart = () => getComputedStyle(document.getElementById("open-menu"), "::after").content.includes("♥");
    const sunIcon = () => getComputedStyle(document.getElementById("open-menu"), "::after").content.includes("☀");
    check("a marca do Sun tem um sol, e não coração", sunIcon() && !heart());
    await Store.signIn("shine", "lua");
    await waitFor(() => document.getElementById("menu-who").textContent.includes("Shine") || heart(), "a Shine entrar");
    check("a marca da Shine ganha um coração, e o sol vai embora", heart() && !sunIcon());

    await openMenu();
    check("o menu diz quem entrou, com o coração dela", who().includes("Shine ♥"), who());
    check("o menu oferece sair", !document.getElementById("menu-sign-out").hidden);
    document.getElementById("menu-sign-out").click();
    if (!(await waitFor(() => cards().length === ofExample.length, "a volta ao exemplo"))) return;
    check("sair volta ao exemplo", names().join() === exampleNames, names().join());

    await openMenu();
    document.getElementById("menu-sign-in").click();
    await pause(150);
    await logIn("admin", "chave");
    if (!(await waitFor(footerVisible, "o rodapé do admin"))) return;
    check("o admin abre no Sun", names()[0] === CATALOG[FIRST][0].name, names()[0]);
    check("o admin vê os três perfis", footer.querySelectorAll('input[name="profile"]').length === Object.keys(PROFILES).length);
  }

  // On desktop the mouse drags the carousel, and the click left over on release does not tick a set.
  async function dragCase() {
    if (!(await waitFor(() => cards().length > 0, "os cartões"))) return;
    if (!SECOND) return;

    const track = document.getElementById("carousel");
    const pointer = (kind, x, buttons) => track.dispatchEvent(new PointerEvent(kind,
      { bubbles: true, pointerType: "mouse", pointerId: 7, button: 0, buttons, clientX: x, clientY: 200 }));
    const firstSeries = () => document.getElementById(`panel-${FIRST}`).querySelector(".sets").textContent;
    const beforeDrag = firstSeries();

    cards()[0].querySelector(".name").dispatchEvent(new PointerEvent("pointerdown",
      { bubbles: true, pointerType: "mouse", pointerId: 7, button: 0, buttons: 1, clientX: 300, clientY: 200 }));
    // More than half the panel, otherwise the landing returns to the workout it left.
    const far = 300 - Math.round(track.clientWidth * 0.7);
    pointer("pointermove", 260, 1);
    pointer("pointermove", far, 1);
    check("arrastar com o mouse desliga o snap enquanto segura", track.classList.contains("dragging"));
    pointer("pointerup", far, 0);
    cards()[0].querySelector(".counter").dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await waitFor(() => activeWorkoutId === SECOND, "o arrasto pousar no segundo treino");
    check("soltar pousa no treino seguinte", activeWorkoutId === SECOND, activeWorkoutId);
    check("o clique que sobra do arrasto não desce série", firstSeries() === beforeDrag, firstSeries());
    await waitFor(() => !track.classList.contains("dragging"), "o snap voltar");
    check("o snap volta depois do pouso", !track.classList.contains("dragging"));

    // A finger does not come through here: touch has native scroll snap, and the hand-made drag would get in its way.
    track.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch", pointerId: 8, button: 0, buttons: 1, clientX: 300, clientY: 200 }));
    track.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "touch", pointerId: 8, buttons: 1, clientX: 100, clientY: 200 }));
    check("o dedo não liga o arrasto à mão", !track.classList.contains("dragging"));
    track.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch", pointerId: 8, buttons: 0, clientX: 100, clientY: 200 }));
  }

  // The editor: rename, create, reorder and remove workouts; move, reorder, remove and create
  // exercises. Everything saves at once and remounts the screen, and nothing deletes data.
  async function editor() {
    if (!(await waitFor(() => cards().length === IN_FIRST, "os cartões do primeiro treino"))) return;
    if (!SECOND) return;

    const tabs = () => [...document.querySelectorAll("#tabs .tab")];
    const actionsOf = (item) => [...item.querySelectorAll(".edit-actions button")];
    const clickOn = (picker) => document.querySelector(picker).click();

    check("a fileira de edição nasce escondida", getComputedStyle(cards()[0].querySelector(".edit-actions")).display === "none");
    clickOn("#open-menu");
    await pause(150);
    clickOn("#menu-edit");
    await pause(200);
    check("o menu liga o modo de edição", document.body.classList.contains("editing") && !document.getElementById("editing").hidden);
    check("editando, cada cartão mostra as ações", getComputedStyle(cards()[0].querySelector(".edit-actions")).display === "flex");
    check("editando, o seletor de perfis some", getComputedStyle(document.getElementById("profiles")).display === "none");

    // Rename the active workout.
    tabOf(FIRST).click();
    await pause(200);
    check("a aba ativa abre as opções do treino", document.getElementById("edit-workout-dialog").open);
    clickOn('#edit-workout-dialog [value="rename"]');
    await pause(200);
    check("renomear pede o nome com o atual preenchido", document.getElementById("workout-name-dialog").open
      && document.getElementById("workout-name").value === FIRST);
    document.getElementById("workout-name").value = "Pernas";
    clickOn('#workout-name-dialog [value="save"]');
    await pause(400);
    check("a aba mostra o nome novo", tabOf(FIRST).textContent.trim() === "Pernas", tabOf(FIRST).textContent);
    check("o nome novo está no banco", (await Store.listWorkouts("sun")).find((t) => t.id === FIRST)?.name === "Pernas");
    check("o id do treino não muda com o nome", Boolean(document.getElementById(`panel-${FIRST}`)));

    // Create a workout.
    const countBefore = tabs().length;
    clickOn("#editing-workout");
    await pause(200);
    document.getElementById("workout-name").value = "Braço";
    clickOn('#workout-name-dialog [value="save"]');
    await pause(500);
    check("criar treino acrescenta uma aba", tabs().length === countBefore + 1, tabs().length);
    const fresh = WORKOUT_IDS[WORKOUT_IDS.length - 1];
    check("o treino novo nasce ativo e vazio", activeWorkoutId === fresh && cards().length === 0, `${activeWorkoutId} ${cards().length}`);
    check("o treino novo tem id sorteado", fresh.length === 36, fresh);

    // Move an exercise from the first to the second workout.
    tabOf(FIRST).click();
    await waitFor(() => activeWorkoutId === FIRST, "voltar ao primeiro treino");
    const moved = cards()[0].querySelector(".name").textContent;
    actionsOf(cards()[0]).find((b) => b.dataset.action === "move").click();
    await pause(200);
    check("mover abre a escolha de treino", document.getElementById("restore-dialog").open
      && document.getElementById("restore-title").textContent === "Mudar de treino");
    document.querySelector(`#restore-workouts input[value="${SECOND}"]`).click();
    clickOn("#restore-confirm");
    await pause(500);
    check("o exercício saiu do primeiro treino", cards().length === IN_FIRST - 1, cards().length);
    const ofSecond = (await Store.listExercises(SECOND, "sun")).map((e) => e.name);
    check("e entrou no fim do segundo", ofSecond[ofSecond.length - 1] === moved, ofSecond.join(","));

    // Move the first exercise down.
    const [firstName, secondName] = cards().slice(0, 2).map((c) => c.querySelector(".name").textContent);
    check("o primeiro não sobe", actionsOf(cards()[0])[0].disabled);
    actionsOf(cards()[0])[1].click();
    await pause(400);
    check("descer troca a ordem", cards()[0].querySelector(".name").textContent === secondName
      && cards()[1].querySelector(".name").textContent === firstName, cards().slice(0, 2).map((c) => c.querySelector(".name").textContent).join(","));

    // Edit what already exists: the same form as new, filled, saving over without changing the id or
    // what the form does not have, like the equipment.
    const edited = (await Store.listExercises(FIRST, "sun"))[0];
    actionsOf(cards()[0]).find((b) => b.dataset.action === "edit").click();
    await pause(200);
    const newForm = document.getElementById("new-exercise-dialog");
    check("editar abre o formulário preenchido com o exercício",
      newForm.open && document.getElementById("new-exercise-title").textContent === "Editar exercício"
        && document.getElementById("new-name").value === edited.name
        && document.getElementById("new-station").value === String(edited.station),
      `${document.getElementById("new-name").value} / ${document.getElementById("new-station").value}`);
    document.getElementById("new-name").value = `${edited.name} editado`;
    document.getElementById("new-station").value = "99";
    newForm.querySelector('[value="create"]').click();
    await pause(500);
    const afterEditing = (await Store.listExercises(FIRST, "sun")).find((e) => e.id === edited.id);
    check("salvar troca nome e aparelho no mesmo exercício",
      afterEditing?.name === `${edited.name} editado` && afterEditing.station === "99"
        && cards()[0].querySelector(".name").textContent === `${edited.name} editado`,
      JSON.stringify({ name: afterEditing?.name, station: afterEditing?.station }));
    check("editar não mexe no que o formulário não tem", afterEditing?.equipment === edited.equipment
      && afterEditing.workout === edited.workout && afterEditing.order === edited.order);
    check("a lista continua do mesmo tamanho depois de editar", cards().length === IN_FIRST - 1, cards().length);

    // The attachment: chosen in the same form, becomes an icon on the card and a named chip in the viewer.
    actionsOf(cards()[0]).find((b) => b.dataset.action === "edit").click();
    await pause(200);
    const options = [...document.querySelectorAll('#new-accessory input[name="new-accessory"]')];
    check("o formulário oferece nenhum mais os acessórios, cada um com ícone",
      options[0].value === "" && options[0].checked && options.length === 1 + Object.keys(ACCESSORIES).length
        && options.slice(1).every((radio) => radio.parentElement.querySelector("svg")),
      options.length);
    document.querySelector('#new-accessory input[value="rope"]').click();
    newForm.querySelector('[value="create"]').click();
    await pause(500);
    const withRope = (await Store.listExercises(FIRST, "sun")).find((e) => e.id === edited.id);
    check("o acessório é gravado no exercício", withRope?.accessory === "rope", withRope?.accessory);
    check("o cartão mostra o ícone do acessório na linha dos músculos",
      Boolean(cards()[0].querySelector(".muscles .accessory-badge svg")) && cards()[0].querySelector(".description").getAttribute("aria-label").includes("Com corda"));
    cards()[0].querySelector(".photo").click();
    await pause(300);
    check("o visor mostra o acessório com nome e ícone",
      document.querySelector("#viewer-meta .value-accessory")?.textContent === "Corda" && document.querySelector("#viewer-meta .value-accessory svg") !== null,
      document.querySelector("#viewer-meta .value-accessory")?.textContent);
    document.getElementById("viewer").close();
    await pause(200);
    actionsOf(cards()[0]).find((b) => b.dataset.action === "edit").click();
    await pause(200);
    check("editar de novo abre com o acessório marcado", document.querySelector('#new-accessory input[value="rope"]').checked);
    document.querySelector('#new-accessory input[value=""]').click();
    newForm.querySelector('[value="create"]').click();
    await pause(500);
    check("nenhum limpa o acessório e tira o ícone do cartão",
      (await Store.listExercises(FIRST, "sun")).find((e) => e.id === edited.id)?.accessory == null && !cards()[0].querySelector(".accessory-badge"));

    // Remove an exercise: it leaves the list and stays in the history.
    const removedName = cards()[0].querySelector(".name").textContent;
    actionsOf(cards()[0]).find((b) => b.dataset.action === "remove").click();
    await pause(200);
    const confirmRemove = document.getElementById("remove-dialog");
    check("tirar pede confirmação antes de mexer na lista", confirmRemove.open && cards().length === IN_FIRST - 1, cards().length);
    confirmRemove.querySelector('[value="cancel"]').click();
    await pause(300);
    check("cancelar deixa o exercício onde estava", cards().length === IN_FIRST - 1
      && cards()[0].querySelector(".name").textContent === removedName, cards().length);
    actionsOf(cards()[0]).find((b) => b.dataset.action === "remove").click();
    await pause(200);
    confirmRemove.querySelector('[value="remove"]').click();
    await pause(400);
    check("confirmado, tirar reduz a lista", cards().length === IN_FIRST - 2, cards().length);
    check("o tirado fica arquivado no histórico",
      (await Store.history("sun")).some((row) => row.exercise.name === removedName && row.exercise.archived));

    // A name similar to an existing one: the app offers the existing exercise and fills the form with it.
    clickOn("#editing-exercise");
    await pause(200);
    const newName = document.getElementById("new-name");
    newName.value = "Adbução na máquina";
    newName.dispatchEvent(new Event("input", { bubbles: true }));
    await pause(100);
    const suggestions = [...document.querySelectorAll("#new-similar button")];
    check("digitar nome parecido oferece o que já existe", suggestions.some((b) => b.textContent.startsWith("Abdução")), suggestions.map((b) => b.textContent).join(" | "));
    suggestions.find((b) => b.textContent.startsWith("Abdução"))?.click();
    await pause(100);
    check("usar o existente preenche máquina e vídeo", newName.value === "Abdução"
      && document.getElementById("new-station").value === "37" && document.getElementById("new-video-code").value === "1104"
      && document.querySelector('#new-muscles input[value="glutes"]').checked, `${document.getElementById("new-station").value} ${document.getElementById("new-video-code").value}`);
    newName.value = "Zumba";
    newName.dispatchEvent(new Event("input", { bubbles: true }));
    await pause(100);
    check("nome sem parecido não oferece nada", document.getElementById("new-similar").hidden);
    clickOn('#new-exercise-dialog [value="cancel"]');
    await pause(200);

    // Create a bodyweight exercise.
    clickOn("#editing-exercise");
    await pause(200);
    document.getElementById("new-name").value = "Prancha";
    document.querySelector('#new-kind input[value="bodyweight"]').click();
    document.querySelector('#new-muscles input[value="abs"]').click();
    clickOn('#new-exercise-dialog [value="create"]');
    await pause(500);
    const plank = cards().find((c) => c.querySelector(".name").textContent === "Prancha");
    check("o exercício novo entra no fim do treino ativo", Boolean(plank) && cards()[cards().length - 1] === plank);
    const inStore = (await Store.listExercises(FIRST, "sun")).find((e) => e.name === "Prancha");
    check("o exercício novo grava tipo e músculo", inStore?.kind === "bodyweight" && inStore?.muscles?.join() === "abs" && inStore.id.length === 36, JSON.stringify(inStore));
    check("peso do corpo não ganha chip de carga", !plank?.querySelector(".load-value"));

    // Remove the created workout.
    tabOf(fresh).click();
    await waitFor(() => activeWorkoutId === fresh, "ir ao treino novo");
    tabOf(fresh).click();
    await pause(200);
    clickOn('#edit-workout-dialog [value="remove"]');
    await pause(500);
    check("tirar o treino devolve a fileira", tabs().length === countBefore && !WORKOUT_IDS.includes(fresh), tabs().length);
    check("o treino tirado fica arquivado, não apagado",
      firebase.docs.get(`profiles/${ACCOUNTS.sun}/workouts/${fresh}`)?.archived === true);

    clickOn("#editing-done");
    await pause(200);
    check("concluir sai do modo de edição", !document.body.classList.contains("editing") && document.getElementById("editing").hidden);
    check("fora da edição as ações somem de novo", getComputedStyle(cards()[0].querySelector(".edit-actions")).display === "none");
  }

  // The circle on screen: Sun creates, Shine joins from the other device, and Sun opens her plan
  // read-only. Starts without login, and the menu's "Círculo" only exists for those with their own branch.
  async function circle() {
    if (!(await waitFor(() => cards().length > 0, "os cartões do exemplo"))) return;
    const openMenu = async () => { document.getElementById("open-menu").click(); await pause(150); };
    const circleMenu = document.getElementById("menu-circle");
    const box = document.getElementById("circle");
    const body = () => document.getElementById("circle-body").textContent;

    await openMenu();
    check("sem login não há círculo no menu", circleMenu.hidden);
    document.getElementById("menu").close();

    await Store.signIn("sun", "sol");
    await waitFor(() => document.getElementById("open-menu").classList.contains("with-sun"), "o Sun na tela");
    await pause(200);
    await openMenu();
    check("logado, o círculo aparece no menu", !circleMenu.hidden);
    circleMenu.click();
    await pause(300);
    check("sem círculo o diálogo oferece criar ou entrar", box.open && !document.getElementById("circle-join").hidden
      && document.getElementById("circle-leave").hidden);

    document.getElementById("circle-code").value = "abc";
    document.getElementById("circle-confirm").click();
    await pause(100);
    check("código curto é recusado na tela", !document.getElementById("circle-error").hidden
      && (await Store.readCircle("sun")) === null);

    document.getElementById("circle-create").click();
    await pause(300);
    const code = await Store.readCircle("sun");
    check("criar mostra o código para passar adiante", code !== null && body().includes(code), body());
    check("dentro do círculo, entrar some e sair aparece", document.getElementById("circle-join").hidden
      && !document.getElementById("circle-leave").hidden);
    check("sozinho, a lista diz que ninguém entrou", document.getElementById("circle-members").textContent.includes("Ninguém"));

    // Shine joins from her device and her plan exists in her branch.
    firebase.fromOutside(`circles/${code}/members/${ACCOUNTS.shine}`, { name: "Shine", joinedAt: 2 });
    Object.entries(SHINE_WORKOUTS).forEach(([workoutId, exercises], workoutOrder) => {
      firebase.fromOutside(`profiles/${ACCOUNTS.shine}/workouts/${workoutId}`, { id: workoutId, name: workoutId, order: workoutOrder });
      exercises.forEach((exercise, order) => firebase.fromOutside(`profiles/${ACCOUNTS.shine}/exercises/${exercise.id}`, { ...exercise, workout: workoutId, order: order, profiles: ["shine"] }));
    });
    await pause(100);
    box.close();
    await openMenu();
    circleMenu.click();
    await pause(300);
    const shineButton = [...document.querySelectorAll("#circle-members button")].find((b) => b.textContent.includes("Shine"));
    check("cada outro membro vira um botão, e o próprio não", Boolean(shineButton)
      && ![...document.querySelectorAll("#circle-members button")].some((b) => b.textContent.includes("Sun")));

    // The card badge: the leg press has the same video code in both plans, and gets Shine's initial.
    // An exercise only Sun does gets nothing.
    const shineCodes = new Set(Object.values(SHINE_WORKOUTS).flat().map((e) => e.videoCode));
    const inCommon = Object.values(SUN_WORKOUTS).flat().find((e) => e.videoCode === 59);
    const onlySun = Object.values(SUN_WORKOUTS).flat().find((e) => e.videoCode > 0 && !shineCodes.has(e.videoCode));
    const cardOf = (exercise) => [...document.querySelectorAll(".exercise")].find((c) => c.querySelector(".name").textContent === exercise.name);
    check("exercício em comum ganha o selo com a inicial de quem mais faz", cardOf(inCommon)?.querySelector(".together")?.textContent === "S",
      cardOf(inCommon)?.querySelector(".together")?.textContent);
    check("exercício que só o Sun faz não ganha selo", Boolean(onlySun) && !cardOf(onlySun)?.querySelector(".together"), onlySun?.name);
    check("o selo é só desenho, o leitor de tela ouve o nome", cardOf(inCommon)?.querySelector(".description").getAttribute("aria-label").includes("Também no treino de Shine"));

    box.close();
    cardOf(inCommon).querySelector(".photo").click();
    await pause(300);
    const shineInViewer = Object.values(SHINE_WORKOUTS).flat().find((e) => e.videoCode === 59);
    check("o visor diz quem mais faz e com quantas séries", document.getElementById("viewer").open
      && !document.getElementById("viewer-circle").hidden
      && document.getElementById("viewer-circle").textContent.startsWith(`Shine faz ${shineInViewer.sets} × ${shineInViewer.reps} no treino `),
      document.getElementById("viewer-circle").textContent);
    document.getElementById("viewer").close();
    cardOf(onlySun).querySelector(".photo").click();
    await pause(300);
    check("sem ninguém em comum a linha do círculo some do visor", document.getElementById("viewer-circle").hidden);
    document.getElementById("viewer").close();
    await openMenu();
    circleMenu.click();
    await pause(300);

    shineButton.click();
    await pause(400);
    const othersPlan = document.getElementById("plan");
    const rows = [...othersPlan.querySelectorAll(".history-row")];
    const shineCount = Object.values(SHINE_WORKOUTS).flat().length;
    check("a ficha da Shine abre com os exercícios dela", othersPlan.open && rows.length === shineCount, rows.length);
    check("a ficha mostra séries por repetições", rows[0]?.querySelector(".history-now")?.textContent === `${SHINE_WORKOUTS.A[0].sets} × ${SHINE_WORKOUTS.A[0].reps}`,
      rows[0]?.querySelector(".history-now")?.textContent);
    check("a ficha alheia não tem botão nem campo além de fechar",
      othersPlan.querySelectorAll("button, input, details, summary").length === 1);
    check("a ficha do Sun na tela não muda", cards().every((card) => !card.textContent.includes(SHINE_WORKOUTS.A[0].name)));
    othersPlan.close();

    await openMenu();
    circleMenu.click();
    await pause(300);
    document.getElementById("circle-leave").click();
    await pause(300);
    check("sair volta ao diálogo de criar ou entrar", !document.getElementById("circle-join").hidden
      && (await Store.readCircle("sun")) === null);
  }

  const CASES = { behavior, keyboard, loads, prepareLoads, example, cloud, visitor, dragCase, editor, circle, prepareMigration, migration, prepareCycle, cycle };

  async function run(testCase) {
    try {
      await CASES[testCase]();
    } catch (error) {
      check(`o caso ${testCase} terminou`, false, `${error}`);
    }
    await fetch("/resultado", { method: "POST", body: JSON.stringify({ testCase, results }) });
  }

  return { run };
})();

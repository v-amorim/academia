// Captures the README screenshots from the real app in headless Chrome, as a 390×844 phone, so
// they never drift from what the code renders. Usage: node scripts/screenshots.mjs
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, launchPhone, sleep } from "./phone.mjs";

const OUT = join(ROOT, "assets", "screenshots");
const { evaluate, screenshot, close } = await launchPhone();
const shoot = async (name) => {
  writeFileSync(join(OUT, `${name}.png`), await screenshot());
  console.log(`${name}.png`);
};

await sleep(600);

// The first workout: one set ticked on the first card, so the counter and the load chip show a change.
await evaluate(`document.querySelector(".exercise .counter").click()`);
await sleep(400);
await shoot("workout");

await evaluate(`document.getElementById("open-menu").click()`);
await sleep(300);
await shoot("menu");

await evaluate(`document.getElementById("menu-history").click()`);
await sleep(700);
await evaluate(`document.querySelector("#history-list details summary")?.click()`);
await sleep(400);
await shoot("history");
await evaluate(`document.getElementById("history").close()`);
await sleep(300);

await evaluate(`document.querySelector(".exercise .photo").click()`);
await sleep(400);
await shoot("exercise");
await evaluate(`document.getElementById("viewer").close()`);
await sleep(300);

await evaluate(`document.querySelector(".exercise .description").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }))`);
await sleep(400);
await shoot("exercise-menu");
await evaluate(`document.getElementById("exercise-menu").close()`);
await sleep(300);

await evaluate(`document.getElementById("open-menu").click()`);
await sleep(200);
await evaluate(`document.getElementById("menu-edit").click()`);
await sleep(500);
await shoot("editor");
await evaluate(`document.getElementById("editing-exercise").click()`);
await sleep(400);
await shoot("new-exercise");
await evaluate(`document.getElementById("new-exercise-dialog").close()`);
await evaluate(`document.getElementById("editing-done").click()`);
await sleep(300);

await evaluate(`document.getElementById("open-menu").click()`);
await sleep(200);
await evaluate(`document.getElementById("menu-circle").click()`);
await sleep(500);
await shoot("circle");
await evaluate(`[...document.querySelectorAll("#circle-members button")].find((b) => b.textContent.includes("Europa")).click()`);
await sleep(500);
await shoot("circle-plan");

await close();

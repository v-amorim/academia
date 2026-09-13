// Captures the README screenshots from the real app in headless Chrome, as a 390×844 phone, so
// they never drift from what the code renders. Usage: node scripts/screenshots.mjs
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname ?? new URL(".", import.meta.url).pathname, "..");
const OUT = join(ROOT, "assets", "screenshots");
const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
  "/usr/bin/google-chrome",
  "/usr/bin/chromium"
].filter(Boolean).find(existsSync);
if (!CHROME) { console.error("Chrome not found"); process.exit(1); }

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer((request, response) => {
  const path = join(ROOT, new URL(request.url, "http://127.0.0.1").pathname.replace(/\/$/, "/index.html"));
  if (!path.startsWith(ROOT) || !existsSync(path)) return response.writeHead(404).end();
  response.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
  createReadStream(path).pipe(response);
});
await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
const origin = `http://127.0.0.1:${server.address().port}`;

const profile = mkdtempSync(join(tmpdir(), "academia-shots-"));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
const debuggerUrl = await new Promise((found) => {
  chrome.stderr.on("data", (chunk) => { const match = String(chunk).match(/DevTools listening on (ws:\/\/\S+)/); if (match) found(match[1]); });
});
const port = new URL(debuggerUrl).port;
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const socket = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
await new Promise((open) => { socket.onopen = open; });

let counter = 0;
const pending = new Map();
socket.onmessage = ({ data }) => { const message = JSON.parse(data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message.result); pending.delete(message.id); } };
const send = (method, params = {}) => new Promise((done) => { const id = ++counter; pending.set(id, done); socket.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.value;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const waitFor = async (expression) => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await sleep(100); } throw new Error(`timed out waiting for ${expression}`); };
const shoot = async (name) => {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, "base64"));
  console.log(`${name}.png`);
};

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, screenOrientation: { angle: 0, type: "portraitPrimary" } });
await send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36", platform: "Linux armv8l" });
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await send("Emulation.setScrollbarsHidden", { hidden: true });
await send("Page.enable");
await send("Page.navigate", { url: `${origin}/index.html` });
await waitFor(`document.querySelector(".exercise .counter") !== null && !document.querySelector("main").hasAttribute("aria-busy")`);
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

socket.close();
chrome.kill();
await new Promise((done) => chrome.once("exit", done));
try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch { /* the OS cleans the temp dir later */ }
server.close();

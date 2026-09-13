// Headless Chrome as a 390×844 Android phone, driven over CDP, serving the repository itself. Shared
// by the README screenshots and the demo recording, so both show what the code renders today.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname ?? new URL(".", import.meta.url).pathname, "..");
const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
  "/usr/bin/google-chrome",
  "/usr/bin/chromium"
].filter(Boolean).find(existsSync);

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

export const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

export async function launchPhone({ deviceScaleFactor = 2 } = {}) {
  if (!CHROME) { console.error("Chrome not found"); process.exit(1); }
  const server = createServer((request, response) => {
    const path = join(ROOT, new URL(request.url, "http://127.0.0.1").pathname.replace(/\/$/, "/index.html"));
    if (!path.startsWith(ROOT) || !existsSync(path)) return response.writeHead(404).end();
    response.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    createReadStream(path).pipe(response);
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const profile = mkdtempSync(join(tmpdir(), "academia-phone-"));
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
  const waitFor = async (expression) => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await sleep(100); } throw new Error(`timed out waiting for ${expression}`); };
  const screenshot = async () => Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64");

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor, mobile: true, screenOrientation: { angle: 0, type: "portraitPrimary" } });
  await send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36", platform: "Linux armv8l" });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await send("Emulation.setScrollbarsHidden", { hidden: true });
  await send("Page.enable");
  await send("Page.navigate", { url: `${origin}/index.html` });
  await waitFor(`document.querySelector(".exercise .counter") !== null && !document.querySelector("main").hasAttribute("aria-busy")`);

  const close = async () => {
    socket.close();
    chrome.kill();
    await new Promise((done) => chrome.once("exit", done));
    server.close();
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch { /* the OS cleans the temp dir later */ }
  };
  return { send, evaluate, waitFor, screenshot, close };
}

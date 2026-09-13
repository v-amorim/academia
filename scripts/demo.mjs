// Records assets/demo.gif from the real app: two taps on the counter, a hold that opens the tape and
// drags it, then a swipe to the next workout. Touch goes through CDP as real touch, so the gestures
// are the ones the phone gets. Needs ffmpeg on PATH, or in the FFMPEG environment variable.
// Usage: node scripts/demo.mjs
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT, launchPhone, sleep } from "./phone.mjs";

const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const FPS = 12;
const OUT = join(ROOT, "assets", "demo.gif");

const { send, evaluate, screenshot, close } = await launchPhone({ deviceScaleFactor: 1 });
await sleep(600);

const frames = mkdtempSync(join(tmpdir(), "academia-demo-"));
let recording = true;
let count = 0;
const record = (async () => {
  while (recording) {
    const started = Date.now();
    writeFileSync(join(frames, `${String(count++).padStart(4, "0")}.png`), await screenshot());
    await sleep(Math.max(0, 1000 / FPS - (Date.now() - started)));
  }
})();

const center = async (selector) => evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
const touch = (type, points) => send("Input.dispatchTouchEvent", { type, touchPoints: points.map(([x, y]) => ({ x, y })) });
const tap = async ([x, y]) => { await touch("touchStart", [[x, y]]); await sleep(60); await touch("touchEnd", []); };
// A held finger, then a slow drag: the tape follows it one row per 44px.
const holdAndDrag = async ([x, y], dy, steps = 12) => {
  await touch("touchStart", [[x, y]]);
  await sleep(700);
  for (let i = 1; i <= steps; i++) {
    await touch("touchMove", [[x, y + (dy * i) / steps]]);
    await sleep(40);
  }
  await sleep(500);
  await touch("touchEnd", []);
};
const swipe = async ([x, y], dx, steps = 10) => {
  await touch("touchStart", [[x, y]]);
  for (let i = 1; i <= steps; i++) {
    await touch("touchMove", [[x + (dx * i) / steps, y]]);
    await sleep(25);
  }
  await touch("touchEnd", []);
};

const counter = await center(".exercise .counter");
await sleep(500);
await tap(counter);
await sleep(700);
await tap(counter);
await sleep(900);
await holdAndDrag(counter, 2 * 44 + 10);
await sleep(1100);
await swipe(await center("#carousel"), -260);
await sleep(1400);

recording = false;
await record;
await close();

// Two passes: one palette for the whole clip, then the frames quantized against it. Loop forever.
const palette = join(frames, "palette.png");
const run = (args) => {
  const result = spawnSync(FFMPEG, args, { stdio: "inherit" });
  if (result.status !== 0) { console.error(`ffmpeg failed (${result.status ?? result.error?.message})`); process.exit(1); }
};
run(["-y", "-framerate", String(FPS), "-i", join(frames, "%04d.png"), "-vf", "palettegen=max_colors=128:stats_mode=diff", palette]);
run(["-y", "-framerate", String(FPS), "-i", join(frames, "%04d.png"), "-i", palette, "-lavfi", "paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle", "-loop", "0", OUT]);
rmSync(frames, { recursive: true, force: true });
console.log(`${OUT} (${count} frames)`);

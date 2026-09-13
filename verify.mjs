// Checks the app without a phone: JS syntax, screen mount on file:// and behavior in a real
// Chrome served over HTTP.
// Usage: node verify.mjs [case]
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// import.meta.dirname needs Node 20.11. The fallback keeps the script alive on Node 18.
const FOLDER = resolve(import.meta.dirname ?? new URL(".", import.meta.url).pathname);
const JS_FILES = ["plans.js", "store.js", "app.js", "probe.js", "fake-firebase.js", "sw.js"];

// How many workouts and exercises come from the seed, not from a number written here: the app
// accepts one workout upwards, and the suite may not be what locks that at three.
const PLANS = readFileSync(join(FOLDER, "plans.js"), "utf8");
const SUN_WORKOUTS = new Function(`${PLANS}; return SUN_WORKOUTS;`)();
const EXAMPLE_WORKOUTS = new Function(`${PLANS}; return EXAMPLE_WORKOUTS;`)();
const PROFILES = new Function(`${PLANS}; return PROFILES;`)();
const WORKOUT_IDS = Object.keys(SUN_WORKOUTS);

// On file:// there is no login, so the screen is the visitor's: the example workout and no profile
// picker, which only the admin sees. The radios exist in the markup, but the app creates them in code.
const EXPECTED = [
  ["cartões", /class="exercise/g, Object.values(EXAMPLE_WORKOUTS).reduce((total, list) => total + list.length, 0)],
  ["abas", /class="tab[ "]/g, WORKOUT_IDS.length],
  ["perfis", /name="profile"/g, Object.keys(PROFILES).length],
  ["diálogos", /<dialog id=/g, 17]
];

// Each case runs in a fresh Chrome profile, so IndexedDB is born clean. The Carga case needs two
// loads in the same profile: the first writes the past, the second brings the app up.
//
// `node verify.mjs carga` runs only what matches the word, and skips the file:// dump, which alone
// costs twenty seconds. That is what it is for: touching one case without paying for the others.
const CASES = [
  { name: "Comportamento", steps: ["behavior"] },
  { name: "Teclado", steps: ["keyboard"] },
  { name: "Carga", steps: ["prepareLoads", "loads"] },
  { name: "Perfil de exemplo", steps: ["example"] },
  { name: "Nuvem", steps: ["cloud"] },
  { name: "Visitante e login", steps: ["visitor"] },
  { name: "Arrasto com o mouse", steps: ["dragCase"] },
  { name: "Editor de treino", steps: ["editor"] },
  { name: "Círculo", steps: ["circle"] },
  { name: "Migração", steps: ["prepareMigration", "migration"] },
  { name: "Ciclo", steps: ["prepareCycle", "cycle"] }
];

const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
  "/usr/bin/google-chrome",
  "/usr/bin/chromium"
].filter(Boolean);

const CASE_TIMEOUT = 60000;
const PARALLEL = 3;
const MIME_TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".jpg": "image/jpeg", ".woff2": "font/woff2",
  ".json": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml"
};

const FILTER = process.argv[2]?.toLowerCase() ?? "";
const withoutAccents = (text) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const CHOSEN = FILTER ? CASES.filter((testCase) => withoutAccents(testCase.name).includes(withoutAccents(FILTER))) : CASES;

let failures = 0;
// With cases in parallel, writing line by line would mix everyone's output. Each case gathers its
// own and the end prints one block per case, in declaration order.
const ok = (text) => `  ok    ${text}`;
const fail = (text) => { failures++; return `  FALHA ${text}`; };

console.log("\nSintaxe");
for (const file of JS_FILES) {
  try {
    execFileSync(process.execPath, ["--check", join(FOLDER, file)], { stdio: "pipe" });
    console.log(ok(file));
  } catch (error) {
    console.log(fail(`${file}\n${error.stderr?.toString().trim()}`));
  }
}

const chrome = CHROME_PATHS.find(existsSync);

const dump = () => spawnSync(chrome, [
  "--headless", "--disable-gpu", "--no-sandbox",
  "--virtual-time-budget=20000",
  // pathToFileURL, not concatenation: on Windows the path has backslashes and a drive letter.
  "--dump-dom", pathToFileURL(join(FOLDER, "index.html")).href
], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).stdout ?? "";

console.log("\nMontagem da tela em file://");
if (!chrome) {
  console.log("  pulado, Chrome não encontrado. Acrescente o caminho em CAMINHOS_CHROME.");
} else {
  // On a busy machine the dump sometimes exits before the list mounts and returns zero cards for
  // everything. A second try separates noise from regression: a broken app returns zero on both.
  let dom = dump();
  if (!dom.includes('class="exercise')) {
    console.log("  a tela veio vazia, tentando de novo");
    dom = dump();
  }

  for (const [name, pattern, expected] of EXPECTED) {
    const found = (dom.match(pattern) ?? []).length;
    console.log(found === expected ? ok(`${name}: ${found}`) : fail(`${name}: esperava ${expected}, achou ${found}`));
  }
}

// The page returns the result by fetch instead of a DOM dump. That way time runs for real: under
// --virtual-time-budget the timers fire before the database operations, and the store's
// OPEN_TIMEOUT expires for no reason.
function server(onReceive) {
  const markup = readFileSync(join(FOLDER, "index.html"), "utf8");

  return createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");

    if (request.method === "POST" && url.pathname === "/resultado") {
      let body = "";
      request.on("data", (chunk) => { body += chunk; });
      request.on("end", () => {
        response.writeHead(204).end();
        onReceive(JSON.parse(body));
      });
      return;
    }

    if (url.pathname === "/sonda") {
      const testCase = url.searchParams.get("caso");
      const injection = `<script src="/probe.js"></script><script>Probe.run(${JSON.stringify(testCase)})</script>`;
      // The fake Firebase goes after the plans, because it reads their UIDs, and before store.js, which
      // consumes it. The suite never talks to the real project.
      const fake = '<script src="/fake-firebase.js"></script>';
      // The `prepare` page does not bring the app up, but loads the plans and the fake Firebase: what it
      // writes has to have the keys today's app expects, and writing them by hand would lock the suite.
      const page = testCase.startsWith("prepare")
        ? `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>preparar</title></head>`
          + `<body><script src="/plans.js"></script>${fake}${injection}</body></html>`
        : markup
          .replace('<script src="store.js">', `${fake}<script src="store.js">`)
          .replace("</body>", `${injection}\n</body>`);
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page);
      return;
    }

    const filePath = join(FOLDER, url.pathname === "/" ? "index.html" : url.pathname.slice(1));
    if (!filePath.startsWith(FOLDER) || !existsSync(filePath)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": MIME_TYPES[extname(filePath)] ?? "application/octet-stream" });
    createReadStream(filePath).pipe(response);
  });
}

// One server for every Chrome, so the answer has to say whose it is: routing is by case name,
// which the probe itself returns in the body.
const waiting = new Map();
const onReceive = (body) => waiting.get(body.testCase)?.(body);

async function runCase({ name, steps }, port) {
  const lines = [`\n${name}`];
  const profile = mkdtempSync(join(tmpdir(), "academia-"));

  try {
    for (const testCase of steps) {
      const received = new Promise((resolve, reject) => {
        waiting.set(testCase, resolve);
        setTimeout(() => reject(new Error(`o caso ${testCase} não respondeu em ${CASE_TIMEOUT / 1000}s`)), CASE_TIMEOUT);
      });

      const browser = spawn(chrome, [
        "--headless", "--disable-gpu", "--no-sandbox",
        `--user-data-dir=${profile}`,
        `http://127.0.0.1:${port}/sonda?caso=${testCase}`
      ], { stdio: "ignore" });

      try {
        const { results } = await received;
        for (const { passed, name: title, detail: detail } of results) {
          const text = detail ? `${title} [${detail}]` : title;
          lines.push(passed ? ok(text) : fail(text));
        }
      } finally {
        waiting.delete(testCase);
        browser.kill();
        await new Promise((done) => browser.once("exit", done));
      }
    }
  } catch (error) {
    lines.push(fail(error.message));
  } finally {
    // On Windows Chrome releases the profile files after exiting, so removal retries and gives up
    // quietly: a forgotten temporary profile does not invalidate the check.
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch {
      /* the OS cleans the temp dir later */
    }
  }
  return lines;
}

if (chrome) {
  const app = server((body) => onReceive(body));
  await new Promise((done) => app.listen(0, "127.0.0.1", done));
  const { port } = app.address();

  // In parallel, with a cap: each case has its own Chrome profile, so they do not fight over the
  // database. The cap exists because a busy machine has returned an empty screen before, and that
  // becomes a failure that is not a bug.
  const queue = [...CHOSEN.entries()];
  const outputs = [];
  const work = async () => {
    while (queue.length > 0) {
      const [position, testCase] = queue.shift();
      outputs[position] = await runCase(testCase, port);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, work));
  for (const lines of outputs) console.log(lines.join("\n"));
  app.close();
} else {
  console.log("\nComportamento, Teclado, Migração da versão 1");
  console.log("  pulado, Chrome não encontrado.");
}

console.log(failures === 0 ? "\nTudo certo.\n" : `\n${failures} falha(s).\n`);
process.exit(failures === 0 ? 0 : 1);

// Verificação do app sem celular: sintaxe dos arquivos JS e montagem real da tela.
// Uso: node verificar.mjs
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// import.meta.dirname exige Node 20.11. O fallback mantém o script vivo em Node 18.
const PASTA = resolve(import.meta.dirname ?? new URL(".", import.meta.url).pathname);
const ARQUIVOS_JS = ["fichas.js", "banco.js", "app.js"];

const ESPERADO = [
  ["cartões", /class="exercicio/g, 7],
  ["abas", /class="aba"/g, 3],
  ["perfis", /name="perfil"/g, 2],
  ["diálogos", /<dialog id=/g, 5]
];

const CAMINHOS_CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
  "/usr/bin/google-chrome",
  "/usr/bin/chromium"
].filter(Boolean);

let falhas = 0;
const ok = (texto) => console.log(`  ok    ${texto}`);
const erro = (texto) => { console.log(`  FALHA ${texto}`); falhas++; };

console.log("\nSintaxe");
for (const arquivo of ARQUIVOS_JS) {
  try {
    execFileSync(process.execPath, ["--check", join(PASTA, arquivo)], { stdio: "pipe" });
    ok(arquivo);
  } catch (falha) {
    erro(`${arquivo}\n${falha.stderr?.toString().trim()}`);
  }
}

console.log("\nMontagem da tela");
const chrome = CAMINHOS_CHROME.find(existsSync);
if (!chrome) {
  console.log("  pulado, Chrome não encontrado. Acrescente o caminho em CAMINHOS_CHROME.");
} else {
  const resultado = spawnSync(chrome, [
    "--headless", "--disable-gpu", "--no-sandbox",
    "--virtual-time-budget=9000",
    // pathToFileURL, e não concatenação: no Windows o caminho tem barra invertida e letra de unidade.
    "--dump-dom", pathToFileURL(join(PASTA, "index.html")).href
  ], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });

  const dom = resultado.stdout ?? "";
  for (const [nome, padrao, esperado] of ESPERADO) {
    const achado = (dom.match(padrao) ?? []).length;
    achado === esperado ? ok(`${nome}: ${achado}`) : erro(`${nome}: esperava ${esperado}, achou ${achado}`);
  }
}

console.log(falhas === 0 ? "\nTudo certo.\n" : `\n${falhas} falha(s).\n`);
process.exit(falhas === 0 ? 0 : 1);

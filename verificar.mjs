// Verificação do app sem celular: sintaxe dos arquivos JS, montagem da tela em file:// e
// comportamento num Chrome de verdade servido por HTTP.
// Uso: node verificar.mjs
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// import.meta.dirname exige Node 20.11. O fallback mantém o script vivo em Node 18.
const PASTA = resolve(import.meta.dirname ?? new URL(".", import.meta.url).pathname);
const ARQUIVOS_JS = ["fichas.js", "banco.js", "app.js", "sonda.js"];

const ESPERADO = [
  ["cartões", /class="exercicio/g, 7],
  ["abas", /class="aba"/g, 3],
  ["perfis", /name="perfil"/g, 2],
  ["diálogos", /<dialog id=/g, 5]
];

// Cada caso roda num perfil de Chrome novo, então o IndexedDB nasce limpo. A migração precisa
// de dois carregamentos no mesmo perfil: primeiro escreve a versão 1, depois sobe o app.
const CASOS = [
  { nome: "Comportamento", passos: ["comportamento"] },
  { nome: "Teclado", passos: ["teclado"] },
  { nome: "Migração da versão 1", passos: ["preparar", "migracao"] }
];

const CAMINHOS_CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
  "/usr/bin/google-chrome",
  "/usr/bin/chromium"
].filter(Boolean);

const PRAZO_CASO = 60000;
const TIPOS = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".jpg": "image/jpeg", ".woff2": "font/woff2"
};

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

const chrome = CAMINHOS_CHROME.find(existsSync);

console.log("\nMontagem da tela em file://");
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

// A página devolve o resultado por sendBeacon em vez de despejo de DOM. Assim o tempo corre de
// verdade: sob --virtual-time-budget os temporizadores disparam antes das operações de banco, e
// o PRAZO_ABERTURA do banco.js estoura sem motivo.
function servidor(aoReceber) {
  const marcacao = readFileSync(join(PASTA, "index.html"), "utf8");

  return createServer((pedido, resposta) => {
    const url = new URL(pedido.url, "http://127.0.0.1");

    if (pedido.method === "POST" && url.pathname === "/resultado") {
      let corpo = "";
      pedido.on("data", (parte) => { corpo += parte; });
      pedido.on("end", () => {
        resposta.writeHead(204).end();
        aoReceber(JSON.parse(corpo));
      });
      return;
    }

    if (url.pathname === "/sonda") {
      const caso = url.searchParams.get("caso");
      const injecao = `<script src="/sonda.js"></script><script>Sonda.rodar(${JSON.stringify(caso)})</script>`;
      const pagina = caso === "preparar"
        ? `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>preparar</title></head><body>${injecao}</body></html>`
        : marcacao.replace("</body>", `${injecao}\n</body>`);
      resposta.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(pagina);
      return;
    }

    const caminho = join(PASTA, url.pathname === "/" ? "index.html" : url.pathname.slice(1));
    if (!caminho.startsWith(PASTA) || !existsSync(caminho)) {
      resposta.writeHead(404).end();
      return;
    }
    resposta.writeHead(200, { "content-type": TIPOS[extname(caminho)] ?? "application/octet-stream" });
    createReadStream(caminho).pipe(resposta);
  });
}

let aoReceber = () => {};

async function rodarCaso({ nome, passos }, porta) {
  console.log(`\n${nome}`);
  const perfil = mkdtempSync(join(tmpdir(), "academia-"));

  try {
    for (const caso of passos) {
      const recebido = new Promise((resolver, rejeitar) => {
        aoReceber = resolver;
        setTimeout(() => rejeitar(new Error(`o caso ${caso} não respondeu em ${PRAZO_CASO / 1000}s`)), PRAZO_CASO);
      });

      const navegador = spawn(chrome, [
        "--headless", "--disable-gpu", "--no-sandbox",
        `--user-data-dir=${perfil}`,
        `http://127.0.0.1:${porta}/sonda?caso=${caso}`
      ], { stdio: "ignore" });

      try {
        const { resultados } = await recebido;
        for (const { passou, nome: titulo, detalhe } of resultados) {
          const linha = detalhe ? `${titulo} [${detalhe}]` : titulo;
          passou ? ok(linha) : erro(linha);
        }
      } finally {
        navegador.kill();
        await new Promise((pronto) => navegador.once("exit", pronto));
      }
    }
  } catch (falha) {
    erro(falha.message);
  } finally {
    // No Windows o Chrome solta os arquivos do perfil depois de sair, então a remoção tenta de
    // novo e desiste calada: perfil temporário esquecido não invalida a verificação.
    try {
      rmSync(perfil, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch {
      /* o sistema limpa o temporário depois */
    }
  }
}

if (chrome) {
  const aplicacao = servidor((corpo) => aoReceber(corpo));
  await new Promise((pronto) => aplicacao.listen(0, "127.0.0.1", pronto));
  const { port } = aplicacao.address();

  for (const caso of CASOS) await rodarCaso(caso, port);
  aplicacao.close();
} else {
  console.log("\nComportamento, Teclado, Migração da versão 1");
  console.log("  pulado, Chrome não encontrado.");
}

console.log(falhas === 0 ? "\nTudo certo.\n" : `\n${falhas} falha(s).\n`);
process.exit(falhas === 0 ? 0 : 1);

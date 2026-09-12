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
const ARQUIVOS_JS = ["fichas.js", "banco.js", "app.js", "sonda.js", "sonda-firebase.js", "sw.js"];

// Quantos treinos e quantos exercícios saem do seed, não de um número escrito aqui: o app
// aceita de um treino em diante, e a suíte não pode ser o que trava isso em três.
const FICHAS = readFileSync(join(PASTA, "fichas.js"), "utf8");
const TREINOS = new Function(`${FICHAS}; return TREINOS;`)();
const TREINOS_EXEMPLO = new Function(`${FICHAS}; return TREINOS_EXEMPLO;`)();
const PERFIS = new Function(`${FICHAS}; return PERFIS;`)();
const LETRAS = Object.keys(TREINOS);

// Em file:// não há login, então a tela é a do visitante: o treino de exemplo, e nenhum seletor
// de perfil, que só o admin vê. Os radios existem na marcação, mas o app os cria por código.
const ESPERADO = [
  ["cartões", /class="exercicio/g, Object.values(TREINOS_EXEMPLO).reduce((total, lista) => total + lista.length, 0)],
  ["abas", /class="aba"/g, LETRAS.length],
  ["perfis", /name="perfil"/g, Object.keys(PERFIS).length],
  ["diálogos", /<dialog id=/g, 10]
];

// Cada caso roda num perfil de Chrome novo, então o IndexedDB nasce limpo. O caso Carga precisa
// de dois carregamentos no mesmo perfil: o primeiro grava o passado, o segundo sobe o app.
//
// `node verificar.mjs carga` roda só o que casa com a palavra, e pula o despejo em file://, que
// sozinho custa vinte segundos. É para isso que serve, mexer num caso sem pagar pelos outros.
const CASOS = [
  { nome: "Comportamento", passos: ["comportamento"] },
  { nome: "Teclado", passos: ["teclado"] },
  { nome: "Carga", passos: ["prepararCarga", "carga"] },
  { nome: "Perfil de exemplo", passos: ["exemplo"] },
  { nome: "Nuvem", passos: ["nuvem"] },
  { nome: "Visitante e login", passos: ["visitante"] }
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
const LADO_A_LADO = 3;
const TIPOS = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".jpg": "image/jpeg", ".woff2": "font/woff2",
  ".json": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml"
};

const FILTRO = process.argv[2]?.toLowerCase() ?? "";
const semAcento = (texto) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const ESCOLHIDOS = FILTRO ? CASOS.filter((caso) => semAcento(caso.nome).includes(semAcento(FILTRO))) : CASOS;

let falhas = 0;
// Com casos em paralelo, escrever linha a linha misturaria a saída de todos. Cada caso junta as
// suas e o fim imprime um bloco por caso, na ordem em que foram declarados.
const ok = (texto) => `  ok    ${texto}`;
const erro = (texto) => { falhas++; return `  FALHA ${texto}`; };

console.log("\nSintaxe");
for (const arquivo of ARQUIVOS_JS) {
  try {
    execFileSync(process.execPath, ["--check", join(PASTA, arquivo)], { stdio: "pipe" });
    console.log(ok(arquivo));
  } catch (falha) {
    console.log(erro(`${arquivo}\n${falha.stderr?.toString().trim()}`));
  }
}

const chrome = CAMINHOS_CHROME.find(existsSync);

const despejar = () => spawnSync(chrome, [
  "--headless", "--disable-gpu", "--no-sandbox",
  "--virtual-time-budget=20000",
  // pathToFileURL, e não concatenação: no Windows o caminho tem barra invertida e letra de unidade.
  "--dump-dom", pathToFileURL(join(PASTA, "index.html")).href
], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).stdout ?? "";

console.log("\nMontagem da tela em file://");
if (!chrome) {
  console.log("  pulado, Chrome não encontrado. Acrescente o caminho em CAMINHOS_CHROME.");
} else {
  // Com a máquina ocupada, o despejo às vezes sai antes de a lista montar e devolve zero cartão
  // em tudo. Uma segunda tentativa separa ruído de regressão: app quebrado devolve zero nas duas.
  let dom = despejar();
  if (!dom.includes('class="exercicio')) {
    console.log("  a tela veio vazia, tentando de novo");
    dom = despejar();
  }

  for (const [nome, padrao, esperado] of ESPERADO) {
    const achado = (dom.match(padrao) ?? []).length;
    console.log(achado === esperado ? ok(`${nome}: ${achado}`) : erro(`${nome}: esperava ${esperado}, achou ${achado}`));
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
      // O Firebase de mentira entra depois da ficha, porque lê os UIDs dela, e antes do banco.js,
      // que é quem o consome. A suíte nunca fala com o projeto de verdade.
      const falso = '<script src="/sonda-firebase.js"></script>';
      // A página do `preparar` não sobe o app, mas carrega a ficha e o Firebase falso: o que ela
      // grava tem que ter as chaves que o app de hoje espera, e escrevê-las à mão travaria a suíte.
      const pagina = caso.startsWith("preparar")
        ? `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>preparar</title></head>`
          + `<body><script src="/fichas.js"></script>${falso}${injecao}</body></html>`
        : marcacao
          .replace('<script src="banco.js">', `${falso}<script src="banco.js">`)
          .replace("</body>", `${injecao}\n</body>`);
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

// Um servidor para todos os Chromes, então a resposta precisa dizer de quem ela é: o roteamento
// é pelo nome do caso, que a própria sonda devolve no corpo.
const esperando = new Map();
const aoReceber = (corpo) => esperando.get(corpo.caso)?.(corpo);

async function rodarCaso({ nome, passos }, porta) {
  const linhas = [`\n${nome}`];
  const perfil = mkdtempSync(join(tmpdir(), "academia-"));

  try {
    for (const caso of passos) {
      const recebido = new Promise((resolver, rejeitar) => {
        esperando.set(caso, resolver);
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
          const texto = detalhe ? `${titulo} [${detalhe}]` : titulo;
          linhas.push(passou ? ok(texto) : erro(texto));
        }
      } finally {
        esperando.delete(caso);
        navegador.kill();
        await new Promise((pronto) => navegador.once("exit", pronto));
      }
    }
  } catch (falha) {
    linhas.push(erro(falha.message));
  } finally {
    // No Windows o Chrome solta os arquivos do perfil depois de sair, então a remoção tenta de
    // novo e desiste calada: perfil temporário esquecido não invalida a verificação.
    try {
      rmSync(perfil, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch {
      /* o sistema limpa o temporário depois */
    }
  }
  return linhas;
}

if (chrome) {
  const aplicacao = servidor((corpo) => aoReceber(corpo));
  await new Promise((pronto) => aplicacao.listen(0, "127.0.0.1", pronto));
  const { port } = aplicacao.address();

  // Em paralelo, com teto: cada caso tem o seu perfil de Chrome, então não disputam banco. O teto
  // existe porque máquina ocupada já devolveu tela vazia antes, e isso vira falha que não é bug.
  const fila = [...ESCOLHIDOS.entries()];
  const saidas = [];
  const trabalhar = async () => {
    while (fila.length > 0) {
      const [posicao, caso] = fila.shift();
      saidas[posicao] = await rodarCaso(caso, port);
    }
  };
  await Promise.all(Array.from({ length: Math.min(LADO_A_LADO, fila.length) }, trabalhar));
  for (const linhas of saidas) console.log(linhas.join("\n"));
  aplicacao.close();
} else {
  console.log("\nComportamento, Teclado, Migração da versão 1");
  console.log("  pulado, Chrome não encontrado.");
}

console.log(falhas === 0 ? "\nTudo certo.\n" : `\n${falhas} falha(s).\n`);
process.exit(falhas === 0 ? 0 : 1);

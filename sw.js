// Service worker do app. Existe por um motivo só: a academia tem sinal ruim, e o app precisa
// abrir sem rede depois de instalado na tela inicial.
//
// Subir VERSAO a cada publicação é o que troca o conteúdo guardado. Sem isso o aparelho fica
// com a versão velha para sempre, que é o jeito clássico de um service worker estragar um app.
const VERSAO = "v12";
const CACHE = `academia-${VERSAO}`;

const ESSENCIAIS = [
  "./",
  "index.html",
  "estilo.css",
  "mulish.woff2",
  "vendor/firebase-app-compat.js",
  "vendor/firebase-auth-compat.js",
  "vendor/firebase-firestore-compat.js",
  "fichas.js",
  "banco.js",
  "app.js",
  "manifest.json",
  "icone.svg",
  "icone-192.png",
  "icone-512.png"
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((nome) => nome !== CACHE).map((nome) => caches.delete(nome))))
      .then(() => self.clients.claim())
  );
});

// Guarda uma cópia só do que é arquivo do app: sem query, mesma origem, resposta inteira e boa.
// Resposta parcial ou de outro site no cache reaparece quebrada offline.
const guardavel = (pedido, resposta) =>
  resposta?.ok && resposta.type === "basic" && new URL(pedido.url).search === "";

async function guardar(pedido, resposta) {
  if (!guardavel(pedido, resposta)) return;
  const cache = await caches.open(CACHE);
  await cache.put(pedido, resposta);
}

// Navegação é rede primeiro: assim uma publicação nova aparece na primeira abertura com sinal,
// e o cache só entra quando a rede falha. O contrário deixaria o treino aberto numa versão velha
// sem jeito de sair dela.
async function paginaDaRede(pedido) {
  try {
    const resposta = await fetch(pedido);
    guardar(pedido, resposta.clone());
    return resposta;
  } catch {
    return (await caches.match(pedido)) ?? (await caches.match("index.html")) ?? Response.error();
  }
}

// Arquivo do app é cache primeiro, com busca em segundo plano para a próxima abertura já ter a
// versão nova. Abrir rápido na academia vale mais do que ter o CSS da última hora.
async function arquivoDoCache(pedido) {
  const guardado = await caches.match(pedido);
  const daRede = fetch(pedido)
    .then((resposta) => {
      guardar(pedido, resposta.clone());
      return resposta;
    })
    .catch(() => guardado);
  return guardado ?? daRede;
}

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;
  if (new URL(pedido.url).origin !== self.location.origin) return;

  evento.respondWith(pedido.mode === "navigate" ? paginaDaRede(pedido) : arquivoDoCache(pedido));
});

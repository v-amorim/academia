const ICONE_CAMERA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1.5 1.5 0 0 0 1.2-.6l.9-1.2a1.5 1.5 0 0 1 1.2-.6h4a1.5 1.5 0 0 1 1.2.6l.9 1.2a1.5 1.5 0 0 0 1.2.6h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z"/><circle cx="12" cy="13" r="3.5"/></svg>`;

const LETRAS = Object.keys(TREINOS);
const ALTURA_ITEM = 44;
const ESPERA_TOQUE_LONGO = 400;
const VAGA_DA_MAQUINA = 0;

const restantes = new Map();
const fotos = new Map();
let perfilAtivo = Banco.lerPreferencia("perfil") ?? "sun";
let letraAtiva = LETRAS[0];
let concluidas = new Set();
let exercicios = [];
let cartoes = [];
// Toque em aba enquanto a anterior ainda carrega: só a última escolha pode desenhar a lista.
let geracao = 0;
let alvoRoda = null;
let alvoVisor = null;
let alvoExercicio = null;
let alvoTreino = null;

const perfis = document.getElementById("perfis");
const abas = document.getElementById("abas");
const lista = document.getElementById("lista");
const secaoCiclo = document.getElementById("ciclo");
const aviso = document.getElementById("aviso");
const camera = document.getElementById("camera");
const dialogoRoda = document.getElementById("dialogo-roda");
const roda = document.getElementById("roda");
const rodaTitulo = document.getElementById("roda-titulo");
const visor = document.getElementById("visor");
const visorTitulo = document.getElementById("visor-titulo");
const visorImg = visor.querySelector("img");
const dialogoRecomecar = document.getElementById("dialogo-recomecar");
const dialogoExercicio = document.getElementById("dialogo-exercicio");
const dialogoTreino = document.getElementById("dialogo-treino");

// Sem banco a tela nasce da semente e o contador funciona só na memória. O aviso âmbar do topo
// é quem conta que nada será salvo; desligar o contador esconderia o app de quem abre o arquivo.
const exerciciosDe = (letra) =>
  Banco.disponivel() ? Banco.listarExercicios(letra) : Promise.resolve(TREINOS[letra]);

// O que o usuário marcou enquanto o banco não abria vence o que estava gravado, e é gravado por cima.
async function adotarBanco() {
  const pendentes = new Map(restantes);
  await Banco.semear(TREINOS);
  await carregarFotos();

  for (const letra of LETRAS) {
    for (const exercicio of await exerciciosDe(letra)) {
      if (pendentes.has(exercicio.id)) {
        await Banco.salvarSerie(perfilAtivo, letra, exercicio.id, pendentes.get(exercicio.id));
      }
    }
  }

  concluidas = await Banco.letrasConcluidas(perfilAtivo);
  document.getElementById("sem-banco").hidden = true;
  await selecionar(letraAtiva);
}

async function carregarFotos() {
  for (const [exId, vagas] of await Banco.lerFotos()) {
    const foto = vagas[VAGA_DA_MAQUINA];
    if (foto) fotos.set(exId, URL.createObjectURL(foto));
  }
}

const faltam = (exercicio) => restantes.get(exercicio.id) ?? exercicio.series;
const letraFeita = (letra) => concluidas.has(letra);
const rotulo = (faltando, reps) => (faltando === 0 ? "feito" : `${faltando}x${reps}`);

function linhaMeta(nome, valor) {
  const marca = document.createElement("b");
  marca.className = "valor";
  marca.textContent = valor;

  const linha = document.createElement("div");
  linha.append(nome, marca);
  return linha;
}

function refrescar() {
  cartoes.forEach((cartao) => cartao.atualizar());
  atualizarAbas();
  atualizarCiclo();
}

async function definir(exercicio, valor) {
  if (valor === faltam(exercicio)) return;

  restantes.set(exercicio.id, valor);
  Banco.salvarSerie(perfilAtivo, letraAtiva, exercicio.id, valor);

  const letra = letraAtiva;
  cartoes[exercicios.indexOf(exercicio)]?.atualizar();
  aviso.textContent = `${exercicio.nome}: ${rotulo(valor, exercicio.reps)}.`;

  if (exercicios.every((outro) => faltam(outro) === 0)) {
    await encerrar(letra);
    aviso.textContent = `${exercicio.nome}: feito. Treino ${letra} completo e gravado no histórico.`;
  }
  atualizarAbas();
  atualizarCiclo();
}

async function encerrar(letra) {
  concluidas.add(letra);
  await Banco.encerrarSessao(perfilAtivo, letra);
  if (letra === letraAtiva) refrescar();
  else {
    atualizarAbas();
    atualizarCiclo();
  }
}

async function resetarLetra(letra) {
  await Banco.resetarTreino(perfilAtivo, letra);
  concluidas.delete(letra);
  for (const exercicio of await exerciciosDe(letra)) restantes.set(exercicio.id, exercicio.series);
}

function ligarToqueLongo(elemento, aoSegurar) {
  let cronometro;
  let disparou = false;

  elemento.addEventListener("pointerdown", () => {
    disparou = false;
    cronometro = setTimeout(() => { disparou = true; aoSegurar(); }, ESPERA_TOQUE_LONGO);
  });
  for (const evento of ["pointerup", "pointercancel", "pointerleave"]) {
    elemento.addEventListener(evento, () => clearTimeout(cronometro));
  }
  elemento.addEventListener("contextmenu", (evento) => evento.preventDefault());

  // Consome a marca ao ser lida. Sem isso ela ficaria ligada até o próximo pointerdown, e o
  // clique do Enter, que não tem pointerdown, seria engolido para sempre depois de um toque longo.
  return () => {
    const houve = disparou;
    disparou = false;
    return houve;
  };
}

function criarPerfil([valor, nome]) {
  const rotuloPerfil = document.createElement("label");
  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "perfil";
  radio.value = valor;
  radio.className = "oculto-visual";
  radio.checked = valor === perfilAtivo;
  radio.onchange = () => trocarPerfil(valor);
  rotuloPerfil.append(radio, nome);
  return rotuloPerfil;
}

async function trocarPerfil(valor) {
  perfilAtivo = valor;
  Banco.gravarPreferencia("perfil", valor);
  restantes.clear();
  concluidas = await Banco.letrasConcluidas(valor);
  await selecionar(LETRAS.find((letra) => !letraFeita(letra)) ?? LETRAS[0]);
  aviso.textContent = `Treino de ${PERFIS[valor]}.`;
}

function criarAba(letra, posicao) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.id = `aba-${letra}`;
  botao.className = "aba";
  botao.setAttribute("role", "tab");
  botao.setAttribute("aria-controls", "lista");

  const segurou = ligarToqueLongo(botao, () => abrirMenuTreino(letra));
  botao.onclick = () => {
    if (segurou()) return;
    if (letra === letraAtiva) abrirMenuTreino(letra);
    else selecionar(letra);
  };

  botao.onkeydown = async (evento) => {
    const passos = { ArrowRight: 1, ArrowLeft: -1, Home: -posicao, End: LETRAS.length - 1 - posicao };
    const passo = passos[evento.key];
    if (passo === undefined) return;
    evento.preventDefault();
    const destino = (posicao + passo + LETRAS.length) % LETRAS.length;
    await selecionar(LETRAS[destino]);
    abas.children[destino].focus();
  };
  return botao;
}

function atualizarAbas() {
  LETRAS.forEach((letra, posicao) => {
    const botao = abas.children[posicao];
    const ativa = letra === letraAtiva;
    const concluido = letraFeita(letra);
    botao.setAttribute("aria-selected", ativa);
    botao.tabIndex = ativa ? 0 : -1;
    botao.innerHTML = concluido ? `${letra} <span class="marca" aria-hidden="true">✓</span>` : letra;
    botao.setAttribute("aria-label", [
      `Treino ${letra}`,
      concluido ? ", concluído" : "",
      ativa ? ". Ativar de novo abre as opções do treino." : ""
    ].join(""));
  });
}

function atualizarCiclo() {
  secaoCiclo.hidden = !LETRAS.every(letraFeita);
}

async function selecionar(letra) {
  const minha = ++geracao;
  const daLetra = await exerciciosDe(letra);
  const { registros } = await Banco.lerSessaoDeHoje(perfilAtivo, letra);
  if (minha !== geracao) return;

  for (const [exId, registro] of registros) restantes.set(exId, registro.restantes);
  letraAtiva = letra;
  exercicios = daLetra;
  lista.setAttribute("aria-labelledby", `aba-${letra}`);
  cartoes = exercicios.map(criarCartao);
  lista.replaceChildren(...cartoes.map((cartao) => cartao.item));
  atualizarAbas();
  atualizarCiclo();
}

function criarCartao(exercicio) {
  const item = document.createElement("li");
  item.className = "exercicio";

  const contador = document.createElement("button");
  contador.type = "button";
  contador.className = "contador";
  ligarContador(contador, exercicio);

  const meio = document.createElement("button");
  meio.type = "button";
  meio.className = "descricao";
  meio.setAttribute("aria-label",
    `${exercicio.nome}. Aparelho ${exercicio.aparelho}, vídeo ${exercicio.cod}. Resetar progresso.`);
  const segurouNome = ligarToqueLongo(meio, () => abrirResetExercicio(exercicio));
  meio.onclick = () => {
    if (segurouNome()) return;
    abrirResetExercicio(exercicio);
  };

  const nome = document.createElement("div");
  nome.className = "nome";
  nome.textContent = exercicio.nome;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.append(linhaMeta("Aparelho ", exercicio.aparelho), linhaMeta("Vídeo ", exercicio.cod));

  meio.append(nome, meta);

  const foto = document.createElement("button");
  foto.type = "button";
  foto.className = "foto";

  const cartao = {
    item,
    atualizar() {
      const faltando = faltam(exercicio);
      item.classList.toggle("feito", faltando === 0);
      contador.dataset.feito = faltando === 0 ? "1" : "0";
      contador.textContent = rotulo(faltando, exercicio.reps);
      contador.setAttribute("aria-label",
        faltando === 0
          ? `${exercicio.nome}: feito. Use as setas para ajustar.`
          : `${exercicio.nome}: ${rotulo(faltando, exercicio.reps)} restantes. Tocar para baixar uma série, setas para ajustar.`);

      const salva = fotos.get(exercicio.id);
      if (salva) {
        foto.innerHTML = `<img src="${salva}" alt="">`;
        foto.setAttribute("aria-label", `Ver foto da máquina de ${exercicio.nome}`);
        foto.onclick = () => abrirVisor(exercicio);
      } else {
        foto.innerHTML = ICONE_CAMERA;
        foto.setAttribute("aria-label", `Tirar foto da máquina de ${exercicio.nome}`);
        foto.onclick = () => tirarFoto(exercicio);
      }
    }
  };

  cartao.atualizar();
  item.append(contador, meio, foto);
  return cartao;
}

function ligarContador(contador, exercicio) {
  const segurou = ligarToqueLongo(contador, () => abrirRoda(exercicio));

  contador.addEventListener("click", () => {
    if (segurou()) return;
    definir(exercicio, Math.max(0, faltam(exercicio) - 1));
  });

  contador.addEventListener("keydown", (evento) => {
    const passos = { ArrowDown: -1, ArrowLeft: -1, ArrowUp: 1, ArrowRight: 1 };
    const passo = passos[evento.key];
    if (passo === undefined) return;
    evento.preventDefault();
    definir(exercicio, Math.min(exercicio.series, Math.max(0, faltam(exercicio) + passo)));
  });
}

function abrirRoda(exercicio) {
  const opcoes = [];
  for (let valor = exercicio.series; valor >= 0; valor--) opcoes.push(valor);
  alvoRoda = { exercicio, opcoes };

  rodaTitulo.textContent = `Séries restantes: ${exercicio.nome}`;
  roda.replaceChildren(
    Object.assign(document.createElement("div"), { className: "vazio" }),
    ...opcoes.map((valor) => {
      const linha = document.createElement("button");
      linha.type = "button";
      linha.textContent = rotulo(valor, exercicio.reps);
      linha.onclick = () => dialogoRoda.close(String(valor));
      return linha;
    }),
    Object.assign(document.createElement("div"), { className: "vazio" })
  );

  dialogoRoda.returnValue = "";
  dialogoRoda.showModal();
  roda.scrollTop = opcoes.indexOf(faltam(exercicio)) * ALTURA_ITEM;
}

document.getElementById("roda-confirmar").onclick = () => {
  const centralizado = Math.round(roda.scrollTop / ALTURA_ITEM);
  const limitado = Math.min(Math.max(centralizado, 0), alvoRoda.opcoes.length - 1);
  dialogoRoda.close(String(alvoRoda.opcoes[limitado]));
};

dialogoRoda.addEventListener("close", () => {
  if (dialogoRoda.returnValue === "") return;
  definir(alvoRoda.exercicio, Number(dialogoRoda.returnValue));
});

function abrirResetExercicio(exercicio) {
  alvoExercicio = exercicio;
  document.getElementById("exercicio-corpo").textContent =
    `${exercicio.nome} volta para ${exercicio.series}x${exercicio.reps}.`;
  dialogoExercicio.returnValue = "";
  dialogoExercicio.showModal();
}

dialogoExercicio.addEventListener("close", () => {
  if (dialogoExercicio.returnValue !== "resetar") return;
  definir(alvoExercicio, alvoExercicio.series);
});

function abrirMenuTreino(letra) {
  alvoTreino = letra;
  document.getElementById("treino-titulo").textContent = `Treino ${letra}`;
  dialogoTreino.returnValue = "";
  dialogoTreino.showModal();
}

dialogoTreino.addEventListener("close", async () => {
  const letra = alvoTreino;
  if (dialogoTreino.returnValue === "encerrar") {
    await encerrar(letra);
    aviso.textContent = `Treino ${letra} encerrado e gravado no histórico.`;
  }
  if (dialogoTreino.returnValue === "resetar") {
    await resetarLetra(letra);
    if (letra === letraAtiva) refrescar();
    else {
      atualizarAbas();
      atualizarCiclo();
    }
    aviso.textContent = `Progresso do treino ${letra} resetado.`;
  }
});

function abrirVisor(exercicio) {
  alvoVisor = exercicio;
  visorTitulo.textContent = `Máquina de ${exercicio.nome}`;
  visorImg.src = fotos.get(exercicio.id);
  visor.showModal();
}

visor.addEventListener("click", (evento) => { if (evento.target === visor) visor.close(); });
document.getElementById("visor-fechar").onclick = () => visor.close();
document.getElementById("visor-trocar").onclick = () => {
  visor.close();
  tirarFoto(alvoVisor);
};

function tirarFoto(exercicio) {
  camera.value = "";
  camera.onchange = async () => {
    const arquivo = camera.files[0];
    if (!arquivo) return;
    const reduzida = await reduzir(arquivo);
    Banco.salvarFoto(exercicio.id, VAGA_DA_MAQUINA, reduzida);
    fotos.set(exercicio.id, URL.createObjectURL(reduzida));
    cartoes[exercicios.indexOf(exercicio)]?.atualizar();
    aviso.textContent = `Foto salva para ${exercicio.nome}.`;
  };
  camera.click();
}

// Foto crua de celular passa de vários MB e estoura a cota do IndexedDB em poucas máquinas.
async function reduzir(arquivo, lado = 800) {
  const imagem = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, lado / Math.max(imagem.width, imagem.height));
  const tela = document.createElement("canvas");
  tela.width = Math.round(imagem.width * escala);
  tela.height = Math.round(imagem.height * escala);
  tela.getContext("2d").drawImage(imagem, 0, 0, tela.width, tela.height);
  imagem.close();
  return new Promise((resolver) => tela.toBlob(resolver, "image/jpeg", 0.8));
}

document.getElementById("abrir-recomecar").onclick = () => {
  dialogoRecomecar.returnValue = "";
  dialogoRecomecar.showModal();
};

dialogoRecomecar.addEventListener("close", async () => {
  if (dialogoRecomecar.returnValue !== "recomecar") return;

  // O cursor do ciclo primeiro. Resetar depois é o que põe as sessões de hoje dentro do ciclo
  // novo, porque o reset devolve o iniciadoEm delas para agora.
  Banco.iniciarCiclo(perfilAtivo);
  for (const letra of LETRAS) await resetarLetra(letra);
  await selecionar(LETRAS[0]);
  aviso.textContent = `Ciclo de ${PERFIS[perfilAtivo]} recomeçado. Treino A liberado.`;
});

(async () => {
  const temBanco = await Banco.abrir(adotarBanco);
  await Banco.semear(TREINOS);
  await carregarFotos();
  concluidas = await Banco.letrasConcluidas(perfilAtivo);

  document.getElementById("sem-banco").hidden = temBanco;
  perfis.append(...Object.entries(PERFIS).map(criarPerfil));
  abas.append(...LETRAS.map(criarAba));
  navigator.storage?.persist?.();
  await selecionar(LETRAS.find((letra) => !letraFeita(letra)) ?? LETRAS[0]);
})();

// Traço de 1.5px porque o ícone fica ao lado de texto de peso 400, e currentColor porque um SVG
// só é recolorido por estado, nunca trocado por outro arquivo.
const ICONE_CAMERA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1.5 1.5 0 0 0 1.2-.6l.9-1.2a1.5 1.5 0 0 1 1.2-.6h4a1.5 1.5 0 0 1 1.2.6l.9 1.2a1.5 1.5 0 0 0 1.2.6h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z"/><circle cx="12" cy="13" r="3.5"/></svg>`;

// O dado guarda o valor cru, minúsculo e sem acento; a tela mostra a palavra como um nativo
// escreve, com diacrítico completo e maiúscula inicial.
const NOME_DO_GRUPO = {
  peito: "Peito", costas: "Costas", ombro: "Ombro", biceps: "Bíceps", triceps: "Tríceps",
  quadriceps: "Quadríceps", posterior: "Posterior", gluteo: "Glúteo", adutor: "Adutor",
  panturrilha: "Panturrilha"
};

const LETRAS = Object.keys(TREINOS);
const ESPERA_TOQUE_LONGO = 400;
const VAGA_DA_MAQUINA = 0;
// Três vagas fixas por exercício: a capa e dois ajustes da máquina que são mais visuais do que
// descritíveis na observação. Sem lista crescente, sem capa escolhida, sem limite para explicar.
const VAGAS = ["Máquina", "Ajuste 1", "Ajuste 2"];

const restantes = new Map();
// exId para lista de object URL por vaga. Lista esparsa: vaga sem foto é buraco.
const fotos = new Map();
let vagaAtiva = VAGA_DA_MAQUINA;
let perfilAtivo = Banco.lerPreferencia("perfil") ?? "sun";
let letraAtiva = LETRAS[0];
let concluidas = new Set();
let exercicios = [];
let cartoes = [];
// Toque em aba enquanto a anterior ainda carrega: só a última escolha pode desenhar a lista.
let geracao = 0;
let alvoVisor = null;
let alvoExercicio = null;
let alvoTreino = null;

const perfis = document.getElementById("perfis");
const abas = document.getElementById("abas");
const lista = document.getElementById("lista");
const secaoCiclo = document.getElementById("ciclo");
const aviso = document.getElementById("aviso");
const camera = document.getElementById("camera");
const visor = document.getElementById("visor");
const visorTitulo = document.getElementById("visor-titulo");
const visorMeta = document.getElementById("visor-meta");
const visorQuadro = document.getElementById("visor-quadro");
const vagas = document.getElementById("vagas");
const observacao = document.getElementById("observacao");
const visorApagar = document.getElementById("visor-apagar");
const visorTrocar = document.getElementById("visor-trocar");
const dialogoApagar = document.getElementById("dialogo-apagar");
const telaCheia = document.getElementById("tela-cheia");
const telaCheiaTitulo = document.getElementById("tela-cheia-titulo");
const zoom = document.getElementById("zoom");
const zoomImg = zoom.querySelector("img");
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
  for (const [exId, porVaga] of await Banco.lerFotos()) {
    fotos.set(exId, porVaga.map((foto) => URL.createObjectURL(foto)));
  }
}

const fotoDa = (exercicio, vaga) => fotos.get(exercicio.id)?.[vaga];
const capaDe = (exercicio) => fotoDa(exercicio, VAGA_DA_MAQUINA);

const faltam = (exercicio) => restantes.get(exercicio.id) ?? exercicio.series;
const letraFeita = (letra) => concluidas.has(letra);
const rotulo = (faltando, reps) => (faltando === 0 ? "feito" : `${faltando}×${reps}`);

// Só músculo. O equipamento vive dentro do nome do exercício, onde ele é parte de como a pessoa
// chama o movimento, e não uma etiqueta de catálogo ao lado dele.
const etiquetasDe = (exercicio) =>
  exercicio.grupos.map((grupo) => NOME_DO_GRUPO[grupo]).join(" · ");

// As séries que faltam são o número grande, e as repetições a linha pequena embaixo.
// Sinal de multiplicação, não a letra x: é o que um nativo lê como "doze vezes".
const rotuloDoContador = (faltando, reps) =>
  faltando === 0
    ? `<span class="serie feito">Feito</span>`
    : `<span class="serie">${faltando}</span><span class="reps">×${reps}</span>`;

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
  cartoes[exercicios.indexOf(exercicio)]?.atualizar({ animar: true });
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
    if (ativa) abas.style.setProperty("--ativa", posicao);
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
  // Toque curto abre o visor, o mesmo destino da foto. O toque longo é atalho para o reset, que
  // também está no visor como botão, e é por ali que o teclado chega nele.
  const segurouNome = ligarToqueLongo(meio, () => abrirResetExercicio(exercicio));
  meio.onclick = () => {
    if (segurouNome()) return;
    abrirVisor(exercicio);
  };
  meio.setAttribute("aria-label", `${exercicio.nome}. ${etiquetasDe(exercicio)}. Abrir detalhes e fotos.`);

  const nome = document.createElement("div");
  nome.className = "nome";
  nome.textContent = exercicio.nome;

  const grupos = document.createElement("div");
  grupos.className = "grupos";
  grupos.textContent = etiquetasDe(exercicio);

  meio.append(nome, grupos);

  const foto = document.createElement("button");
  foto.type = "button";
  foto.className = "foto";
  foto.onclick = () => abrirVisor(exercicio);

  const cartao = {
    item,
    // Só quem mudou anima, e só quando mudou: montar a lista inteira com entrada seria
    // animação de carga, que não diz nada.
    atualizar({ animar = false } = {}) {
      const faltando = faltam(exercicio);
      item.classList.toggle("feito", faltando === 0);
      contador.dataset.feito = faltando === 0 ? "1" : "0";
      contador.innerHTML = rotuloDoContador(faltando, exercicio.reps);
      if (animar) contador.querySelector(".serie").classList.add("entrando");
      // O preenchimento sobe com o que já foi executado, não com o que falta.
      contador.style.setProperty("--progresso", `${((exercicio.series - faltando) / exercicio.series) * 100}%`);
      contador.setAttribute("aria-label",
        faltando === 0
          ? `${exercicio.nome}: feito. Use as setas para ajustar.`
          : `${exercicio.nome}: ${rotulo(faltando, exercicio.reps)} restantes. Tocar para baixar uma série, setas para ajustar.`);

      const capa = capaDe(exercicio);
      foto.innerHTML = capa ? `<img src="${capa}" alt="">` : ICONE_CAMERA;
      foto.setAttribute("aria-label", capa
        ? `Fotos da máquina de ${exercicio.nome}`
        : `Fotos da máquina de ${exercicio.nome}, nenhuma ainda`);
    }
  };

  cartao.atualizar();
  item.append(contador, meio, foto);
  return cartao;
}

// Segurar o contador e arrastar muda o valor no lugar, como o seletor de hora do celular. A fita
// de números nasce dentro do próprio contador, cobrindo-o, e acompanha o dedo. Não é diálogo: o
// ajuste acontece onde o dedo está, e soltar confirma.
function ligarContador(contador, exercicio) {
  let ajuste = null;
  let cronometro;
  let ajustou = false;
  let origem = 0;

  const desistir = () => clearTimeout(cronometro);

  contador.addEventListener("pointerdown", (evento) => {
    origem = evento.clientY;
    ajustou = false;
    cronometro = setTimeout(() => {
      ajuste = { origem, inicial: faltam(exercicio), valor: faltam(exercicio) };
      // Ponteiro sintético não existe para o navegador, e capturá-lo lança.
      try { contador.setPointerCapture(evento.pointerId); } catch { /* gesto sem captura */ }
      abrirFita(contador, exercicio, ajuste.valor);
      navigator.vibrate?.(10);
    }, ESPERA_TOQUE_LONGO);
  });

  contador.addEventListener("pointermove", (evento) => {
    // Antes do gesto pegar, dedo que anda é rolagem da lista, não ajuste.
    if (!ajuste) {
      if (Math.abs(evento.clientY - origem) > 10) desistir();
      return;
    }
    const continuo = Math.min(exercicio.series,
      Math.max(0, ajuste.inicial + (ajuste.origem - evento.clientY) / PASSO_DO_AJUSTE));
    ajuste.valor = Math.round(continuo);
    moverFita(continuo, ajuste.valor);
  });

  const soltar = () => {
    desistir();
    if (!ajuste) return;
    const valor = ajuste.valor;
    ajuste = null;
    ajustou = true;
    fecharFita(contador);
    definir(exercicio, valor);
  };
  contador.addEventListener("pointerup", soltar);
  contador.addEventListener("pointercancel", soltar);
  contador.addEventListener("pointerleave", desistir);
  contador.addEventListener("contextmenu", (evento) => evento.preventDefault());

  // O pointerup do gesto ainda gera um clique. Sem esta guarda, o ajuste seria seguido de uma
  // série a menos. A marca é consumida na leitura, senão o clique do Enter morreria depois.
  contador.addEventListener("click", () => {
    if (ajustou) {
      ajustou = false;
      return;
    }
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

// Uma linha da fita por unidade, e o dedo anda com ela: 44px de arrasto muda o valor em um.
const PASSO_DO_AJUSTE = 44;
let fita = null;

function abrirFita(contador, exercicio, valor) {
  fita = document.createElement("div");
  fita.className = "fita";
  // O contador guarda o rótulo de acessibilidade, e a fita é o desenho do mesmo número.
  fita.setAttribute("aria-hidden", "true");

  const coluna = document.createElement("div");
  coluna.className = "fita-coluna";
  coluna.append(...Array.from({ length: exercicio.series + 1 }, (_, opcao) => {
    const linha = document.createElement("span");
    linha.className = opcao === 0 ? "fita-valor feito" : "fita-valor";
    linha.textContent = opcao === 0 ? "Feito" : String(opcao);
    return linha;
  }));

  fita.append(coluna);
  contador.classList.add("ajustando");
  contador.append(fita);
  moverFita(valor, valor);
}

function moverFita(continuo, escolhido) {
  const coluna = fita?.firstElementChild;
  if (!coluna) return;
  coluna.style.setProperty("--desvio", `${-continuo * PASSO_DO_AJUSTE}px`);
  [...coluna.children].forEach((linha, opcao) => linha.classList.toggle("escolhido", opcao === escolhido));
}

function fecharFita(contador) {
  contador.classList.remove("ajustando");
  fita?.remove();
  fita = null;
}

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

// O quadro vazio também abre o visor, e não a câmera direto: o número do vídeo mora aqui, e ele
// precisa estar ao alcance justamente onde ainda não há foto.
function abrirVisor(exercicio) {
  alvoVisor = exercicio;
  vagaAtiva = VAGA_DA_MAQUINA;
  visorTitulo.textContent = exercicio.nome;
  montarMeta(exercicio);
  observacao.value = exercicio.observacao ?? "";
  desenharVisor();
  visor.showModal();
}

// Informação de consulta, não de execução, e por isso mora no visor. Os valores viram chip, e o
// rótulo fica apagado: quem abriu isto veio atrás do número, não da palavra.
const valorEmChip = (texto) =>
  Object.assign(document.createElement("b"), { className: "valor", textContent: texto });

// `16/25` na origem quer dizer dois aparelhos onde dá para fazer o mesmo exercício, então a tela
// escreve "ou". Montado por nó, e não por innerHTML: na fase 4 esse texto vem do editor.
function montarMeta(exercicio) {
  const partes = [document.createTextNode("Aparelho ")];
  exercicio.aparelho.split("/").forEach((valor, posicao) => {
    if (posicao) partes.push(document.createTextNode(" ou "));
    partes.push(valorEmChip(valor.trim()));
  });
  partes.push(document.createTextNode(" · Vídeo "), valorEmChip(exercicio.cod));
  visorMeta.replaceChildren(...partes);
}

function desenharVisor() {
  const exercicio = alvoVisor;
  const atual = fotoDa(exercicio, vagaAtiva);
  const nomeDaVaga = VAGAS[vagaAtiva].toLowerCase();

  visorQuadro.innerHTML = atual
    ? `<button type="button" class="ampliar" aria-label="Ampliar a foto de ${nomeDaVaga}"><img src="${atual}" alt=""></button>`
    : `${ICONE_CAMERA}<span>Nenhuma foto de ${nomeDaVaga} ainda</span>`;
  if (atual) visorQuadro.querySelector(".ampliar").onclick = () => abrirTelaCheia(exercicio, vagaAtiva);

  vagas.replaceChildren(...VAGAS.map((nome, vaga) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "vaga";
    const url = fotoDa(exercicio, vaga);
    botao.innerHTML =
      `<span class="vaga-quadro">${url ? `<img src="${url}" alt="">` : ICONE_CAMERA}</span>` +
      `<span class="vaga-nome">${nome}</span>`;
    botao.setAttribute("aria-label", url ? nome : `${nome}, sem foto`);
    if (vaga === vagaAtiva) botao.setAttribute("aria-current", "true");
    botao.onclick = () => {
      vagaAtiva = vaga;
      desenharVisor();
    };
    return botao;
  }));

  visorTrocar.textContent = atual ? "Trocar foto" : "Tirar foto";
  visorApagar.hidden = !atual;
}

const refrescarVisor = (exercicio) => {
  if (visor.open && alvoVisor === exercicio) desenharVisor();
};

function abrirTelaCheia(exercicio, vaga) {
  telaCheiaTitulo.textContent = `${exercicio.nome} · ${VAGAS[vaga]}`;
  zoomImg.src = fotoDa(exercicio, vaga);
  reiniciarZoom();
  telaCheia.showModal();
}

document.getElementById("tela-cheia-fechar").onclick = () => telaCheia.close();

// Pinça, arrasto e toque duplo na mão, por pointer events. A pinça nativa não serve: ela amplia a
// página inteira, diálogo junto. O ponto sob os dedos fica parado: a translação é recalculada a
// partir de onde esse ponto estava na imagem quando o gesto começou.
const ESCALA_MAXIMA = 5;
const ESCALA_DO_TOQUE_DUPLO = 2.5;
const INTERVALO_TOQUE_DUPLO = 300;
let escala = 1;
let deslocamento = { x: 0, y: 0 };
const ponteiros = new Map();
let gesto = null;
let ultimoToque = { em: 0, x: 0, y: 0 };

function reiniciarZoom() {
  escala = 1;
  deslocamento = { x: 0, y: 0 };
  ponteiros.clear();
  gesto = null;
  aplicarZoom();
}

function aplicarZoom() {
  // Ampliada, a imagem não pode deixar borda vazia no meio da tela; em escala 1 fica centrada.
  const area = zoom.getBoundingClientRect();
  const folgaX = Math.max(0, (zoomImg.offsetWidth * escala - area.width) / 2);
  const folgaY = Math.max(0, (zoomImg.offsetHeight * escala - area.height) / 2);
  deslocamento.x = Math.min(folgaX, Math.max(-folgaX, deslocamento.x));
  deslocamento.y = Math.min(folgaY, Math.max(-folgaY, deslocamento.y));
  zoomImg.style.transform = `translate(${deslocamento.x}px, ${deslocamento.y}px) scale(${escala})`;
}

const centroDaArea = () => {
  const area = zoom.getBoundingClientRect();
  return { x: area.left + area.width / 2, y: area.top + area.height / 2 };
};

// Ponto da tela para ponto da imagem, na escala e deslocamento de agora.
function pontoNaImagem(ponto) {
  const centro = centroDaArea();
  return { x: (ponto.x - centro.x - deslocamento.x) / escala, y: (ponto.y - centro.y - deslocamento.y) / escala };
}

// Escolhe a escala nova e desloca para que `fixo` da imagem continue sob `ponto` da tela.
function ampliarEm(ponto, fixo, novaEscala) {
  const centro = centroDaArea();
  escala = Math.min(ESCALA_MAXIMA, Math.max(1, novaEscala));
  deslocamento = { x: ponto.x - centro.x - fixo.x * escala, y: ponto.y - centro.y - fixo.y * escala };
  aplicarZoom();
}

const meioDe = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distanciaDe = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function iniciarGesto() {
  const dedos = [...ponteiros.values()];
  if (dedos.length >= 2) {
    const meio = meioDe(dedos[0], dedos[1]);
    gesto = { distancia: distanciaDe(dedos[0], dedos[1]), escala, fixo: pontoNaImagem(meio) };
  } else if (dedos.length === 1) {
    gesto = { origem: dedos[0], deslocamento: { ...deslocamento } };
  } else {
    gesto = null;
  }
}

zoom.addEventListener("pointerdown", (evento) => {
  zoom.setPointerCapture(evento.pointerId);
  ponteiros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
  iniciarGesto();
});

zoom.addEventListener("pointermove", (evento) => {
  if (!ponteiros.has(evento.pointerId)) return;
  ponteiros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
  const dedos = [...ponteiros.values()];
  if (dedos.length >= 2 && gesto?.distancia) {
    const meio = meioDe(dedos[0], dedos[1]);
    ampliarEm(meio, gesto.fixo, gesto.escala * (distanciaDe(dedos[0], dedos[1]) / gesto.distancia));
  } else if (dedos.length === 1 && gesto?.origem && escala > 1) {
    deslocamento = {
      x: gesto.deslocamento.x + dedos[0].x - gesto.origem.x,
      y: gesto.deslocamento.y + dedos[0].y - gesto.origem.y
    };
    aplicarZoom();
  }
});

function soltar(evento) {
  const dedo = ponteiros.get(evento.pointerId);
  ponteiros.delete(evento.pointerId);

  // Toque é dedo que desceu e subiu quase no mesmo lugar; arrasto não conta.
  const agora = Date.now();
  const foiToque = evento.type === "pointerup" && dedo && ponteiros.size === 0 && gesto?.origem
    && distanciaDe(dedo, gesto.origem) < 10;
  if (foiToque && agora - ultimoToque.em < INTERVALO_TOQUE_DUPLO && distanciaDe(dedo, ultimoToque) < 30) {
    ampliarEm(dedo, pontoNaImagem(dedo), escala > 1 ? 1 : ESCALA_DO_TOQUE_DUPLO);
    ultimoToque = { em: 0, x: 0, y: 0 };
  } else if (foiToque) {
    ultimoToque = { em: agora, ...dedo };
  }

  // Sem pinça sobrando e quase no tamanho natural: encaixa em 1, senão fica um resto de zoom que
  // não se vê e só atrapalha o arrasto.
  if (ponteiros.size === 0 && escala < 1.05) {
    escala = 1;
    deslocamento = { x: 0, y: 0 };
    aplicarZoom();
  }
  iniciarGesto();
}
zoom.addEventListener("pointerup", soltar);
zoom.addEventListener("pointercancel", soltar);

zoom.addEventListener("wheel", (evento) => {
  evento.preventDefault();
  const ponto = { x: evento.clientX, y: evento.clientY };
  ampliarEm(ponto, pontoNaImagem(ponto), escala * Math.exp(-evento.deltaY * 0.002));
}, { passive: false });

document.getElementById("visor-fechar").onclick = () => visor.close();
document.getElementById("visor-resetar").onclick = () => abrirResetExercicio(alvoVisor);
visorTrocar.onclick = () => tirarFoto(alvoVisor, vagaAtiva);

visorApagar.onclick = () => {
  document.getElementById("apagar-corpo").textContent =
    `A foto de ${VAGAS[vagaAtiva].toLowerCase()} de ${alvoVisor.nome} sai deste aparelho.`;
  dialogoApagar.returnValue = "";
  dialogoApagar.showModal();
};

dialogoApagar.addEventListener("close", () => {
  if (dialogoApagar.returnValue !== "apagar") return;
  const exercicio = alvoVisor;
  const vaga = vagaAtiva;
  Banco.apagarFoto(exercicio.id, vaga);
  const porVaga = fotos.get(exercicio.id) ?? [];
  URL.revokeObjectURL(porVaga[vaga]);
  delete porVaga[vaga];
  cartoes[exercicios.indexOf(exercicio)]?.atualizar();
  refrescarVisor(exercicio);
  aviso.textContent = `Foto de ${VAGAS[vaga].toLowerCase()} de ${exercicio.nome} apagada.`;
});

// Salva ao sair do campo. Enter conclui em vez de quebrar linha: observação é "banco 4, pino 7",
// não texto corrido, e no celular é o que fecha o teclado.
observacao.addEventListener("change", () => {
  const exercicio = alvoVisor;
  const texto = observacao.value.trim();
  exercicio.observacao = texto;
  Banco.salvarObservacao(exercicio.id, texto);
  aviso.textContent = texto
    ? `Observação de ${exercicio.nome} salva.`
    : `Observação de ${exercicio.nome} apagada.`;
});
observacao.addEventListener("keydown", (evento) => {
  if (evento.key !== "Enter" || evento.shiftKey) return;
  evento.preventDefault();
  observacao.blur();
});

function tirarFoto(exercicio, vaga) {
  camera.value = "";
  camera.onchange = async () => {
    const arquivo = camera.files[0];
    if (!arquivo) return;
    const reduzida = await reduzir(arquivo);
    Banco.salvarFoto(exercicio.id, vaga, reduzida);
    const porVaga = fotos.get(exercicio.id) ?? [];
    if (porVaga[vaga]) URL.revokeObjectURL(porVaga[vaga]);
    porVaga[vaga] = URL.createObjectURL(reduzida);
    fotos.set(exercicio.id, porVaga);
    cartoes[exercicios.indexOf(exercicio)]?.atualizar();
    refrescarVisor(exercicio);
    aviso.textContent = `Foto de ${VAGAS[vaga].toLowerCase()} de ${exercicio.nome} salva.`;
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

// Tocar fora fecha qualquer diálogo, e fechar assim é sempre cancelar: close() sem argumento
// deixa o returnValue vazio, e todo ouvinte de close trata vazio como cancelado.
//
// As duas condições são necessárias. Só o alvo não basta porque o recheio vazio do diálogo
// também é o próprio elemento, e tocar nele fecharia. Só a coordenada não basta porque o clique
// que o Enter gera num botão focado chega em 0,0, que cai fora da caixa: sem o alvo, o teclado
// perdia a capacidade de confirmar qualquer diálogo.
for (const caixa of document.querySelectorAll("dialog")) {
  caixa.addEventListener("click", (evento) => {
    if (evento.target !== caixa) return;
    const area = caixa.getBoundingClientRect();
    const dentro = evento.clientX >= area.left && evento.clientX <= area.right
      && evento.clientY >= area.top && evento.clientY <= area.bottom;
    if (!dentro) caixa.close();
  });
}

(async () => {
  const temBanco = await Banco.abrir(adotarBanco);
  await Banco.semear(TREINOS);
  await carregarFotos();
  concluidas = await Banco.letrasConcluidas(perfilAtivo);

  document.getElementById("sem-banco").hidden = temBanco;
  perfis.append(...Object.entries(PERFIS).map(criarPerfil));
  abas.append(...LETRAS.map(criarAba));
  abas.style.setProperty("--quantas", LETRAS.length);
  navigator.storage?.persist?.();
  // Duas APIs de plataforma fora do banco.js, as duas aqui e as duas ignorando o retorno. O
  // registro falha calado por file://, que não tem origem segura, e é o comportamento esperado:
  // aberto como arquivo o app roda sem guardar nada, service worker inclusive.
  navigator.serviceWorker?.register("sw.js").catch(() => { /* sem origem segura */ });
  await selecionar(LETRAS.find((letra) => !letraFeita(letra)) ?? LETRAS[0]);
})();

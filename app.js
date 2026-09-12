// Traço de 1.5px porque o ícone fica ao lado de texto de peso 400, e currentColor porque um SVG
// só é recolorido por estado, nunca trocado por outro arquivo.
const ICONE_CAMERA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1.5 1.5 0 0 0 1.2-.6l.9-1.2a1.5 1.5 0 0 1 1.2-.6h4a1.5 1.5 0 0 1 1.2.6l.9 1.2a1.5 1.5 0 0 0 1.2.6h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z"/><circle cx="12" cy="13" r="3.5"/></svg>`;

// Traço 2 porque o ícone tem 13px: a 1.5 a linha some ao lado do número em peso 700. Mesmo
// vocabulário do ícone da câmera, currentColor e nada de arquivo por estado.
const traco = (miolo) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${miolo}</svg>`;

const ICONE_SUBIU = traco(`<path d="M3 17 9.5 10.5 14 15 21 8"/><path d="M15 8h6v6"/>`);
const ICONE_DESCEU = traco(`<path d="M3 7 9.5 13.5 14 9 21 16"/><path d="M15 16h6v-6"/>`);
const ICONE_MANTEVE = traco(`<path d="M5 9h14"/><path d="M5 15h14"/>`);

// O dado guarda o valor cru, minúsculo e sem acento; a tela mostra a palavra como um nativo
// escreve, com diacrítico completo e maiúscula inicial.
const NOME_DO_GRUPO = {
  peito: "Peito", costas: "Costas", ombro: "Ombro", biceps: "Bíceps", triceps: "Tríceps",
  quadriceps: "Quadríceps", posterior: "Posterior", gluteo: "Glúteo", adutor: "Adutor",
  panturrilha: "Panturrilha", lombar: "Lombar", abdomen: "Abdômen"
};

// Os treinos vêm do banco a cada carga, e a ficha só serve de fallback sem banco. `letra` é o
// id do treino, que sessões e exercícios guardam; o nome é o que a aba mostra.
let LETRAS = Object.keys(TREINOS);
let treinos = LETRAS.map((letra, ordem) => ({ id: letra, nome: letra, ordem }));
const nomeDoTreino = (letra) => treinos.find((treino) => treino.id === letra)?.nome ?? letra;
// "Treino A" para nome curto, e o nome sozinho quando ele já é uma palavra ("Pernas").
const tituloDoTreino = (letra) => {
  const nome = nomeDoTreino(letra);
  return nome.length <= 2 ? `Treino ${nome}` : nome;
};
const ESPERA_TOQUE_LONGO = 400;
// Abaixo disto o dedo ainda está parado: é tremor de quem segura, não gesto.
const FOLGA_DO_DEDO = 10;
const VAGA_DA_MAQUINA = 0;
// Três vagas fixas por exercício: a capa e dois ajustes da máquina que são mais visuais do que
// descritíveis na observação. Sem lista crescente, sem capa escolhida, sem limite para explicar.
const VAGAS = ["Máquina", "Ajuste 1", "Ajuste 2"];

const restantes = new Map();
// exId para a carga digitada hoje, e exId para a carga dos outros dias, da mais nova para a mais
// velha. A de hoje sai da sessão; as outras, do histórico.
const cargasDeHoje = new Map();
const minutosDeHoje = new Map();
const historicoDeCarga = new Map();
// exId para lista de object URL por vaga. Lista esparsa: vaga sem foto é buraco.
const fotos = new Map();
let vagaAtiva = VAGA_DA_MAQUINA;
let perfilAtivo = Banco.lerPreferencia("perfil") ?? "sun";
let letraAtiva = LETRAS[0];
let concluidas = new Set();
const exerciciosPorLetra = new Map();
const cartaoPorId = new Map();
let alvoVisor = null;
let alvoExercicio = null;
let alvoTreino = null;

const perfis = document.getElementById("perfis");
const abas = document.getElementById("abas");
const principal = document.querySelector("main");
const carrossel = document.getElementById("carrossel");
const secaoCiclo = document.getElementById("ciclo");
const aviso = document.getElementById("aviso");
const seletorDeFoto = document.getElementById("foto-nova");
const visor = document.getElementById("visor");
const visorTitulo = document.getElementById("visor-titulo");
const visorMeta = document.getElementById("visor-meta");
const visorQuadro = document.getElementById("visor-quadro");
const vagas = document.getElementById("vagas");
const observacao = document.getElementById("observacao");
const repeticoes = document.getElementById("repeticoes");
const repeticoesRotulo = document.getElementById("repeticoes-rotulo");
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

// Sem banco a tela nasce do seed e o contador funciona só na memória. O aviso âmbar do topo
// é quem conta que nada será salvo; desligar o contador esconderia o app de quem abre o arquivo.
const catalogoDe = (perfil) => FICHA_DE[perfil] ?? TREINOS;
const exerciciosDe = (letra) =>
  Banco.disponivel() ? Banco.listarExercicios(letra, perfilAtivo) : Promise.resolve(catalogoDe(perfilAtivo)[letra] ?? []);

// Só o catálogo de quem está na tela: na nuvem cada perfil tem o seu, e quem não é admin não
// pode escrever no dos outros. O histórico de exemplo vem junto, e só na primeira vez.
async function seedPerfil(perfil) {
  if (perfil === "example") {
    await Banco.seed(TREINOS_EXEMPLO, DONO_DO_EXEMPLO, ARQUIVADOS_EXEMPLO);
    await Banco.seedHistorico("example", TREINOS_EXEMPLO, ARQUIVADOS_EXEMPLO);
  } else {
    await Banco.seed(catalogoDe(perfil), [perfil]);
  }
}

// Quem entrou decide o que a tela mostra. Sem login é o exemplo. Sun e Shine abrem no próprio
// treino. Só o admin vê o rodapé de perfis: para quem não é admin, os demais nem existem.
const PAPEL_POR_UID = Object.fromEntries(Object.entries(CONTAS).map(([papel, uid]) => [uid, papel]));
let usuario = null;

async function aplicarUsuario(uid) {
  usuario = PAPEL_POR_UID[uid] ?? null;
  const permitidos = usuario === "admin" ? Object.keys(PERFIS) : usuario ? [usuario] : ["example"];
  for (const perfil of permitidos.filter((outro) => outro !== "example")) {
    await Banco.ligarNuvem(perfil, CONTAS[perfil]);
  }
  perfis.hidden = usuario !== "admin";
  // Easter eggs: a marca ganha um coração quando é a Shine que entrou, e um sol quando é o Sun.
  document.getElementById("abrir-menu").classList.toggle("com-coracao", usuario === "shine");
  document.getElementById("abrir-menu").classList.toggle("com-sol", usuario === "sun");
  const lembrado = Banco.lerPreferencia("perfil");
  perfilAtivo = permitidos.includes(lembrado) ? lembrado : permitidos[0];
  perfis.querySelector(`input[value="${perfilAtivo}"]`).checked = true;

  await seedPerfil(perfilAtivo);
  concluidas = await Banco.letrasConcluidas(perfilAtivo);
  await carregarTreinos();
  irPara(LETRAS.find((letra) => !letraFeita(letra)) ?? LETRAS[0], false);
  atualizarMenu();
}

// O que o usuário marcou enquanto o banco não abria vence o que estava gravado, e é gravado por cima.
async function adotarBanco() {
  const pendentes = new Map(restantes);
  await seedPerfil(perfilAtivo);
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
  await carregarTreinos();
}

async function carregarFotos() {
  for (const [exId, porVaga] of await Banco.lerFotos()) {
    fotos.set(exId, porVaga.map((foto) => URL.createObjectURL(foto)));
  }
}

const fotoDa = (exercicio, vaga) => fotos.get(exercicio.id)?.[vaga];
const capaDe = (exercicio) => fotoDa(exercicio, VAGA_DA_MAQUINA);

const faltam = (exercicio) => restantes.get(exercicio.id) ?? exercicio.series;

// A carga vale para o exercício inteiro, e não por série: no 3×12 as três são com o mesmo peso.
// O que está na tela é o de hoje, se existir, e senão o da última vez, que é o que a pessoa vai
// repetir. O número é o que está escrito no equipamento, sem conta de cabeça.
// A última vez que aquele número foi anotado, que não é a última sessão: o dia em que a carga
// entrou pode não ser o mesmo em que o tempo entrou.
const ultimoDe = (exercicio, campo) =>
  historicoDeCarga.get(exercicio.id)?.find((entrada) => entrada[campo] != null);

const ultimaCarga = (exercicio) => ultimoDe(exercicio, "carga");
const cargaDe = (exercicio) => cargasDeHoje.get(exercicio.id) ?? ultimaCarga(exercicio)?.carga;
const minutosDe = (exercicio) => minutosDeHoje.get(exercicio.id) ?? ultimoDe(exercicio, "minutos")?.minutos;

// Nem todo exercício se mede em quilo: a esteira se mede em km/h, a bicicleta em nível, e o
// tempo do aeróbico em minutos. A unidade vive no exercício, e o padrão é o peso da máquina.
const unidadeDe = (exercicio) => exercicio.unidade ?? "kg";
const ehAerobico = (exercicio) => exercicio.tipo === "tempo";
const semCarga = (exercicio) => exercicio.tipo === "corpo";

// Vírgula, como se fala. Sem casa decimal quando o número é redondo, porque halter de 14 é 14.
const soONumero = (valor) => String(Math.round(valor * 100) / 100).replace(".", ",");
const emMedida = (valor, unidade) => `${soONumero(valor)} ${unidade}`;

// A unidade vira caixa alta pelo CSS, e o texto continua natural no código. Em minúscula o k sobe
// e o g desce, e ao lado de dígitos tabulares o conjunto fica torto.
//
// Número e unidade saem num nó só de propósito: soltos dentro de um contêiner flex eles viram
// dois itens, o alinhamento centralizado levanta a unidade, e "30 kg" passa a ler "30 elevado
// a kg". Juntos, a unidade volta a ser texto na mesma linha de base.
function comTexto(conteudo, unidade) {
  const bloco = Object.assign(document.createElement("span"), { className: "quilos" });
  bloco.append(texto(conteudo),
    Object.assign(document.createElement("span"), { className: "unidade", textContent: unidade }));
  return bloco;
}

const comUnidade = (valor, unidade) => comTexto(soONumero(valor), unidade);

// Texto que só existe para o leitor de tela, onde a tela se satisfaz com um ícone.
const oculto = (conteudo) =>
  Object.assign(document.createElement("span"), { className: "oculto-visual", textContent: conteudo });
const emDia = (data) => `${data.slice(8)}/${data.slice(5, 7)}`;
const emNumero = (texto) => {
  const valor = Number(texto.trim().replace(",", "."));
  return texto.trim() !== "" && Number.isFinite(valor) && valor >= 0 && valor < 1000 ? valor : null;
};
const letraFeita = (letra) => concluidas.has(letra);
const rotulo = (faltando, reps) => (faltando === 0 ? "feito" : `${faltando}×${reps}`);

// Só músculo. O equipamento vive dentro do nome do exercício, onde ele é parte de como a pessoa
// chama o movimento, e não uma etiqueta de catálogo ao lado dele.
const etiquetasDe = (exercicio) =>
  exercicio.grupos.map((grupo) => NOME_DO_GRUPO[grupo]).join(" · ");

// As séries que faltam são o número grande, e as repetições a linha pequena embaixo.
// Sinal de multiplicação, não a letra x: é o que um nativo lê como "doze vezes".
// O haltere da marca, na mesma geometria do icone.svg em 24 unidades: o "feito" ganha a forma de
// duas linhas do "3 × 12 rep", com o ícone no lugar do número. O texto continua embaixo, porque
// ícone sozinho não carrega significado.
const ICONE_HALTERE = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="11.05" width="12" height="1.9" rx="0.95"/><rect x="3.9" y="8.4" width="2.75" height="7.2" rx="1.2"/><rect x="17.35" y="8.4" width="2.75" height="7.2" rx="1.2"/><rect x="1.9" y="9.9" width="1.6" height="4.2" rx="0.8"/><rect x="20.5" y="9.9" width="1.6" height="4.2" rx="0.8"/></svg>`;

const rotuloDoContador = (faltando, reps) =>
  faltando === 0
    ? `<span class="serie feito">${ICONE_HALTERE}</span><span class="reps"><span class="unidade">Feito</span></span>`
    : `<span class="serie">${faltando}<span class="vezes">×</span></span><span class="reps">${reps}<span class="unidade">rep</span></span>`;

function refrescar() {
  cartaoPorId.forEach((cartao) => cartao.atualizar());
  atualizarAbas();
  atualizarCiclo();
}

async function definir(exercicio, valor) {
  if (valor === faltam(exercicio)) return;

  restantes.set(exercicio.id, valor);
  // A letra vem do exercício, e não da aba visível: com os três painéis montados ao mesmo tempo,
  // o que está na tela não é mais garantia de quem está sendo mexido.
  Banco.salvarSerie(perfilAtivo, exercicio.letra, exercicio.id, valor);

  // O chip herdado é da tela, e só vira registro quando uma série desce. Sem esta condição, um
  // treino aberto e abandonado gravaria peso em exercício que ninguém fez, e a tendência do
  // histórico passaria a mentir. Subir a série de volta não conta: nada foi levantado.
  if (valor < exercicio.series && !cargasDeHoje.has(exercicio.id) && ultimaCarga(exercicio)) {
    gravarDigitado(exercicio, "carga", ultimaCarga(exercicio).carga);
  }

  const letra = exercicio.letra;
  cartaoPorId.get(exercicio.id)?.atualizar({ animar: true });
  aviso.textContent = `${exercicio.nome}: ${rotulo(valor, exercicio.reps)}.`;

  if ((exerciciosPorLetra.get(letra) ?? []).every((outro) => faltam(outro) === 0)) {
    await encerrar(letra);
    aviso.textContent = `${exercicio.nome}: feito. ${tituloDoTreino(letra)} completo e gravado no histórico.`;
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
  let origem = null;

  elemento.addEventListener("pointerdown", (evento) => {
    disparou = false;
    origem = { x: evento.clientX, y: evento.clientY };
    cronometro = setTimeout(() => { disparou = true; aoSegurar(); }, ESPERA_TOQUE_LONGO);
  });
  // Dedo que anda é rolagem ou troca de treino, e nenhuma das duas pode virar toque longo.
  elemento.addEventListener("pointermove", (evento) => {
    if (origem && Math.hypot(evento.clientX - origem.x, evento.clientY - origem.y) > FOLGA_DO_DEDO) {
      clearTimeout(cronometro);
    }
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
  await seedPerfil(valor);
  concluidas = await Banco.letrasConcluidas(valor);
  await carregarTreinos();
  irPara(LETRAS.find((letra) => !letraFeita(letra)) ?? LETRAS[0], false);
  aviso.textContent = `Treino de ${PERFIS[valor]}.`;
}

function criarAba(letra, posicao) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.id = `aba-${letra}`;
  botao.className = "aba";
  botao.setAttribute("role", "tab");
  botao.setAttribute("aria-controls", "lista");

  // Editando, a aba ativa abre as opções do treino em si (nome, ordem, tirar); fora da edição,
  // as do dia (encerrar, resetar).
  const abrirOpcoes = () => (editando ? abrirEditarTreino(letra) : abrirMenuTreino(letra));
  const segurou = ligarToqueLongo(botao, abrirOpcoes);
  botao.onclick = () => {
    if (segurou()) return;
    if (letra === letraAtiva) abrirOpcoes();
    else irPara(letra);
  };

  botao.onkeydown = async (evento) => {
    const passos = { ArrowRight: 1, ArrowLeft: -1, Home: -posicao, End: LETRAS.length - 1 - posicao };
    const passo = passos[evento.key];
    if (passo === undefined) return;
    evento.preventDefault();
    const destino = (posicao + passo + LETRAS.length) % LETRAS.length;
    irPara(LETRAS[destino]);
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
    // A posição da pílula não vem daqui: ela segue a rolagem do carrossel, quadro a quadro.
    botao.replaceChildren(nomeDoTreino(letra));
    if (concluido) {
      const marca = document.createElement("span");
      marca.className = "marca";
      marca.setAttribute("aria-hidden", "true");
      marca.textContent = "✓";
      botao.append(" ", marca);
    }
    botao.setAttribute("aria-label", [
      `${tituloDoTreino(letra)}`,
      concluido ? ", concluído" : "",
      ativa ? ". Ativar de novo abre as opções do treino." : ""
    ].join(""));
  });
}

function atualizarCiclo() {
  secaoCiclo.hidden = !LETRAS.every(letraFeita);
}

// Carrega os treinos todos de uma vez e monta um painel por treino. Antes era um treino por vez,
// com uma guarda de geração para o caso de o dedo trocar de aba no meio da leitura; com todos
// montados, essa corrida deixa de existir.
async function carregarTreinos() {
  exerciciosPorLetra.clear();
  restantes.clear();
  cargasDeHoje.clear();
  minutosDeHoje.clear();
  historicoDeCarga.clear();

  if (Banco.disponivel()) {
    treinos = await Banco.listarTreinos(perfilAtivo);
  } else {
    treinos = Object.keys(catalogoDe(perfilAtivo)).map((letra, ordem) => ({ id: letra, nome: letra, ordem }));
  }
  LETRAS = treinos.map((treino) => treino.id);
  if (!LETRAS.includes(letraAtiva)) letraAtiva = LETRAS[0];
  abas.replaceChildren(...LETRAS.map(criarAba));
  abas.style.setProperty("--quantas", LETRAS.length);

  for (const letra of LETRAS) {
    exerciciosPorLetra.set(letra, await exerciciosDe(letra));

    const { registros } = await Banco.lerSessaoDeHoje(perfilAtivo, letra);
    for (const [exId, registro] of registros) {
      restantes.set(exId, registro.restantes);
      if (registro.carga != null) cargasDeHoje.set(exId, registro.carga);
      if (registro.minutos != null) minutosDeHoje.set(exId, registro.minutos);
    }

    for (const [exId, cargas] of await Banco.cargasAnteriores(perfilAtivo, letra)) {
      historicoDeCarga.set(exId, cargas);
    }
  }

  montarPaineis();
  atualizarAbas();
  atualizarCiclo();
}

function montarPaineis() {
  cartaoPorId.clear();
  carrossel.replaceChildren(...LETRAS.map((letra) => {
    const painel = document.createElement("section");
    painel.className = "painel";
    painel.id = `painel-${letra}`;
    painel.dataset.letra = letra;
    painel.setAttribute("role", "tabpanel");
    painel.setAttribute("aria-labelledby", `aba-${letra}`);

    const lista = document.createElement("ul");
    lista.className = "lista";
    lista.append(...(exerciciosPorLetra.get(letra) ?? []).map((exercicio, posicao) => {
      const cartao = criarCartao(exercicio, posicao);
      cartaoPorId.set(exercicio.id, cartao);
      return cartao.item;
    }));

    painel.append(lista);
    return painel;
  }));

  irPara(letraAtiva, false);
}

// Rolar até o painel. O navegador anima quando pode; sob movimento reduzido ele salta, que é o
// que a pessoa pediu ao ligar a preferência.
function irPara(letra, suave = true) {
  const painel = document.getElementById(`painel-${letra}`);
  if (!painel) return;
  // A rolagem suave leva quadros para chegar, e no meio do caminho o carrossel está parado em
  // cima do painel de onde saiu. Sem guardar para onde ela vai, o pouso atrasado dessa animação
  // desfaz a escolha que o dedo acabou de fazer na aba seguinte.
  //
  // Já estando lá, não há rolagem nenhuma, e marcar destino aqui o deixaria marcado para sempre:
  // sem evento de rolagem para limpá-lo, todo gesto seguinte seria descartado por ele.
  const jaEstaLa = Math.abs(carrossel.scrollLeft - painel.offsetLeft) < 1;
  destinoDaRolagem = jaEstaLa ? null : letra;
  clearTimeout(esqueceroDestino);
  // Rede de segurança: rolagem que não chega, por tela escondida ou aba em segundo plano, não
  // pode trancar a troca de treino.
  if (!jaEstaLa) esqueceroDestino = setTimeout(() => { destinoDaRolagem = null; }, PRAZO_DO_DESTINO);
  carrossel.scrollTo({ left: painel.offsetLeft, behavior: suave ? "smooth" : "instant" });
  assumir(letra);
}

// Quem manda na aba ativa é onde o carrossel parou. Chamar de novo com a mesma letra não faz
// nada, então o clique na aba e o evento de snap podem chegar os dois sem trabalho repetido.
function assumir(letra, anunciar = false) {
  if (letra === letraAtiva || !LETRAS.includes(letra)) return;
  letraAtiva = letra;
  atualizarAbas();
  atualizarCiclo();
  if (anunciar) aviso.textContent = `${tituloDoTreino(letra)}.`;
}

// A pílula anda com a rolagem, em fração de painel: é o que faz o indicador acompanhar o dedo em
// vez de pular quando o gesto termina. Passivo de propósito, porque isto roda a cada quadro.
// Só um gesto de verdade anuncia a troca de treino. Rolagem que o próprio app pediu já tem a
// mensagem dela, e anunciar de novo apagaria o "ciclo recomeçado" que acabou de ser escrito.
let gestoNoCarrossel = false;
for (const nome of ["pointerdown", "wheel", "touchstart"]) {
  carrossel.addEventListener(nome, () => { gestoNoCarrossel = true; }, { passive: true });
}

carrossel.addEventListener("scroll", () => {
  if (carrossel.clientWidth > 0) {
    abas.style.setProperty("--ativa", carrossel.scrollLeft / carrossel.clientWidth);
  }
  agendarPouso();
}, { passive: true });

// `scrollsnapchange` é o evento certo, e diz sozinho em qual painel o gesto pousou. Onde ele não
// existe, o mesmo trabalho sai de uma rolagem que ficou quieta.
if ("onscrollsnapchange" in carrossel) {
  carrossel.addEventListener("scrollsnapchange", (evento) => {
    const letra = evento.snapTargetInline?.dataset.letra;
    if (letra) pousarEm(letra);
  });
}

// Uma rolagem pedida pelo app deixa eventos de snap para trás. Sem esta guarda, o snap atrasado
// da rolagem anterior desfaz a aba que o app acabou de escolher.
function pousarEm(letra) {
  if (destinoDaRolagem !== null && letra !== destinoDaRolagem) return;
  destinoDaRolagem = null;
  assumir(letra, gestoNoCarrossel);
  gestoNoCarrossel = false;
}

const ESPERA_POUSO = 120;
const PRAZO_DO_DESTINO = 1000;
let pouso;
let esqueceroDestino;
let destinoDaRolagem = null;

function agendarPouso() {
  clearTimeout(pouso);
  pouso = setTimeout(() => {
    const largura = carrossel.clientWidth;
    if (largura === 0) return;
    // A rolagem ficou quieta, então onde ela parou é a verdade, venha de gesto ou de animação.
    // O destino não entra aqui: uma animação interrompida no meio pelo dedo deixaria a guarda
    // rejeitando o painel onde a pessoa de fato parou.
    destinoDaRolagem = null;
    assumir(LETRAS[Math.round(carrossel.scrollLeft / largura)], gestoNoCarrossel);
    gestoNoCarrossel = false;
  }, ESPERA_POUSO);
}

// No desktop o navegador não arrasta conteúdo com o mouse, então o deslize entre treinos é
// feito à mão só para ele: o dedo continua com o scroll snap nativo. Durante o arrasto o snap
// desliga, senão ele puxa o painel de volta a cada quadro, e volta depois que o pouso animado
// termina. Arrasto que começa no contador não entra, porque ali o gesto é o ajuste de séries.
const ARRASTO = { origemX: 0, origemScroll: 0, arrastando: false, arrastou: false };
let devolverSnap;

carrossel.addEventListener("pointerdown", (evento) => {
  if (evento.pointerType !== "mouse" || evento.button !== 0 || evento.target.closest(".contador")) return;
  ARRASTO.origemX = evento.clientX;
  ARRASTO.origemScroll = carrossel.scrollLeft;
  ARRASTO.arrastando = false;
  ARRASTO.arrastou = false;
});

carrossel.addEventListener("pointermove", (evento) => {
  if (evento.pointerType !== "mouse" || !(evento.buttons & 1)) return;
  const distancia = evento.clientX - ARRASTO.origemX;
  if (!ARRASTO.arrastando) {
    if (Math.abs(distancia) <= FOLGA_DO_DEDO) return;
    ARRASTO.arrastando = true;
    ARRASTO.arrastou = true;
    clearTimeout(devolverSnap);
    carrossel.classList.add("arrastando");
    try { carrossel.setPointerCapture(evento.pointerId); } catch { /* ponteiro sintético */ }
  }
  carrossel.scrollLeft = ARRASTO.origemScroll - distancia;
});

function soltarArrasto() {
  if (!ARRASTO.arrastando) return;
  ARRASTO.arrastando = false;
  const largura = carrossel.clientWidth;
  if (largura > 0) irPara(LETRAS[Math.min(LETRAS.length - 1, Math.max(0, Math.round(carrossel.scrollLeft / largura)))]);
  // O snap só volta depois que a rolagem pousou, senão ele corta a animação e o painel salta.
  const devolver = () => {
    carrossel.classList.remove("arrastando");
    carrossel.removeEventListener("scrollend", devolver);
  };
  carrossel.addEventListener("scrollend", devolver);
  devolverSnap = setTimeout(devolver, PRAZO_DO_DESTINO);
}
carrossel.addEventListener("pointerup", soltarArrasto);
carrossel.addEventListener("pointercancel", soltarArrasto);

// Soltar o mouse depois de arrastar ainda dispara um clique no que estiver embaixo, e ele
// baixaria uma série ou abriria o visor. A marca é consumida aqui, na captura, antes de todos.
carrossel.addEventListener("click", (evento) => {
  if (!ARRASTO.arrastou) return;
  ARRASTO.arrastou = false;
  evento.stopPropagation();
  evento.preventDefault();
}, { capture: true });

// Tocar na esteira é dizer "fiz". O tempo que estava na caixa vira registro do dia, e tocar de
// novo desfaz: sem série para baixar, é o toque que abre e fecha o exercício.
function concluirAerobico(exercicio) {
  const feito = faltam(exercicio) === 0;
  if (feito) {
    minutosDeHoje.delete(exercicio.id);
    Banco.apagarValor(perfilAtivo, exercicio.letra, exercicio.id, "minutos");
  } else {
    const minutos = minutosDe(exercicio);
    if (minutos !== undefined) gravarDigitado(exercicio, "minutos", minutos);
  }
  definir(exercicio, feito ? exercicio.series : 0);
  aviso.textContent = feito
    ? `${exercicio.nome}: desfeito.`
    : `${exercicio.nome}: feito, ${emMedida(minutosDe(exercicio) ?? 0, "min")}.`;
}

function criarCampo(exercicio, qual) {
  const campo = document.createElement("input");
  campo.type = "text";
  // decimal, e não number: o campo numérico recusa vírgula e ainda traz setas que ninguém usa.
  campo.inputMode = "decimal";
  campo.className = "carga-campo";
  campo.hidden = true;
  campo.setAttribute("aria-label", `Carga de ${exercicio.nome}, em ${unidadeDe(exercicio)}`);
  return campo;
}

function criarCartao(exercicio, posicao) {
  const item = document.createElement("li");
  item.className = "exercicio";
  // Só serve à escada da entrada: é o que dá a cada cartão o seu atraso.
  item.style.setProperty("--posicao", posicao);

  const contador = document.createElement("button");
  contador.type = "button";
  contador.className = "contador";

  // Na esteira não há série para baixar: a caixa de cima vira o tempo. Tocar marca feito com o
  // tempo que já estava ali, e segurar abre a mesma fita do contador, só que em minutos.
  if (ehAerobico(exercicio)) ligarTempo(contador, exercicio);
  else ligarContador(contador, exercicio);

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

  // Carga e séries dividem a mesma caixa, separadas por um traço: de pé na máquina as duas são a
  // mesma pergunta, e ler uma no canto do cartão e a outra embaixo obriga o olho a viajar.
  const bloco = document.createElement("div");
  bloco.className = "bloco";

  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "carga-valor";

  const campo = criarCampo(exercicio, "carga");
  // Mesma gramática do contador: toque faz, segurar ajusta. No dedo o chip é pequeno demais para
  // ser alvo, e tocar nele querendo baixar série abria o teclado. Pelo teclado o clique chega
  // com detail 0, e aí o chip continua sendo o caminho para a carga.
  const segurouChip = ligarToqueLongo(chip, () => abrirCampoDaCarga(exercicio, chip, campo));
  chip.onclick = (evento) => {
    if (segurouChip()) return;
    if (evento.detail === 0) return abrirCampoDaCarga(exercicio, chip, campo);
    contador.click();
  };
  ligarCampoDaCarga(exercicio, chip, campo);

  bloco.append(contador);
  // Flexão e abdominal não têm peso na máquina, então a caixa de baixo some em vez de ficar
  // esperando um número que nunca vem.
  if (!semCarga(exercicio)) bloco.append(chip, campo);

  const cartao = {
    item,
    // Só quem mudou anima, e só quando mudou: montar a lista inteira com entrada seria
    // animação de carga, que não diz nada.
    atualizar({ animar = false } = {}) {
      const faltando = faltam(exercicio);
      item.classList.toggle("feito", faltando === 0);
      contador.dataset.feito = faltando === 0 ? "1" : "0";

      if (ehAerobico(exercicio)) {
        const minutos = minutosDe(exercicio);
        // Mesmo desenho do contador de séries: o número grande em cima e a unidade na linha de
        // baixo, onde nos outros cartões fica o "12 rep".
        contador.innerHTML = minutos === undefined
          ? `<span class="serie">+</span><span class="reps"><span class="unidade">min</span></span>`
          : `<span class="serie">${tempoCurto(minutos)}</span><span class="reps"><span class="unidade">${unidadeDoTempo(minutos)}</span></span>`;
        contador.dataset.vazio = minutos === undefined ? "1" : "0";
        contador.style.setProperty("--progresso", "0%");
        contador.setAttribute("aria-label", minutos === undefined
          ? `Anotar o tempo de ${exercicio.nome}. Segurar para escolher os minutos.`
          : `${exercicio.nome}: ${emMedida(minutos, "min")}. Tocar marca feito, segurar ajusta o tempo, setas mudam de cinco em cinco.`);
      } else {
        contador.innerHTML = rotuloDoContador(faltando, exercicio.reps);
        if (animar) contador.querySelector(".serie").classList.add("entrando");
        // O preenchimento sobe com o que já foi executado, não com o que falta.
        contador.style.setProperty("--progresso", `${((exercicio.series - faltando) / exercicio.series) * 100}%`);
        contador.setAttribute("aria-label",
          faltando === 0
            ? `${exercicio.nome}: feito. Use as setas para ajustar.`
            : `${exercicio.nome}: ${rotulo(faltando, exercicio.reps)} restantes. Tocar para baixar uma série, setas para ajustar.`);
      }

      const capa = capaDe(exercicio);
      foto.innerHTML = capa ? `<img src="${capa}" alt="">` : ICONE_CAMERA;
      foto.setAttribute("aria-label", capa
        ? `Fotos da máquina de ${exercicio.nome}`
        : `Fotos da máquina de ${exercicio.nome}, nenhuma ainda`);

      if (semCarga(exercicio)) return;
      const carga = cargaDe(exercicio);
      const rumo = rumoDaCarga(exercicio);
      const unidade = unidadeDe(exercicio);
      chip.dataset.vazio = carga === undefined ? "1" : "0";
      // O ícone só aparece quando a carga mudou hoje. O quanto mudou mora no histórico: nesta
      // caixa cabe a direção, e direção é o que se quer saber de pé na máquina.
      chip.innerHTML = rumo === 0 ? "" : rumo > 0 ? ICONE_SUBIU : ICONE_DESCEU;
      chip.classList.toggle("carga-ganho", rumo > 0);
      chip.classList.toggle("carga-queda", rumo < 0);
      chip.append(carga === undefined ? comTexto("+", unidade) : comUnidade(carga, unidade));
      chip.setAttribute("aria-label", rotuloDaCarga(exercicio, carga, rumo));
    }
  };

  cartao.atualizar();
  item.append(bloco, meio, foto, acoesDeEdicao(exercicio));
  return cartao;
}

// A fileira do modo de edição, presente em todo cartão e visível só editando: subir, descer,
// mudar de treino e tirar. Tirar é arquivar, e o histórico é o caminho de volta.
function acoesDeEdicao(exercicio) {
  const fileira = document.createElement("div");
  fileira.className = "edicao-acoes";
  const botao = (texto, rotulo, agir) => {
    const elemento = document.createElement("button");
    elemento.type = "button";
    elemento.textContent = texto;
    elemento.setAttribute("aria-label", `${rotulo}: ${exercicio.nome}`);
    elemento.onclick = agir;
    return elemento;
  };
  const subir = botao("↑", "Subir", () => deslocarExercicio(exercicio, -1));
  const descer = botao("↓", "Descer", () => deslocarExercicio(exercicio, 1));
  const lista = exerciciosPorLetra.get(exercicio.letra) ?? [];
  subir.disabled = lista[0]?.id === exercicio.id;
  descer.disabled = lista[lista.length - 1]?.id === exercicio.id;
  fileira.append(
    subir,
    descer,
    botao("Mover", "Mudar de treino", () => abrirEscolhaDeTreino(exercicio, "mover")),
    botao("Tirar", "Tirar do treino", () => tirarExercicio(exercicio))
  );
  return fileira;
}

// O selo diz a direção três vezes: no ícone, na cor e no sinal do número. Assim ele continua
// legível para quem não distingue as duas cores, e continua bonito para quem distingue.
function selo(diferenca, unidade) {
  const marca = document.createElement("span");
  const subiu = diferenca > 0;
  marca.className = `selo ${diferenca === 0 ? "selo-neutro" : subiu ? "selo-ganho" : "selo-queda"}`;
  marca.innerHTML = diferenca === 0 ? ICONE_MANTEVE : subiu ? ICONE_SUBIU : ICONE_DESCEU;
  // Sem palavra quando não mudou: o sinal de igual já diz tudo, e a palavra ao lado dele era
  // ruído. Quem lê por leitor de tela continua ouvindo, porque o ícone é mudo.
  if (diferenca === 0) marca.append(oculto("sem mudança"));
  else marca.append(comTexto(comSinal(diferenca), unidade));
  return marca;
}

const seloNeutro = (palavra) => {
  const marca = document.createElement("span");
  marca.className = "selo selo-neutro";
  marca.textContent = palavra;
  return marca;
};

// Subiu, caiu ou está igual, comparando o que foi digitado hoje com a última vez. Carga apenas
// herdada não tem rumo: ela é a da última vez, e não mudou coisa nenhuma.
function rumoDaCarga(exercicio) {
  const anterior = ultimaCarga(exercicio);
  const hoje = cargasDeHoje.get(exercicio.id);
  if (hoje === undefined || !anterior) return 0;
  return Math.sign(diferencaEntre(hoje, anterior.carga));
}

// O ícone é enfeite do que o rótulo já diz por extenso: quem lê por leitor de tela ouve a
// diferença em quilos, que na caixa não caberia.
function rotuloDaCarga(exercicio, carga, rumo) {
  if (carga === undefined) return `Carga de ${exercicio.nome}: nenhuma. Segurar para digitar.`;
  const anterior = ultimaCarga(exercicio);
  const comparacao = rumo === 0 ? ""
    : ` ${comSinal(diferencaEntre(cargasDeHoje.get(exercicio.id), anterior.carga))} ${unidadeDe(exercicio)} desde ${emDia(anterior.data)}.`;
  return `Carga de ${exercicio.nome}: ${emMedida(carga, unidadeDe(exercicio))}.${comparacao} Segurar para mudar.`;
}

const texto = (conteudo) => document.createTextNode(conteudo);

// Os dois números que se digitam num cartão. A caixa não sabe onde eles moram: recebe como ler o
// de hoje, o que mostrar quando não há nada de hoje, e como gravar e apagar.
const DIGITADOS = {
  carga: {
    deHoje: (exercicio) => cargasDeHoje.get(exercicio.id),
    mostrar: cargaDe,
    guardar: (exercicio, valor) => cargasDeHoje.set(exercicio.id, valor),
    esquecer: (exercicio) => cargasDeHoje.delete(exercicio.id),
    unidade: unidadeDe,
    aoApagar: (exercicio) => `Carga de ${exercicio.nome} apagada.`
  },
  minutos: {
    deHoje: (exercicio) => minutosDeHoje.get(exercicio.id),
    mostrar: minutosDe,
    guardar: (exercicio, valor) => minutosDeHoje.set(exercicio.id, valor),
    esquecer: (exercicio) => minutosDeHoje.delete(exercicio.id),
    unidade: () => "min",
    aoApagar: (exercicio) => `Tempo de ${exercicio.nome} apagado.`
  }
};

function abrirCampoDaCarga(exercicio, chip, campo, qual = "carga") {
  const valor = DIGITADOS[qual].mostrar(exercicio);
  campo.value = valor === undefined ? "" : String(valor).replace(".", ",");
  chip.hidden = true;
  campo.hidden = false;
  campo.focus();
  campo.select();
}

function ligarCampoDaCarga(exercicio, chip, campo, qual = "carga") {
  const fechar = () => {
    campo.hidden = true;
    chip.hidden = false;
  };

  let desistiu = false;

  // Sai do campo e vale. Enter e tocar fora passam por aqui, e no celular Enter é o que fecha o
  // teclado. Campo apagado apaga a carga do dia, e o chip volta a mostrar a da última vez.
  // Número impossível não grava nada e deixa tudo como estava.
  campo.addEventListener("blur", () => {
    fechar();
    if (desistiu) {
      desistiu = false;
      return;
    }

    const anunciar = (texto) => {
      cartaoPorId.get(exercicio.id)?.atualizar();
      aviso.textContent = texto;
    };

    const dono = DIGITADOS[qual];

    if (campo.value.trim() === "") {
      if (dono.deHoje(exercicio) === undefined) return;
      dono.esquecer(exercicio);
      Banco.apagarValor(perfilAtivo, exercicio.letra, exercicio.id, qual);
      return anunciar(dono.aoApagar(exercicio));
    }

    const valor = emNumero(campo.value);
    if (valor === null || valor === dono.deHoje(exercicio)) return;
    gravarDigitado(exercicio, qual, valor);
    // Anotar o tempo é o que conclui o aeróbico: não há série para baixar numa esteira.
    anunciar(`${exercicio.nome}: ${emMedida(valor, dono.unidade(exercicio))}.`);
  });

  campo.addEventListener("keydown", (evento) => {
    if (evento.key !== "Enter" && evento.key !== "Escape") return;
    evento.preventDefault();
    // Lido antes do blur, porque o ouvinte de lá consome a marca ao passar por ela.
    const cancelou = evento.key === "Escape";
    desistiu = cancelou;
    campo.blur();
    if (cancelou) chip.focus();
  });
}

const gravarDigitado = (exercicio, qual, valor) => {
  DIGITADOS[qual].guardar(exercicio, valor);
  Banco.salvarValor(perfilAtivo, exercicio.letra, exercicio.id, qual, valor);
};

// Segurar o contador e arrastar muda o valor no lugar, como o seletor de hora do celular. A fita
// de números nasce dentro do próprio contador, cobrindo-o, e acompanha o dedo. Não é diálogo: o
// ajuste acontece onde o dedo está, e soltar confirma.
// O mesmo gesto serve ao contador de séries e ao tempo do aeróbico: toque faz, segurar abre a
// fita e arrasta, setas andam um passo. O que muda é a lista de opções e o que fazer com a
// escolhida, e isso vem de fora.
function ligarAjuste(contador, { opcoes, atual, aplicar, aoTocar }) {
  let ajuste = null;
  let cronometro;
  let ajustou = false;
  let origem = 0;

  const desistir = () => clearTimeout(cronometro);
  const ultimo = () => opcoes().length - 1;

  contador.addEventListener("pointerdown", (evento) => {
    origem = evento.clientY;
    ajustou = false;
    cronometro = setTimeout(() => {
      ajuste = { origem, inicial: atual(), valor: atual() };
      // Ponteiro sintético não existe para o navegador, e capturá-lo lança.
      try { contador.setPointerCapture(evento.pointerId); } catch { /* gesto sem captura */ }
      abrirFita(contador, opcoes(), ajuste.valor);
      navigator.vibrate?.(10);
    }, ESPERA_TOQUE_LONGO);
  });

  contador.addEventListener("pointermove", (evento) => {
    // Antes do gesto pegar, dedo que anda é rolagem da lista, não ajuste.
    if (!ajuste) {
      if (Math.abs(evento.clientY - origem) > FOLGA_DO_DEDO) desistir();
      return;
    }
    const continuo = Math.min(ultimo(),
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
    aplicar(valor);
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
    aoTocar();
  });

  contador.addEventListener("keydown", (evento) => {
    const passos = { ArrowDown: -1, ArrowLeft: -1, ArrowUp: 1, ArrowRight: 1 };
    const passo = passos[evento.key];
    if (passo === undefined) return;
    evento.preventDefault();
    aplicar(Math.min(ultimo(), Math.max(0, atual() + passo)));
  });
}

function ligarContador(contador, exercicio) {
  ligarAjuste(contador, {
    opcoes: () => [{ texto: "Feito", feito: true },
      ...Array.from({ length: exercicio.series }, (_, i) => ({ texto: String(i + 1) }))],
    atual: () => faltam(exercicio),
    aplicar: (valor) => definir(exercicio, valor),
    aoTocar: () => definir(exercicio, Math.max(0, faltam(exercicio) - 1))
  });
}

// O tempo anda de 5 em 5 até a hora, e de 15 em 15 até três horas: na esteira ninguém corre 23
// minutos, e a fita precisa caber no polegar. Quem quer 1h30 arrasta até lá.
const MINUTOS = [...Array.from({ length: 12 }, (_, i) => (i + 1) * 5), ...Array.from({ length: 8 }, (_, i) => 75 + i * 15)];
const indiceDoTempo = (minutos) => {
  const alvo = minutos ?? 30;
  return MINUTOS.reduce((melhor, opcao, i) => (Math.abs(opcao - alvo) < Math.abs(MINUTOS[melhor] - alvo) ? i : melhor), 0);
};
// Até 59 é "30" sobre "min"; da hora em diante vira "1:30" sobre "h", como um relógio.
const tempoCurto = (minutos) => (minutos < 60 ? String(minutos) : `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, "0")}`);
const unidadeDoTempo = (minutos) => (minutos < 60 ? "min" : "h");

function ligarTempo(contador, exercicio) {
  ligarAjuste(contador, {
    opcoes: () => MINUTOS.map((minutos) => ({ texto: tempoCurto(minutos) })),
    atual: () => indiceDoTempo(minutosDe(exercicio)),
    aplicar: (indice) => {
      const minutos = MINUTOS[indice];
      gravarDigitado(exercicio, "minutos", minutos);
      cartaoPorId.get(exercicio.id)?.atualizar();
      aviso.textContent = `${exercicio.nome}: ${emMedida(minutos, "min")}.`;
    },
    aoTocar: () => concluirAerobico(exercicio)
  });
}

// Uma linha da fita por unidade, e o dedo anda com ela: 44px de arrasto muda o valor em um.
const PASSO_DO_AJUSTE = 44;
let fita = null;

function abrirFita(contador, opcoes, valor) {
  fita = document.createElement("div");
  fita.className = "fita";
  // O contador guarda o rótulo de acessibilidade, e a fita é o desenho do mesmo número.
  fita.setAttribute("aria-hidden", "true");

  const coluna = document.createElement("div");
  coluna.className = "fita-coluna";
  coluna.append(...opcoes.map((opcao) => {
    const linha = document.createElement("span");
    linha.className = opcao.feito ? "fita-valor feito" : "fita-valor";
    linha.textContent = opcao.texto;
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
  document.getElementById("treino-titulo").textContent = `${tituloDoTreino(letra)}`;
  dialogoTreino.returnValue = "";
  dialogoTreino.showModal();
}

dialogoTreino.addEventListener("close", async () => {
  const letra = alvoTreino;
  if (dialogoTreino.returnValue === "encerrar") {
    await encerrar(letra);
    aviso.textContent = `${tituloDoTreino(letra)} encerrado e gravado no histórico.`;
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
  // Aeróbico não tem repetição: o campo some em vez de ficar vazio esperando um número.
  repeticoes.value = exercicio.reps ?? "";
  repeticoes.hidden = ehAerobico(exercicio);
  repeticoesRotulo.hidden = ehAerobico(exercicio);
  desenharVisor();
  visor.showModal();
}

// Repetições por série mudam de exercício para exercício, e a ficha da academia muda de vez em
// quando. Grava só o campo, por cima do exercício, como a observação.
repeticoes.addEventListener("change", () => {
  const exercicio = alvoVisor;
  const valor = Number.parseInt(repeticoes.value, 10);
  if (!Number.isInteger(valor) || valor < 1 || valor > 99) {
    repeticoes.value = exercicio.reps ?? "";
    return;
  }
  exercicio.reps = valor;
  Banco.salvarRepeticoes(perfilAtivo, exercicio.id, valor);
  cartaoPorId.get(exercicio.id)?.atualizar();
  aviso.textContent = `${exercicio.nome}: ${valor} repetições por série.`;
});
repeticoes.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") repeticoes.blur();
});

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

  // "Adicionar" e não "Tirar": a foto pode vir da câmera ou da galeria, e quem escolhe é o sistema.
  visorTrocar.textContent = atual ? "Trocar foto" : "Adicionar foto";
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
visorTrocar.onclick = () => escolherFoto(alvoVisor, vagaAtiva);

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
  cartaoPorId.get(exercicio.id)?.atualizar();
  refrescarVisor(exercicio);
  aviso.textContent = `Foto de ${VAGAS[vaga].toLowerCase()} de ${exercicio.nome} apagada.`;
});

// Salva ao sair do campo. Enter conclui em vez de quebrar linha: observação é "banco 4, pino 7",
// não texto corrido, e no celular é o que fecha o teclado.
observacao.addEventListener("change", () => {
  const exercicio = alvoVisor;
  const texto = observacao.value.trim();
  exercicio.observacao = texto;
  Banco.salvarObservacao(perfilAtivo, exercicio.id, texto);
  aviso.textContent = texto
    ? `Observação de ${exercicio.nome} salva.`
    : `Observação de ${exercicio.nome} apagada.`;
});
observacao.addEventListener("keydown", (evento) => {
  if (evento.key !== "Enter" || evento.shiftKey) return;
  evento.preventDefault();
  observacao.blur();
});

function escolherFoto(exercicio, vaga) {
  seletorDeFoto.value = "";
  seletorDeFoto.onchange = async () => {
    const arquivo = seletorDeFoto.files[0];
    if (!arquivo) return;
    const reduzida = await reduzir(arquivo);
    Banco.salvarFoto(exercicio.id, vaga, reduzida);
    const porVaga = fotos.get(exercicio.id) ?? [];
    if (porVaga[vaga]) URL.revokeObjectURL(porVaga[vaga]);
    porVaga[vaga] = URL.createObjectURL(reduzida);
    fotos.set(exercicio.id, porVaga);
    cartaoPorId.get(exercicio.id)?.atualizar();
    refrescarVisor(exercicio);
    aviso.textContent = `Foto de ${VAGAS[vaga].toLowerCase()} de ${exercicio.nome} salva.`;
  };
  seletorDeFoto.click();
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
  await carregarTreinos();
  irPara(LETRAS[0], false);
  aviso.textContent = `Ciclo de ${PERFIS[perfilAtivo]} recomeçado. Treino A liberado.`;
});

// A aba Histórico. Abre por exercício, e não por dia: a pergunta que se faz de pé na máquina é
// "quanto eu puxei da última vez", e é essa que a primeira tela responde. O dia continua no dado,
// dentro da progressão de cada exercício.
//
// Mostra o treino inteiro, agrupado como ele é, inclusive o exercício que nunca teve carga. Achar
// o próprio treino não pode depender de digitar o nome dele: a busca é atalho, não pedágio.
const painelDoHistorico = document.getElementById("historico");
const buscaDoHistorico = document.getElementById("historico-busca");
const listaDoHistorico = document.getElementById("historico-lista");
const vazioDoHistorico = document.getElementById("historico-vazio");

let linhasDoHistorico = [];

// Busca que ignora acento: quem digita "biceps" no celular quer achar "Bíceps", e ninguém para o
// treino para alcançar o til.
const semAcento = (texto) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

async function abrirHistorico() {
  linhasDoHistorico = await Banco.historico(perfilAtivo);
  buscaDoHistorico.value = "";
  desenharHistorico();
  painelDoHistorico.showModal();
}

function filtrarHistorico() {
  const procurado = semAcento(buscaDoHistorico.value.trim());
  if (!procurado) return linhasDoHistorico;
  return linhasDoHistorico.filter(({ exercicio }) =>
    semAcento(exercicio.nome).includes(procurado) || semAcento(etiquetasDe(exercicio)).includes(procurado));
}

function desenharHistorico() {
  const linhas = filtrarHistorico();
  const blocos = [];

  const titulo = (palavra) => Object.assign(document.createElement("h3"), {
    className: "historico-treino",
    textContent: palavra
  });

  // Um título por treino, na ordem em que os treinos existem. Sem o título, vinte e um exercícios
  // seguidos viram uma parede, e achar o de hoje passa a exigir a busca de novo.
  for (const letra of LETRAS) {
    const doTreino = linhas.filter(({ exercicio }) => exercicio.letra === letra && !estaForaDoTreino(exercicio));
    if (doTreino.length === 0) continue;
    blocos.push(titulo(`${tituloDoTreino(letra)}`), ...doTreino.map(linhaDoHistorico));
  }

  // Exercício que saiu do treino continua contando: o peso foi levantado, e apagar isso da tela
  // seria o histórico mentir sobre o que aconteceu.
  const foraDoTreino = linhas.filter(({ exercicio }) => estaForaDoTreino(exercicio));
  if (foraDoTreino.length > 0) {
    blocos.push(titulo("Fora do treino"), ...foraDoTreino.map(linhaDoHistorico));
  }

  listaDoHistorico.replaceChildren(...blocos);
  const procurado = buscaDoHistorico.value.trim();
  vazioDoHistorico.hidden = linhas.length > 0;
  vazioDoHistorico.textContent = linhas.length > 0 ? "" : `Nada encontrado para "${procurado}".`;
}

// Arquivado é o que a fase 4 faz no lugar de apagar. A letra fora da fileira cobre o outro
// caminho: treino que deixou de existir leva os exercícios dele junto.
const estaForaDoTreino = (exercicio) => Boolean(exercicio.arquivado) || !LETRAS.includes(exercicio.letra);

// Sem carga nenhuma o exercício não vira <details>: não há progressão para abrir, e um triângulo
// que abre no vazio promete o que não existe.
function linhaDoHistorico({ exercicio, cargas }) {
  // O que o histórico acompanha muda com o exercício: peso na máquina, e minutos no aeróbico, que
  // é onde está a progressão de quem corre.
  const campo = ehAerobico(exercicio) ? "minutos" : "carga";
  const unidade = ehAerobico(exercicio) ? "min" : unidadeDe(exercicio);
  const serie = cargas
    .filter((entrada) => entrada[campo] != null)
    .map((entrada) => ({ data: entrada.data, valor: entrada[campo] }));

  const bloco = document.createElement(serie.length > 0 ? "details" : "div");
  bloco.className = "historico-linha";

  const resumo = document.createElement(serie.length > 0 ? "summary" : "div");
  resumo.className = "historico-resumo";
  const nome = Object.assign(document.createElement("span"), { className: "historico-nome", textContent: exercicio.nome });
  const grupos = Object.assign(document.createElement("span"), { className: "historico-grupos", textContent: etiquetasDe(exercicio) });
  const agora = document.createElement("span");
  agora.className = serie.length > 0 ? "historico-agora" : "historico-agora historico-sem";
  if (serie.length > 0) agora.append(comUnidade(serie[0].valor, unidade));
  // Flexão nunca teve carga, e dizer "sem carga" nela soa como falta. O que falta e o que não se
  // aplica são coisas diferentes, e o histórico não pode confundir as duas.
  else if (semCarga(exercicio)) agora.textContent = "peso do corpo";
  else agora.textContent = ehAerobico(exercicio) ? "sem tempo" : "sem carga";

  resumo.append(nome, grupos, agora);
  if (serie.length > 0) {
    resumo.append(tendenciaDe(serie, unidade));
    bloco.append(resumo, progressaoDe(serie, unidade));
  } else {
    bloco.append(resumo);
  }

  // Fora do treino, a linha ganha o caminho de volta. Dentro dele não: tirar do treino é do modo
  // de edição, e um botão de remover escondido no histórico seria a pior porta possível para isso.
  if (estaForaDoTreino(exercicio)) {
    bloco.classList.add("historico-fora");
    bloco.append(voltarParaOTreino(exercicio, serie));
  }
  return bloco;
}

function voltarParaOTreino(exercicio, serie) {
  const linha = document.createElement("div");
  linha.className = "historico-acoes";

  // Quando saiu, e não há sempre resposta: treino que deixou de existir levou os exercícios junto
  // sem ninguém arquivar nada. Aí o último dia em que ele foi feito é o mais perto da verdade.
  const saiu = exercicio.arquivadoEm
    ? `Saiu do treino em ${emDia(emData(exercicio.arquivadoEm))}`
    : serie[0] ? `Sem treino desde ${emDia(serie[0].data)}` : "Fora de todos os treinos";
  linha.append(Object.assign(document.createElement("span"), { className: "historico-saiu", textContent: saiu }));

  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "secundario";
  botao.textContent = "Voltar ao treino";
  botao.onclick = () => abrirEscolhaDeTreino(exercicio, "reativar");
  linha.append(botao);
  return linha;
}

// Instante do relógio para o dia local, no mesmo formato das datas que o banco guarda.
function emData(quando) {
  const dia = new Date(quando);
  return `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`;
}

let alvoReativar = null;
let letraEscolhida = LETRAS[0];

// O mesmo diálogo escolhe o treino para dois destinos: voltar do histórico e mudar de treino no
// editor. O que muda é o título e o que acontece ao confirmar.
let modoDaEscolha = "reativar";

function abrirEscolhaDeTreino(exercicio, modo) {
  modoDaEscolha = modo;
  document.getElementById("reativar-titulo").textContent = modo === "mover" ? "Mudar de treino" : "Voltar para o treino";
  document.getElementById("reativar-confirmar").textContent = modo === "mover" ? "Mover" : "Voltar para o treino";
  abrirReativar(exercicio, modo === "mover"
    ? `${exercicio.nome} sai deste treino e entra no fim do escolhido, com o histórico que já tem.`
    : `${exercicio.nome} volta para a lista do dia, com o histórico que já tem.`);
}

function abrirReativar(exercicio, corpo) {
  alvoReativar = exercicio;
  letraEscolhida = LETRAS.includes(exercicio.letra) ? exercicio.letra : LETRAS[0];
  document.getElementById("reativar-corpo").textContent = corpo;
  desenharEscolhaDoTreino();
  const dialogo = document.getElementById("dialogo-reativar");
  dialogo.returnValue = "";
  dialogo.showModal();
}

// Fileira de rádios de verdade, e não botões: escolher um treino entre três é exatamente o que
// um grupo de rádio é, e daí vêm de graça as setas do teclado e o anúncio de "1 de 3".
function desenharEscolhaDoTreino() {
  document.getElementById("reativar-treinos").replaceChildren(...LETRAS.map((letra) => {
    const rotuloDaLetra = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "reativar-treino";
    radio.value = letra;
    radio.className = "oculto-visual";
    radio.checked = letra === letraEscolhida;
    radio.onchange = () => { letraEscolhida = letra; };
    rotuloDaLetra.append(radio, `${tituloDoTreino(letra)}`);
    return rotuloDaLetra;
  }));
}

document.getElementById("dialogo-reativar").addEventListener("close", async (evento) => {
  if (evento.target.returnValue !== "reativar") return;
  const exercicio = alvoReativar;
  if (modoDaEscolha === "mover") {
    await Banco.moverExercicio(exercicio.id, letraEscolhida, perfilAtivo);
    await carregarTreinos();
    aviso.textContent = `${exercicio.nome} agora está no ${tituloDoTreino(letraEscolhida)}.`;
    return;
  }
  await Banco.reativarExercicio(exercicio.id, letraEscolhida, perfilAtivo);
  linhasDoHistorico = await Banco.historico(perfilAtivo);
  desenharHistorico();
  await carregarTreinos();
  aviso.textContent = `${exercicio.nome} voltou para o ${tituloDoTreino(letraEscolhida)}.`;
});

// O modo de edição. Liga pelo menu da marca, desliga em "Concluir". Enquanto dura, o rodapé
// troca o seletor de perfis pela barra de edição, a aba ativa abre as opções do treino, e cada
// cartão mostra a fileira de subir, descer, mover e tirar. Toda mudança grava na hora e remonta
// a tela: não existe "salvar" no fim, como no resto do app.
let editando = false;
const barraDeEdicao = document.getElementById("edicao");
const dialogoNomeTreino = document.getElementById("dialogo-nome-treino");
const campoNomeTreino = document.getElementById("nome-treino");
const dialogoEditarTreino = document.getElementById("dialogo-editar-treino");
const dialogoNovoExercicio = document.getElementById("dialogo-novo-exercicio");
let treinoEmEdicao = null;

function alternarEdicao(ligar) {
  editando = ligar;
  document.body.classList.toggle("editando", ligar);
  barraDeEdicao.hidden = !ligar;
  perfis.hidden = ligar || usuario !== "admin";
  aviso.textContent = ligar ? "Modo de edição. Toque na aba ativa para mexer no treino." : "Edição concluída.";
}

document.getElementById("menu-editar").onclick = () => {
  menu.close();
  alternarEdicao(true);
};
document.getElementById("edicao-concluir").onclick = () => alternarEdicao(false);

// Um diálogo só para nome novo e para renomear: o que muda é o título e o que fazer ao salvar.
let aoSalvarNome = null;
function pedirNome(titulo, atual, salvar) {
  document.getElementById("nome-treino-titulo").textContent = titulo;
  campoNomeTreino.value = atual;
  aoSalvarNome = salvar;
  dialogoNomeTreino.returnValue = "";
  dialogoNomeTreino.showModal();
  campoNomeTreino.select();
}
dialogoNomeTreino.addEventListener("close", async () => {
  if (dialogoNomeTreino.returnValue !== "salvar") return;
  const nome = campoNomeTreino.value.trim();
  if (!nome) return;
  await aoSalvarNome(nome);
});

document.getElementById("edicao-treino").onclick = () => pedirNome("Novo treino", "", async (nome) => {
  const treino = await Banco.criarTreino(perfilAtivo, nome);
  await carregarTreinos();
  irPara(treino.id, false);
  aviso.textContent = `${tituloDoTreino(treino.id)} criado.`;
});

function abrirEditarTreino(letra) {
  treinoEmEdicao = letra;
  document.getElementById("editar-treino-titulo").textContent = tituloDoTreino(letra);
  const posicao = LETRAS.indexOf(letra);
  dialogoEditarTreino.querySelector('[value="antes"]').disabled = posicao === 0;
  dialogoEditarTreino.querySelector('[value="depois"]').disabled = posicao === LETRAS.length - 1;
  // O último treino não sai: sem nenhum, a tela não tem onde ficar.
  dialogoEditarTreino.querySelector('[value="tirar"]').disabled = LETRAS.length === 1;
  dialogoEditarTreino.returnValue = "";
  dialogoEditarTreino.showModal();
}

dialogoEditarTreino.addEventListener("close", async () => {
  const letra = treinoEmEdicao;
  const acao = dialogoEditarTreino.returnValue;
  if (acao === "renomear") {
    return pedirNome("Renomear treino", nomeDoTreino(letra), async (nome) => {
      await Banco.renomearTreino(perfilAtivo, letra, nome);
      await carregarTreinos();
      aviso.textContent = `Treino renomeado para ${nome}.`;
    });
  }
  if (acao === "antes" || acao === "depois") {
    const ordem = [...LETRAS];
    const de = ordem.indexOf(letra);
    const para = acao === "antes" ? de - 1 : de + 1;
    [ordem[de], ordem[para]] = [ordem[para], ordem[de]];
    await Banco.reordenarTreinos(perfilAtivo, ordem);
    await carregarTreinos();
    irPara(letra, false);
    aviso.textContent = `${tituloDoTreino(letra)} agora é o ${para + 1}º.`;
  }
  if (acao === "tirar") {
    await Banco.arquivarTreino(perfilAtivo, letra);
    await carregarTreinos();
    irPara(LETRAS[0], false);
    aviso.textContent = `${tituloDoTreino(letra)} saiu da fileira. Os dias dele continuam no histórico.`;
  }
});

async function deslocarExercicio(exercicio, passo) {
  const ids = (exerciciosPorLetra.get(exercicio.letra) ?? []).map((outro) => outro.id);
  const de = ids.indexOf(exercicio.id);
  const para = de + passo;
  if (para < 0 || para >= ids.length) return;
  [ids[de], ids[para]] = [ids[para], ids[de]];
  await Banco.reordenarExercicios(perfilAtivo, ids);
  await carregarTreinos();
  aviso.textContent = `${exercicio.nome} agora é o ${para + 1}º do treino.`;
}

async function tirarExercicio(exercicio) {
  await Banco.arquivarExercicio(perfilAtivo, exercicio.id);
  await carregarTreinos();
  aviso.textContent = `${exercicio.nome} saiu do treino. Continua no histórico, e volta por lá.`;
}

// O formulário do exercício novo. Os músculos vêm do mesmo mapa que a tela usa para escrever.
const gruposDoNovo = document.getElementById("novo-grupos");
gruposDoNovo.append(...Object.entries(NOME_DO_GRUPO).map(([valor, nome]) => {
  const rotuloDoGrupo = document.createElement("label");
  const caixa = document.createElement("input");
  caixa.type = "checkbox";
  caixa.name = "novo-grupo";
  caixa.value = valor;
  caixa.className = "oculto-visual";
  rotuloDoGrupo.append(caixa, nome);
  return rotuloDoGrupo;
}));
const tipoDoNovo = () => dialogoNovoExercicio.querySelector('input[name="novo-tipo"]:checked').value;
for (const radio of dialogoNovoExercicio.querySelectorAll('input[name="novo-tipo"]')) {
  radio.onchange = () => {
    const aerobico = tipoDoNovo() === "tempo";
    document.getElementById("novo-unidade").hidden = !aerobico;
    document.getElementById("novo-unidade-rotulo").hidden = !aerobico;
  };
}

document.getElementById("edicao-exercicio").onclick = () => {
  dialogoNovoExercicio.querySelector("form").reset();
  document.getElementById("novo-unidade").hidden = true;
  document.getElementById("novo-unidade-rotulo").hidden = true;
  dialogoNovoExercicio.returnValue = "";
  dialogoNovoExercicio.showModal();
};

dialogoNovoExercicio.addEventListener("close", async () => {
  if (dialogoNovoExercicio.returnValue !== "criar") return;
  const valor = (id) => document.getElementById(id).value.trim();
  const numero = (id, padrao) => {
    const lido = Number.parseInt(valor(id), 10);
    return Number.isInteger(lido) && lido > 0 ? lido : padrao;
  };
  const tipo = tipoDoNovo();
  const dados = {
    nome: valor("novo-nome"),
    aparelho: valor("novo-aparelho") || "livre",
    equipamento: "maquina",
    series: tipo === "tempo" ? 1 : numero("novo-series", 3),
    reps: tipo === "tempo" ? null : numero("novo-reps", 12),
    cod: numero("novo-cod", 0),
    grupos: [...gruposDoNovo.querySelectorAll("input:checked")].map((caixa) => caixa.value)
  };
  if (tipo) dados.tipo = tipo;
  if (tipo === "tempo") dados.unidade = valor("novo-unidade") || "km/h";
  if (!dados.nome) return;
  const exercicio = await Banco.criarExercicio(perfilAtivo, letraAtiva, dados);
  await carregarTreinos();
  cartaoPorId.get(exercicio.id)?.item.scrollIntoView({ block: "nearest" });
  aviso.textContent = `${exercicio.nome} entrou no ${tituloDoTreino(letraAtiva)}.`;
});

function tendenciaDe(serie, unidade) {
  const faixa = document.createElement("span");
  faixa.className = "historico-tendencia";
  faixa.append(
    Object.assign(document.createElement("span"), { className: "tendencia-dia", textContent: emDia(serie[0].data) }),
    serie[1] ? selo(diferencaEntre(serie[0].valor, serie[1].valor), unidade) : seloNeutro("primeira")
  );
  return faixa;
}

const comSinal = (valor) => `${valor > 0 ? "+" : ""}${String(valor).replace(".", ",")}`;
const diferencaEntre = (novo, velho) => Math.round((novo - velho) * 100) / 100;

// A barra é proporcional à faixa do exercício, e não a zero: entre 40 e 45 a diferença some se a
// barra começar do chão, e é justo essa diferença que interessa.
function progressaoDe(serie, unidade) {
  const maior = Math.max(...serie.map(({ valor }) => valor));
  const menor = Math.min(...serie.map(({ valor }) => valor));
  const faixa = maior - menor;
  const primeira = serie[serie.length - 1];
  const desdeOComeco = diferencaEntre(serie[0].valor, primeira.valor);

  const bloco = document.createElement("div");
  bloco.className = "progressao-bloco";

  // Responde de uma vez as duas perguntas que a linha sozinha não responde: desde quando você faz
  // este exercício, e quanto ele andou nesse tempo.
  const resumo = Object.assign(document.createElement("p"), { className: "progressao-resumo" });
  resumo.textContent = serie.length === 1
    ? `Primeira vez em ${emDia(primeira.data)}, com ${emMedida(primeira.valor, unidade)}.`
    : `Desde ${emDia(primeira.data)}, ${desdeOComeco === 0 ? "sem mudança" : `${comSinal(desdeOComeco)} ${unidade}`} em ${serie.length} treinos.`;

  const lista = document.createElement("ol");
  lista.className = "progressao";
  lista.append(...serie.map(({ data, valor }, posicao) => {
    const item = document.createElement("li");
    const dia = Object.assign(document.createElement("span"), { className: "progressao-dia", textContent: emDia(data) });
    const barra = document.createElement("span");
    barra.className = "progressao-barra";
    barra.setAttribute("aria-hidden", "true");
    barra.style.setProperty("--parte", `${faixa === 0 ? 100 : 25 + ((valor - menor) / faixa) * 75}%`);
    const mostrador = Object.assign(document.createElement("span"), { className: "progressao-carga" });
    mostrador.append(comUnidade(valor, unidade));

    // O passo daquele dia, contra o treino anterior. O mais antigo não tem contra o que comparar.
    // Aqui o selo vira texto com ícone, sem pílula: dez pílulas empilhadas viram confete.
    const anterior = serie[posicao + 1];
    const passo = Object.assign(document.createElement("span"), { className: "progressao-passo" });
    const diferenca = anterior ? diferencaEntre(valor, anterior.valor) : null;

    if (diferenca === null) passo.textContent = "primeira";
    else if (diferenca === 0) {
      passo.innerHTML = ICONE_MANTEVE;
      passo.append(oculto("sem mudança"));
    } else {
      passo.classList.add(diferenca > 0 ? "passo-ganho" : "passo-queda");
      passo.innerHTML = diferenca > 0 ? ICONE_SUBIU : ICONE_DESCEU;
      passo.append(texto(comSinal(diferenca)));
    }

    item.append(dia, barra, mostrador, passo);
    return item;
  }));

  bloco.append(resumo, lista);
  return bloco;
}

const menu = document.getElementById("menu");
const quemEntrou = document.getElementById("menu-quem");
const botaoEntrar = document.getElementById("menu-entrar");
const botaoSair = document.getElementById("menu-sair");
const login = document.getElementById("login");
const loginUsuario = document.getElementById("login-usuario");
const loginSenha = document.getElementById("login-senha");
const loginErro = document.getElementById("login-erro");
const loginConfirmar = document.getElementById("login-confirmar");

const nomeDoUsuario = () => PERFIS[usuario] ?? "Admin";
const ENFEITE = { shine: " ♥", sun: " ☀" };

function atualizarMenu() {
  quemEntrou.textContent = usuario
    ? `Você entrou como ${nomeDoUsuario()}${ENFEITE[usuario] ?? ""}.`
    : "Sem login. Este é o perfil de exemplo, salvo só neste aparelho.";
  botaoEntrar.hidden = Boolean(usuario);
  botaoSair.hidden = !usuario;
}

document.getElementById("abrir-menu").onclick = () => {
  atualizarMenu();
  menu.showModal();
};
document.getElementById("menu-historico").onclick = () => {
  menu.close();
  abrirHistorico();
};
botaoEntrar.onclick = () => {
  menu.close();
  login.querySelector("form").reset();
  loginErro.hidden = true;
  login.showModal();
};
botaoSair.onclick = async () => {
  menu.close();
  await Banco.sair();
  aviso.textContent = "Você saiu. De volta ao perfil de exemplo.";
};
document.getElementById("login-cancelar").onclick = () => login.close();

// O Firebase devolve códigos, e a tela devolve uma frase só para credencial errada: dizer se o
// que falhou foi o usuário ou a senha é ajuda para quem está chutando.
login.querySelector("form").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  loginErro.hidden = true;
  loginConfirmar.disabled = true;
  try {
    await Banco.entrar(loginUsuario.value.trim(), loginSenha.value);
    login.close();
    aviso.textContent = `Você entrou como ${nomeDoUsuario()}.`;
  } catch (falha) {
    loginErro.textContent = falha?.code === "auth/network-request-failed"
      ? "Sem conexão para entrar. Tente com sinal."
      : "Usuário ou senha errados.";
    loginErro.hidden = false;
  } finally {
    loginConfirmar.disabled = false;
  }
});

document.getElementById("historico-fechar").onclick = () => painelDoHistorico.close();
buscaDoHistorico.addEventListener("input", desenharHistorico);

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
  await carregarFotos();

  document.getElementById("sem-banco").hidden = temBanco;
  perfis.append(...Object.entries(PERFIS).map(criarPerfil));
  navigator.storage?.persist?.();
  // Duas APIs de plataforma fora do banco.js, as duas aqui e as duas ignorando o retorno. O
  // registro falha calado por file://, que não tem origem segura, e é o comportamento esperado:
  // aberto como arquivo o app roda sem guardar nada, service worker inclusive.
  navigator.serviceWorker?.register("sw.js").catch(() => { /* sem origem segura */ });
  // A tela só monta depois que o Firebase disse quem está logado. Entrar e sair passam pelo
  // mesmo caminho: cada mudança de usuário remonta a tela do perfil certo.
  await new Promise((pronto) => Banco.aoMudarUsuario((uid) => pronto(aplicarUsuario(uid))));
})();

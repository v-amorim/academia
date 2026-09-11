// Asserções que só rodam com o app montado num navegador de verdade. O verificar.mjs injeta
// este arquivo no index.html servido por HTTP e espera o resultado voltar por fetch.
const Sonda = (function () {
  const resultados = [];
  const confere = (nome, condicao, detalhe = "") =>
    resultados.push({ passou: Boolean(condicao), nome, detalhe: String(detalhe) });

  const respira = (ms = 150) => new Promise((pronto) => setTimeout(pronto, ms));

  async function aguardar(condicao, rotulo, tentativas = 40) {
    for (let i = 0; i < tentativas; i++) {
      if (condicao()) return true;
      await respira(100);
    }
    confere(`esperou por ${rotulo}`, false, "estourou o prazo");
    return false;
  }

  // Quantos treinos existem e como se chamam sai da semente. A suíte aceita ABC, ABCD ou um
  // treino só, e o app tem que aceitar junto.
  //
  // A guarda existe porque o caso `preparar` roda numa página sem o app: lá não há TREINOS nem
  // LETRAS, e ler direto derrubaria o arquivo inteiro antes de `rodar` ser chamado.
  const CATALOGO = typeof TREINOS === "undefined" ? {} : TREINOS;
  const NOMES = Object.keys(CATALOGO);
  const PRIMEIRA = NOMES[0];
  const SEGUNDA = NOMES[1];
  const ULTIMA = NOMES[NOMES.length - 1];
  // A migração precisa de dois treinos fundos o bastante para ter as posições que ela usa, então
  // escolhe o último que tenha, em vez de supor que todo treino é grande.
  const FUNDA = [...NOMES].reverse().find((letra) => CATALOGO[letra].length >= 3 && letra !== NOMES[0]) ?? NOMES[0];
  const quantosExercicios = () => NOMES.reduce((total, letra) => total + CATALOGO[letra].length, 0);
  const DO_PRIMEIRO = CATALOGO[PRIMEIRA]?.length ?? 0;
  // O rótulo cheio de cada exercício sai da própria semente: nem todo treino é 3x12.
  const cheioDe = (letra) => CATALOGO[letra].map((exercicio) => `${exercicio.series}×${exercicio.reps}`);
  const primeiroCheio = () => cheioDe(PRIMEIRA)[0];
  const umAMenos = () => `${CATALOGO[PRIMEIRA][0].series - 1}×${CATALOGO[PRIMEIRA][0].reps}`;

  // Os três painéis ficam montados ao mesmo tempo, então "os cartões" são os do painel em que o
  // carrossel está parado, e não todos os da página.
  const painelAtivo = () => document.getElementById(`painel-${letraAtiva}`);
  const cartoes = () => [...(painelAtivo()?.querySelectorAll(".exercicio") ?? [])];

  // O contador tem o número que falta em cima e as repetições embaixo, então o rótulo é remontado
  // das duas partes. Assim a sonda confere que as duas renderizam, e não só o texto do botão.
  function rotuloDo(item) {
    const contador = item.querySelector(".contador");
    const reps = contador.querySelector(".reps");
    if (!reps) return contador.textContent;
    return `${contador.querySelector(".serie").textContent}${reps.textContent}`;
  }

  const contadores = () => cartoes().map(rotuloDo);
  const abaDe = (letra) => document.getElementById(`aba-${letra}`);
  const menu = () => document.getElementById("dialogo-treino");
  const avisoDiz = (trecho) => document.getElementById("aviso").textContent.includes(trecho);

  async function baixarAte(item, alvo) {
    while (rotuloDo(item) !== alvo) {
      item.querySelector(".contador").click();
      await respira(80);
    }
  }

  async function pelaAba(letra, valor) {
    abaDe(letra).click();
    // O segundo toque só abre o menu se a aba já for a ativa, e trocar de aba agora é uma rolagem
    // que leva quadros. Esperar pelo estado, e não por um prazo, é o que tira a corrida daqui.
    await aguardar(() => letraAtiva === letra, `a aba ${letra} ficar ativa`);
    abaDe(letra).click();
    await respira();
    menu().querySelector(`[value="${valor}"]`).click();
    await respira(250);
  }

  async function comportamento() {
    if (!(await aguardar(() => cartoes().length === DO_PRIMEIRO, "os cartões do primeiro treino"))) return;

    confere("banco disponível por http", document.getElementById("sem-banco").hidden);
    confere("o catálogo inteiro é semeado",
      (await Promise.all(NOMES.map((l) => Banco.listarExercicios(l, "sun"))))
        .reduce((total, lista) => total + lista.length, 0) === quantosExercicios());
    confere("a primeira aba nasce ativa", abaDe(PRIMEIRA).getAttribute("aria-selected") === "true");
    confere("nenhuma aba concluída", !document.querySelector(".aba .marca"));
    confere("treino e perfil ficam juntos no rodapé",
      Boolean(document.getElementById("abas").closest("footer") && document.getElementById("perfis").closest("footer")));
    confere("a marca fica no topo", Boolean(document.querySelector("header .logo")));

    cartoes()[0].querySelector(".contador").click();
    await respira();
    confere("um toque desce uma série", contadores()[0] === umAMenos(), contadores()[0]);
    confere("a série baixada é anunciada", avisoDiz(umAMenos()));

    await baixarAte(cartoes()[0], "Feito");
    confere("zerado mostra feito", contadores()[0] === "Feito", contadores()[0]);
    confere("cartão zerado ganha a classe feito", cartoes()[0].classList.contains("feito"));
    confere("uma aba não conclui por um exercício", !abaDe(PRIMEIRA).querySelector(".marca"));

    for (const item of cartoes().slice(1)) await baixarAte(item, "Feito");
    await respira(250);
    confere("zerar o último encerra o treino", Boolean(abaDe(PRIMEIRA).querySelector(".marca")));
    confere("o encerramento automático é anunciado", avisoDiz("completo e gravado"),
      document.getElementById("aviso").textContent);
    confere(SEGUNDA ? "o ciclo ainda não completou" : "com um treino só, concluí-lo fecha o ciclo",
      document.getElementById("ciclo").hidden === Boolean(SEGUNDA));

    const cheia = await Banco.lerSessaoDeHoje("sun", PRIMEIRA);
    confere("sessão fica concluída no banco", cheia.sessao?.concluidoEm > 0);
    confere("todo exercício do treino fica gravado", cheia.registros.size === DO_PRIMEIRO, cheia.registros.size);
    confere("a primeira letra entra nas concluídas", (await Banco.letrasConcluidas("sun")).has(PRIMEIRA));

    // Só faz sentido com dois treinos ou mais. Com um, não há para onde trocar.
    if (SEGUNDA) {
      abaDe(SEGUNDA).click();
      await respira(250);
      confere("trocar de aba carrega o outro treino",
        cartoes()[0].querySelector(".nome").textContent === CATALOGO[SEGUNDA][0].nome);
      confere("treino não começado nasce cheio", contadores().join() === cheioDe(SEGUNDA).join(), contadores().join());

      abaDe(PRIMEIRA).click();
      await respira(250);
      confere("voltar para a primeira mantém o feito", contadores().every((texto) => texto === "Feito"));
    }

    abaDe(PRIMEIRA).click();
    await respira();
    confere("a aba ativa abre o menu", menu().open);
    confere("o rótulo novo está no menu",
      menu().querySelector('[value="encerrar"]').textContent === "Encerrar treino aqui");
    confere("o rótulo antigo morreu", !menu().querySelector('[value="feito"]'));
    menu().querySelector('[value="resetar"]').click();
    await respira(250);

    confere("reset volta ao total", contadores().join() === cheioDe(PRIMEIRA).join(), contadores().join());
    confere("reset tira o visto da aba", !abaDe(PRIMEIRA).querySelector(".marca"));
    confere("reset não apaga registro", (await Banco.lerSessaoDeHoje("sun", PRIMEIRA)).registros.size === DO_PRIMEIRO);

    // Treino parcial: um exercício desce, o resto é abandonado.
    cartoes()[0].querySelector(".contador").click();
    await respira();
    await pelaAba(PRIMEIRA, "encerrar");
    confere("encerrar marca a aba", Boolean(abaDe(PRIMEIRA).querySelector(".marca")));
    confere("o encerramento manual é anunciado", avisoDiz("encerrado e gravado"));
    confere("encerrar não mexe no que está na tela", contadores()[0] === umAMenos(), contadores()[0]);

    const parcial = await Banco.lerSessaoDeHoje("sun", PRIMEIRA);
    const exerciciosA = await Banco.listarExercicios(PRIMEIRA, "sun");
    confere("treino parcial grava o treino inteiro", parcial.registros.size === DO_PRIMEIRO, parcial.registros.size);
    confere("o executado guarda o que sobrou",
      parcial.registros.get(exerciciosA[0].id).restantes === CATALOGO[PRIMEIRA][0].series - 1);
    confere("o pulado guarda o total",
      parcial.registros.get(exerciciosA[1].id).restantes === CATALOGO[PRIMEIRA][1].series);

    for (const letra of NOMES.slice(1)) await pelaAba(letra, "encerrar");
    confere("todas as abas concluem",
      document.querySelectorAll(".aba .marca").length === NOMES.length,
      document.querySelectorAll(".aba .marca").length);
    confere("o ciclo completo aparece", !document.getElementById("ciclo").hidden);

    document.getElementById("abrir-recomecar").click();
    await respira();
    const recomecar = document.getElementById("dialogo-recomecar");
    confere("o diálogo de recomeçar abre", recomecar.open);
    recomecar.querySelector('[value="recomecar"]').click();
    await respira(400);

    confere("recomeçar limpa os vistos", document.querySelectorAll(".aba .marca").length === 0);
    confere("recomeçar esconde a seção do ciclo", document.getElementById("ciclo").hidden);
    confere("recomeçar volta para a primeira", abaDe(PRIMEIRA).getAttribute("aria-selected") === "true");
    confere("recomeçar zera os contadores", contadores().join() === cheioDe(PRIMEIRA).join(), contadores().join());
    confere("recomeçar é anunciado", avisoDiz("recomeçado"));
    confere("recomeçar não apaga sessão", (await Banco.lerSessaoDeHoje("sun", PRIMEIRA)).registros.size === DO_PRIMEIRO);
    confere("nada fica concluído depois do recomeço", (await Banco.letrasConcluidas("sun")).size === 0);

    cartoes()[0].querySelector(".contador").click();
    await respira();
    document.querySelector('input[value="shine"]').click();
    await respira(300);
    confere("o outro perfil nasce cheio", contadores().join() === cheioDe(PRIMEIRA).join(), contadores().join());
    confere("a troca de perfil é anunciada", avisoDiz("Shine"));
    document.querySelector('input[value="sun"]').click();
    await respira(300);
    confere("cada perfil volta com o próprio progresso", contadores()[0] === umAMenos(), contadores()[0]);

    const banco = await new Promise((pronto) => {
      const pedido = indexedDB.open("academia");
      pedido.onsuccess = () => {
        const info = { versao: pedido.result.version, depositos: [...pedido.result.objectStoreNames] };
        pedido.result.close();
        pronto(info);
      };
    });
    confere("banco na versão 5", banco.versao === 5, banco.versao);
    confere("o depósito estado morreu", !banco.depositos.includes("estado"), banco.depositos.join(","));

    // Concluir de novo no mesmo dia, depois de recomeçar o ciclo. O visto da aba vem da memória
    // e apareceria de qualquer jeito; quem denuncia a sessão fora do ciclo é o banco.
    for (const item of cartoes()) await baixarAte(item, "Feito");
    await respira(300);
    confere("concluída de novo aparece na tela", Boolean(abaDe(PRIMEIRA).querySelector(".marca")));
    confere("concluída de novo entra no ciclo corrente",
      (await Banco.letrasConcluidas("sun")).has(PRIMEIRA));

    await instalacao();
  }

  // O que faz o app abrir sem rede na academia. Cortar a rede de dentro da página não dá, então
  // aqui se confere o que sobra: o worker ativo e os arquivos guardados. O teste offline de
  // verdade é manual, por DevTools ou pelo celular.
  async function instalacao() {
    const ativo = await Promise.race([
      navigator.serviceWorker?.ready.then(() => true),
      respira(8000).then(() => false)
    ]);
    confere("o service worker ativa", ativo === true);
    if (!ativo) return;

    const nomes = await caches.keys();
    confere("existe um cache só, com a versão no nome", nomes.length === 1 && nomes[0].startsWith("academia-"),
      nomes.join(","));

    const cache = await caches.open(nomes[0]);
    const guardados = (await cache.keys()).map((pedido) => new URL(pedido.url).pathname);
    const faltando = ["/index.html", "/estilo.css", "/app.js", "/banco.js", "/fichas.js", "/mulish.woff2", "/manifest.json"]
      .filter((arquivo) => !guardados.includes(arquivo));
    confere("o cache guarda o app inteiro, fonte e manifest", faltando.length === 0, faltando.join(","));

    const manifesto = await (await fetch("manifest.json")).json();
    confere("o manifest declara nome, escopo e tela cheia",
      manifesto.name === "Sunshine" && manifesto.display === "standalone" && manifesto.start_url === ".");
    confere("o manifest traz ícone comum e mascarável",
      manifesto.icons.some((icone) => icone.purpose === "any" && icone.sizes === "512x512")
        && manifesto.icons.some((icone) => icone.purpose === "maskable"));
  }

  async function teclado() {
    if (!(await aguardar(() => cartoes().length === DO_PRIMEIRO, "os cartões do primeiro treino"))) return;
    const tecla = (alvo, key) =>
      alvo.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

    abaDe(PRIMEIRA).focus();

    // Navegar entre abas exige ter para onde ir. Com um treino só, a fileira nem aparece.
    if (SEGUNDA) {
      confere("só a aba ativa é tabulável", abaDe(PRIMEIRA).tabIndex === 0 && abaDe(SEGUNDA).tabIndex === -1);

      tecla(abaDe(PRIMEIRA), "ArrowRight");
      await respira(250);
      confere("seta direita seleciona a próxima", abaDe(SEGUNDA).getAttribute("aria-selected") === "true");
      confere("seta direita leva o foco junto", document.activeElement === abaDe(SEGUNDA));
      confere("o painel aponta para a aba certa",
        painelAtivo().getAttribute("aria-labelledby") === `aba-${SEGUNDA}`);

      tecla(abaDe(SEGUNDA), "End");
      await respira(250);
      confere("End vai para a última", abaDe(ULTIMA).getAttribute("aria-selected") === "true" && document.activeElement === abaDe(ULTIMA));
      tecla(abaDe(ULTIMA), "Home");
      await respira(250);
      confere("Home volta para a primeira", abaDe(PRIMEIRA).getAttribute("aria-selected") === "true" && document.activeElement === abaDe(PRIMEIRA));

      // O deslize é do navegador agora: um trilho com um painel por treino e scroll snap. O que
      // se confere aqui é o que o app faz com o resultado, e não a física, que não é mais nossa.
      const carrossel = document.getElementById("carrossel");
      const painelDe = (letra) => document.getElementById(`painel-${letra}`);
      const rolarAte = async (letra) => {
        carrossel.scrollLeft = painelDe(letra).offsetLeft;
        carrossel.dispatchEvent(new Event("scroll"));
        await respira(300);
      };

      confere("existe um painel por treino",
        document.querySelectorAll(".painel").length === NOMES.length,
        document.querySelectorAll(".painel").length);
      confere("os painéis ficam todos montados ao mesmo tempo",
        Boolean(painelDe(SEGUNDA)?.querySelector(".exercicio")));
      confere("o trilho encaixa em cada painel",
        getComputedStyle(carrossel).scrollSnapType.includes("mandatory"),
        getComputedStyle(carrossel).scrollSnapType);
      confere("um lance rápido anda um treino só, e não atravessa a fileira",
        getComputedStyle(painelDe(PRIMEIRA)).scrollSnapStop === "always");

      await rolarAte(SEGUNDA);
      confere("parar no painel seguinte troca o treino ativo", letraAtiva === SEGUNDA, letraAtiva);
      confere("a aba acompanha o painel", abaDe(SEGUNDA).getAttribute("aria-selected") === "true");

      await rolarAte(PRIMEIRA);
      confere("voltar ao painel anterior devolve o treino", letraAtiva === PRIMEIRA, letraAtiva);

      // A pílula é posicionada pela rolagem, em fração de painel: é isso que a faz acompanhar o
      // dedo no meio do gesto. A fração do meio do caminho não dá para simular daqui, porque o
      // encaixe obrigatório puxa de volta para o ponto de encaixe qualquer scrollLeft escrito à
      // mão. O que se confere é a ligação, que é o que pode quebrar sem ninguém ver.
      const pilula = () => Number(document.getElementById("abas").style.getPropertyValue("--ativa"));
      await rolarAte(SEGUNDA);
      confere("a pílula segue a rolagem", pilula() === 1, pilula());
      await rolarAte(PRIMEIRA);
      confere("a pílula volta com ela", pilula() === 0, pilula());

    } else {
      confere("com um treino só, a fileira de abas some da tela",
        document.getElementById("abas").offsetParent === null);
    }

    const contador = cartoes()[0].querySelector(".contador");
    contador.focus();
    tecla(contador, "ArrowDown");
    await respira();
    confere("seta baixo desce uma série", contadores()[0] === umAMenos(), contadores()[0]);
    tecla(contador, "ArrowUp");
    await respira();
    confere("seta cima sobe uma série", contadores()[0] === primeiroCheio(), contadores()[0]);
    tecla(contador, "ArrowUp");
    await respira();
    confere("o contador não passa do total", contadores()[0] === primeiroCheio(), contadores()[0]);

    // Pelo gesto de verdade: segurar, arrastar, soltar. É o único teste que passa pelo toque longo.
    const alvo = cartoes()[0].querySelector(".contador");
    const PASSO = 44;
    const fita = () => alvo.querySelector(".fita");
    const escolhido = () => fita()?.querySelector(".escolhido")?.textContent;

    const segurar = (y = 300) => alvo.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: y }));
    const arrastar = (y) => alvo.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientY: y }));
    // O clique que o navegador dispara depois do gesto também é simulado, senão a guarda que o
    // engole nunca seria exercitada.
    const soltar = (y) => {
      alvo.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: y }));
      alvo.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    };

    segurar();
    await respira(600);
    confere("segurar o contador abre a fita de ajuste", Boolean(fita()));
    confere("a fita traz uma linha por valor", fita().firstElementChild.children.length === 4,
      fita().firstElementChild.children.length);
    confere("as linhas vão de feito até o total",
      [...fita().firstElementChild.children].map((l) => l.textContent).join(",") === "Feito,1,2,3");
    confere("a fita nasce no valor de agora", escolhido() === "3", escolhido());
    confere("a fita fica em cima do contador, e não no meio da tela",
      Math.abs(fita().getBoundingClientRect().left - alvo.getBoundingClientRect().left) < 2);

    // Arrastar para baixo diminui: a coluna acompanha o dedo, e os menores estão acima.
    arrastar(300 + PASSO);
    await respira(50);
    confere("arrastar para baixo baixa o valor", escolhido() === "2", escolhido());
    confere("o contador só muda ao soltar", contadores()[0] === primeiroCheio(), contadores()[0]);
    arrastar(300 + 2 * PASSO);
    await respira(50);
    confere("arrastar mais baixa mais", escolhido() === "1", escolhido());
    arrastar(300 + PASSO);
    await respira(50);
    confere("voltar para cima sobe o valor", escolhido() === "2", escolhido());
    arrastar(300 - 5 * PASSO);
    await respira(50);
    confere("a fita não passa do total", escolhido() === "3", escolhido());
    arrastar(300 + 9 * PASSO);
    await respira(50);
    confere("a fita para em feito", escolhido() === "Feito", escolhido());

    arrastar(300 + 2 * PASSO);
    soltar(300 + 2 * PASSO);
    await respira(250);
    confere("soltar fecha a fita", !fita());
    // O clique que o navegador gera depois do gesto sai junto no soltar(): se a guarda falhasse,
    // o valor aqui seria uma série a menos.
    confere("soltar grava o valor, e o clique do gesto é engolido", contadores()[0] === `1×${CATALOGO[PRIMEIRA][0].reps}`, contadores()[0]);

    // Dedo que anda antes dos 400ms é rolagem da lista, e não pode virar ajuste.
    segurar(300);
    arrastar(340);
    await respira(600);
    confere("mover antes do tempo não abre a fita", !fita());
    soltar(340);
    await respira(250);

    abaDe(PRIMEIRA).click();
    await respira();
    abaDe(PRIMEIRA).click();
    await respira(250);
    confere("o menu do treino abre", menu().open);
    // Clique em 0,0 cai fora da caixa de qualquer diálogo centralizado.
    menu().dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 0, clientY: 0 }));
    await respira(250);
    confere("tocar fora fecha o menu do treino", !menu().open);
    confere("fechar o menu não encerra nem reseta", !abaDe(PRIMEIRA).querySelector(".marca"));

    cartoes()[0].querySelector(".descricao").click();
    await respira();
    const detalhes = document.getElementById("visor");
    confere("o meio do cartão abre o visor", detalhes.open);
    confere("o aparelho aparece no visor e não no cartão",
      document.getElementById("visor-meta").textContent.includes(`Aparelho ${CATALOGO[PRIMEIRA][0].aparelho}`)
        && !cartoes()[0].querySelector(".descricao").textContent.includes(String(CATALOGO[PRIMEIRA][0].aparelho)));
    document.getElementById("visor-resetar").click();
    await respira();
    const dialogo = document.getElementById("dialogo-exercicio");
    confere("o reset tem caminho sem toque longo, pelo visor", dialogo.open);
    dialogo.querySelector('[value="resetar"]').click();
    await respira(250);
    confere("resetar pelo visor volta ao total", contadores()[0] === primeiroCheio(), contadores()[0]);
    detalhes.close();
    await respira();

    const meio = cartoes()[0].querySelector(".descricao");
    meio.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await respira(600);
    meio.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await respira(250);
    confere("o toque longo no meio é atalho para o reset", dialogo.open && !detalhes.open);
    dialogo.close();
    await respira();

    // Nome acessível vem do aria-label, do texto, ou do label que envolve o controle.
    const semNome = [...document.querySelectorAll("button, input, [tabindex]")]
      .filter((elemento) => !elemento.closest("dialog") && !elemento.hidden && elemento.tabIndex !== -1)
      .filter((elemento) => !elemento.getAttribute("aria-label")
        && !elemento.textContent.trim()
        && !elemento.closest("label")?.textContent.trim());
    confere("todo controle alcançável tem nome acessível", semNome.length === 0,
      semNome.map((elemento) => elemento.id || elemento.tagName).join(","));
  }

  async function migracao() {
    if (!(await aguardar(() => cartoes().length === DO_PRIMEIRO, "os cartões do primeiro treino"))) return;

    const idA3 = (await Banco.listarExercicios(PRIMEIRA, "sun"))[3].id;
    const idC2 = (await Banco.listarExercicios(FUNDA, "sun"))[2].id;

    const chaves = await new Promise((pronto) => {
      const pedido = indexedDB.open("academia");
      pedido.onsuccess = () => {
        const db = pedido.result;
        const busca = db.transaction("fotos", "readonly").objectStore("fotos").getAllKeys();
        busca.onsuccess = () => { const achadas = busca.result; db.close(); pronto(achadas); };
      };
    });

    confere("nenhuma foto se perde na migração", chaves.length === 3, chaves.length);
    confere("nenhuma chave velha sobra", chaves.every((chave) => chave.indexOf(":") === 36), chaves.join(" | "));
    confere("foto dos dois perfis vira duas vagas",
      chaves.includes(`${idA3}:0`) && chaves.includes(`${idA3}:1`));
    confere("foto de um perfil só ocupa a vaga da máquina", chaves.includes(`${idC2}:0`));

    confere("o cartão migrado mostra a foto", Boolean(cartoes()[3].querySelector(".foto img")));
    confere("cartão sem foto segue com a câmera", Boolean(cartoes()[0].querySelector(".foto svg")));
    confere("o progresso por posição é descartado", rotuloDo(cartoes()[3]) === cheioDe(PRIMEIRA)[3], rotuloDo(cartoes()[3]));

    cartoes()[3].querySelector(".foto").click();
    await respira();
    const visor = document.getElementById("visor");
    const fotoGrande = () => document.getElementById("visor-quadro").querySelector("img");
    const vagas = () => [...document.querySelectorAll(".vaga")];
    confere("o visor abre com a foto migrada", visor.open && fotoGrande()?.src.startsWith("blob:"));
    confere("a tira tem três vagas", vagas().length === 3, vagas().length);
    confere("a vaga da máquina nasce escolhida", vagas()[0].getAttribute("aria-current") === "true");
    confere("a segunda foto migrada aparece na vaga 1", Boolean(vagas()[1].querySelector("img")));
    confere("a vaga 2 está vazia", Boolean(vagas()[2].querySelector("svg")));

    const capa = fotoGrande().src;
    const telaCheia = document.getElementById("tela-cheia");
    const ampliada = telaCheia.querySelector("img");
    document.querySelector(".ampliar").click();
    await respira();
    confere("tocar na foto grande abre a tela cheia", telaCheia.open && ampliada.src === capa);
    confere("a tela cheia diz de qual vaga é a foto",
      document.getElementById("tela-cheia-titulo").textContent.includes("Máquina"));
    const zoomArea = document.getElementById("zoom");
    const meio = zoomArea.getBoundingClientRect();
    zoomArea.dispatchEvent(new WheelEvent("wheel", { deltaY: -600, clientX: meio.left + meio.width / 2, clientY: meio.top + meio.height / 2, bubbles: true, cancelable: true }));
    await respira(50);
    const escalaDe = () => Number(ampliada.style.transform.match(/scale\(([\d.]+)\)/)?.[1] ?? 1);
    confere("a roda do mouse amplia", escalaDe() > 1.5, ampliada.style.transform);
    // Toque duplo por pointer events: dois pares de desce-e-sobe no mesmo ponto.
    const ponto = { clientX: meio.left + meio.width / 2, clientY: meio.top + meio.height / 2, pointerId: 1, bubbles: true };
    for (let vez = 0; vez < 2; vez++) {
      zoomArea.dispatchEvent(new PointerEvent("pointerdown", ponto));
      zoomArea.dispatchEvent(new PointerEvent("pointerup", ponto));
      await respira(40);
    }
    confere("o toque duplo volta ao tamanho natural depois do zoom", escalaDe() === 1, ampliada.style.transform);
    for (let vez = 0; vez < 2; vez++) {
      zoomArea.dispatchEvent(new PointerEvent("pointerdown", ponto));
      zoomArea.dispatchEvent(new PointerEvent("pointerup", ponto));
      await respira(40);
    }
    confere("o toque duplo amplia a partir do natural", escalaDe() === 2.5, ampliada.style.transform);
    document.getElementById("tela-cheia-fechar").click();
    await respira();
    confere("fechar a tela cheia volta ao visor", !telaCheia.open && visor.open);
    document.querySelector(".ampliar").click();
    await respira();
    confere("a tela cheia reabre sem zoom", escalaDe() === 1, ampliada.style.transform);
    document.getElementById("tela-cheia-fechar").click();
    await respira();

    vagas()[1].click();
    await respira();
    confere("tocar na vaga troca a foto grande", fotoGrande().src !== capa && fotoGrande().src.startsWith("blob:"));
    confere("o botão fala em trocar quando há foto", document.getElementById("visor-trocar").textContent === "Trocar foto");

    vagas()[2].click();
    await respira();
    confere("vaga vazia mostra o convite", !fotoGrande() && document.getElementById("visor-quadro").textContent.includes("Nenhuma foto"));
    confere("o botão fala em adicionar quando não há foto", document.getElementById("visor-trocar").textContent === "Adicionar foto");
    confere("sem foto não há o que apagar", document.getElementById("visor-apagar").hidden);

    vagas()[1].click();
    await respira();
    document.getElementById("visor-apagar").click();
    await respira();
    const apagar = document.getElementById("dialogo-apagar");
    confere("apagar pede confirmação", apagar.open);
    apagar.querySelector('[value="apagar"]').click();
    await respira(300);
    confere("apagar tira a foto do banco", !(await Banco.lerFotos()).get(idA3)?.[1]);
    confere("apagar mantém a capa", Boolean((await Banco.lerFotos()).get(idA3)?.[0]));
    confere("a vaga apagada volta a mostrar a câmera", Boolean(vagas()[1].querySelector("svg")));
    confere("apagar é anunciado", avisoDiz("apagada"));

    const campo = document.getElementById("observacao");
    campo.value = "Banco 4, pino 7";
    campo.dispatchEvent(new Event("change", { bubbles: true }));
    await respira(300);
    confere("a observação vai para o banco",
      (await Banco.listarExercicios(PRIMEIRA, "sun"))[3].observacao === "Banco 4, pino 7");
    confere("a observação não vaza para o cartão", !cartoes()[3].textContent.includes("pino"));
    confere("a observação é anunciada", avisoDiz("Observação"));
    document.getElementById("visor-fechar").click();
    await respira();

    cartoes()[0].querySelector(".foto").click();
    await respira();
    confere("o quadro vazio abre o visor, e não a câmera", visor.open && document.getElementById("visor-trocar").textContent === "Adicionar foto");
    confere("o vídeo está ao alcance sem foto", document.getElementById("visor-meta").textContent.includes("Vídeo"));
    document.getElementById("visor-fechar").click();
    await respira();

    document.querySelector('input[value="shine"]').click();
    await respira(300);
    confere("a foto é a mesma nos dois perfis", Boolean(cartoes()[3].querySelector(".foto img")));
    cartoes()[3].querySelector(".descricao").click();
    await respira();
    confere("a observação é a mesma nos dois perfis", campo.value === "Banco 4, pino 7", campo.value);
    document.getElementById("visor-fechar").click();
    await respira();
  }

  // Dois treinos de dias passados, para a carga ter de onde ser herdada e com o que ser
  // comparada. Monta chave de depósito à mão, como o preparar da migração: é a única maneira de
  // existir passado antes de o app abrir, e o formato está coberto pelas asserções logo abaixo.
  const diasAtras = (quantos) => {
    const dia = new Date();
    dia.setDate(dia.getDate() - quantos);
    const doisDigitos = (numero) => String(numero).padStart(2, "0");
    return `${dia.getFullYear()}-${doisDigitos(dia.getMonth() + 1)}-${doisDigitos(dia.getDate())}`;
  };

  const ANTEONTEM = diasAtras(3);
  const SEMANA_PASSADA = diasAtras(7);
  const emDia = (data) => `${data.slice(8)}/${data.slice(5, 7)}`;

  function prepararCarga() {
    return new Promise((pronto) => {
      // Já na versão de hoje: num banco mais velho, a subida de versão limparia justamente o
      // histórico do Sun que este caso precisa ter para herdar a carga.
      const pedido = indexedDB.open("academia", 5);
      pedido.onupgradeneeded = () => {
        for (const nome of ["exercicios", "sessoes", "registros", "ciclo", "fotos"]) {
          pedido.result.createObjectStore(nome);
        }
      };
      pedido.onsuccess = () => {
        const db = pedido.result;
        const transacao = db.transaction(["sessoes", "registros", "ciclo"], "readwrite");
        const sessoes = transacao.objectStore("sessoes");
        const registros = transacao.objectStore("registros");
        const primeiro = CATALOGO[PRIMEIRA][0].id;
        const segundo = CATALOGO[PRIMEIRA][1].id;

        // O ciclo começa agora, senão os treinos de semana passada contam como concluídos no
        // ciclo corrente e o app abre no treino seguinte em vez de no primeiro.
        transacao.objectStore("ciclo").put({ iniciadoEm: Date.now() }, "sun");

        for (const [data, carga] of [[SEMANA_PASSADA, 40], [ANTEONTEM, 45]]) {
          const sessao = `sun:${data}_${PRIMEIRA}`;
          sessoes.put({ perfil: "sun", letra: PRIMEIRA, data, iniciadoEm: 1, concluidoEm: 2 }, sessao);
          registros.put({ exId: primeiro, restantes: 0, carga, atualizadoEm: 2 }, `${sessao}:${primeiro}`);
          // O segundo exercício passou os dois dias sem carga: é quem prova que o cartão sem
          // histórico continua convidando em vez de herdar do vizinho.
          registros.put({ exId: segundo, restantes: 0, atualizadoEm: 2 }, `${sessao}:${segundo}`);
        }

        transacao.oncomplete = () => {
          db.close();
          confere("dois treinos passados preparados", true);
          pronto();
        };
        transacao.onerror = () => { confere("dois treinos passados preparados", false, "transação falhou"); pronto(); };
      };
      pedido.onerror = () => { confere("dois treinos passados preparados", false, pedido.error?.name); pronto(); };
    });
  }

  async function carga() {
    if (!(await aguardar(() => cartoes().length === DO_PRIMEIRO, "os cartões do primeiro treino"))) return;

    const chipDe = (posicao) => cartoes()[posicao].querySelector(".carga-valor");
    const campoDe = (posicao) => cartoes()[posicao].querySelector(".carga-campo");
    const noBanco = async (posicao) => {
      const { registros } = await Banco.lerSessaoDeHoje("sun", PRIMEIRA);
      return registros.get(CATALOGO[PRIMEIRA][posicao].id)?.carga;
    };

    confere("o app abre no primeiro treino, e não no seguinte",
      abaDe(PRIMEIRA).getAttribute("aria-selected") === "true");
    confere("a carga da última vez aparece no cartão", chipDe(0).textContent === "45kg", chipDe(0).textContent);
    confere("carga só herdada não finge ter mudado hoje",
      !chipDe(0).classList.contains("carga-ganho") && !chipDe(0).classList.contains("carga-queda"),
      chipDe(0).className);
    confere("a carga divide a caixa com as séries",
      chipDe(0).closest(".bloco")?.querySelector(".contador") !== null);
    confere("exercício sem histórico continua convidando",
      chipDe(1).textContent === "+kg", chipDe(1).textContent);
    confere("herdar é da tela, e não grava nada sozinho", (await noBanco(0)) === undefined, await noBanco(0));

    // Baixar uma série é o que transforma o herdado em registro: o dia passou a ter treino.
    cartoes()[0].querySelector(".contador").click();
    await respira(300);
    confere("baixar uma série grava a carga herdada", (await noBanco(0)) === 45, await noBanco(0));
    confere("exercício intocado segue sem carga no banco", (await noBanco(1)) === undefined, await noBanco(1));

    chipDe(0).click();
    await respira();
    confere("tocar no chip abre o campo", !campoDe(0).hidden && document.activeElement === campoDe(0));
    // O hidden não esconde elemento com display declarado pelo autor, e sem a regra que corrige
    // isso o chip fica na tela junto do campo, com a caixa ganhando uma faixa a mais.
    confere("o chip some enquanto o campo está aberto",
      getComputedStyle(chipDe(0)).display === "none", getComputedStyle(chipDe(0)).display);
    confere("a caixa não ganha faixa nenhuma ao editar",
      cartoes()[0].querySelectorAll(".bloco > :not([hidden])").length === 2,
      cartoes()[0].querySelectorAll(".bloco > :not([hidden])").length);
    confere("o campo abre com a carga de agora", campoDe(0).value === "45", campoDe(0).value);
    confere("o campo pede teclado decimal", campoDe(0).inputMode === "decimal", campoDe(0).inputMode);

    campoDe(0).value = "52,5";
    campoDe(0).blur();
    await respira(300);
    confere("a vírgula vira meio quilo", (await noBanco(0)) === 52.5, await noBanco(0));
    confere("o chip mostra a carga com vírgula", chipDe(0).textContent === "52,5kg", chipDe(0).textContent);
    confere("o cartão mostra que a carga subiu hoje",
      chipDe(0).classList.contains("carga-ganho") && Boolean(chipDe(0).querySelector("svg")),
      chipDe(0).className);
    confere("o quanto subiu fica no rótulo, que é onde cabe",
      chipDe(0).getAttribute("aria-label").includes(`+7,5 kg desde ${emDia(ANTEONTEM)}`),
      chipDe(0).getAttribute("aria-label"));
    confere("a carga é anunciada", avisoDiz("52,5 kg"));

    chipDe(0).click();
    await respira();
    campoDe(0).value = "nada disso";
    campoDe(0).blur();
    await respira(300);
    confere("número impossível não grava", (await noBanco(0)) === 52.5, await noBanco(0));

    // Escapar desiste, e desistir não pode ser confundido com apagar.
    chipDe(0).click();
    await respira();
    campoDe(0).value = "";
    campoDe(0).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await respira(300);
    confere("escapar fecha o campo sem apagar", (await noBanco(0)) === 52.5, await noBanco(0));
    confere("escapar devolve o foco para o chip", document.activeElement === chipDe(0));

    chipDe(0).click();
    await respira();
    campoDe(0).value = "";
    campoDe(0).blur();
    await respira(300);
    confere("campo apagado apaga a carga do dia", (await noBanco(0)) === undefined, await noBanco(0));
    confere("apagar a de hoje devolve a da última vez",
      chipDe(0).textContent === "45kg", chipDe(0).textContent);
    confere("o registro do dia sobrevive à carga apagada",
      (await Banco.lerSessaoDeHoje("sun", PRIMEIRA)).registros.has(CATALOGO[PRIMEIRA][0].id));
    confere("apagar é anunciado", avisoDiz("apagada"));

    chipDe(0).click();
    await respira();
    campoDe(0).value = "52,5";
    campoDe(0).blur();
    await respira(300);

    // Resetar é refazer o treino, não desdizer o peso que estava na máquina.
    await pelaAba(PRIMEIRA, "resetar");
    confere("o reset devolve as séries", contadores()[0] === primeiroCheio(), contadores()[0]);
    confere("o reset não apaga a carga do dia", (await noBanco(0)) === 52.5, await noBanco(0));
    confere("a carga continua na tela depois do reset", chipDe(0).textContent === "52,5kg", chipDe(0).textContent);

    if (SEGUNDA) {
      abaDe(SEGUNDA).click();
      await respira(300);
      confere("treino sem carga nenhuma não herda do outro",
        chipDe(0).textContent === "+kg", chipDe(0).textContent);
      abaDe(PRIMEIRA).click();
      await respira(300);
      confere("voltar traz a carga de volta", chipDe(0).textContent === "52,5kg", chipDe(0).textContent);
    }

    await aAbaHistorico();

    document.querySelector('input[value="shine"]').click();
    await respira(400);
    confere("a carga é de quem treinou, e não da máquina",
      chipDe(0).textContent === "+kg", chipDe(0).textContent);

    document.getElementById("abrir-historico").click();
    await respira(300);
    confere("o histórico segue o perfil de quem está treinando",
      document.querySelectorAll(".historico-linha .historico-sem").length
        === document.querySelectorAll(".historico-linha").length,
      document.querySelectorAll(".historico-linha .historico-sem").length);
    document.getElementById("historico-fechar").click();
    await respira(250);
  }

  async function aAbaHistorico() {
    const painel = document.getElementById("historico");
    const linhas = () => [...document.querySelectorAll(".historico-linha")];
    const nomes = () => linhas().map((linha) => linha.querySelector(".historico-nome").textContent);
    const busca = document.getElementById("historico-busca");
    const digitar = async (texto) => {
      busca.value = texto;
      busca.dispatchEvent(new Event("input", { bubbles: true }));
      await respira(150);
    };

    confere("o histórico nasce fechado", !painel.open);
    document.getElementById("abrir-historico").click();
    await respira(300);
    confere("a marca do topo abre o histórico", painel.open);

    const primeiro = CATALOGO[PRIMEIRA][0];
    const quantosExerciciosExistem = NOMES.reduce((total, letra) => total + CATALOGO[letra].length, 0);
    confere("o histórico traz o treino inteiro, e não só o que tem carga",
      linhas().length === quantosExerciciosExistem, linhas().length);
    confere("cada treino ganha seu título",
      document.querySelectorAll(".historico-treino").length === NOMES.length,
      document.querySelectorAll(".historico-treino").length);
    confere("exercício sem carga aparece dizendo que não tem",
      linhas()[1].querySelector(".historico-sem")?.textContent === "sem carga",
      linhas()[1].querySelector(".historico-agora")?.textContent);
    confere("exercício sem carga não promete progressão", linhas()[1].tagName !== "DETAILS", linhas()[1].tagName);
    confere("o histórico abre pelo exercício", nomes()[0] === primeiro.nome, nomes()[0]);
    confere("a carga de agora aparece na linha",
      linhas()[0].querySelector(".historico-agora").textContent === "52,5kg",
      linhas()[0].querySelector(".historico-agora").textContent);
    confere("a linha compara com a vez anterior",
      linhas()[0].querySelector(".historico-tendencia").textContent.includes("+7,5"),
      linhas()[0].querySelector(".historico-tendencia").textContent);

    confere("a progressão nasce recolhida", !linhas()[0].open);
    linhas()[0].open = true;
    await respira(150);
    const dias = [...linhas()[0].querySelectorAll(".progressao li")]
      .map((item) => item.querySelector(".progressao-carga").textContent);
    confere("a progressão traz os três dias, do mais novo para o mais velho",
      dias.join(" ") === "52,5kg 45kg 40kg", dias.join(" "));

    // A busca é atalho, e não pedágio: ela filtra o que já estava todo na tela.
    await digitar("biceps");
    const comBiceps = CATALOGO[PRIMEIRA].filter((exercicio) => exercicio.grupos.includes("biceps")).length;
    confere("busca sem acento acha o grupo com acento", linhas().length >= comBiceps && linhas().length < quantosExerciciosExistem,
      `${linhas().length} de ${quantosExerciciosExistem}`);
    await digitar("costas");
    confere("busca por grupo acha o exercício", nomes().includes(primeiro.nome), nomes().join(","));
    await digitar("PUXADA");
    confere("busca não liga para maiúscula", nomes()[0] === primeiro.nome, nomes().join(","));
    await digitar("jacaré");
    confere("busca sem resultado diz o que foi procurado",
      document.getElementById("historico-vazio").textContent.includes("jacaré"),
      document.getElementById("historico-vazio").textContent);
    await digitar("");
    confere("limpar a busca traz tudo de volta", linhas().length === quantosExerciciosExistem, linhas().length);

    document.getElementById("historico-fechar").click();
    await respira(250);
    confere("fechar o histórico volta para o treino", !painel.open);
  }

  // Escreve um banco na versão 1, com o formato de chave que existia antes do id estável.
  function preparar() {
    return new Promise((pronto) => {
      const pedido = indexedDB.open("academia", 1);
      pedido.onupgradeneeded = () => {
        pedido.result.createObjectStore("estado");
        pedido.result.createObjectStore("fotos");
      };
      pedido.onsuccess = () => {
        const db = pedido.result;
        const transacao = db.transaction(["estado", "fotos"], "readwrite");
        // A chave velha era perfil mais letra do treino mais posição na lista. A letra sai da
        // semente de hoje, senão a suíte volta a exigir que os treinos se chamem A, B e C.
        const noQuarto = `${PRIMEIRA}3`;
        const noTerceiro = `${FUNDA}2`;
        transacao.objectStore("estado").put(1, `sun:${noQuarto}`);
        transacao.objectStore("fotos").put(new Blob(["foto do sun"], { type: "image/jpeg" }), `sun:${noQuarto}`);
        transacao.objectStore("fotos").put(new Blob(["foto da shine"], { type: "image/jpeg" }), `shine:${noQuarto}`);
        transacao.objectStore("fotos").put(new Blob(["foto do leg press"], { type: "image/jpeg" }), `sun:${noTerceiro}`);
        transacao.oncomplete = () => {
          db.close();
          confere("banco na versão 1 preparado", true);
          pronto();
        };
        transacao.onerror = () => { confere("banco na versão 1 preparado", false, "transação falhou"); pronto(); };
      };
      pedido.onerror = () => { confere("banco na versão 1 preparado", false, pedido.error?.name); pronto(); };
    });
  }

  // O perfil de exemplo nasce com treino próprio, histórico de semanas e dois exercícios fora do
  // treino. É o único lugar onde a volta ao treino pode ser exercitada sem inventar dado.
  async function exemplo() {
    if (!(await aguardar(() => cartoes().length === DO_PRIMEIRO, "os cartões do primeiro treino"))) return;

    const doExemplo = typeof TREINOS_EXEMPLO === "undefined" ? {} : TREINOS_EXEMPLO;
    const letrasDoExemplo = Object.keys(doExemplo);
    const nomes = () => cartoes().map((item) => item.querySelector(".nome").textContent);

    confere("o perfil de exemplo existe no rodapé", Boolean(document.querySelector('input[value="example"]')));
    confere("o catálogo da academia não sabe do exemplo",
      !nomes().some((nome) => doExemplo[letrasDoExemplo[0]].some((outro) => outro.nome === nome)),
      nomes().join(","));

    document.querySelector('input[value="example"]').click();
    await respira(500);
    confere("o exemplo tem o treino dele",
      nomes().join() === doExemplo[letrasDoExemplo[0]].map((exercicio) => exercicio.nome).join(),
      nomes().join());
    confere("o exemplo abre com carga herdada das semanas passadas",
      cartoes()[0].querySelector(".carga-valor").dataset.vazio === "0",
      cartoes()[0].querySelector(".carga-valor").textContent);
    // Semente que inventa peso em flexão é semente errada, e passaria despercebida na tela.
    const deCorpo = doExemplo[letrasDoExemplo[0]].findIndex((exercicio) => exercicio.tipo === "corpo");
    confere("exercício de peso do corpo não ganha carga inventada",
      deCorpo < 0 || !cartoes()[deCorpo].querySelector(".carga-valor"),
      cartoes()[deCorpo]?.querySelector(".carga-valor")?.textContent);

    // A esteira: tocar faz, segurar ajusta. O mostrador tem que sair da tela quando o campo entra,
    // senão a caixa fica com o tempo duplicado.
    const daEsteira = doExemplo[letrasDoExemplo[0]].findIndex((exercicio) => exercicio.tipo === "tempo");
    if (daEsteira >= 0) {
      const caixa = () => cartoes()[daEsteira].querySelector(".contador");
      const campoDoTempo = () => cartoes()[daEsteira].querySelector(".tempo-campo");
      confere("o aeróbico nasce por fazer", !cartoes()[daEsteira].classList.contains("feito"));

      caixa().click();
      await respira(300);
      confere("tocar no tempo marca o aeróbico como feito", cartoes()[daEsteira].classList.contains("feito"));
      confere("tocar no tempo não abre o teclado", campoDoTempo().hidden);

      caixa().dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      await respira(600);
      caixa().dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      await respira(250);
      confere("segurar o tempo abre o teclado", !campoDoTempo().hidden);
      confere("o mostrador some enquanto o campo está aberto",
        getComputedStyle(caixa()).display === "none", getComputedStyle(caixa()).display);
      campoDoTempo().blur();
      await respira(300);
    }

    document.getElementById("abrir-historico").click();
    await respira(400);
    const fora = [...document.querySelectorAll(".historico-treino")]
      .find((titulo) => titulo.textContent === "Fora do treino");
    confere("o histórico separa o que saiu do treino", Boolean(fora));
    if (!fora) return;

    const arquivados = [...document.querySelectorAll(".historico-linha")]
      .filter((linha) => linha.querySelector(".historico-acoes"));
    confere("só o que saiu do treino tem o caminho de volta",
      arquivados.length === (typeof ARQUIVADOS_EXEMPLO === "undefined" ? 0 : ARQUIVADOS_EXEMPLO.length),
      arquivados.length);

    confere("a linha de fora do treino afunda no fundo da página",
      getComputedStyle(arquivados[0]).backgroundColor === getComputedStyle(document.body).backgroundColor,
      getComputedStyle(arquivados[0]).backgroundColor);
    confere("a linha diz quando o exercício saiu do treino",
      /Saiu do treino em \d\d\/\d\d/.test(arquivados[0].querySelector(".historico-saiu").textContent),
      arquivados[0].querySelector(".historico-saiu").textContent);

    const oQueVolta = arquivados[0].querySelector(".historico-nome").textContent;
    arquivados[0].querySelector(".historico-acoes button").click();
    await respira(300);
    const dialogo = document.getElementById("dialogo-reativar");
    confere("voltar para o treino pergunta em qual treino", dialogo.open);
    confere("a escolha do treino tem uma opção por treino",
      dialogo.querySelectorAll('input[name="reativar-treino"]').length === NOMES.length);

    const alvo = NOMES[NOMES.length - 1];
    dialogo.querySelector(`input[value="${alvo}"]`).click();
    dialogo.querySelector('[value="reativar"]').click();
    await respira(500);

    confere("o exercício sai do grupo de fora do treino",
      ![...document.querySelectorAll(".historico-linha")]
        .filter((linha) => linha.querySelector(".historico-acoes"))
        .some((linha) => linha.querySelector(".historico-nome").textContent === oQueVolta));
    confere("a volta é anunciada", avisoDiz("voltou para o treino"));

    document.getElementById("historico-fechar").click();
    await respira(250);
    abaDe(alvo).click();
    await respira(400);
    confere("o exercício reativado aparece no fim do treino escolhido",
      nomes()[nomes().length - 1] === oQueVolta, nomes().join());
    confere("o histórico dele sobreviveu à volta",
      (await Banco.historico("example")).find((linha) => linha.exercicio.nome === oQueVolta).cargas.length > 0);
  }

  // Um banco na versão 4, com treino gravado para os três perfis. É o estado de quem já usava o
  // app antes da limpeza.
  function prepararLimpeza() {
    return new Promise((pronto) => {
      const pedido = indexedDB.open("academia", 4);
      pedido.onupgradeneeded = () => {
        for (const nome of ["exercicios", "sessoes", "registros", "ciclo", "fotos"]) {
          if (!pedido.result.objectStoreNames.contains(nome)) pedido.result.createObjectStore(nome);
        }
      };
      pedido.onsuccess = () => {
        const db = pedido.result;
        const transacao = db.transaction(["sessoes", "registros", "ciclo", "fotos"], "readwrite");
        const exId = CATALOGO[PRIMEIRA][0].id;
        // Cada perfil com um exercício do catálogo dele: o histórico filtra por dono, e um
        // registro do Sun gravado no Exemplo simplesmente não apareceria.
        const doExemplo = Object.values(TREINOS_EXEMPLO)[0][0].id;

        for (const perfil of ["sun", "shine", "example"]) {
          const sessao = `${perfil}:${ANTEONTEM}_${PRIMEIRA}`;
          const dele = perfil === "example" ? doExemplo : exId;
          transacao.objectStore("sessoes").put({ perfil, letra: PRIMEIRA, data: ANTEONTEM, iniciadoEm: 1, concluidoEm: 2 }, sessao);
          transacao.objectStore("registros").put({ exId: dele, restantes: 0, carga: 40, atualizadoEm: 2 }, `${sessao}:${dele}`);
          transacao.objectStore("ciclo").put({ iniciadoEm: 1 }, perfil);
        }
        // A foto é do exercício, não do perfil: ela tem que sobreviver à limpeza.
        transacao.objectStore("fotos").put(new Blob(["foto"], { type: "image/jpeg" }), `${exId}:0`);

        transacao.oncomplete = () => { db.close(); confere("banco na versão 4 preparado", true); pronto(); };
        transacao.onerror = () => { confere("banco na versão 4 preparado", false, "transação falhou"); pronto(); };
      };
      pedido.onerror = () => { confere("banco na versão 4 preparado", false, pedido.error?.name); pronto(); };
    });
  }

  async function limpeza() {
    if (!(await aguardar(() => cartoes().length === DO_PRIMEIRO, "os cartões do primeiro treino"))) return;

    const cargasDe = async (perfil) => {
      const historico = await Banco.historico(perfil);
      return historico.reduce((total, linha) => total + linha.cargas.length, 0);
    };

    confere("a carga de teste do Sun sai na subida de versão", (await cargasDe("sun")) === 0, await cargasDe("sun"));
    confere("a da Shine também", (await cargasDe("shine")) === 0, await cargasDe("shine"));
    confere("o histórico do Exemplo continua de pé", (await cargasDe("example")) > 0, await cargasDe("example"));
    confere("o ciclo do Sun recomeça junto", (await Banco.lerCiclo("sun")).iniciadoEm === 0);
    confere("nenhum treino do Sun nasce concluído", (await Banco.letrasConcluidas("sun")).size === 0);
    confere("a foto sobrevive, porque é do exercício e não do perfil",
      (await Banco.lerFotos()).size > 0, (await Banco.lerFotos()).size);
  }

  const CASOS = { comportamento, teclado, migracao, preparar, carga, prepararCarga, exemplo, limpeza, prepararLimpeza };

  async function rodar(caso) {
    try {
      await CASOS[caso]();
    } catch (falha) {
      confere(`o caso ${caso} terminou`, false, `${falha}`);
    }
    await fetch("/resultado", { method: "POST", body: JSON.stringify({ caso, resultados }) });
  }

  return { rodar };
})();

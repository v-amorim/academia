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

  // Quantos treinos existem e como se chamam sai do seed. A suíte aceita ABC, ABCD ou um
  // treino só, e o app tem que aceitar junto.
  //
  // A guarda existe porque o caso `prepararCarga` roda numa página sem o app: lá não há TREINOS nem
  // LETRAS, e ler direto derrubaria o arquivo inteiro antes de `rodar` ser chamado.
  const CATALOGO = typeof TREINOS === "undefined" ? {} : TREINOS;
  const NOMES = Object.keys(CATALOGO);
  const PRIMEIRA = NOMES[0];
  const SEGUNDA = NOMES[1];
  const ULTIMA = NOMES[NOMES.length - 1];
  const quantosExercicios = () => NOMES.reduce((total, letra) => total + CATALOGO[letra].length, 0);
  const DO_PRIMEIRO = CATALOGO[PRIMEIRA]?.length ?? 0;
  // O rótulo cheio de cada exercício sai do próprio seed: nem todo treino é 3x12.
  const cheioDe = (letra) => CATALOGO[letra].map((exercicio) => `${exercicio.series}×${exercicio.reps}`);
  const primeiroCheio = () => cheioDe(PRIMEIRA)[0];
  const umAMenos = () => `${CATALOGO[PRIMEIRA][0].series - 1}×${CATALOGO[PRIMEIRA][0].reps}`;

  // Os três painéis ficam montados ao mesmo tempo, então "os cartões" são os do painel em que o
  // carrossel está parado, e não todos os da página.
  const painelAtivo = () => document.getElementById(`painel-${letraAtiva}`);
  const cartoes = () => [...(painelAtivo()?.querySelectorAll(".exercicio") ?? [])];

  // O contador tem o número que falta em cima e as repetições embaixo, então o rótulo é remontado
  // das duas partes. Assim a sonda confere que as duas renderizam, e não só o texto do botão.
  // A segunda linha escreve "12 rep" na tela; aqui ela volta a "3×12", que é como a ficha e o
  // aviso falam. No aeróbico a segunda linha é só a unidade, e sai como está.
  function rotuloDo(item) {
    const contador = item.querySelector(".contador");
    const reps = contador.querySelector(".reps");
    if (!reps) return contador.textContent;
    const numero = reps.textContent.replace(reps.querySelector(".unidade")?.textContent ?? "", "");
    const unidade = reps.querySelector(".unidade")?.textContent ?? "";
    const serie = contador.querySelector(".serie").textContent.replace("×", "");
    return numero ? `${serie}×${numero}` : `${serie}${unidade}`;
  }

  const contadores = () => cartoes().map(rotuloDo);
  const abaDe = (letra) => document.getElementById(`aba-${letra}`);
  const menu = () => document.getElementById("dialogo-treino");
  const avisoDiz = (trecho) => document.getElementById("aviso").textContent.includes(trecho);

  // A marca abre o menu, e o histórico é um item dele.
  async function abrirPeloMenu() {
    document.getElementById("abrir-menu").click();
    await respira(150);
    document.getElementById("menu-historico").click();
  }

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
    confere("o catálogo inteiro vem do seed",
      (await Promise.all(NOMES.map((l) => Banco.listarExercicios(l, "sun"))))
        .reduce((total, lista) => total + lista.length, 0) === quantosExercicios());
    confere("a primeira aba nasce ativa", abaDe(PRIMEIRA).getAttribute("aria-selected") === "true");
    confere("nenhuma aba concluída", !document.querySelector(".aba.feita"));
    confere("treino e perfil ficam juntos no rodapé",
      Boolean(document.getElementById("abas").closest("footer") && document.getElementById("perfis").closest("footer")));
    confere("a marca fica no topo", Boolean(document.querySelector("header .logo")));
    // Quem rola é o painel, nunca a página: com o corpo crescendo junto da lista, no Android o
    // gesto vertical sobre os cartões não ia para lado nenhum.
    confere("a página não cresce com a lista", document.documentElement.scrollHeight <= innerHeight,
      `${document.documentElement.scrollHeight} > ${innerHeight}`);

    cartoes()[0].querySelector(".contador").click();
    await respira();
    confere("um toque desce uma série", contadores()[0] === umAMenos(), contadores()[0]);
    confere("a série baixada é anunciada", avisoDiz(umAMenos()));

    await baixarAte(cartoes()[0], "Feito");
    confere("zerado mostra feito", contadores()[0] === "Feito", contadores()[0]);
    confere("cartão zerado ganha a classe feito", cartoes()[0].classList.contains("feito"));
    confere("uma aba não conclui por um exercício", !abaDe(PRIMEIRA).classList.contains("feita"));

    for (const item of cartoes().slice(1)) await baixarAte(item, "Feito");
    await respira(250);
    confere("zerar o último encerra o treino", Boolean(abaDe(PRIMEIRA).classList.contains("feita")));
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
    confere("reset tira o visto da aba", !abaDe(PRIMEIRA).classList.contains("feita"));
    confere("reset não apaga registro", (await Banco.lerSessaoDeHoje("sun", PRIMEIRA)).registros.size === DO_PRIMEIRO);

    // Treino parcial: um exercício desce, o resto é abandonado.
    cartoes()[0].querySelector(".contador").click();
    await respira();
    await pelaAba(PRIMEIRA, "encerrar");
    confere("encerrar marca a aba", Boolean(abaDe(PRIMEIRA).classList.contains("feita")));
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
      document.querySelectorAll(".aba.feita").length === NOMES.length,
      document.querySelectorAll(".aba.feita").length);
    confere("o ciclo completo aparece", !document.getElementById("ciclo").hidden);

    document.getElementById("abrir-recomecar").click();
    await respira();
    const recomecar = document.getElementById("dialogo-recomecar");
    confere("o diálogo de recomeçar abre", recomecar.open);
    recomecar.querySelector('[value="recomecar"]').click();
    await respira(400);

    confere("recomeçar limpa os vistos", document.querySelectorAll(".aba.feita").length === 0);
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
    confere("banco na versão 8", banco.versao === 8, banco.versao);
    confere("o depósito estado morreu", !banco.depositos.includes("estado"), banco.depositos.join(","));

    // Concluir de novo no mesmo dia, depois de recomeçar o ciclo. O visto da aba vem da memória
    // e apareceria de qualquer jeito; quem denuncia a sessão fora do ciclo é o banco.
    for (const item of cartoes()) await baixarAte(item, "Feito");
    await respira(300);
    confere("concluída de novo aparece na tela", Boolean(abaDe(PRIMEIRA).classList.contains("feita")));
    confere("concluída de novo entra no ciclo corrente",
      (await Banco.letrasConcluidas("sun")).has(PRIMEIRA));

    // Repetições por série mudam no visor, e o cartão e o banco seguem.
    // Cartão feito não mostra o ×12, então o alvo é um que ainda tenha série pela frente.
    const alvoReps = cartoes().find((item) => !item.classList.contains("feito")) ?? cartoes()[0];
    if (alvoReps.classList.contains("feito")) {
      alvoReps.querySelector(".contador").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
      await respira();
    }
    const nomeDoAlvo = alvoReps.querySelector(".nome").textContent;
    const repsNoBanco = async () => (await Banco.listarExercicios(PRIMEIRA, "sun")).find((exercicio) => exercicio.nome === nomeDoAlvo).reps;
    const repsDaFicha = CATALOGO[PRIMEIRA].find((exercicio) => exercicio.nome === nomeDoAlvo).reps;
    alvoReps.querySelector(".foto").click();
    await respira();
    const campoReps = document.getElementById("repeticoes");
    confere("o visor mostra as repetições do exercício", campoReps.value === String(repsDaFicha), campoReps.value);
    campoReps.value = "10";
    campoReps.dispatchEvent(new Event("change", { bubbles: true }));
    await respira();
    confere("mudar as repetições atualiza o cartão", rotuloDo(alvoReps).endsWith("×10"), rotuloDo(alvoReps));
    confere("as repetições novas vão para o banco", (await repsNoBanco()) === 10, await repsNoBanco());
    campoReps.value = "abc";
    campoReps.dispatchEvent(new Event("change", { bubbles: true }));
    await respira();
    confere("repetição inválida não grava", campoReps.value === "10" && (await repsNoBanco()) === 10, campoReps.value);
    document.getElementById("visor-fechar").click();
    await respira();

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
    confere("fechar o menu não encerra nem reseta", !abaDe(PRIMEIRA).classList.contains("feita"));

    // Desde 2026-09-13 o corpo do cartão baixa série, como o contador, e o visor abre só pela foto.
    // O cartão chega aqui feito pelos testes de cima: uma seta sobe uma série para haver o que baixar.
    if (!contadores()[0].includes("×")) {
      cartoes()[0].querySelector(".contador").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
      await respira();
    }
    const antesDoToque = contadores()[0];
    cartoes()[0].querySelector(".descricao").click();
    await respira();
    confere("o meio do cartão baixa uma série", contadores()[0] !== antesDoToque && !document.getElementById("visor").open, contadores()[0]);
    cartoes()[0].querySelector(".foto").click();
    await respira();
    const detalhes = document.getElementById("visor");
    confere("a foto abre o visor", detalhes.open);
    confere("o aparelho aparece no visor e não no cartão",
      document.getElementById("visor-meta").textContent.includes(`Aparelho ${CATALOGO[PRIMEIRA][0].aparelho}`)
        && !cartoes()[0].querySelector(".descricao").textContent.includes(String(CATALOGO[PRIMEIRA][0].aparelho)));

    // As ações de foto moram sobre a foto e só aparecem ao tocar nela: o visor sem foto tem só o
    // fechar como botão de texto.
    const acoesDaFoto = () => detalhes.querySelector(".foto-acoes");
    confere("as ações da foto nascem escondidas", acoesDaFoto().hidden && getComputedStyle(acoesDaFoto()).display === "none");
    confere("só o fechar sobra como botão de texto no visor", [...detalhes.querySelectorAll("button.secundario, button.primario")].map((b) => b.textContent).join() === "Fechar");
    detalhes.querySelector(".quadro-toque").click();
    await respira();
    confere("tocar no quadro mostra câmera e galeria, e sem foto nem ampliar nem apagar",
      !acoesDaFoto().hidden && [...acoesDaFoto().querySelectorAll(".icone")].map((b) => b.dataset.acao).join() === "camera,galeria",
      [...acoesDaFoto().querySelectorAll(".icone")].map((b) => b.dataset.acao).join());
    confere("cada ícone tem nome para o leitor de tela", [...acoesDaFoto().querySelectorAll(".icone")].every((b) => b.getAttribute("aria-label")));
    detalhes.querySelector(".quadro-toque").click();
    await respira();
    confere("tocar de novo esconde as ações", acoesDaFoto().hidden);

    detalhes.close();
    await respira();

    // O menu do exercício: segurar no corpo, ou o evento de menu de contexto, que é o caminho do
    // mouse e do teclado. Ajusta séries e carga um passo por toque, e é onde o reset mora agora.
    const menuDoExercicio = document.getElementById("menu-exercicio");
    // Uma série de folga, para o "mais" do menu ter para onde ir.
    cartoes()[0].querySelector(".contador").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    await respira();
    cartoes()[0].querySelector(".descricao").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    await respira();
    confere("o menu de contexto abre o menu do exercício", menuDoExercicio.open);
    const feitas = () => document.getElementById("series-valor").textContent;
    const cargaNoMenu = () => document.getElementById("carga-valor-menu").textContent;
    const total = CATALOGO[PRIMEIRA][0].series;
    const feitasNoCartao = () => (contadores()[0].includes("×") ? total - Number(contadores()[0].split("×")[0]) : total);
    const feitasAntes = feitasNoCartao();
    confere("o menu diz quantas séries foram feitas", feitas() === `${feitasAntes} de ${total}`, `${feitas()} / ${contadores()[0]}`);
    document.getElementById("series-mais").click();
    await respira();
    confere("mais uma série no menu baixa o contador", feitas() === `${feitasAntes + 1} de ${total}` && feitasNoCartao() === feitasAntes + 1, `${feitas()} ${contadores()[0]}`);
    document.getElementById("series-menos").click();
    await respira();
    confere("uma série a menos volta o contador", feitas() === `${feitasAntes} de ${total}` && feitasNoCartao() === feitasAntes, feitas());
    const cargaAntes = cargaNoMenu();
    document.getElementById("carga-mais").click();
    await respira();
    confere("mais carga anda meio degrau de anilha e grava no chip", cargaNoMenu() !== cargaAntes
      && cartoes()[0].querySelector(".carga-valor").textContent.replace(/\s/g, "") === cargaNoMenu().replace(/\s/g, ""), `${cargaAntes} -> ${cargaNoMenu()} / ${cartoes()[0].querySelector(".carga-valor").textContent}`);
    document.getElementById("carga-menos").click();
    await respira();
    // Sem carga nenhuma, o passo de volta para no zero, e não em "sem carga": zero é um número gravado.
    confere("menos carga desfaz o passo", cargaNoMenu() === (cargaAntes === "sem carga" ? "0 kg" : cargaAntes), cargaNoMenu());

    document.getElementById("menu-exercicio-resetar").click();
    await respira();
    const dialogo = document.getElementById("dialogo-exercicio");
    confere("o reset tem caminho sem toque longo, pelo menu do exercício", dialogo.open && !menuDoExercicio.open);
    dialogo.querySelector('[value="resetar"]').click();
    await respira(250);
    confere("resetar pelo menu volta ao total", contadores()[0] === primeiroCheio(), contadores()[0]);

    const meio = cartoes()[0].querySelector(".descricao");
    meio.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await respira(600);
    meio.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    meio.click();
    await respira(250);
    confere("o toque longo no meio abre o menu do exercício, e o clique que vem junto não baixa série",
      menuDoExercicio.open && !detalhes.open && contadores()[0] === primeiroCheio(), contadores()[0]);
    menuDoExercicio.close();
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

  // Dois treinos de dias passados, para a carga ter de onde ser herdada e com o que ser
  // comparada. Escreve direto no Firestore de mentira, no branch do Sun, com os ids de documento
  // que o banco.js monta: é a única maneira de existir passado antes de o app abrir, e o formato
  // está coberto pelas asserções do caso Nuvem.
  const diasAtras = (quantos) => {
    const dia = new Date();
    dia.setDate(dia.getDate() - quantos);
    const doisDigitos = (numero) => String(numero).padStart(2, "0");
    return `${dia.getFullYear()}-${doisDigitos(dia.getMonth() + 1)}-${doisDigitos(dia.getDate())}`;
  };

  const ANTEONTEM = diasAtras(3);
  const SEMANA_PASSADA = diasAtras(7);
  const emDia = (data) => `${data.slice(8)}/${data.slice(5, 7)}`;

  async function prepararCarga() {
    const banco = firebase.firestore();
    const branch = `perfis/${CONTAS.sun}`;
    const primeiro = CATALOGO[PRIMEIRA][0].id;
    const segundo = CATALOGO[PRIMEIRA][1].id;

    // O ciclo começa agora, senão os treinos de semana passada contam como concluídos no
    // ciclo corrente e o app abre no treino seguinte em vez de no primeiro.
    await banco.collection(`${branch}/ciclo`).doc("atual").set({ iniciadoEm: Date.now() });

    for (const [data, carga] of [[SEMANA_PASSADA, 40], [ANTEONTEM, 45]]) {
      const sessao = `${data}_${PRIMEIRA}`;
      await banco.collection(`${branch}/sessoes`).doc(sessao)
        .set({ perfil: "sun", letra: PRIMEIRA, data, iniciadoEm: 1, concluidoEm: 2 });
      await banco.collection(`${branch}/registros`).doc(`${sessao}:${primeiro}`)
        .set({ exId: primeiro, restantes: 0, carga, atualizadoEm: 2 });
      // O segundo exercício passou os dois dias sem carga: é quem prova que o cartão sem
      // histórico continua convidando em vez de herdar do vizinho.
      await banco.collection(`${branch}/registros`).doc(`${sessao}:${segundo}`)
        .set({ exId: segundo, restantes: 0, atualizadoEm: 2 });
    }
    confere("dois treinos passados preparados", firebase.dados.size === 7, firebase.dados.size);
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

    // Tocar no chip abre o campo direto, sem segurar, e não mexe na série. Pedido de 2026-09-13,
    // depois de uma temporada em que tocar baixava série e só segurar abria o campo.
    const antesDoToque = contadores()[0];
    chipDe(0).dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await respira();
    confere("tocar no chip abre o campo da carga sem baixar série", !campoDe(0).hidden && document.activeElement === campoDe(0) && contadores()[0] === antesDoToque, contadores()[0]);
    campoDe(0).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await respira();
    chipDe(0).click();
    await respira();
    confere("pelo teclado o chip abre o campo", !campoDe(0).hidden && document.activeElement === campoDe(0));
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

    await abrirPeloMenu();
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
    await abrirPeloMenu();
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
    // O aeróbico desenha como o contador: número em cima e "min" na linha do ×12.
    const esteira = cartoes().find((item) => item.querySelector(".contador .reps")?.textContent === "min");
    confere("o tempo do aeróbico fica em duas linhas, com min embaixo",
      Boolean(esteira) && esteira.querySelector(".contador .serie") !== null,
      cartoes().map(rotuloDo).join(","));
    if (esteira) {
      const [serieAero, repsAero] = [".serie", ".reps"].map((s) => getComputedStyle(esteira.querySelector(`.contador ${s}`)).fontSize);
      const [seriePeso, repsPeso] = [".serie", ".reps"].map((s) => getComputedStyle(cartoes()[0].querySelector(`.contador ${s}`)).fontSize);
      confere("o min tem a fonte do ×12, e o número a do contador", serieAero === seriePeso && repsAero === repsPeso, `${serieAero} ${repsAero}`);
    }

    // O exemplo tem os três tipos na mesma lista, e é onde uma altura diferente apareceria.
    const alturas = cartoes().map((item) => Math.round(item.getBoundingClientRect().height));
    confere("cartão sem carga tem a mesma altura dos outros", new Set(alturas).size === 1, alturas.join(","));
    const pontas = cartoes().map((item) => `${Math.round(item.querySelector(".bloco").getBoundingClientRect().width)}=${Math.round(item.querySelector(".foto").getBoundingClientRect().width)}`);
    confere("as duas pontas do cartão têm a mesma largura",
      pontas.every((par) => { const [a, b] = par.split("="); return a === b; }), pontas.join(" "));
    confere("o exemplo abre com carga herdada das semanas passadas",
      cartoes()[0].querySelector(".carga-valor").dataset.vazio === "0",
      cartoes()[0].querySelector(".carga-valor").textContent);
    // Seed que inventa peso em flexão é seed errado, e passaria despercebido na tela.
    const deCorpo = doExemplo[letrasDoExemplo[0]].findIndex((exercicio) => exercicio.tipo === "corpo");
    confere("exercício de peso do corpo não ganha carga inventada",
      deCorpo < 0 || !cartoes()[deCorpo].querySelector(".carga-valor"),
      cartoes()[deCorpo]?.querySelector(".carga-valor")?.textContent);

    // A esteira: tocar faz, segurar abre a fita de minutos, como no contador de séries.
    const daEsteira = doExemplo[letrasDoExemplo[0]].findIndex((exercicio) => exercicio.tipo === "tempo");
    if (daEsteira >= 0) {
      const cartaoDaEsteira = () => cartoes()[daEsteira];
      const caixa = () => cartaoDaEsteira().querySelector(".contador");
      const idDaEsteira = doExemplo[letrasDoExemplo[0]][daEsteira].id;
      confere("o aeróbico nasce por fazer", !cartaoDaEsteira().classList.contains("feito"));

      caixa().click();
      await respira(300);
      confere("tocar no tempo marca o aeróbico como feito", cartaoDaEsteira().classList.contains("feito"));
      confere("tocar no tempo não abre teclado nenhum", !cartaoDaEsteira().querySelector("input:not([hidden])"));

      // Segurar e arrastar sete passos para cima: de 30 minutos vai a 1h15, e a tela troca para o
      // desenho de relógio.
      caixa().dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: 400 }));
      await respira(600);
      confere("segurar o tempo abre a fita", Boolean(caixa().querySelector(".fita")));
      caixa().dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientY: 400 - 7 * 44 }));
      caixa().dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: 400 - 7 * 44 }));
      await respira(300);
      confere("soltar grava o tempo escolhido", (await Banco.lerSessaoDeHoje("example", letrasDoExemplo[0])).registros.get(idDaEsteira)?.minutos === 75);
      confere("da hora em diante o tempo vira relógio", caixa().querySelector(".serie").textContent === "1:15"
        && caixa().querySelector(".reps").textContent === "h", rotuloDo(cartaoDaEsteira()));
      confere("a fita fecha ao soltar", !caixa().querySelector(".fita"));

      // Desfazer e refazer não pode perder o tempo: era assim que a esteira zerava no Android.
      // Toque inteiro, e não só click: o pointerup sintético de cima não gerou o clique que
      // consome a guarda do ajuste, e o pointerdown é quem a rearma.
      const tocar = () => {
        caixa().dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: 400 }));
        caixa().dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: 400 }));
        caixa().click();
      };
      tocar();
      await respira(300);
      confere("tocar de novo desfaz o aeróbico", !cartaoDaEsteira().classList.contains("feito"));
      confere("desfazer mantém o tempo do dia", (await Banco.lerSessaoDeHoje("example", letrasDoExemplo[0])).registros.get(idDaEsteira)?.minutos === 75
        && caixa().querySelector(".serie").textContent === "1:15", rotuloDo(cartaoDaEsteira()));
      tocar();
      await respira(300);
      confere("refazer volta feito com o mesmo tempo", cartaoDaEsteira().classList.contains("feito")
        && caixa().querySelector(".serie").textContent === "1:15", rotuloDo(cartaoDaEsteira()));
    }

    await abrirPeloMenu();
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
    confere("a volta é anunciada", avisoDiz("voltou para o"), document.getElementById("aviso").textContent);

    document.getElementById("historico-fechar").click();
    await respira(250);
    abaDe(alvo).click();
    await respira(400);
    confere("o exercício reativado aparece no fim do treino escolhido",
      nomes()[nomes().length - 1] === oQueVolta, nomes().join());
    confere("o histórico dele sobreviveu à volta",
      (await Banco.historico("example")).find((linha) => linha.exercicio.nome === oQueVolta).cargas.length > 0);
  }

  // O motor da nuvem, sobre o Firebase de mentira do sonda-firebase.js. O app já abriu no
  // motor local; aqui o Sun é ligado ao branch dele e tudo que ele grava tem que ir parar lá, e
  // só lá.
  async function nuvem() {
    // A página abre sem login, então o que está na tela é o exemplo, no motor local.
    if (!(await aguardar(() => cartoes().length > 0, "os cartões do exemplo"))) return;

    const agora = new Date();
    const dois = (n) => String(n).padStart(2, "0");
    const HOJE = `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
    const gravados = (prefixo) => [...firebase.dados.keys()].filter((caminho) => caminho.startsWith(prefixo));
    const branch = `perfis/${CONTAS.sun}`;
    const primeiro = CATALOGO[PRIMEIRA][0];

    const recusa = await Banco.entrar("sun", "errada").then(() => null, (falha) => falha.code);
    confere("senha errada é recusada com o código do Auth", recusa === "auth/invalid-credential", recusa);
    const uid = await Banco.entrar("sun", "sol");
    confere("entrar devolve o uid da conta", uid === CONTAS.sun, uid);

    confere("ligar o perfil ao branch espera o espelho", (await Banco.ligarNuvem("sun", uid)) === true);
    await Banco.seed(TREINOS, ["sun"]);
    confere("o seed vai para o branch do Sun",
      gravados(`${branch}/exercicios/`).length === quantosExercicios(), gravados(`${branch}/exercicios/`).length);
    confere("e não abre branch para ninguém mais",
      gravados("perfis/").every((caminho) => caminho.startsWith(branch)),
      gravados("perfis/").filter((caminho) => !caminho.startsWith(branch)).join(" "));
    confere("a leitura do Sun sai do espelho, com o catálogo inteiro",
      (await Banco.listarExercicios(PRIMEIRA, "sun")).length === DO_PRIMEIRO);

    await Banco.salvarSerie("sun", PRIMEIRA, primeiro.id, 2);
    const registro = firebase.dados.get(`${branch}/registros/${HOJE}_${PRIMEIRA}:${primeiro.id}`);
    confere("a série vira documento no branch, sem o perfil no id", registro?.restantes === 2, JSON.stringify(registro));
    confere("a sessão nasce junto", Boolean(firebase.dados.get(`${branch}/sessoes/${HOJE}_${PRIMEIRA}`)));
    confere("a leitura vê a escrita na hora",
      (await Banco.lerSessaoDeHoje("sun", PRIMEIRA)).registros.get(primeiro.id)?.restantes === 2);

    await Banco.salvarValor("sun", PRIMEIRA, primeiro.id, "carga", 40);
    const doHistorico = (await Banco.historico("sun")).find((linha) => linha.exercicio.id === primeiro.id);
    confere("a carga entra no histórico do Sun", doHistorico?.cargas[0]?.carga === 40, JSON.stringify(doHistorico?.cargas));

    await Banco.encerrarSessao("sun", PRIMEIRA);
    confere("encerrar conclui a letra pelo espelho", (await Banco.letrasConcluidas("sun")).has(PRIMEIRA));
    // O espelho responde sem sair do milissegundo, e o ciclo precisa começar depois da sessão.
    await respira(5);
    Banco.iniciarCiclo("sun");
    confere("o ciclo é um documento fixo", Boolean(firebase.dados.get(`${branch}/ciclo/atual`)));
    confere("recomeçar o ciclo tira a letra", (await Banco.letrasConcluidas("sun")).size === 0);

    // Ficha alheia no branch: o que nunca foi treinado sai, o que tem registro fica arquivado.
    const [intrusoNovo, intrusoTreinado] = TREINOS_SHINE.A;
    firebase.deFora(`${branch}/exercicios/${intrusoNovo.id}`, { ...intrusoNovo, letra: "A", ordem: 50, perfis: ["sun"] });
    firebase.deFora(`${branch}/exercicios/${intrusoTreinado.id}`, { ...intrusoTreinado, letra: "A", ordem: 51, perfis: ["sun"] });
    firebase.deFora(`${branch}/registros/2026-01-05_A:${intrusoTreinado.id}`, { exId: intrusoTreinado.id, restantes: 0, carga: 20, atualizadoEm: 1 });
    await respira(50);
    await Banco.tirarIntrusos("sun", Object.values(TREINOS_SHINE).flat().map((e) => e.id));
    await respira(50);
    confere("intruso nunca treinado é apagado", !firebase.dados.has(`${branch}/exercicios/${intrusoNovo.id}`));
    confere("intruso com registro fica arquivado", firebase.dados.get(`${branch}/exercicios/${intrusoTreinado.id}`)?.arquivado === true);
    confere("a ficha do Sun não é tocada", (await Banco.listarExercicios(PRIMEIRA, "sun")).length === DO_PRIMEIRO);

    // Foto: a chave é o código do vídeo, igual nas duas fichas, e ela sobe em base64 para a
    // coleção compartilhada. Leg press existe no Sun e na Shine com o mesmo código.
    const legPressSun = Object.values(TREINOS).flat().find((e) => e.cod === 59);
    const legPressShine = Object.values(TREINOS_SHINE).flat().find((e) => e.cod === 59);
    confere("máquina igual em fichas diferentes tem a mesma chave de foto",
      Banco.chaveDaFoto(legPressSun) === Banco.chaveDaFoto(legPressShine) && legPressSun.id !== legPressShine.id);
    await Banco.salvarFoto(Banco.chaveDaFoto(legPressSun), 0, new Blob(["foto"], { type: "image/jpeg" }));
    await respira(50);
    const fotoNaNuvem = firebase.dados.get("fotos/cod-59:0");
    confere("a foto sobe em base64 para a coleção compartilhada", fotoNaNuvem?.dados === "Zm90bw==" && fotoNaNuvem.tipo === "image/jpeg", JSON.stringify(fotoNaNuvem));
    const lidas = await Banco.lerFotos();
    confere("a foto volta como blob pela chave", lidas.get("cod-59")?.[0]?.size === 4);
    Banco.apagarFoto("cod-59", 0);
    await respira(50);
    confere("apagar tira a foto da nuvem", !firebase.dados.has("fotos/cod-59:0"));

    // O outro aparelho gravou uma observação: ela tem que chegar pelo snapshot, sem recarregar.
    firebase.deFora(`${branch}/exercicios/${primeiro.id}`, { ...firebase.dados.get(`${branch}/exercicios/${primeiro.id}`), observacao: "do outro aparelho" });
    await respira(50);
    confere("escrita de fora chega ao espelho",
      (await Banco.listarExercicios(PRIMEIRA, "sun"))[0].observacao === "do outro aparelho");

    confere("a Shine não está em lugar nenhum deste aparelho", (await Banco.listarExercicios(PRIMEIRA, "shine")).length === 0
      && gravados(`perfis/${CONTAS.shine}`).length === 0);

    // Círculo: o Sun cria, a Shine entra com o código do outro aparelho, e o Sun passa a ler a
    // ficha dela por um branch só de leitura. Cada um escreve só o próprio documento de membro.
    confere("sem círculo, o perfil não tem código", (await Banco.lerCirculo("sun")) === null);
    const codigo = await Banco.criarCirculo("sun", "Sun");
    await respira(50);
    confere("criar gera um código de seis letras sem ambiguidade", /^[A-HJ-NP-Z2-9]{6}$/.test(codigo), codigo);
    confere("o criador vira membro pelo próprio documento",
      firebase.dados.get(`circulos/${codigo}/membros/${CONTAS.sun}`)?.nome === "Sun");
    confere("o código fica no branch do dono", firebase.dados.get(`${branch}/circulo/atual`)?.codigo === codigo
      && (await Banco.lerCirculo("sun")) === codigo);
    confere("ninguém escreveu fora do próprio documento",
      gravados("circulos/").every((caminho) => caminho === `circulos/${codigo}/membros/${CONTAS.sun}`));

    firebase.deFora(`circulos/${codigo}/membros/${CONTAS.shine}`, { nome: "Shine", entrouEm: 2 });
    const membros = await Banco.lerMembros(codigo);
    confere("os membros chegam com uid e nome", membros.length === 2
      && membros.some((m) => m.uid === CONTAS.shine && m.nome === "Shine"), JSON.stringify(membros));

    const daShine = TREINOS_SHINE.A[2];
    firebase.deFora(`perfis/${CONTAS.shine}/exercicios/${daShine.id}`, { ...daShine, letra: "A", ordem: 0, perfis: ["shine"] });
    confere("o branch de um membro abre só para ler", (await Banco.ligarNuvem("membro:shine", CONTAS.shine)) === true);
    confere("a ficha do membro sai do espelho dele, e não da do Sun",
      (await Banco.listarExercicios("A", "membro:shine")).map((e) => e.id).join() === daShine.id
      && (await Banco.listarExercicios(PRIMEIRA, "sun")).every((e) => e.id !== daShine.id));

    await Banco.sairDoCirculo("sun");
    await respira(50);
    confere("sair apaga o próprio documento de membro e o código do branch",
      !firebase.dados.has(`circulos/${codigo}/membros/${CONTAS.sun}`) && (await Banco.lerCirculo("sun")) === null);
    confere("sair não toca no documento do outro membro", firebase.dados.has(`circulos/${codigo}/membros/${CONTAS.shine}`));
    // O que foi posto de fora no branch da Shine sai daqui, para o seed sem servidor abaixo medir um branch vazio.
    firebase.dados.delete(`perfis/${CONTAS.shine}/exercicios/${daShine.id}`);

    // Espelho que só viu o cache não é base para o seed: poderia escrever por cima de edição que
    // ainda não chegou do servidor.
    firebase.soCache = true;
    await Banco.ligarNuvem("shine", CONTAS.shine);
    await Banco.seed(TREINOS, ["shine"]);
    confere("sem resposta do servidor o seed não roda", gravados(`perfis/${CONTAS.shine}`).length === 0, gravados(`perfis/${CONTAS.shine}`).length);

    await Banco.sair();
    confere("sair desliga a nuvem: sem login não sobra nada do Sun no aparelho",
      (await Banco.listarExercicios(PRIMEIRA, "sun")).length === 0);
  }

  // Quem abre o link sem entrar vê o exemplo e nenhum outro perfil. Entrar como Sun troca para
  // o treino dela sem mostrar o rodapé; só o admin ganha o seletor.
  async function visitante() {
    const doExemplo = TREINOS_EXEMPLO[Object.keys(TREINOS_EXEMPLO)[0]];
    const nomesDoExemplo = doExemplo.map((exercicio) => exercicio.nome).join();
    const nomes = () => cartoes().map((item) => item.querySelector(".nome").textContent);
    const rodape = document.getElementById("perfis");
    const rodapeVisivel = () => getComputedStyle(rodape).display !== "none";
    const dialogo = document.getElementById("login");
    const erro = document.getElementById("login-erro");
    const quem = () => document.getElementById("menu-quem").textContent;
    const abrirMenu = async () => { document.getElementById("abrir-menu").click(); await respira(150); };
    const entrar = async (usuario, senha) => {
      document.getElementById("login-usuario").value = usuario;
      document.getElementById("login-senha").value = senha;
      document.getElementById("login-confirmar").click();
      await respira(300);
    };

    if (!(await aguardar(() => cartoes().length === doExemplo.length, "os cartões do exemplo"))) return;
    confere("sem login a tela é o exemplo", nomes().join() === nomesDoExemplo, nomes().join());
    confere("sem login o rodapé de perfis não aparece", !rodapeVisivel());

    await abrirMenu();
    confere("o menu diz que não há login", quem().includes("Sem login"), quem());
    confere("o menu oferece entrar, e não sair",
      !document.getElementById("menu-entrar").hidden && document.getElementById("menu-sair").hidden);
    document.getElementById("menu-entrar").click();
    await respira(150);
    confere("entrar abre o diálogo de login", dialogo.open);

    await entrar("sun", "errada");
    confere("senha errada avisa e não fecha", !erro.hidden && dialogo.open, erro.textContent);
    await entrar("sun", "sol");
    if (!(await aguardar(() => cartoes().length === DO_PRIMEIRO && !dialogo.open, "o treino do Sun"))) return;
    confere("a Sun abre no próprio treino", nomes()[0] === CATALOGO[PRIMEIRA][0].nome, nomes()[0]);
    confere("a entrada é anunciada", avisoDiz("Sun"), document.getElementById("aviso").textContent);
    confere("a Sun não vê o rodapé de perfis", !rodapeVisivel());
    const coracao = () => getComputedStyle(document.getElementById("abrir-menu"), "::after").content.includes("♥");
    const sol = () => getComputedStyle(document.getElementById("abrir-menu"), "::after").content.includes("☀");
    confere("a marca do Sun tem um sol, e não coração", sol() && !coracao());
    await Banco.entrar("shine", "lua");
    await aguardar(() => document.getElementById("menu-quem").textContent.includes("Shine") || coracao(), "a Shine entrar");
    confere("a marca da Shine ganha um coração, e o sol vai embora", coracao() && !sol());

    await abrirMenu();
    confere("o menu diz quem entrou, com o coração dela", quem().includes("Shine ♥"), quem());
    confere("o menu oferece sair", !document.getElementById("menu-sair").hidden);
    document.getElementById("menu-sair").click();
    if (!(await aguardar(() => cartoes().length === doExemplo.length, "a volta ao exemplo"))) return;
    confere("sair volta ao exemplo", nomes().join() === nomesDoExemplo, nomes().join());

    await abrirMenu();
    document.getElementById("menu-entrar").click();
    await respira(150);
    await entrar("admin", "chave");
    if (!(await aguardar(rodapeVisivel, "o rodapé do admin"))) return;
    confere("o admin abre no Sun", nomes()[0] === CATALOGO[PRIMEIRA][0].nome, nomes()[0]);
    confere("o admin vê os três perfis", rodape.querySelectorAll('input[name="perfil"]').length === Object.keys(PERFIS).length);
  }

  // No desktop o mouse arrasta o carrossel, e o clique que sobra ao soltar não desce série.
  async function arrasto() {
    if (!(await aguardar(() => cartoes().length > 0, "os cartões"))) return;
    if (!SEGUNDA) return;

    const trilho = document.getElementById("carrossel");
    const ponteiro = (tipo, x, buttons) => trilho.dispatchEvent(new PointerEvent(tipo,
      { bubbles: true, pointerType: "mouse", pointerId: 7, button: 0, buttons, clientX: x, clientY: 200 }));
    const serieDoPrimeiro = () => document.getElementById(`painel-${PRIMEIRA}`).querySelector(".serie").textContent;
    const antesDoArrasto = serieDoPrimeiro();

    cartoes()[0].querySelector(".nome").dispatchEvent(new PointerEvent("pointerdown",
      { bubbles: true, pointerType: "mouse", pointerId: 7, button: 0, buttons: 1, clientX: 300, clientY: 200 }));
    // Mais da metade do painel, senão o pouso devolve ao treino de onde saiu.
    const longe = 300 - Math.round(trilho.clientWidth * 0.7);
    ponteiro("pointermove", 260, 1);
    ponteiro("pointermove", longe, 1);
    confere("arrastar com o mouse desliga o snap enquanto segura", trilho.classList.contains("arrastando"));
    ponteiro("pointerup", longe, 0);
    cartoes()[0].querySelector(".contador").dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await aguardar(() => letraAtiva === SEGUNDA, "o arrasto pousar no segundo treino");
    confere("soltar pousa no treino seguinte", letraAtiva === SEGUNDA, letraAtiva);
    confere("o clique que sobra do arrasto não desce série", serieDoPrimeiro() === antesDoArrasto, serieDoPrimeiro());
    await aguardar(() => !trilho.classList.contains("arrastando"), "o snap voltar");
    confere("o snap volta depois do pouso", !trilho.classList.contains("arrastando"));

    // Dedo não passa por aqui: o toque tem o scroll snap nativo, e o arrasto à mão o atrapalharia.
    trilho.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch", pointerId: 8, button: 0, buttons: 1, clientX: 300, clientY: 200 }));
    trilho.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "touch", pointerId: 8, buttons: 1, clientX: 100, clientY: 200 }));
    confere("o dedo não liga o arrasto à mão", !trilho.classList.contains("arrastando"));
    trilho.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch", pointerId: 8, buttons: 0, clientX: 100, clientY: 200 }));
  }

  // O editor: renomear, criar, reordenar e tirar treino; mover, reordenar, tirar e criar exercício.
  // Tudo grava na hora e remonta a tela, e nada apaga dado.
  async function editor() {
    if (!(await aguardar(() => cartoes().length === DO_PRIMEIRO, "os cartões do primeiro treino"))) return;
    if (!SEGUNDA) return;

    const abas = () => [...document.querySelectorAll("#abas .aba")];
    const acoesDo = (item) => [...item.querySelectorAll(".edicao-acoes button")];
    const clicar = (seletor) => document.querySelector(seletor).click();

    confere("a fileira de edição nasce escondida", getComputedStyle(cartoes()[0].querySelector(".edicao-acoes")).display === "none");
    clicar("#abrir-menu");
    await respira(150);
    clicar("#menu-editar");
    await respira(200);
    confere("o menu liga o modo de edição", document.body.classList.contains("editando") && !document.getElementById("edicao").hidden);
    confere("editando, cada cartão mostra as ações", getComputedStyle(cartoes()[0].querySelector(".edicao-acoes")).display === "grid");
    confere("editando, o seletor de perfis some", getComputedStyle(document.getElementById("perfis")).display === "none");

    // Renomear o treino ativo.
    abaDe(PRIMEIRA).click();
    await respira(200);
    confere("a aba ativa abre as opções do treino", document.getElementById("dialogo-editar-treino").open);
    clicar('#dialogo-editar-treino [value="renomear"]');
    await respira(200);
    confere("renomear pede o nome com o atual preenchido", document.getElementById("dialogo-nome-treino").open
      && document.getElementById("nome-treino").value === PRIMEIRA);
    document.getElementById("nome-treino").value = "Pernas";
    clicar('#dialogo-nome-treino [value="salvar"]');
    await respira(400);
    confere("a aba mostra o nome novo", abaDe(PRIMEIRA).textContent.trim() === "Pernas", abaDe(PRIMEIRA).textContent);
    confere("o nome novo está no banco", (await Banco.listarTreinos("sun")).find((t) => t.id === PRIMEIRA)?.nome === "Pernas");
    confere("o id do treino não muda com o nome", Boolean(document.getElementById(`painel-${PRIMEIRA}`)));

    // Criar um treino.
    const quantasAntes = abas().length;
    clicar("#edicao-treino");
    await respira(200);
    document.getElementById("nome-treino").value = "Braço";
    clicar('#dialogo-nome-treino [value="salvar"]');
    await respira(500);
    confere("criar treino acrescenta uma aba", abas().length === quantasAntes + 1, abas().length);
    const novo = LETRAS[LETRAS.length - 1];
    confere("o treino novo nasce ativo e vazio", letraAtiva === novo && cartoes().length === 0, `${letraAtiva} ${cartoes().length}`);
    confere("o treino novo tem id sorteado", novo.length === 36, novo);

    // Mover um exercício do primeiro para o segundo treino.
    abaDe(PRIMEIRA).click();
    await aguardar(() => letraAtiva === PRIMEIRA, "voltar ao primeiro treino");
    const movido = cartoes()[0].querySelector(".nome").textContent;
    acoesDo(cartoes()[0]).find((b) => b.textContent === "Mover").click();
    await respira(200);
    confere("mover abre a escolha de treino", document.getElementById("dialogo-reativar").open
      && document.getElementById("reativar-titulo").textContent === "Mudar de treino");
    document.querySelector(`#reativar-treinos input[value="${SEGUNDA}"]`).click();
    clicar("#reativar-confirmar");
    await respira(500);
    confere("o exercício saiu do primeiro treino", cartoes().length === DO_PRIMEIRO - 1, cartoes().length);
    const doSegundo = (await Banco.listarExercicios(SEGUNDA, "sun")).map((e) => e.nome);
    confere("e entrou no fim do segundo", doSegundo[doSegundo.length - 1] === movido, doSegundo.join(","));

    // Descer o primeiro exercício.
    const [primeiroNome, segundoNome] = cartoes().slice(0, 2).map((c) => c.querySelector(".nome").textContent);
    confere("o primeiro não sobe", acoesDo(cartoes()[0])[0].disabled);
    acoesDo(cartoes()[0])[1].click();
    await respira(400);
    confere("descer troca a ordem", cartoes()[0].querySelector(".nome").textContent === segundoNome
      && cartoes()[1].querySelector(".nome").textContent === primeiroNome, cartoes().slice(0, 2).map((c) => c.querySelector(".nome").textContent).join(","));

    // Tirar um exercício: sai da lista e fica no histórico.
    const tirado = cartoes()[0].querySelector(".nome").textContent;
    acoesDo(cartoes()[0]).find((b) => b.textContent === "Tirar").click();
    await respira(400);
    confere("tirar reduz a lista", cartoes().length === DO_PRIMEIRO - 2, cartoes().length);
    confere("o tirado fica arquivado no histórico",
      (await Banco.historico("sun")).some((linha) => linha.exercicio.nome === tirado && linha.exercicio.arquivado));

    // Nome parecido com o que já existe: o app oferece o existente e preenche com ele.
    clicar("#edicao-exercicio");
    await respira(200);
    const nomeNovo = document.getElementById("novo-nome");
    nomeNovo.value = "Adbução na máquina";
    nomeNovo.dispatchEvent(new Event("input", { bubbles: true }));
    await respira(100);
    const sugestoes = [...document.querySelectorAll("#novo-parecidos button")];
    confere("digitar nome parecido oferece o que já existe", sugestoes.some((b) => b.textContent.startsWith("Abdução")), sugestoes.map((b) => b.textContent).join(" | "));
    sugestoes.find((b) => b.textContent.startsWith("Abdução"))?.click();
    await respira(100);
    confere("usar o existente preenche máquina e vídeo", nomeNovo.value === "Abdução"
      && document.getElementById("novo-aparelho").value === "37" && document.getElementById("novo-cod").value === "1104"
      && document.querySelector('#novo-grupos input[value="gluteo"]').checked, `${document.getElementById("novo-aparelho").value} ${document.getElementById("novo-cod").value}`);
    nomeNovo.value = "Zumba";
    nomeNovo.dispatchEvent(new Event("input", { bubbles: true }));
    await respira(100);
    confere("nome sem parecido não oferece nada", document.getElementById("novo-parecidos").hidden);
    clicar('#dialogo-novo-exercicio [value="cancelar"]');
    await respira(200);

    // Criar um exercício de peso do corpo.
    clicar("#edicao-exercicio");
    await respira(200);
    document.getElementById("novo-nome").value = "Prancha";
    document.querySelector('#novo-tipo input[value="corpo"]').click();
    document.querySelector('#novo-grupos input[value="abdomen"]').click();
    clicar('#dialogo-novo-exercicio [value="criar"]');
    await respira(500);
    const prancha = cartoes().find((c) => c.querySelector(".nome").textContent === "Prancha");
    confere("o exercício novo entra no fim do treino ativo", Boolean(prancha) && cartoes()[cartoes().length - 1] === prancha);
    const noBanco = (await Banco.listarExercicios(PRIMEIRA, "sun")).find((e) => e.nome === "Prancha");
    confere("o exercício novo grava tipo e músculo", noBanco?.tipo === "corpo" && noBanco?.grupos?.join() === "abdomen" && noBanco.id.length === 36, JSON.stringify(noBanco));
    confere("peso do corpo não ganha chip de carga", !prancha?.querySelector(".carga-valor"));

    // Tirar o treino criado.
    abaDe(novo).click();
    await aguardar(() => letraAtiva === novo, "ir ao treino novo");
    abaDe(novo).click();
    await respira(200);
    clicar('#dialogo-editar-treino [value="tirar"]');
    await respira(500);
    confere("tirar o treino devolve a fileira", abas().length === quantasAntes && !LETRAS.includes(novo), abas().length);
    confere("o treino tirado fica arquivado, não apagado",
      firebase.dados.get(`perfis/${CONTAS.sun}/treinos/${novo}`)?.arquivado === true);

    clicar("#edicao-concluir");
    await respira(200);
    confere("concluir sai do modo de edição", !document.body.classList.contains("editando") && document.getElementById("edicao").hidden);
    confere("fora da edição as ações somem de novo", getComputedStyle(cartoes()[0].querySelector(".edicao-acoes")).display === "none");
  }

  // O círculo na tela: o Sun cria, a Shine entra pelo outro aparelho, e o Sun abre a ficha dela
  // só para ler. Começa sem login, e o "Círculo" do menu só existe para quem tem branch próprio.
  async function circulo() {
    if (!(await aguardar(() => cartoes().length > 0, "os cartões do exemplo"))) return;
    const abrirMenu = async () => { document.getElementById("abrir-menu").click(); await respira(150); };
    const menuCirculo = document.getElementById("menu-circulo");
    const caixa = document.getElementById("circulo");
    const corpo = () => document.getElementById("circulo-corpo").textContent;

    await abrirMenu();
    confere("sem login não há círculo no menu", menuCirculo.hidden);
    document.getElementById("menu").close();

    await Banco.entrar("sun", "sol");
    await aguardar(() => document.getElementById("abrir-menu").classList.contains("com-sol"), "o Sun na tela");
    await respira(200);
    await abrirMenu();
    confere("logado, o círculo aparece no menu", !menuCirculo.hidden);
    menuCirculo.click();
    await respira(300);
    confere("sem círculo o diálogo oferece criar ou entrar", caixa.open && !document.getElementById("circulo-entrar").hidden
      && document.getElementById("circulo-sair").hidden);

    document.getElementById("circulo-codigo").value = "abc";
    document.getElementById("circulo-confirmar").click();
    await respira(100);
    confere("código curto é recusado na tela", !document.getElementById("circulo-erro").hidden
      && (await Banco.lerCirculo("sun")) === null);

    document.getElementById("circulo-criar").click();
    await respira(300);
    const codigo = await Banco.lerCirculo("sun");
    confere("criar mostra o código para passar adiante", codigo !== null && corpo().includes(codigo), corpo());
    confere("dentro do círculo, entrar some e sair aparece", document.getElementById("circulo-entrar").hidden
      && !document.getElementById("circulo-sair").hidden);
    confere("sozinho, a lista diz que ninguém entrou", document.getElementById("circulo-membros").textContent.includes("Ninguém"));

    // A Shine entra pelo aparelho dela e a ficha dela existe no branch dela.
    firebase.deFora(`circulos/${codigo}/membros/${CONTAS.shine}`, { nome: "Shine", entrouEm: 2 });
    Object.entries(TREINOS_SHINE).forEach(([letra, exercicios], ordemTreino) => {
      firebase.deFora(`perfis/${CONTAS.shine}/treinos/${letra}`, { id: letra, nome: letra, ordem: ordemTreino });
      exercicios.forEach((exercicio, ordem) => firebase.deFora(`perfis/${CONTAS.shine}/exercicios/${exercicio.id}`, { ...exercicio, letra, ordem, perfis: ["shine"] }));
    });
    await respira(100);
    caixa.close();
    await abrirMenu();
    menuCirculo.click();
    await respira(300);
    const botaoDaShine = [...document.querySelectorAll("#circulo-membros button")].find((b) => b.textContent.includes("Shine"));
    confere("cada outro membro vira um botão, e o próprio não", Boolean(botaoDaShine)
      && ![...document.querySelectorAll("#circulo-membros button")].some((b) => b.textContent.includes("Sun")));

    // O selo no cartão: o Leg press tem o mesmo código de vídeo nas duas fichas, e ganha a
    // inicial da Shine. Exercício que só o Sun faz não ganha nada.
    const codigosDaShine = new Set(Object.values(TREINOS_SHINE).flat().map((e) => e.cod));
    const emComum = Object.values(TREINOS).flat().find((e) => e.cod === 59);
    const soDoSun = Object.values(TREINOS).flat().find((e) => e.cod > 0 && !codigosDaShine.has(e.cod));
    const cartaoDe = (exercicio) => [...document.querySelectorAll(".exercicio")].find((c) => c.querySelector(".nome").textContent === exercicio.nome);
    confere("exercício em comum ganha o selo com a inicial de quem mais faz", cartaoDe(emComum)?.querySelector(".junto")?.textContent === "S",
      cartaoDe(emComum)?.querySelector(".junto")?.textContent);
    confere("exercício que só o Sun faz não ganha selo", Boolean(soDoSun) && !cartaoDe(soDoSun)?.querySelector(".junto"), soDoSun?.nome);
    confere("o selo é só desenho, o leitor de tela ouve o nome", cartaoDe(emComum)?.querySelector(".descricao").getAttribute("aria-label").includes("Também no treino de Shine"));

    caixa.close();
    cartaoDe(emComum).querySelector(".foto").click();
    await respira(300);
    const daShineNoVisor = Object.values(TREINOS_SHINE).flat().find((e) => e.cod === 59);
    confere("o visor diz quem mais faz e com quantas séries", document.getElementById("visor").open
      && !document.getElementById("visor-circulo").hidden
      && document.getElementById("visor-circulo").textContent.startsWith(`Shine faz ${daShineNoVisor.series} × ${daShineNoVisor.reps} no treino `),
      document.getElementById("visor-circulo").textContent);
    document.getElementById("visor").close();
    cartaoDe(soDoSun).querySelector(".foto").click();
    await respira(300);
    confere("sem ninguém em comum a linha do círculo some do visor", document.getElementById("visor-circulo").hidden);
    document.getElementById("visor").close();
    await abrirMenu();
    menuCirculo.click();
    await respira(300);

    botaoDaShine.click();
    await respira(400);
    const fichaAlheia = document.getElementById("ficha");
    const linhas = [...fichaAlheia.querySelectorAll(".historico-linha")];
    const quantosDaShine = Object.values(TREINOS_SHINE).flat().length;
    confere("a ficha da Shine abre com os exercícios dela", fichaAlheia.open && linhas.length === quantosDaShine, linhas.length);
    confere("a ficha mostra séries por repetições", linhas[0]?.querySelector(".historico-agora")?.textContent === `${TREINOS_SHINE.A[0].series} × ${TREINOS_SHINE.A[0].reps}`,
      linhas[0]?.querySelector(".historico-agora")?.textContent);
    confere("a ficha alheia não tem botão nem campo além de fechar",
      fichaAlheia.querySelectorAll("button, input, details, summary").length === 1);
    confere("a ficha do Sun na tela não muda", cartoes().every((cartao) => !cartao.textContent.includes(TREINOS_SHINE.A[0].nome)));
    fichaAlheia.close();

    await abrirMenu();
    menuCirculo.click();
    await respira(300);
    document.getElementById("circulo-sair").click();
    await respira(300);
    confere("sair volta ao diálogo de criar ou entrar", !document.getElementById("circulo-entrar").hidden
      && (await Banco.lerCirculo("sun")) === null);
  }

  const CASOS = { comportamento, teclado, carga, prepararCarga, exemplo, nuvem, visitante, arrasto, editor, circulo };

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

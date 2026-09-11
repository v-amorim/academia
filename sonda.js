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

  const cartoes = () => [...document.querySelectorAll(".exercicio")];

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
    await respira();
    abaDe(letra).click();
    await respira();
    menu().querySelector(`[value="${valor}"]`).click();
    await respira(250);
  }

  async function comportamento() {
    if (!(await aguardar(() => cartoes().length === DO_PRIMEIRO, "os cartões do primeiro treino"))) return;

    confere("banco disponível por http", document.getElementById("sem-banco").hidden);
    confere("o catálogo inteiro é semeado",
      (await Promise.all(NOMES.map((l) => Banco.listarExercicios(l))))
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
    const exerciciosA = await Banco.listarExercicios(PRIMEIRA);
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
    confere("banco na versão 3", banco.versao === 3, banco.versao);
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
      confere("a lista aponta para a aba certa",
        document.getElementById("lista").getAttribute("aria-labelledby") === `aba-${SEGUNDA}`);

      tecla(abaDe(SEGUNDA), "End");
      await respira(250);
      confere("End vai para a última", abaDe(ULTIMA).getAttribute("aria-selected") === "true" && document.activeElement === abaDe(ULTIMA));
      tecla(abaDe(ULTIMA), "Home");
      await respira(250);
      confere("Home volta para a primeira", abaDe(PRIMEIRA).getAttribute("aria-selected") === "true" && document.activeElement === abaDe(PRIMEIRA));

      // Deslizar na lista, como virar página: o conteúdo segue o dedo, e puxar para a esquerda
      // traz o próximo treino.
      const principal = document.querySelector("main");
      const deslizar = (de, para, ateY = 200) => {
        principal.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: de, clientY: 200 }));
        principal.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: para, clientY: ateY }));
        principal.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: para, clientY: ateY }));
      };
      const ativa = () => NOMES.find((letra) => abaDe(letra).getAttribute("aria-selected") === "true");

      deslizar(300, 200);
      await respira(250);
      confere("deslizar para a esquerda traz o próximo treino", ativa() === SEGUNDA, ativa());
      deslizar(200, 300);
      await respira(250);
      confere("deslizar para a direita volta ao anterior", ativa() === PRIMEIRA, ativa());
      deslizar(300, 290);
      await respira(250);
      confere("deslize curto não troca de treino", ativa() === PRIMEIRA, ativa());
      deslizar(300, 200, 400);
      await respira(250);
      confere("dedo mais vertical é rolagem, e não troca de treino", ativa() === PRIMEIRA, ativa());

      // No trackpad o mesmo gesto não gera ponteiro nenhum, só roda com deltaX.
      const roda = (deltaX, deltaY = 0) =>
        principal.dispatchEvent(new WheelEvent("wheel", { deltaX, deltaY, bubbles: true, cancelable: true }));

      // Uma passada de trackpad vira dezenas de eventos, todos na mesma rajada: o primeiro troca
      // e a inércia tem que morrer na trava, senão uma passada atravessa a fileira inteira.
      for (let resto = 0; resto < 10; resto++) roda(80);
      await respira(300);
      confere("uma passada de trackpad troca um treino só", ativa() === SEGUNDA, ativa());
      roda(-80);
      await respira(300);
      confere("roda para a direita volta ao anterior", ativa() === PRIMEIRA, ativa());
      roda(10, 120);
      await respira(300);
      confere("rolar a lista com a roda não troca de treino", ativa() === PRIMEIRA, ativa());

      // Sem isto o Chrome do Android toma o toque como rolagem e cancela o ponteiro antes dos
      // 60px. Nenhum navegador de mesa denuncia a falta, então quem denuncia é esta linha.
      const toque = getComputedStyle(principal).touchAction;
      confere("a lista entrega o horizontal ao app e guarda o vertical com o navegador",
        toque.includes("pan-y"), toque);
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

    const idA3 = (await Banco.listarExercicios(PRIMEIRA))[3].id;
    const idC2 = (await Banco.listarExercicios(FUNDA))[2].id;

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
      (await Banco.listarExercicios(PRIMEIRA))[3].observacao === "Banco 4, pino 7");
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

  const CASOS = { comportamento, teclado, migracao, preparar };

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

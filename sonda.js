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

  const cartoes = () => [...document.querySelectorAll(".exercicio")];

  // O contador empilha o número que falta atrás das repetições, então o rótulo é remontado das
  // duas partes. Assim a sonda confere que as duas renderizam, e não só o texto do botão.
  function rotuloDo(item) {
    const contador = item.querySelector(".contador");
    const fantasma = contador.querySelector(".fantasma");
    if (!fantasma) return contador.textContent;
    return `${fantasma.textContent}×${contador.querySelector(".reps").textContent.replace(" rep", "")}`;
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
    if (!(await aguardar(() => cartoes().length === 7, "os cartões de A"))) return;

    confere("banco disponível por http", document.getElementById("sem-banco").hidden);
    confere("21 exercícios semeados",
      (await Banco.listarExercicios("A")).length + (await Banco.listarExercicios("B")).length +
      (await Banco.listarExercicios("C")).length === 21);
    confere("aba A nasce ativa", abaDe("A").getAttribute("aria-selected") === "true");
    confere("nenhuma aba concluída", !document.querySelector(".aba .marca"));

    cartoes()[0].querySelector(".contador").click();
    await respira();
    confere("um toque desce uma série", contadores()[0] === "2×12", contadores()[0]);
    confere("a série baixada é anunciada", avisoDiz("2×12"));

    await baixarAte(cartoes()[0], "feito");
    confere("zerado mostra feito", contadores()[0] === "feito", contadores()[0]);
    confere("cartão zerado ganha a classe feito", cartoes()[0].classList.contains("feito"));
    confere("uma aba não conclui por um exercício", !abaDe("A").querySelector(".marca"));

    for (const item of cartoes().slice(1)) await baixarAte(item, "feito");
    await respira(250);
    confere("zerar o último encerra o treino", Boolean(abaDe("A").querySelector(".marca")));
    confere("o encerramento automático é anunciado", avisoDiz("completo e gravado"),
      document.getElementById("aviso").textContent);
    confere("o ciclo ainda não completou", document.getElementById("ciclo").hidden);

    const cheia = await Banco.lerSessaoDeHoje("sun", "A");
    confere("sessão fica concluída no banco", cheia.sessao?.concluidoEm > 0);
    confere("os sete registros ficam gravados", cheia.registros.size === 7, cheia.registros.size);
    confere("A entra nas letras concluídas", (await Banco.letrasConcluidas("sun")).has("A"));

    abaDe("B").click();
    await respira(250);
    confere("trocar de aba carrega o outro treino",
      cartoes()[0].querySelector(".nome").textContent === TREINOS.B[0].nome);
    confere("treino não começado nasce cheio", contadores().every((texto) => texto === "3×12"));

    abaDe("A").click();
    await respira(250);
    confere("voltar para A mantém o feito", contadores().every((texto) => texto === "feito"));

    abaDe("A").click();
    await respira();
    confere("a aba ativa abre o menu", menu().open);
    confere("o rótulo novo está no menu",
      menu().querySelector('[value="encerrar"]').textContent === "Encerrar treino aqui");
    confere("o rótulo antigo morreu", !menu().querySelector('[value="feito"]'));
    menu().querySelector('[value="resetar"]').click();
    await respira(250);

    confere("reset volta ao total", contadores().every((texto) => texto === "3×12"), contadores().join(","));
    confere("reset tira o visto da aba", !abaDe("A").querySelector(".marca"));
    confere("reset não apaga registro", (await Banco.lerSessaoDeHoje("sun", "A")).registros.size === 7);

    // Treino parcial: um exercício desce, o resto é abandonado.
    cartoes()[0].querySelector(".contador").click();
    await respira();
    await pelaAba("A", "encerrar");
    confere("encerrar marca a aba", Boolean(abaDe("A").querySelector(".marca")));
    confere("o encerramento manual é anunciado", avisoDiz("encerrado e gravado"));
    confere("encerrar não mexe no que está na tela", contadores()[0] === "2×12", contadores()[0]);

    const parcial = await Banco.lerSessaoDeHoje("sun", "A");
    const exerciciosA = await Banco.listarExercicios("A");
    confere("treino parcial grava os sete", parcial.registros.size === 7, parcial.registros.size);
    confere("o executado guarda o que sobrou", parcial.registros.get(exerciciosA[0].id).restantes === 2);
    confere("o pulado guarda o total", parcial.registros.get(exerciciosA[1].id).restantes === 3);

    for (const letra of ["B", "C"]) await pelaAba(letra, "encerrar");
    confere("as três abas concluem", document.querySelectorAll(".aba .marca").length === 3);
    confere("o ciclo completo aparece", !document.getElementById("ciclo").hidden);

    document.getElementById("abrir-recomecar").click();
    await respira();
    const recomecar = document.getElementById("dialogo-recomecar");
    confere("o diálogo de recomeçar abre", recomecar.open);
    recomecar.querySelector('[value="recomecar"]').click();
    await respira(400);

    confere("recomeçar limpa os vistos", document.querySelectorAll(".aba .marca").length === 0);
    confere("recomeçar esconde a seção do ciclo", document.getElementById("ciclo").hidden);
    confere("recomeçar volta para A", abaDe("A").getAttribute("aria-selected") === "true");
    confere("recomeçar zera os contadores", contadores().every((texto) => texto === "3×12"));
    confere("recomeçar é anunciado", avisoDiz("recomeçado"));
    confere("recomeçar não apaga sessão", (await Banco.lerSessaoDeHoje("sun", "A")).registros.size === 7);
    confere("nada fica concluído depois do recomeço", (await Banco.letrasConcluidas("sun")).size === 0);

    cartoes()[0].querySelector(".contador").click();
    await respira();
    document.querySelector('input[value="shine"]').click();
    await respira(300);
    confere("o outro perfil nasce cheio", contadores().every((texto) => texto === "3×12"));
    confere("a troca de perfil é anunciada", avisoDiz("Shine"));
    document.querySelector('input[value="sun"]').click();
    await respira(300);
    confere("cada perfil volta com o próprio progresso", contadores()[0] === "2×12", contadores()[0]);

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
    for (const item of cartoes()) await baixarAte(item, "feito");
    await respira(300);
    confere("A concluída de novo aparece na tela", Boolean(abaDe("A").querySelector(".marca")));
    confere("A concluída de novo entra no ciclo corrente",
      (await Banco.letrasConcluidas("sun")).has("A"));
  }

  async function teclado() {
    if (!(await aguardar(() => cartoes().length === 7, "os cartões de A"))) return;
    const tecla = (alvo, key) =>
      alvo.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

    abaDe("A").focus();
    confere("só a aba ativa é tabulável", abaDe("A").tabIndex === 0 && abaDe("B").tabIndex === -1);

    tecla(abaDe("A"), "ArrowRight");
    await respira(250);
    confere("seta direita seleciona a próxima", abaDe("B").getAttribute("aria-selected") === "true");
    confere("seta direita leva o foco junto", document.activeElement === abaDe("B"));
    confere("a lista aponta para a aba certa",
      document.getElementById("lista").getAttribute("aria-labelledby") === "aba-B");

    tecla(abaDe("B"), "End");
    await respira(250);
    confere("End vai para a última", abaDe("C").getAttribute("aria-selected") === "true" && document.activeElement === abaDe("C"));
    tecla(abaDe("C"), "Home");
    await respira(250);
    confere("Home volta para a primeira", abaDe("A").getAttribute("aria-selected") === "true" && document.activeElement === abaDe("A"));

    const contador = cartoes()[0].querySelector(".contador");
    contador.focus();
    tecla(contador, "ArrowDown");
    await respira();
    confere("seta baixo desce uma série", contadores()[0] === "2×12", contadores()[0]);
    tecla(contador, "ArrowUp");
    await respira();
    confere("seta cima sobe uma série", contadores()[0] === "3×12", contadores()[0]);
    tecla(contador, "ArrowUp");
    await respira();
    confere("o contador não passa do total", contadores()[0] === "3×12", contadores()[0]);

    // Pelo gesto de verdade, e não chamando abrirRoda: é o único teste que passa pelo toque longo.
    const seletor = document.getElementById("dialogo-roda");
    const alvo = cartoes()[0].querySelector(".contador");
    alvo.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await respira(600);
    alvo.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await respira(250);
    const opcoes = [...seletor.querySelectorAll(".opcao")];
    confere("o toque longo no contador abre o seletor", seletor.open);
    confere("o seletor traz uma opção por valor", opcoes.length === 4, opcoes.length);
    confere("as opções vão de feito até o total", opcoes.map((o) => o.textContent).join(",") === "feito,1,2,3",
      opcoes.map((o) => o.textContent).join(","));
    confere("o valor de agora vem marcado",
      opcoes.filter((o) => o.getAttribute("aria-current") === "true").map((o) => o.textContent).join() === "3");
    opcoes[1].click();
    await respira(250);
    confere("um toque escolhe e fecha", !seletor.open);
    confere("o seletor grava o valor escolhido", contadores()[0] === "1×12", contadores()[0]);

    cartoes()[0].querySelector(".descricao").click();
    await respira();
    const dialogo = document.getElementById("dialogo-exercicio");
    confere("o nome abre o reset sem toque longo", dialogo.open);
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
    if (!(await aguardar(() => cartoes().length === 7, "os cartões de A"))) return;

    const idA3 = (await Banco.listarExercicios("A"))[3].id;
    const idC2 = (await Banco.listarExercicios("C"))[2].id;

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
    confere("o progresso por posição é descartado", rotuloDo(cartoes()[3]) === "3×12", rotuloDo(cartoes()[3]));

    cartoes()[3].querySelector(".foto").click();
    await respira();
    const visor = document.getElementById("visor");
    confere("o visor abre com a foto migrada", visor.open && visor.querySelector("img").src.startsWith("blob:"));
    document.getElementById("visor-fechar").click();
    await respira();

    document.querySelector('input[value="shine"]').click();
    await respira(300);
    confere("a foto é a mesma nos dois perfis", Boolean(cartoes()[3].querySelector(".foto img")));
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
        transacao.objectStore("estado").put(1, "sun:A3");
        transacao.objectStore("fotos").put(new Blob(["foto do sun"], { type: "image/jpeg" }), "sun:A3");
        transacao.objectStore("fotos").put(new Blob(["foto da shine"], { type: "image/jpeg" }), "shine:A3");
        transacao.objectStore("fotos").put(new Blob(["foto do leg press"], { type: "image/jpeg" }), "sun:C2");
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

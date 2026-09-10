// Camada de acesso a dado. Nenhuma outra parte do app toca indexedDB ou localStorage direto.
// Na fase 6 este é o único arquivo reescrito, trocando IndexedDB por Firestore.
const Banco = (function () {
  // Em origem opaca (arquivo aberto direto) o open() nunca lança nem dispara evento, então o
  // prazo é o único jeito de sair. Aparelho lento pode estourar o prazo e abrir depois: nesse
  // caso o banco é adotado em vez de descartado.
  const PRAZO_ABERTURA = 2500;

  let db = null;

  function abrir(aoAbrirTarde) {
    return new Promise((resolver) => {
      let respondido = false;
      const responder = (aberto) => {
        if (respondido) return;
        respondido = true;
        clearTimeout(prazo);
        db = aberto;
        resolver(Boolean(aberto));
      };
      const prazo = setTimeout(() => responder(null), PRAZO_ABERTURA);

      let pedido;
      try {
        pedido = indexedDB.open("academia", 1);
      } catch {
        return responder(null);
      }

      pedido.onupgradeneeded = () => {
        pedido.result.createObjectStore("estado");
        pedido.result.createObjectStore("fotos");
      };
      pedido.onsuccess = () => {
        if (!respondido) return responder(pedido.result);
        db = pedido.result;
        aoAbrirTarde?.();
      };
      pedido.onerror = () => responder(null);
      pedido.onblocked = () => responder(null);
    });
  }

  const disponivel = () => db !== null;

  function ler(deposito) {
    if (!db) return Promise.resolve([]);
    return new Promise((resolver) => {
      const transacao = db.transaction(deposito, "readonly");
      const alvo = transacao.objectStore(deposito);
      const chaves = alvo.getAllKeys();
      const valores = alvo.getAll();
      valores.onsuccess = () => resolver(chaves.result.map((chave, i) => [chave, valores.result[i]]));
      // Sem estes dois, transação que falha deixa a promessa pendurada e a tela nunca monta.
      transacao.onerror = () => resolver([]);
      transacao.onabort = () => resolver([]);
    });
  }

  function gravar(deposito, chave, valor) {
    db?.transaction(deposito, "readwrite").objectStore(deposito).put(valor, chave);
  }

  function apagar(deposito, chave) {
    db?.transaction(deposito, "readwrite").objectStore(deposito).delete(chave);
  }

  // Safari lança ao tocar em localStorage numa origem opaca, e o Chrome não. Daí o try.
  function lerPreferencia(chave) {
    try {
      return localStorage.getItem(chave);
    } catch {
      return null;
    }
  }

  function gravarPreferencia(chave, valor) {
    try {
      localStorage.setItem(chave, valor);
    } catch {
      /* sem armazenamento nesta origem */
    }
  }

  return { abrir, disponivel, ler, gravar, apagar, lerPreferencia, gravarPreferencia };
})();

# Sunshine

Contador de séries para treino de academia. Aplicativo web instalável, sem servidor e sem build,
com os dados guardados no próprio aparelho.

**[Abrir o app](https://v-amorim.github.io/academia/)**

Dois perfis treinam sobre o mesmo catálogo de exercícios, cada um com o próprio progresso. Na
academia o app abre sem rede, e o dedo faz tudo com uma mão só.

## O que ele faz

- **Contador de séries por exercício.** Um toque desce uma série. Segurar e arrastar ajusta o
  valor no lugar, como o seletor de hora do celular, com a fita de números nascendo dentro do
  próprio contador. As setas do teclado fazem o mesmo.
- **Ciclo ABC.** Concluir os três treinos libera o reinício. Treino encerrado no meio grava o que
  foi feito, e exercício pulado entra com zero.
- **Detalhe por exercício**, com número do aparelho, código do vídeo, três fotos da máquina e um
  campo de observação para as regulagens.
- **Foto em tela cheia**, com pinça, arrasto e toque duplo.
- **Histórico que se grava sozinho.** A sessão do dia é o próprio registro do histórico, então
  não existe passo de salvar, e resetar escreve por cima em vez de apagar.

## Decisões que moldaram o código

**Sem build e sem dependências.** Os scripts são clássicos, não módulos, porque `type="module"`
não executa em `file://`. Isso mantém a página abrindo com dois cliques, o que também é o que
permite verificá-la sem servidor.

**Uma camada só toca o armazenamento.** `banco.js` é o único arquivo que conhece IndexedDB e
`localStorage`; o resto do app fala em exercício, sessão e vaga de foto. É o que deixa a troca
por um banco na nuvem caber num arquivo.

**Identificador estável.** Cada exercício tem um id fixo escrito no código, nunca sorteado em
execução, porque o catálogo é compartilhado entre os aparelhos e id gerado em cada um duplicaria
tudo na primeira sincronização.

**Gestos escritos à mão.** O ajuste do contador e o zoom da foto são feitos com pointer events,
não com a pinça nativa, que ampliaria a página inteira junto com o diálogo. Todo gesto de ponteiro
tem equivalente de teclado.

**O service worker usa duas estratégias.** Navegação busca a rede primeiro, para uma publicação
nova aparecer já na primeira abertura com sinal. Arquivo do app vem do cache primeiro, com busca
em segundo plano, porque abrir rápido na academia vale mais do que ter o CSS da última hora.

**Diálogo é `<dialog>` nativo.** Prisão de foco, Escape, foco de volta no gatilho e fundo inerte
vêm de graça. Tocar fora fecha qualquer um deles, e fechar assim é sempre cancelar.

## Rodar

Abra `index.html` com dois cliques. Por `file://` o app funciona, mas **séries e fotos não são
salvas**, e um aviso no topo diz isso: o navegador bloqueia IndexedDB em origem opaca, recusa a
fonte local e não registra o service worker.

Para salvar tudo, sirva por HTTP:

```bash
npx --yes http-server -p 8080     # com Node
python3 -m http.server 8080       # com Python
```

## Verificar

```bash
node verificar.mjs
```

Precisa de **Node 20.11 ou mais novo** e do Chrome instalado. Funciona no macOS, no Windows e no
Linux; se o Chrome estiver noutro caminho, acrescente em `CAMINHOS_CHROME`.

São 130 conferências em três camadas. A sintaxe dos cinco arquivos JS. A montagem da tela em
`file://`, que confirma que o app abre com dois cliques. E o comportamento num Chrome de verdade
servido por HTTP, com perfil novo a cada caso para o banco nascer limpo: contador, ajuste por
arrasto, encerramento, reset, ciclo, perfis, fotos, observação, zoom, teclado, instalação e a
subida de um banco de versão antiga com fotos gravadas.

Nada de framework de teste. Um servidor `node:http` injeta uma sonda na página, a página devolve o
resultado por `fetch`, e a suíte é validada por mutação: quebra-se uma linha de propósito e
confere-se que a asserção certa fica vermelha.

Fora do alcance dela, só no aparelho: câmera, instalação na tela inicial e a persistência real do
armazenamento no iOS.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Só a marcação |
| `estilo.css` | Tokens de cor e todo o estilo |
| `mulish.woff2` | A fonte, servida do próprio repositório para funcionar sem rede |
| `fichas.js` | Os 21 exercícios e os dois perfis |
| `banco.js` | Acesso a dado. Único arquivo que toca IndexedDB e localStorage |
| `app.js` | Tela, gestos e diálogos |
| `sonda.js` | As asserções que rodam com o app montado no navegador |
| `sw.js` | Service worker. Guarda o app para abrir sem rede |
| `manifest.json` | Nome, cores e ícones da instalação |
| `icone.svg` | Fonte dos ícones. Os PNG saem dele |
| `verificar.mjs` | Verificação sem celular. Serve o app, sobe o Chrome e lê o resultado |

A ordem dos scripts em `index.html` importa: `fichas.js`, depois `banco.js`, depois `app.js`.

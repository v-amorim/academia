# Treino ABC

App de treino de academia. Página estática, sem servidor, dados no aparelho.

Dois usuários: **Sun** e **Shine**. Cada um com o próprio
progresso, hoje sobre o mesmo treino.

## Abrir

Abra `index.html` no navegador, com dois cliques mesmo.

Por `file://` o app roda, mas **séries e fotos não são salvas**, e um aviso âmbar no topo diz
isso. O navegador bloqueia IndexedDB em origem opaca. A escolha de perfil é exceção: ela usa
`localStorage`, que funciona em `file://` no Chrome, e sobrevive à recarga.

Para salvar tudo, sirva por HTTP:

```bash
npx --yes http-server -p 8080     # com Node
python3 -m http.server 8080       # com Python
```

## Verificar

```bash
node verificar.mjs
```

Precisa de **Node 20.11 ou mais novo**, e do Chrome instalado. Funciona no macOS, no Windows e
no Linux; se o Chrome estiver em outro caminho, acrescente em `CAMINHOS_CHROME`.

São três camadas. A sintaxe dos quatro arquivos JS. A montagem da tela em `file://`, que
confirma que o app abre com dois cliques, com 7 cartões, 3 abas, 2 perfis e 5 diálogos. E o
comportamento num Chrome de verdade servido por HTTP, com perfil novo a cada caso para o banco
nascer limpo: contador, encerramento, reset, ciclo, perfis, passagem de teclado e a subida de um
banco da versão 1 com fotos gravadas.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Só a marcação |
| `estilo.css` | Tokens de cor e todo o estilo |
| `mulish.woff2` | A fonte, servida do próprio repo para funcionar sem rede |
| `fichas.js` | Os 21 exercícios e os dois perfis |
| `banco.js` | Acesso a dado. Único arquivo que toca IndexedDB e localStorage |
| `app.js` | Tela, gestos e diálogos |
| `sonda.js` | As asserções que rodam com o app montado no navegador |
| `verificar.mjs` | Verificação sem celular. Serve o app, sobe o Chrome e lê o resultado |
| `BACKLOG.md` | Arquitetura decidida, fases e o que falta construir |
| `CONVENCOES.md` | Regras de cor, interação, código e armadilhas de ferramenta |
| `treino_AB.jpg`, `treino_C.jpg` | Fichas originais da academia, fonte dos 21 exercícios |

Os scripts são clássicos, não módulos, e a ordem em `index.html` importa: `fichas.js`, depois
`banco.js`, depois `app.js`. Módulo ES não roda por `file://`, o que mataria tanto abrir o app
com dois cliques quanto o `verificar.mjs`.

## O que já funciona

- Contador de séries por exercício, com toque curto, toque longo e setas do teclado
- Ciclo ABC, com reinício ao concluir os três treinos
- Perfis Sun e Shine, com dados separados
- Uma foto por exercício, tirada pela câmera e redimensionada antes de gravar
- Diálogos de resetar exercício, resetar treino e marcar treino como feito

## Antes de mexer no código

Leia `CONVENCOES.md`. Ele registra decisões que já foram tomadas e revertidas uma vez, além de
armadilhas de ferramenta que custaram tempo para descobrir.

Depois leia a seção "Fases" do `BACKLOG.md`. A fase 0 está feita.

**A fase 1 está bloqueada por quatro decisões**, listadas em "Fase 1 está bloqueada" no
`BACKLOG.md`. Duas delas quebram a forma de abrir o app e a única forma de verificá-lo, então
não comece por ali sem revisar essas decisões.

# Sunshine

App de treino de academia. Página estática, sem servidor, dados no aparelho.

Dois usuários: **Sun** e **Shine**. Cada um com o próprio
progresso, hoje sobre o mesmo treino ABC. O nome do app é os dois juntos.

## Abrir

Abra `index.html` no navegador, com dois cliques mesmo.

Por `file://` o app roda, mas **séries e fotos não são salvas**, e um aviso âmbar no topo diz
isso. O navegador bloqueia IndexedDB em origem opaca, e pela mesma razão o service worker não
registra e a fonte do repo é recusada. A escolha de perfil é exceção: ela usa `localStorage`, que
funciona em `file://` no Chrome, e sobrevive à recarga.

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

São três camadas. A sintaxe dos cinco arquivos JS. A montagem da tela em `file://`, que confirma
que o app abre com dois cliques, com 7 cartões, 3 abas, 2 perfis e 6 diálogos. E o comportamento
num Chrome de verdade servido por HTTP, com perfil novo a cada caso para o banco nascer limpo:
contador, ajuste por arrasto, encerramento, reset, ciclo, perfis, fotos, observação, zoom,
passagem de teclado, instalação como PWA e a subida de um banco da versão 1 com fotos gravadas.

São 130 conferências. O que ela não alcança está no fim do `CONVENCOES.md`: câmera, persistência
real no iOS e a sensação dos gestos no dedo.

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
| `sw.js` | Service worker. Guarda o app para abrir sem rede na academia |
| `manifest.json` | Nome, cores e ícones de quando o app vai para a tela inicial |
| `icone.svg` | Fonte dos ícones. Os PNG saem dele |
| `verificar.mjs` | Verificação sem celular. Serve o app, sobe o Chrome e lê o resultado |
| `BACKLOG.md` | Arquitetura decidida, fases e o que falta construir |
| `CONVENCOES.md` | Regras de cor, interação, código e armadilhas de ferramenta |

Os scripts são clássicos, não módulos, e a ordem em `index.html` importa: `fichas.js`, depois
`banco.js`, depois `app.js`. Módulo ES não roda por `file://`, o que mataria tanto abrir o app
com dois cliques quanto o `verificar.mjs`.

## O que já funciona

- Contador de séries por exercício. Toque curto desce uma série, segurar e arrastar ajusta o
  valor no lugar, como o seletor de hora do celular, e as setas do teclado fazem o mesmo
- Ciclo ABC, com reinício ao concluir os três treinos
- Perfis Sun e Shine, com dados separados sobre o mesmo catálogo de exercícios
- Tela de detalhe por exercício, com aparelho, vídeo, três fotos da máquina e observação. Abre
  pelo meio do cartão ou pela foto
- Foto em tela cheia, com pinça, arrasto e toque duplo
- Histórico gravado sozinho: a sessão do dia é o próprio registro, e reset nunca apaga
- Instalação na tela inicial, com o app abrindo sem rede depois da primeira visita

## Antes de mexer no código

Leia `CONVENCOES.md`. Ele registra decisões que já foram tomadas e revertidas, às vezes duas
vezes no mesmo dia, além de armadilhas de ferramenta que custaram tempo para descobrir.

Depois leia a seção "Ordem" do `BACKLOG.md`. As fases 0, 1 e 2 estão feitas, e a 5 está pela
metade: falta publicar no GitHub Pages, que depende de o repositório ganhar um remoto.

A próxima é a fase 3, o histórico: peso do dia, aba de histórico com busca e exportação.

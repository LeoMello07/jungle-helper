# Jungle Helper

Overlay para jungler no League of Legends, no visual do HUD do jogo. Lê só a **Live Client Data API**
oficial da Riot (`https://127.0.0.1:2999`, a mesma do placar/TAB) e o Data Dragon. Não mexe na memória do jogo.

## Rodar

```bash
npm install          # só na primeira vez
npm start            # overlay por cima do jogo
npm run demo         # overlay com uma partida simulada (para testar sem jogar)
npm run web          # sem overlay: abra http://127.0.0.1:7878 num 2º monitor
node src/server.js --lan   # idem, acessível pelo celular na mesma rede
```

### Atalhos de um clique (Mac)

```bash
osacompile -o ~/Applications/"Abrir Jungle Helper.app" launchers/abrir.applescript
osacompile -o ~/Applications/"Fechar Jungle Helper.app" launchers/fechar.applescript
```

Depois arraste os dois de `~/Applications` para o Dock. (Não deixe na Mesa se ela sincroniza com o iCloud.)

No LoL, use o modo de janela **Sem moldura**: em tela cheia o jogo esconde o overlay.

## Atalhos (overlay)

| Atalho | Ação |
|---|---|
| `Ctrl+Shift+1…5` | Inimigo 1–5 (TOP, JG, MID, ADC, SUP) usou **Flash** |
| `Ctrl+Alt+1…5` | Inimigo 1–5 usou o **outro feitiço** |
| apertar de novo em até 4s | desfaz a marcação |
| `Ctrl+Shift+C` | copia todos os timers ("MID flash 12:57 \| TOP ghost 9:10") para colar no chat |
| `Ctrl+Shift+0` | modo edição: clicar nos painéis, arrastar, marcar/cancelar feitiço com o mouse |
| `Ctrl+Shift+B` | mostra/esconde a build |
| `Ctrl+Shift+H` | esconde/mostra o overlay |
| `Ctrl+Shift+Q` | fecha |

No Mac o `Ctrl` é a tecla **Control** (não Command). Ao marcar um feitiço, o callout já vai para a área de transferência.

## O que ele faz

- **Feitiços inimigos**: timers com o cooldown do patch atual (Data Dragon), já descontando a aceleração das
  Botas Ionianas. Botão **IC** aparece em quem usa Inspiração: ligue se ele tiver Insight Cósmico.
- **Objetivos**: Dragão (com tipo, alma e Ancião), Larvas, Arauto, Atakhan e Barão, a partir do kill feed.
- **Conselheiro**: chance de gank por lane (Flash/feitiços caídos, nível, placar, CC aliado, onde o jungler inimigo
  apareceu por último), minimapa com a lane recomendada e a rota inicial, e alertas: vantagem numérica,
  objetivo nascendo, ponto de alma, jungler inimigo visto/morto, lanes vazias, diferença de nível, hora de resetar.
- **Build**: core do seu campeão, próximo item com barra de ouro, e situacionais contra o time inimigo
  (anticura, resistência mágica/armadura, penetração contra tanques, Presságio de Randuin contra crítico…).

## Ajustar

- `public/data/builds.js`: builds por campeão (nomes em inglês do Data Dragon; item que sumir do patch é ignorado).
- `public/config.js`: tempos de objetivos. **Não vêm de API nenhuma**: confira a cada patch.
- `npm test`: roda o motor de conselhos sobre a partida demo.

## Limites

- A API não mostra posição, vida nem visão dos inimigos. Os feitiços inimigos são marcados por você, e
  "onde o jungler inimigo está" vem só do kill feed e dos objetivos.
- Builds são ponto de partida, não estatística de meta.
- A política de ferramentas de terceiros da Riot muda com o tempo. Use por sua conta, principalmente em ranqueada.

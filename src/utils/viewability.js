// Escolha do vídeo ATIVO ao rolar — usado por FeedScreen e VideoScreen.
//
// HISTÓRICO DE DOIS BUGS AQUI. Ler antes de mexer.
//
// BUG 1 (06/08, "abro pelo Explorar, o primeiro roda e depois trava"):
// as telas faziam `setActive(viewableItems[0].index)`. Dois furos:
//   a) `viewableItems[0]` pode ser o item SAINDO da tela (com threshold de
//      80% os dois ficam visíveis por um instante) — o ativo pulava pra trás;
//   b) `index` pode vir **null** do FlashList. Aí `index === ativo` fica falso
//      pra TODOS e `Math.abs(index - null)` vira `Math.abs(index)`: só os
//      índices 0 e 1 montam player.
//
// BUG 2 (06/08, causado pela correção do bug 1 — "travou tudo, não roda mais
// nada"): a 1ª versão deste helper chamava `setAtivo(atual => novo)`, no
// estilo do useState. Só que o FeedScreen usa uma ação do ZUSTAND
// (`setCurrentIndex: (i) => set({ currentIndex: i })`), que recebe VALOR, não
// função. Resultado: `currentIndex` virou uma FUNÇÃO — `currentIndex === index`
// falso pra todo card e `Math.abs(função - número)` = NaN, então nenhum player
// montava. Pior que o bug original.
//
// LIÇÃO EMBUTIDA NA API: este helper **nunca** usa atualização funcional.
// Recebe um ref com o valor atual e sempre entrega um NÚMERO pro setter, então
// funciona igual com useState, Zustand, Redux ou o que vier. Semântica de
// setter não é detalhe — não dá pra assumir que dois setters são iguais.
//
// Bônus de performance: só chama o setter quando o índice MUDA de verdade.
// Antes, cada evento de scroll disparava re-render mesmo sem mudança — e
// re-render no feed remonta players.

// Config de viewability COMPARTILHADA e estável (mesma referência sempre).
// Objeto inline no JSX (`viewabilityConfig={{...}}`) muda de identidade a cada
// render; o React Native reclama e pode instabilizar a detecção quando isso
// acontece. Uma constante única garante que feed e VideoScreen usem exatamente
// a mesma regra, sem esse risco.
export const VIEW_CONFIG = { itemVisiblePercentThreshold: 80, minimumViewTime: 100 };

export function escolherAtivo(viewableItems, atualFallback = 0) {
  if (!Array.isArray(viewableItems) || viewableItems.length === 0) {
    return atualFallback;
  }
  let melhor = null;
  let melhorPct = -1;
  for (const v of viewableItems) {
    if (!v || v.isViewable === false) continue;
    const idx = typeof v.index === 'number' ? v.index : NaN;
    if (!Number.isFinite(idx) || idx < 0) continue;
    // percentVisible nem sempre vem (varia por versão/plataforma) — sem ele,
    // qualquer item válido já é melhor que nenhum
    const pct = typeof v.percentVisible === 'number' ? v.percentVisible : 1;
    if (pct > melhorPct) { melhorPct = pct; melhor = idx; }
  }
  return melhor == null ? atualFallback : melhor;
}

// setAtivo: recebe SEMPRE um número (nunca função).
// refAtual: useRef com o índice corrente, mantido aqui dentro.
export function criarHandlerAtivo(setAtivo, refAtual) {
  return ({ viewableItems }) => {
    const atual = refAtual && typeof refAtual.current === 'number' ? refAtual.current : 0;
    const novo = escolherAtivo(viewableItems, atual);
    if (!Number.isFinite(novo) || novo === atual) return; // nada mudou: não re-renderiza
    if (refAtual) refAtual.current = novo;
    setAtivo(novo);
  };
}

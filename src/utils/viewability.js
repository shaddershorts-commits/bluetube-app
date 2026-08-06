// Escolha do vídeo ATIVO ao rolar — usado por FeedScreen e VideoScreen.
//
// POR QUE ISTO EXISTE (bug de 06/08/2026: "abro pelo Explorar, o primeiro
// vídeo roda e depois trava"):
// Os dois lugares faziam `setActive(viewableItems[0].index)`. Isso tem dois
// furos, e o segundo é fatal:
//   1. `viewableItems[0]` pode ser o item que está SAINDO da tela (com
//      threshold de 80% os dois ficam visíveis por um instante durante o
//      scroll) — o ativo pulava pra trás.
//   2. `index` pode vir **null** do FlashList. Se `activeIdx` virar null,
//      `index === activeIdx` fica falso pra TODOS os itens: nenhum vídeo
//      ativo, nada toca. E `Math.abs(index - null)` vira `Math.abs(index)`,
//      então só os índices 0 e 1 montam player. Resultado exato do relato:
//      o primeiro roda, o resto morre.
//
// CONTINGÊNCIA (a pergunta "como isso nunca mais se repete"):
//   - null/undefined/NaN NUNCA passam: se nada for válido, MANTÉM o ativo
//     anterior em vez de zerar. Estado ruim não substitui estado bom.
//   - escolhe o item MAIS visível (maior percentual), não o primeiro do array.
//   - o consumidor recebe sempre um número inteiro >= 0.

export function escolherAtivo(viewableItems, atualFallback = 0) {
  if (!Array.isArray(viewableItems) || viewableItems.length === 0) {
    return atualFallback;
  }
  let melhor = null;
  let melhorPct = -1;
  for (const v of viewableItems) {
    if (!v || !v.isViewable) continue;
    const idx = typeof v.index === 'number' ? v.index : NaN;
    if (!Number.isFinite(idx) || idx < 0) continue;
    // percent nem sempre vem (depende da versão/plataforma) — sem ele,
    // qualquer item válido já é melhor que nenhum
    const pct = typeof v.percentVisible === 'number' ? v.percentVisible : 1;
    if (pct > melhorPct) { melhorPct = pct; melhor = idx; }
  }
  return melhor == null ? atualFallback : melhor;
}

// Handler pronto: devolve a função pro onViewableItemsChanged já com a
// proteção de "nunca troca por valor inválido".
export function criarHandlerAtivo(setAtivo) {
  return ({ viewableItems }) => {
    setAtivo((atual) => escolherAtivo(viewableItems, atual));
  };
}

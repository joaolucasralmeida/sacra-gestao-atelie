import type { Centavos } from "./dinheiro";

export type CustoProduto = {
  custoMaterialCentavos: Centavos;
  /**
   * O tempo dela tem preço. Separar mão de obra do material é o que revela
   * quando uma peça está sendo vendida no prejuízo do próprio trabalho.
   */
  custoMaoObraCentavos: Centavos;
};

export type Precificacao = {
  custoTotalCentavos: Centavos;
  lucroCentavos: Centavos;
  /** Fração entre 0 e 1. 0.5 = 50%. */
  margem: number;
};

export function custoTotal(custo: CustoProduto): Centavos {
  return custo.custoMaterialCentavos + custo.custoMaoObraCentavos;
}

/**
 * Margem = lucro ÷ preço de venda.
 *
 * Custo 10, venda 20 -> lucro 10, margem 50%.
 *
 * Isto é margem, não markup. O mesmo par de números daria markup de 100%
 * (lucro ÷ custo). Os dois são chamados de "margem" no dia a dia e a
 * confusão é clássica; aqui seguimos a definição que a cliente usou no
 * briefing.
 */
export function precificar(
  precoVendaCentavos: Centavos,
  custo: CustoProduto,
): Precificacao {
  const custoTotalCentavos = custoTotal(custo);
  const lucroCentavos = precoVendaCentavos - custoTotalCentavos;

  return {
    custoTotalCentavos,
    lucroCentavos,
    margem: precoVendaCentavos > 0 ? lucroCentavos / precoVendaCentavos : 0,
  };
}

export function formatarMargem(margem: number): string {
  return `${(margem * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

/**
 * Preço necessário para atingir uma margem alvo.
 *
 * preço = custo ÷ (1 - margem). Base da sugestão de preço de kit (Fase 2).
 * Margem >= 1 é impossível: exigiria preço infinito.
 */
export function precoParaMargem(
  custoTotalCentavos: Centavos,
  margemAlvo: number,
): Centavos | null {
  if (margemAlvo >= 1 || margemAlvo < 0) return null;
  return Math.ceil(custoTotalCentavos / (1 - margemAlvo));
}

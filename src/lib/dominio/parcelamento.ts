import { addDays, addMonths, format, parseISO } from "date-fns";
import type { Centavos } from "./dinheiro";

export type Intervalo = { tipo: "mensal" } | { tipo: "dias"; dias: number };

export type ParcelaGerada = {
  numero: number;
  valorCentavos: Centavos;
  /** Data ISO (YYYY-MM-DD). Vencimento não tem hora — é um dia no calendário. */
  vencimento: string;
};

/**
 * Divide um total em parcelas, colocando a sobra na última.
 *
 * R$ 100,00 em 3x = 33,33 / 33,33 / 33,34.
 *
 * A soma das parcelas é sempre igual ao total, por construção — não por
 * sorte de arredondamento. A sobra vai na última porque é a convenção que
 * a cliente já usa no caderno, e porque a diferença aparece no fim, onde
 * ninguém confere.
 */
export function gerarParcelas(
  totalCentavos: Centavos,
  quantidade: number,
  primeiroVencimento: string,
  intervalo: Intervalo = { tipo: "mensal" },
): ParcelaGerada[] {
  if (quantidade < 1)
    throw new Error("Quantidade de parcelas deve ser ao menos 1");
  if (!Number.isInteger(quantidade))
    throw new Error("Quantidade de parcelas deve ser inteira");

  const base = Math.floor(totalCentavos / quantidade);
  const sobra = totalCentavos - base * quantidade;
  const inicio = parseISO(primeiroVencimento);

  return Array.from({ length: quantidade }, (_, indice) => {
    const ultima = indice === quantidade - 1;
    return {
      numero: indice + 1,
      valorCentavos: ultima ? base + sobra : base,
      vencimento: format(avancar(inicio, intervalo, indice), "yyyy-MM-dd"),
    };
  });
}

/**
 * Avança a data em N períodos.
 *
 * No modo mensal usamos addMonths, que já resolve o caso chato: uma venda
 * com primeira parcela em 31/01 vence 28/02 (ou 29 em ano bissexto), não
 * 03/03.
 */
function avancar(inicio: Date, intervalo: Intervalo, periodos: number): Date {
  if (periodos === 0) return inicio;
  return intervalo.tipo === "mensal"
    ? addMonths(inicio, periodos)
    : addDays(inicio, intervalo.dias * periodos);
}

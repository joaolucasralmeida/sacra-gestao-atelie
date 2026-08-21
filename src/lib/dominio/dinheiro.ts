/**
 * Dinheiro é sempre inteiro em centavos.
 *
 * Nenhum valor monetário do sistema é float. Somar 0.1 + 0.2 em ponto
 * flutuante dá 0.30000000000000004, e um sistema financeiro que erra o
 * centavo perde a confiança da usuária no primeiro fechamento de mês.
 */

export type Centavos = number;

const FORMATADOR = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formata centavos como moeda: 4850 -> "R$ 48,50". */
export function formatarBRL(centavos: Centavos): string {
  return FORMATADOR.format(centavos / 100);
}

/** Formata sem o símbolo, para tabelas densas: 4850 -> "48,50". */
export function formatarValor(centavos: Centavos): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Converte o que a usuária digitou em centavos.
 *
 * Aceita as formas que aparecem na prática: "25", "25,90", "R$ 25,90",
 * "1.234,56" e também "25.90", que é o que sai de teclado numérico de
 * celular. Retorna null quando não dá para interpretar — o chamador
 * decide o que fazer, em vez de receber um NaN silencioso.
 */
export function parseParaCentavos(entrada: string): Centavos | null {
  const limpo = entrada.trim().replace(/[R$\s]/g, "");
  if (limpo === "") return null;

  const temVirgula = limpo.includes(",");
  const temPonto = limpo.includes(".");

  let normalizado: string;
  if (temVirgula && temPonto) {
    // "1.234,56" — ponto é separador de milhar, vírgula é decimal.
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (temVirgula) {
    normalizado = limpo.replace(",", ".");
  } else {
    // "25.90" do teclado do celular, ou "25" inteiro.
    normalizado = limpo;
  }

  if (!/^-?\d*\.?\d*$/.test(normalizado)) return null;

  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return null;

  return Math.round(numero * 100);
}

/** Soma segura de centavos. */
export function somar(...valores: Centavos[]): Centavos {
  return valores.reduce((total, valor) => total + valor, 0);
}

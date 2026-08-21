import type { Centavos } from "./dinheiro";

export const FUSO_LOJA = "America/Sao_Paulo";

/**
 * Hoje, no fuso da loja, como data ISO (YYYY-MM-DD).
 *
 * O servidor roda em UTC. Sem isto, entre 21h e 00h de Cachoeiro o sistema
 * já estaria no dia seguinte e marcaria como atrasada uma parcela que
 * vence hoje — exatamente no horário em que ela senta para lançar as
 * vendas do fim de semana.
 */
export function hojeNaLoja(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_LOJA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

export type SituacaoParcela = "paga" | "parcial" | "pendente";

export type EstadoParcela = {
  situacao: SituacaoParcela;
  /** Ortogonal à situação: uma parcela pode estar parcial E atrasada. */
  atrasada: boolean;
  pagoCentavos: Centavos;
  restanteCentavos: Centavos;
  /** Rótulo único para o badge, já com a precedência resolvida. */
  rotulo: "Pago" | "Atrasado" | "Parcial" | "Pendente";
};

/**
 * Estado da parcela, derivado — nunca gravado.
 *
 * Guardar "atrasada" numa coluna exigiria um cron para virar o dia, e o
 * dia vira mesmo quando o cron falha. Calcular na leitura é sempre
 * correto e não tem nada para quebrar.
 *
 * Situação e atraso são independentes de propósito: uma parcela pode
 * estar parcialmente paga e atrasada ao mesmo tempo, e o sistema precisa
 * saber das duas coisas. Só o rótulo achata isso, dando precedência ao
 * atraso — é a informação urgente.
 */
export function estadoParcela(
  parcela: { valorCentavos: Centavos; vencimento: string },
  pagoCentavos: Centavos,
  hoje: string = hojeNaLoja(),
): EstadoParcela {
  const restanteCentavos = Math.max(0, parcela.valorCentavos - pagoCentavos);
  const quitada = pagoCentavos >= parcela.valorCentavos;

  const situacao: SituacaoParcela = quitada
    ? "paga"
    : pagoCentavos > 0
      ? "parcial"
      : "pendente";

  const atrasada = !quitada && parcela.vencimento < hoje;

  return {
    situacao,
    atrasada,
    pagoCentavos,
    restanteCentavos,
    rotulo: quitada
      ? "Pago"
      : atrasada
        ? "Atrasado"
        : situacao === "parcial"
          ? "Parcial"
          : "Pendente",
  };
}

/** Dias até o vencimento. Negativo quando já venceu. */
export function diasAteVencer(
  vencimento: string,
  hoje: string = hojeNaLoja(),
): number {
  const umDia = 86_400_000;
  return Math.round((Date.parse(vencimento) - Date.parse(hoje)) / umDia);
}

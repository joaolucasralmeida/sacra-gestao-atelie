import type { Centavos } from "./dinheiro";
import { custoTotal, type CustoProduto } from "./precificacao";

export type ComponenteKit = CustoProduto & {
  produtoId: string;
  nome: string;
  /** Quantas unidades deste produto entram em um kit. */
  quantidade: number;
  /** Estoque atual do produto. */
  estoque: number;
  precoVendaCentavos: Centavos;
};

export type Montabilidade = {
  /** Quantos kits ainda dá para montar com o estoque atual. */
  maximo: number;
  /** O componente que trava a montagem. Null quando o kit não tem itens. */
  limitante: { produtoId: string; nome: string } | null;
};

/**
 * Quantos kits dá para montar, e quem está travando.
 *
 * 10 terços, 5 cruzes, 20 velas, um de cada por kit -> 5 kits, limitado
 * pela cruz.
 *
 * Saber *qual* item limita é metade do valor: "dá para montar 5" manda
 * ela conferir o estoque inteiro; "a cruz limita em 5" manda ela fazer
 * cruzes.
 */
export function calcularMontabilidade(
  componentes: ComponenteKit[],
): Montabilidade {
  if (componentes.length === 0) return { maximo: 0, limitante: null };

  let maximo = Infinity;
  let limitante: Montabilidade["limitante"] = null;

  for (const componente of componentes) {
    // Componente com quantidade zero seria divisão por zero e não faz
    // sentido numa receita — trata como impedimento explícito.
    if (componente.quantidade <= 0) {
      return {
        maximo: 0,
        limitante: { produtoId: componente.produtoId, nome: componente.nome },
      };
    }

    const possiveis = Math.floor(componente.estoque / componente.quantidade);
    if (possiveis < maximo) {
      maximo = possiveis;
      limitante = { produtoId: componente.produtoId, nome: componente.nome };
    }
  }

  return { maximo: Math.max(0, maximo), limitante };
}

/** Custo do kit: soma do custo dos componentes, na quantidade da receita. */
export function custoDoKit(componentes: ComponenteKit[]): Centavos {
  return componentes.reduce(
    (total, componente) =>
      total + custoTotal(componente) * componente.quantidade,
    0,
  );
}

/** Quanto custaria comprar os itens separadamente — a régua do desconto. */
export function precoSomadoDosItens(componentes: ComponenteKit[]): Centavos {
  return componentes.reduce(
    (total, componente) =>
      total + componente.precoVendaCentavos * componente.quantidade,
    0,
  );
}

export type ResumoKit = {
  custoCentavos: Centavos;
  precoSomadoCentavos: Centavos;
  precoKitCentavos: Centavos;
  descontoCentavos: Centavos;
  lucroCentavos: Centavos;
  margem: number;
};

export function resumirKit(
  componentes: ComponenteKit[],
  precoKitCentavos: Centavos,
): ResumoKit {
  const custoCentavos = custoDoKit(componentes);
  const precoSomadoCentavos = precoSomadoDosItens(componentes);
  const lucroCentavos = precoKitCentavos - custoCentavos;

  return {
    custoCentavos,
    precoSomadoCentavos,
    precoKitCentavos,
    descontoCentavos: Math.max(0, precoSomadoCentavos - precoKitCentavos),
    lucroCentavos,
    margem: precoKitCentavos > 0 ? lucroCentavos / precoKitCentavos : 0,
  };
}

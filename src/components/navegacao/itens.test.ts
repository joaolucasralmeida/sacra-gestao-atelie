import { describe, expect, it } from "vitest";
import {
  ITENS_NAV,
  INICIO_DO_VENDEDOR,
  ROTAS_DO_VENDEDOR,
  itensDoPapel,
} from "./itens";

/**
 * O menu é a primeira barreira que a pessoa enxerga. A segunda é o proxy,
 * que usa ROTAS_DO_VENDEDOR — derivada desta mesma lista. Se ela errar,
 * erram as duas juntas.
 */
describe("itensDoPapel", () => {
  it("dá ao vendedor apenas Vender e Configurações", () => {
    expect(itensDoPapel("vendedor").map((i) => i.href)).toEqual([
      "/vender",
      "/configuracoes",
    ]);
  });

  it("dá à dona o menu inteiro", () => {
    expect(itensDoPapel("dona")).toHaveLength(ITENS_NAV.length);
  });

  it("esconde do vendedor tudo que o RLS fecha para ele", () => {
    const dele = itensDoPapel("vendedor").map((i) => i.href);
    for (const rota of ["/", "/produtos", "/kits", "/clientes", "/a-receber"]) {
      expect(dele).not.toContain(rota);
    }
  });

  it("trata item sem papéis como exclusivo da dona", () => {
    const semPapeis = ITENS_NAV.filter((i) => !i.papeis).map((i) => i.href);
    const doVendedor = itensDoPapel("vendedor").map((i) => i.href);
    for (const rota of semPapeis) {
      expect(doVendedor).not.toContain(rota);
    }
  });
});

describe("ROTAS_DO_VENDEDOR", () => {
  it("acompanha o menu, sem lista paralela para desencontrar", () => {
    expect(ROTAS_DO_VENDEDOR).toEqual(
      itensDoPapel("vendedor").map((i) => i.href),
    );
  });

  it("inclui o destino para onde o vendedor é redirecionado", () => {
    expect(ROTAS_DO_VENDEDOR).toContain(INICIO_DO_VENDEDOR);
  });
});

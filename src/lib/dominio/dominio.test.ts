import { describe, expect, it } from "vitest";
import { formatarBRL, parseParaCentavos } from "./dinheiro";
import { gerarParcelas } from "./parcelamento";
import { precificar, precoParaMargem } from "./precificacao";
import { diasAteVencer, estadoParcela, hojeNaLoja } from "./parcelas";
import { calcularMontabilidade, resumirKit, type ComponenteKit } from "./kits";
import { linkCobranca } from "./cobranca";

/**
 * O Intl separa "R$" do valor com espaço não-quebrável, de propósito: numa
 * tabela estreita o símbolo não pode ficar órfão no fim da linha. Os testes
 * normalizam para poder comparar com espaço comum.
 */
const semNbsp = (texto: string) => texto.replace(/ /g, " ");

describe("dinheiro", () => {
  it("formata centavos em BRL", () => {
    expect(semNbsp(formatarBRL(485000))).toBe("R$ 4.850,00");
    expect(semNbsp(formatarBRL(0))).toBe("R$ 0,00");
  });

  it("lê as formas que a usuária realmente digita", () => {
    expect(parseParaCentavos("25")).toBe(2500);
    expect(parseParaCentavos("25,90")).toBe(2590);
    expect(parseParaCentavos("R$ 25,90")).toBe(2590);
    expect(parseParaCentavos("1.234,56")).toBe(123456);
    // Teclado numérico de celular manda ponto como decimal.
    expect(parseParaCentavos("25.90")).toBe(2590);
  });

  it("recusa lixo em vez de devolver NaN", () => {
    expect(parseParaCentavos("")).toBeNull();
    expect(parseParaCentavos("abc")).toBeNull();
  });
});

describe("parcelamento", () => {
  // Caso 12 da spec.
  it("soma exatamente o total, com a sobra na última parcela", () => {
    const parcelas = gerarParcelas(10000, 3, "2026-09-10");

    expect(parcelas.map((p) => p.valorCentavos)).toEqual([3333, 3333, 3334]);
    expect(parcelas.reduce((s, p) => s + p.valorCentavos, 0)).toBe(10000);
  });

  it("mantém a soma em valores quebrados quaisquer", () => {
    for (const total of [1, 7, 999, 15000, 33333, 149_99]) {
      for (const n of [1, 2, 3, 4, 5, 6, 7, 12]) {
        const soma = gerarParcelas(total, n, "2026-01-31").reduce(
          (s, p) => s + p.valorCentavos,
          0,
        );
        expect(soma).toBe(total);
      }
    }
  });

  it("avança mês a mês sem escorregar para março", () => {
    const parcelas = gerarParcelas(30000, 3, "2026-01-31");

    expect(parcelas.map((p) => p.vencimento)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  it("aceita intervalo em dias", () => {
    const parcelas = gerarParcelas(9000, 3, "2026-09-01", {
      tipo: "dias",
      dias: 15,
    });

    expect(parcelas.map((p) => p.vencimento)).toEqual([
      "2026-09-01",
      "2026-09-16",
      "2026-10-01",
    ]);
  });

  it("rejeita quantidade inválida", () => {
    expect(() => gerarParcelas(1000, 0, "2026-09-01")).toThrow();
    expect(() => gerarParcelas(1000, 2.5, "2026-09-01")).toThrow();
  });
});

describe("precificação", () => {
  it("usa margem sobre o preço, não markup", () => {
    const resultado = precificar(2000, {
      custoMaterialCentavos: 600,
      custoMaoObraCentavos: 400,
    });

    expect(resultado.custoTotalCentavos).toBe(1000);
    expect(resultado.lucroCentavos).toBe(1000);
    expect(resultado.margem).toBe(0.5); // markup seria 1.0
  });

  it("mostra prejuízo quando a mão de obra estoura o preço", () => {
    const resultado = precificar(1000, {
      custoMaterialCentavos: 400,
      custoMaoObraCentavos: 800,
    });

    expect(resultado.lucroCentavos).toBe(-200);
    expect(resultado.margem).toBeLessThan(0);
  });

  it("calcula o preço para uma margem alvo", () => {
    expect(precoParaMargem(1800, 0.4)).toBe(3000);
    expect(precoParaMargem(1800, 1)).toBeNull();
  });
});

describe("parcelas", () => {
  const parcela = { valorCentavos: 10000, vencimento: "2026-09-10" };

  it("registra pagamento parcial com o restante correto", () => {
    const estado = estadoParcela(parcela, 6000, "2026-09-01");

    expect(estado.situacao).toBe("parcial");
    expect(estado.restanteCentavos).toBe(4000);
    expect(estado.rotulo).toBe("Parcial");
  });

  it("quita quando o pago alcança o valor", () => {
    expect(estadoParcela(parcela, 10000, "2026-09-01").situacao).toBe("paga");
    // Pagou mais que a parcela: continua paga, sem restante negativo.
    expect(estadoParcela(parcela, 12000, "2026-09-01").restanteCentavos).toBe(
      0,
    );
  });

  // Caso 17 da spec.
  it("vira atrasada só depois do vencimento", () => {
    expect(estadoParcela(parcela, 0, "2026-09-10").atrasada).toBe(false);
    expect(estadoParcela(parcela, 0, "2026-09-11").atrasada).toBe(true);
  });

  it("trata parcial e atrasada como estados independentes", () => {
    const estado = estadoParcela(parcela, 6000, "2026-09-20");

    expect(estado.situacao).toBe("parcial");
    expect(estado.atrasada).toBe(true);
    // O rótulo dá precedência ao atraso: é a informação urgente.
    expect(estado.rotulo).toBe("Atrasado");
  });

  it("parcela paga nunca aparece como atrasada", () => {
    expect(estadoParcela(parcela, 10000, "2027-01-01").atrasada).toBe(false);
  });

  it("usa o fuso da loja, não o do servidor", () => {
    // 03:00 UTC de 11/09 ainda é dia 10 em Cachoeiro.
    const madrugada = new Date("2026-09-11T02:00:00Z");

    expect(hojeNaLoja(madrugada)).toBe("2026-09-10");
    expect(estadoParcela(parcela, 0, hojeNaLoja(madrugada)).atrasada).toBe(
      false,
    );
  });

  it("conta os dias até vencer", () => {
    expect(diasAteVencer("2026-09-10", "2026-09-01")).toBe(9);
    expect(diasAteVencer("2026-09-01", "2026-09-10")).toBe(-9);
  });
});

describe("cobrança no WhatsApp", () => {
  const base = {
    cliente: "Maria das Graças Silva",
    numero: 2,
    valorCentavos: 5000,
    vencimento: "2026-08-23",
  };

  it("normaliza o telefone como ela digita", () => {
    const link = linkCobranca("(28) 99999-0000", base)!;
    expect(new URL(link).pathname).toBe("/5528999990000");
  });

  it("não duplica o DDI de quem já tem 55", () => {
    const link = linkCobranca("5528999990000", base)!;
    expect(new URL(link).pathname).toBe("/5528999990000");
  });

  it("recusa telefone curto demais em vez de gerar link quebrado", () => {
    expect(linkCobranca("9999", base)).toBeNull();
    expect(linkCobranca(null, base)).toBeNull();
    expect(linkCobranca("", base)).toBeNull();
  });

  it("trata a pessoa pelo primeiro nome", () => {
    const texto = mensagemDe(linkCobranca("28999990000", base)!);
    expect(texto).toContain("Oi Maria,");
    expect(texto).not.toContain("das Graças");
  });

  it("diz 'vence' no futuro e 'venceu' no passado", () => {
    expect(mensagemDe(linkCobranca("28999990000", base)!)).toContain(
      "vence em 23/08/2026",
    );

    const atrasada = mensagemDe(
      linkCobranca("28999990000", { ...base, atrasada: true })!,
    );
    expect(atrasada).toContain("venceu em 23/08/2026");
  });

  it("cobra o que falta, não o valor cheio da parcela", () => {
    const texto = mensagemDe(
      linkCobranca("28999990000", { ...base, valorCentavos: 3000 })!,
    );
    expect(semNbsp(texto)).toContain("R$ 30,00");
  });
});

function mensagemDe(link: string): string {
  return new URL(link).searchParams.get("text") ?? "";
}

describe("kits", () => {
  const componente = (
    nome: string,
    quantidade: number,
    estoque: number,
  ): ComponenteKit => ({
    produtoId: nome,
    nome,
    quantidade,
    estoque,
    custoMaterialCentavos: 300,
    custoMaoObraCentavos: 200,
    precoVendaCentavos: 2000,
  });

  // Caso 15 da spec.
  it("identifica o item limitante", () => {
    const resultado = calcularMontabilidade([
      componente("Terço", 1, 10),
      componente("Cruz", 1, 5),
      componente("Vela", 1, 20),
    ]);

    expect(resultado.maximo).toBe(5);
    expect(resultado.limitante?.nome).toBe("Cruz");
  });

  it("considera a quantidade da receita", () => {
    // 20 velas, 3 por kit -> 6 kits.
    const resultado = calcularMontabilidade([componente("Vela", 3, 20)]);

    expect(resultado.maximo).toBe(6);
  });

  it("retorna zero quando falta componente", () => {
    const resultado = calcularMontabilidade([
      componente("Terço", 1, 10),
      componente("Cruz", 1, 0),
    ]);

    expect(resultado.maximo).toBe(0);
    expect(resultado.limitante?.nome).toBe("Cruz");
  });

  it("não monta kit sem receita", () => {
    expect(calcularMontabilidade([])).toEqual({ maximo: 0, limitante: null });
  });

  it("nunca reporta montagem negativa com estoque negativo", () => {
    expect(calcularMontabilidade([componente("Terço", 1, -4)]).maximo).toBe(0);
  });

  it("resume custo, desconto, lucro e margem do kit", () => {
    const componentes = [componente("Terço", 1, 10), componente("Cruz", 1, 5)];
    const resumo = resumirKit(componentes, 3490);

    expect(resumo.custoCentavos).toBe(1000); // 500 + 500
    expect(resumo.precoSomadoCentavos).toBe(4000);
    expect(resumo.descontoCentavos).toBe(510);
    expect(resumo.lucroCentavos).toBe(2490);
  });
});

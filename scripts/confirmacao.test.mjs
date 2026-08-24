import { describe, expect, it, vi } from "vitest";
import { confirmar } from "./confirmacao.mjs";

const PALAVRA = "APAGAR TUDO";
const responde = (valor) => async () => valor;

/**
 * Esta é a única trava entre um comando digitado por engano e a perda dos
 * dados da loja. Na dúvida, não apaga.
 */
describe("confirmar", () => {
  it("prossegue com a palavra exata", async () => {
    const { prosseguir } = await confirmar({
      palavra: PALAVRA,
      isTTY: true,
      perguntar: responde(PALAVRA),
    });
    expect(prosseguir).toBe(true);
  });

  it.each([
    ["resposta qualquer", "sim"],
    ["vazio", ""],
    ["minúsculas", "apagar tudo"],
    ["espaço a mais", "APAGAR  TUDO"],
    ["palavra parcial", "APAGAR"],
  ])("recusa: %s", async (_rotulo, resposta) => {
    const { prosseguir } = await confirmar({
      palavra: PALAVRA,
      isTTY: true,
      perguntar: responde(resposta),
    });
    expect(prosseguir).toBe(false);
  });

  it("recusa sem terminal, porque não teria como perguntar", async () => {
    const { prosseguir } = await confirmar({ palavra: PALAVRA, isTTY: false });
    expect(prosseguir).toBe(false);
  });

  it("aceita --sim sem perguntar nada", async () => {
    const perguntar = vi.fn();
    const { prosseguir } = await confirmar({
      palavra: PALAVRA,
      argv: ["--sim"],
      isTTY: true,
      perguntar,
    });
    expect(prosseguir).toBe(true);
    expect(perguntar).not.toHaveBeenCalled();
  });

  it("não confunde --simular com --sim", async () => {
    const { prosseguir } = await confirmar({
      palavra: PALAVRA,
      argv: ["--simular"],
      isTTY: false,
    });
    expect(prosseguir).toBe(false);
  });
});

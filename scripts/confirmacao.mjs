/**
 * Decide se uma operação destrutiva pode prosseguir.
 *
 * Vive separado do script que apaga para poder ser testado sem tocar no
 * banco — é a única trava entre um comando digitado por engano e a perda
 * dos dados da loja.
 */
import { createInterface } from "node:readline";

/** Pergunta no terminal, ecoando o que é digitado. */
export function perguntarNoTerminal(rotulo) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(rotulo, (resposta) => {
      rl.close();
      resolve(resposta.trim());
    });
  });
}

/**
 * @returns {Promise<{ prosseguir: boolean, motivo: string }>}
 *
 * `motivo` explica a recusa para o script imprimir. A regra é conservadora:
 * na dúvida, não apaga.
 */
export async function confirmar({
  palavra,
  argv = [],
  isTTY = false,
  perguntar = perguntarNoTerminal,
}) {
  if (argv.includes("--sim")) {
    return { prosseguir: true, motivo: "confirmado por --sim" };
  }

  if (!isTTY) {
    return {
      prosseguir: false,
      motivo:
        "Sem terminal para perguntar. Se é isso mesmo que você quer,\n" +
        "  rode de novo com --sim.",
    };
  }

  const resposta = await perguntar(`  Digite ${palavra} para continuar: `);

  if (resposta !== palavra) {
    return { prosseguir: false, motivo: "Cancelado. Nada foi apagado." };
  }

  return { prosseguir: true, motivo: "confirmado no terminal" };
}

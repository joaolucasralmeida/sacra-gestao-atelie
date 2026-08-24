/**
 * Sessão compartilhada pelos scripts de manutenção.
 *
 * As credenciais vêm do ambiente, nunca do código. Antes elas estavam
 * escritas em cinco arquivos — que iriam para o repositório e, num projeto
 * de portfólio, para um GitHub público junto com a senha da dona.
 *
 * Defina antes de rodar, no PowerShell:
 *
 *   $env:SACRA_EMAIL = "..."
 *   $env:SACRA_SENHA = "..."
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

/**
 * Erro que encerra o script com mensagem, sem rastro de pilha.
 *
 * Existe porque `process.exit()` derruba o Node no Windows com
 * "Assertion failed ... UV_HANDLE_CLOSING" quando ainda há conexões do
 * `fetch` fechando — que é sempre o caso depois de falar com o Supabase.
 * Lançar um erro deixa o processo terminar sozinho, do jeito certo.
 */
class SaidaComErro extends Error {}

let codigoDeSaida = 1;

process.on("uncaughtException", (erro) => {
  if (!(erro instanceof SaidaComErro)) throw erro;
  // A mensagem já foi impressa por `abortar`; aqui só o código de saída.
  process.exitCode = codigoDeSaida;
});

/**
 * Imprime a mensagem e interrompe o script. Nunca retorna.
 *
 * `codigo` distingue os motivos para quem chama o script de outro programa.
 */
export function abortar(mensagem, codigo = 1) {
  console.error(mensagem);
  encerrar(codigo);
}

/** Interrompe o script sem imprimir nada. Nunca retorna. */
export function encerrar(codigo = 0) {
  codigoDeSaida = codigo;
  throw new SaidaComErro(`saida `);
}

export function lerEnvLocal() {
  return Object.fromEntries(
    readFileSync(new URL("../.env.local", import.meta.url), "utf8")
      .split("\n")
      .filter((linha) => linha.includes("="))
      .map((linha) => {
        const corte = linha.indexOf("=");
        return [linha.slice(0, corte).trim(), linha.slice(corte + 1).trim()];
      }),
  );
}

export function criarCliente() {
  const env = lerEnvLocal();
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Cliente já autenticado como a dona. Encerra o processo se faltar credencial. */
export async function entrarComoDona() {
  const email = process.env.SACRA_EMAIL;
  const senha = process.env.SACRA_SENHA;

  if (!email || !senha) {
    abortar(
      "Faltam credenciais. Defina SACRA_EMAIL e SACRA_SENHA no ambiente:\n" +
        '  $env:SACRA_EMAIL = "seu@email"\n' +
        '  $env:SACRA_SENHA = "sua-senha"',
    );
  }

  const db = criarCliente();
  const { data, error } = await db.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) abortar(`Login falhou: ${error.message}`);

  return { db, usuario: data.user };
}

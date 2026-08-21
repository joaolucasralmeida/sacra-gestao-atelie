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
    console.error(
      "Faltam credenciais. Defina SACRA_EMAIL e SACRA_SENHA no ambiente:\n" +
        '  $env:SACRA_EMAIL = "seu@email"\n' +
        '  $env:SACRA_SENHA = "sua-senha"',
    );
    process.exit(1);
  }

  const db = criarCliente();
  const { data, error } = await db.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    console.error("Login falhou:", error.message);
    process.exit(1);
  }

  return { db, usuario: data.user };
}

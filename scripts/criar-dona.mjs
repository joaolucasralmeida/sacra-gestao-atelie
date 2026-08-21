/**
 * Cria a conta da dona via signUp público.
 *
 * O trigger `ao_criar_usuario` promove automaticamente o PRIMEIRO perfil a
 * `dona`; os seguintes entram como `vendedor`. Se o projeto exigir
 * confirmação de e-mail, a conta nasce pendente e o login falha até
 * confirmar — o script avisa quando é esse o caso.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const [email, senha, nome] = process.argv.slice(2);

if (!email || !senha) {
  console.error("uso: node scripts/criar-dona.mjs <email> <senha> [nome]");
  process.exit(1);
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const { data, error } = await supabase.auth.signUp({
  email,
  password: senha,
  options: { data: { nome: nome ?? email.split("@")[0] } },
});

if (error) {
  console.error("Falhou:", error.message);
  process.exit(1);
}

if (!data.session) {
  console.log(
    "Conta criada, mas SEM sessão — o projeto exige confirmação de e-mail.",
  );
  console.log("Confirme pelo link enviado, ou desligue a confirmação em");
  console.log("Authentication > Sign In / Providers > Confirm email.");
  process.exit(2);
}

console.log("Conta criada e sessão aberta.");

const { data: perfil } = await supabase
  .from("perfis")
  .select("nome, papel")
  .eq("id", data.user.id)
  .single();

console.log("Perfil:", perfil);

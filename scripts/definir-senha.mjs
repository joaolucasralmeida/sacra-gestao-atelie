/**
 * Define a senha de um usuário existente, sem enviar e-mail.
 *
 * Usa a API de administração do Supabase, que exige a *secret key* — a chave
 * mestra do projeto. Ela não fica gravada em lugar nenhum: é digitada na hora
 * e vive apenas na memória enquanto o script roda.
 *
 * Preserva o `id` do usuário, o perfil `dona` e todo o histórico. É a
 * alternativa ao "Send password recovery", que depende de e-mail e esbarra no
 * limite de envio do SMTP embutido.
 *
 * uso: node scripts/definir-senha.mjs <email>
 */
import { createInterface } from "node:readline";
import { lerEnvLocal, liberarEntrada } from "./sessao.mjs";

const url = lerEnvLocal().NEXT_PUBLIC_SUPABASE_URL;

/** Pergunta sem ecoar o que é digitado. */
function perguntarOculto(rotulo) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl._writeToOutput = function (texto) {
      if (texto.includes(rotulo)) this.output.write(texto);
    };
    rl.question(rotulo, (resposta) => {
      rl.output.write("\n");
      rl.close();
      resolve(resposta.trim());
    });
  });
}

class Falha extends Error {}

async function principal() {
  const email = process.argv[2] ?? process.env.SACRA_EMAIL;

  if (!email) {
    throw new Falha(
      "Informe o e-mail: node scripts/definir-senha.mjs <email>",
    );
  }

  console.log("\n  Definir senha — Sacra Studio");
  console.log(`  Projeto: ${new URL(url).host}`);
  console.log(`  Usuário: ${email}\n`);
  console.log("  Cole a secret key (Settings > API Keys > Secret keys).");
  console.log("  Nada aparece na tela enquanto você cola. É esperado.\n");

  const chave = await perguntarOculto("  secret key: ");
  if (!chave.startsWith("sb_secret_")) {
    throw new Falha(
      "Isso não parece uma secret key — ela começa com sb_secret_.",
    );
  }

  const cabecalhos = {
    apikey: chave,
    Authorization: `Bearer ${chave}`,
    "Content-Type": "application/json",
  };

  console.log("\n  Procurando o usuário...");

  const busca = await fetch(`${url}/auth/v1/admin/users`, {
    headers: cabecalhos,
  });
  if (!busca.ok) {
    throw new Falha(
      `A API recusou a chave (HTTP ${busca.status}). Confira se copiou a secret key inteira.`,
    );
  }

  const { users } = await busca.json();
  const usuario = users.find((u) => u.email === email);
  if (!usuario) throw new Falha(`Não encontrei ${email} neste projeto.`);

  console.log(`  Encontrado: ${usuario.id}\n`);

  const senha = await perguntarOculto("  nova senha: ");
  const confirmacao = await perguntarOculto("  repita a senha: ");

  if (senha !== confirmacao) throw new Falha("As duas senhas não são iguais.");
  if (senha.length < 8) throw new Falha("Use pelo menos 8 caracteres.");

  const resposta = await fetch(`${url}/auth/v1/admin/users/${usuario.id}`, {
    method: "PUT",
    headers: cabecalhos,
    body: JSON.stringify({ password: senha }),
  });

  if (!resposta.ok) {
    throw new Falha(
      `Não consegui definir a senha (HTTP ${resposta.status}): ${await resposta.text()}`,
    );
  }

  console.log("\n  Senha definida.");
  console.log("  Entre no sistema com esse e-mail e a nova senha.\n");
}

try {
  await principal();
} catch (erro) {
  if (!(erro instanceof Falha)) throw erro;
  console.error(`\n  ${erro.message}\n`);
  process.exitCode = 1;
}

// O processo encerra sozinho: sem `process.exit`, que no Windows derruba o
// Node com uma asserção quando a leitura do teclado ainda está fechando.
liberarEntrada();

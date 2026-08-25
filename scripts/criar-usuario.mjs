/**
 * Cria um usuário pela API de administração do Supabase.
 *
 * O trigger `ao_criar_usuario` decide o papel: o primeiro perfil do banco
 * nasce `dona`, os seguintes nascem `vendedor`. Este script não escolhe papel
 * — ele confere qual saiu e avisa, para ninguém descobrir depois.
 *
 * A conta nasce sem senha. Quem entra define a própria, pelo link de
 * recuperação ou pelo `definir-senha.mjs`. Ninguém precisa combinar senha
 * provisória por WhatsApp.
 *
 * uso: node scripts/criar-usuario.mjs <email> "<nome>"
 */
import { createInterface } from "node:readline";
import { lerEnvLocal, liberarEntrada } from "./sessao.mjs";

const url = lerEnvLocal().NEXT_PUBLIC_SUPABASE_URL;

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
  const email = process.argv[2];
  const nome = process.argv[3];

  if (!email || !nome) {
    throw new Falha('uso: node scripts/criar-usuario.mjs <email> "<nome>"');
  }

  console.log("\n  Criar usuário — Sacra Studio");
  console.log(`  Projeto: ${new URL(url).host}`);
  console.log(`  E-mail:  ${email}`);
  console.log(`  Nome:    ${nome}\n`);
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

  // Confere antes de criar: repetir e-mail devolve um erro cru da API.
  const busca = await fetch(`${url}/auth/v1/admin/users`, {
    headers: cabecalhos,
  });
  if (!busca.ok) {
    throw new Falha(
      `A API recusou a chave (HTTP ${busca.status}). Confira se copiou a secret key inteira.`,
    );
  }

  const { users } = await busca.json();
  if (users.some((u) => u.email === email)) {
    throw new Falha(`${email} já tem conta neste projeto.`);
  }

  console.log("  Criando...");

  const criacao = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: cabecalhos,
    body: JSON.stringify({
      email,
      // Sem isto a conta nasce pendente e o login falha até confirmar por
      // e-mail — que hoje depende do SMTP estar de pé.
      email_confirm: true,
      user_metadata: { nome },
    }),
  });

  if (!criacao.ok) {
    throw new Falha(
      `Não consegui criar (HTTP ${criacao.status}): ${await criacao.text()}`,
    );
  }

  const usuario = await criacao.json();
  console.log(`  Conta criada: ${usuario.id}\n`);

  // O perfil é criado pelo trigger, não por este script. Ler de volta é o
  // que confirma que o papel saiu como se esperava.
  const perfil = await fetch(
    `${url}/rest/v1/perfis?id=eq.${usuario.id}&select=nome,papel`,
    { headers: cabecalhos },
  );

  if (!perfil.ok) {
    console.log("  Não consegui ler o perfil para conferir o papel.");
    return;
  }

  const [linha] = await perfil.json();

  if (!linha) {
    console.log("  ATENÇÃO: o perfil não foi criado. O trigger falhou?");
    return;
  }

  console.log(`  Perfil: ${linha.nome} — papel "${linha.papel}"`);

  if (linha.papel === "dona") {
    console.log(
      "\n  ATENÇÃO: saiu como dona, não vendedor. Isso acontece quando o\n" +
        "  banco não tinha nenhum perfil antes. Ajuste se não era o esperado.",
    );
  }

  console.log("\n  A conta não tem senha ainda. Para ela entrar:");
  console.log("    - peça uma recuperação de senha (exige o SMTP funcionando), ou");
  console.log(`    - rode: node scripts/definir-senha.mjs ${email}\n`);
}

try {
  await principal();
} catch (erro) {
  if (!(erro instanceof Falha)) throw erro;
  console.error(`\n  ${erro.message}\n`);
  process.exitCode = 1;
}

liberarEntrada();

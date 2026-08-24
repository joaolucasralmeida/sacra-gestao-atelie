/**
 * Zera os dados operacionais, preservando as configurações.
 *
 * Serve para deixar o banco limpo depois dos testes, antes da loja começar a
 * usar de verdade. Não toca em formas de pagamento, categorias nem usuários.
 *
 * Fala com o banco de PRODUÇÃO — o mesmo que a loja usa — e não há backup
 * automático. Por isso conta o que será perdido, mostra na tela e exige a
 * palavra de confirmação antes de escrever qualquer coisa. Para uso
 * automatizado, `--sim` dispensa a pergunta.
 *
 * Ordem obrigatória na exclusão: venda_itens e kit_itens seguram os produtos
 * por chave estrangeira RESTRICT — é o que impede apagar um produto e levar o
 * histórico de vendas junto sem perceber.
 */
import { confirmar } from "./confirmacao.mjs";
import { entrarComoDona, lerEnvLocal } from "./sessao.mjs";

const TUDO = "00000000-0000-0000-0000-000000000000";
const PALAVRA = "APAGAR TUDO";

const TABELAS = [
  "vendas",
  "estoque_movimentos",
  "montagens_kit",
  "kits",
  "produtos",
  "clientes",
  "eventos",
];

const { db, usuario } = await entrarComoDona();

async function contar(tabela) {
  const { count } = await db
    .from(tabela)
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

/** As fotos vivem no storage e não somem junto com o produto. */
async function listarFotos() {
  const { data: pastas } = await db.storage
    .from("produtos")
    .list("", { limit: 1000 });

  const arquivos = [];
  for (const pasta of pastas ?? []) {
    const { data: dentro } = await db.storage
      .from("produtos")
      .list(pasta.name, { limit: 1000 });
    for (const arquivo of dentro ?? [])
      arquivos.push(`${pasta.name}/${arquivo.name}`);
  }
  return arquivos;
}

async function apagar(rotulo, promessa) {
  const { error } = await promessa;
  console.log(
    `  ${error ? "✗" : "✓"} ${rotulo}${error ? ` — ${error.message}` : ""}`,
  );
}

// ---------------------------------------------------------------------------
// 1. Medir o estrago antes de qualquer escrita.
// ---------------------------------------------------------------------------

const contagens = Object.fromEntries(
  await Promise.all(TABELAS.map(async (t) => [t, await contar(t)])),
);
const fotos = await listarFotos();
const total =
  Object.values(contagens).reduce((soma, n) => soma + n, 0) + fotos.length;

if (total === 0) {
  console.log("\n  O banco já está vazio. Nada a fazer.\n");
  process.exit(0);
}

const host = new URL(lerEnvLocal().NEXT_PUBLIC_SUPABASE_URL).host;

console.log(`\n  Banco: ${host}`);
console.log(`  Conta: ${usuario.email}\n`);
console.log("  Isto vai apagar PERMANENTEMENTE:\n");

for (const tabela of TABELAS) {
  if (contagens[tabela] > 0) {
    console.log(`    ${String(contagens[tabela]).padStart(5)}  ${tabela}`);
  }
}
if (fotos.length > 0) {
  console.log(`    ${String(fotos.length).padStart(5)}  fotos no storage`);
}

console.log("\n  Não há backup automático. O que sair daqui não volta.\n");

// ---------------------------------------------------------------------------
// 2. Confirmar.
// ---------------------------------------------------------------------------

const { prosseguir, motivo } = await confirmar({
  palavra: PALAVRA,
  argv: process.argv,
  isTTY: process.stdin.isTTY,
});

if (!prosseguir) {
  console.log(`\n  ${motivo}\n`);
  process.exitCode = 1;
  process.stdin.unref();
} else {
  // ---------------------------------------------------------------------------
  // 3. Apagar.
  // ---------------------------------------------------------------------------

  console.log("\nZerando dados operacionais:");

  await apagar(
    "vendas (leva itens, parcelas e pagamentos)",
    db.from("vendas").delete().neq("id", TUDO),
  );
  await apagar(
    "movimentos de estoque",
    db.from("estoque_movimentos").delete().neq("id", TUDO),
  );
  await apagar(
    "montagens de kit",
    db.from("montagens_kit").delete().neq("id", TUDO),
  );
  await apagar(
    "receitas de kit",
    db.from("kit_itens").delete().neq("kit_id", TUDO),
  );
  await apagar("kits", db.from("kits").delete().neq("id", TUDO));
  await apagar("produtos", db.from("produtos").delete().neq("id", TUDO));
  await apagar("clientes", db.from("clientes").delete().neq("id", TUDO));
  await apagar("eventos", db.from("eventos").delete().neq("id", TUDO));

  if (fotos.length > 0) {
    await apagar(
      `${fotos.length} foto(s) do storage`,
      db.storage.from("produtos").remove(fotos),
    );
  }

  console.log("\nSobrou:");
  for (const tabela of TABELAS) {
    console.log(`  ${tabela.padEnd(20)} ${await contar(tabela)}`);
  }
  console.log(
    "\nPreservados: formas de pagamento, categorias, configurações e usuários.",
  );

  process.stdin.unref();
}

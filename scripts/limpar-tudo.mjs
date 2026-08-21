/**
 * Zera os dados operacionais, preservando as configurações.
 *
 * Serve para deixar o banco limpo depois dos testes, antes da loja começar a
 * usar de verdade. Não toca em formas de pagamento, categorias nem usuários.
 *
 * Ordem obrigatória: venda_itens e kit_itens seguram os produtos por chave
 * estrangeira RESTRICT — é o que impede apagar um produto e levar o histórico
 * de vendas junto sem perceber.
 */
import { entrarComoDona } from "./sessao.mjs";

const { db, usuario } = await entrarComoDona();

const TUDO = "00000000-0000-0000-0000-000000000000";

async function apagar(rotulo, promessa) {
  const { error } = await promessa;
  console.log(
    `  ${error ? "✗" : "✓"} ${rotulo}${error ? ` — ${error.message}` : ""}`,
  );
}

console.log("Zerando dados operacionais:");

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

// As fotos vivem no storage, não no banco: apagar o produto não leva o
// arquivo junto. Sem esta parte, cada limpeza deixaria a cota do plano
// gratuito ocupada por imagens de produtos que não existem mais.
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
if (arquivos.length > 0) {
  await apagar(
    `${arquivos.length} foto(s) do storage`,
    db.storage.from("produtos").remove(arquivos),
  );
}

const contar = async (tabela) => {
  const { count } = await db
    .from(tabela)
    .select("id", { count: "exact", head: true });
  return count ?? 0;
};

console.log("\nSobrou:");
for (const t of [
  "produtos",
  "kits",
  "clientes",
  "vendas",
  "eventos",
  "estoque_movimentos",
]) {
  console.log(`  ${t.padEnd(20)} ${await contar(t)}`);
}
console.log(
  "\nPreservados: formas de pagamento, categorias, configurações e usuários.",
);

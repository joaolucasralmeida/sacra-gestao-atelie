/**
 * Remove o que os testes de aceitação deixaram para trás.
 *
 * A ordem importa: `venda_itens` e `kit_itens` referenciam `produtos` com
 * ON DELETE RESTRICT — é o que impede alguém apagar um produto e levar o
 * histórico de vendas junto. Aqui a gente desmonta na ordem inversa.
 */
import { entrarComoDona } from "./sessao.mjs";

const { db, usuario } = await entrarComoDona();

const { data: produtos } = await db
  .from("produtos")
  .select("id")
  .like("sku", "TESTE-%");
const { data: kits } = await db
  .from("kits")
  .select("id")
  .like("nome", "TESTE-%");
const { data: clientes } = await db
  .from("clientes")
  .select("id")
  .like("nome", "TESTE-%");

const idsProdutos = (produtos ?? []).map((p) => p.id);
const idsKits = (kits ?? []).map((k) => k.id);

// Toda venda que encostou nesses produtos ou kits.
const { data: itens } = await db
  .from("venda_itens")
  .select("venda_id")
  .or(
    [
      idsProdutos.length ? `produto_id.in.(${idsProdutos.join(",")})` : null,
      idsKits.length ? `kit_id.in.(${idsKits.join(",")})` : null,
    ]
      .filter(Boolean)
      .join(","),
  );

const idsVendas = [...new Set((itens ?? []).map((i) => i.venda_id))];

async function apagar(rotulo, promessa) {
  const { error } = await promessa;
  console.log(
    `  ${error ? "✗" : "✓"} ${rotulo}${error ? ` — ${error.message}` : ""}`,
  );
}

console.log("Limpando:");

if (idsVendas.length) {
  // Cascata leva itens, parcelas e pagamentos junto.
  await apagar(
    `${idsVendas.length} venda(s)`,
    db.from("vendas").delete().in("id", idsVendas),
  );
}
if (idsProdutos.length) {
  await apagar(
    "movimentos de produto",
    db.from("estoque_movimentos").delete().in("produto_id", idsProdutos),
  );
}
if (idsKits.length) {
  await apagar(
    "movimentos de kit",
    db.from("estoque_movimentos").delete().in("kit_id", idsKits),
  );
  await apagar(
    "montagens",
    db.from("montagens_kit").delete().in("kit_id", idsKits),
  );
  await apagar(
    "receitas de kit",
    db.from("kit_itens").delete().in("kit_id", idsKits),
  );
  await apagar("kits", db.from("kits").delete().in("id", idsKits));
}
if (idsProdutos.length) {
  await apagar("produtos", db.from("produtos").delete().in("id", idsProdutos));
}
if (clientes?.length) {
  await apagar(
    "clientes",
    db
      .from("clientes")
      .delete()
      .in(
        "id",
        clientes.map((c) => c.id),
      ),
  );
}

const contar = async (tabela, coluna, padrao) => {
  const { count } = await db
    .from(tabela)
    .select("id", { count: "exact", head: true })
    .like(coluna, padrao);
  return count ?? 0;
};

console.log("\nSobrou:");
console.log(`  produtos TESTE-: ${await contar("produtos", "sku", "TESTE-%")}`);
console.log(`  kits TESTE-:     ${await contar("kits", "nome", "TESTE-%")}`);
console.log(
  `  clientes TESTE-: ${await contar("clientes", "nome", "TESTE-%")}`,
);

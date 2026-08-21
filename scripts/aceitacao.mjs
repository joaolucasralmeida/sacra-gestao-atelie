/**
 * Testes de aceitação contra o banco real.
 *
 * Exercita os casos da Seção 9 da spec que dependem do Postgres — os que
 * são pura matemática já estão cobertos por vitest. Tudo que é criado leva
 * o prefixo TESTE- e é removido no fim.
 */
import { criarCliente, entrarComoDona } from "./sessao.mjs";

const { db, usuario } = await entrarComoDona();

let passou = 0;
let falhou = 0;
const criados = { produtos: [], kits: [], clientes: [], vendas: [] };

function ok(nome, condicao, detalhe = "") {
  if (condicao) {
    passou++;
    console.log(`  ✓ ${nome}`);
  } else {
    falhou++;
    console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  }
}

async function erroDe(promessa) {
  const { error } = await promessa;
  return error?.message ?? null;
}

// ---------------------------------------------------------------------------
console.log("\n== Sessão ==");

const { data: perfil } = await db
  .from("perfis")
  .select("nome, papel")
  .eq("id", usuario.id)
  .single();

ok("login como dona", perfil?.papel === "dona", `papel=${perfil?.papel}`);

// ---------------------------------------------------------------------------
console.log("\n== Produtos e produção ==");

async function criarProduto(nome, sku, material, maoObra, preco, minimo = 2) {
  const { data, error } = await db
    .from("produtos")
    .insert({
      nome,
      sku,
      custo_material_centavos: material,
      custo_mao_obra_centavos: maoObra,
      preco_venda_centavos: preco,
      estoque_minimo: minimo,
    })
    .select("id")
    .single();

  if (error) throw new Error(`${nome}: ${error.message}`);
  criados.produtos.push(data.id);
  return data.id;
}

const terco = await criarProduto("TESTE- Terço", "TESTE-T1", 400, 800, 2500);
const cruz = await criarProduto("TESTE- Cruz", "TESTE-C1", 300, 500, 1500);
const vela = await criarProduto("TESTE- Vela", "TESTE-V1", 100, 100, 500);

ok("produto criado", Boolean(terco));

const { data: pTerco } = await db
  .from("vw_produtos")
  .select(
    "custo_total_centavos, lucro_centavos, margem, estoque, abaixo_minimo",
  )
  .eq("id", terco)
  .single();

ok("custo soma material + mão de obra", pTerco.custo_total_centavos === 1200);
ok("lucro = preço - custo", pTerco.lucro_centavos === 1300);
ok(
  "margem = lucro / preço",
  Math.abs(pTerco.margem - 0.52) < 0.0001,
  `margem=${pTerco.margem}`,
);
ok("estoque nasce zerado", pTerco.estoque === 0);
ok("produto sem estoque alerta para produzir", pTerco.abaixo_minimo === true);

for (const [id, qtd] of [
  [terco, 10],
  [cruz, 5],
  [vela, 20],
]) {
  const e = await erroDe(
    db
      .from("estoque_movimentos")
      .insert({ produto_id: id, delta: qtd, origem: "producao" }),
  );
  if (e) throw new Error(`produção: ${e}`);
}

const { data: aposProducao } = await db
  .from("vw_produtos")
  .select("id, estoque")
  .in("id", [terco, cruz, vela]);

const estoqueDe = (id) => aposProducao.find((p) => p.id === id).estoque;

ok(
  "produção entra no estoque",
  estoqueDe(terco) === 10 && estoqueDe(cruz) === 5,
);

const erroAjuste = await erroDe(
  db
    .from("estoque_movimentos")
    .insert({ produto_id: terco, delta: -1, origem: "ajuste" }),
);
ok("ajuste sem motivo é recusado pelo banco", erroAjuste !== null);

// ---------------------------------------------------------------------------
console.log("\n== Kits ==");

const { data: kit, error: erroKit } = await db
  .from("kits")
  .insert({ nome: "TESTE- Kit Devoção", preco_centavos: 3490 })
  .select("id")
  .single();

if (erroKit) throw new Error(erroKit.message);
criados.kits.push(kit.id);

await db.from("kit_itens").insert([
  { kit_id: kit.id, produto_id: terco, quantidade: 1 },
  { kit_id: kit.id, produto_id: cruz, quantidade: 1 },
  { kit_id: kit.id, produto_id: vela, quantidade: 1 },
]);

const { data: vKit } = await db
  .from("vw_kits")
  .select(
    "custo_centavos, preco_somado_centavos, desconto_centavos, lucro_centavos, montaveis, limitante_nome, estoque",
  )
  .eq("id", kit.id)
  .single();

ok(
  "custo do kit soma os componentes",
  vKit.custo_centavos === 2200,
  `custo=${vKit.custo_centavos}`,
);
ok("preço somado dos itens", vKit.preco_somado_centavos === 4500);
ok("desconto do kit", vKit.desconto_centavos === 1010);
ok("lucro do kit", vKit.lucro_centavos === 1290);
// Caso 15 da spec.
ok(
  "montáveis limitado pelo item mais escasso",
  vKit.montaveis === 5,
  `montaveis=${vKit.montaveis}`,
);
ok(
  "aponta o item limitante",
  vKit.limitante_nome === "TESTE- Cruz",
  `limitante=${vKit.limitante_nome}`,
);

const { error: erroMontar } = await db.rpc("montar_kit", {
  p_kit_id: kit.id,
  p_quantidade: 3,
});
ok("montar kit executa", !erroMontar, erroMontar?.message);

const { data: kitPos } = await db
  .from("vw_kits")
  .select("estoque, montaveis")
  .eq("id", kit.id)
  .single();
const { data: prodPos } = await db
  .from("vw_produtos")
  .select("id, estoque")
  .in("id", [terco, cruz, vela]);
const estPos = (id) => prodPos.find((p) => p.id === id).estoque;

ok(
  "montagem cria estoque de kit",
  kitPos.estoque === 3,
  `estoque kit=${kitPos.estoque}`,
);
ok(
  "montagem consome componentes",
  estPos(terco) === 7 && estPos(cruz) === 2 && estPos(vela) === 17,
  `terço=${estPos(terco)} cruz=${estPos(cruz)} vela=${estPos(vela)}`,
);
ok(
  "montáveis cai junto com o estoque",
  kitPos.montaveis === 2,
  `montaveis=${kitPos.montaveis}`,
);

// ---------------------------------------------------------------------------
console.log("\n== Vendas ==");

const { data: formas } = await db.from("formas_pagamento").select("id, nome");
const pix = formas.find((f) => f.nome === "Pix").id;

const { data: vendaSimples, error: erroVenda } = await db.rpc(
  "registrar_venda",
  {
    payload: {
      itens: [{ produto_id: terco, quantidade: 3 }],
      forma_pagamento_id: pix,
    },
  },
);
ok("venda à vista registra", !erroVenda, erroVenda?.message);
if (vendaSimples) criados.vendas.push(vendaSimples);

const { data: prodVenda } = await db
  .from("vw_produtos")
  .select("estoque")
  .eq("id", terco)
  .single();
ok(
  "venda baixa o estoque",
  prodVenda.estoque === 4,
  `estoque=${prodVenda.estoque}`,
);

// Caso 16 da spec: kit não pode baixar os componentes de novo.
const { data: vendaKit } = await db.rpc("registrar_venda", {
  payload: {
    itens: [{ kit_id: kit.id, quantidade: 1 }],
    forma_pagamento_id: pix,
  },
});
if (vendaKit) criados.vendas.push(vendaKit);

const { data: kitVendido } = await db
  .from("vw_kits")
  .select("estoque")
  .eq("id", kit.id)
  .single();
const { data: compsAposKit } = await db
  .from("vw_produtos")
  .select("id, estoque")
  .in("id", [cruz, vela]);
const estKit = (id) => compsAposKit.find((p) => p.id === id).estoque;

ok(
  "venda de kit baixa o estoque do kit",
  kitVendido.estoque === 2,
  `kit=${kitVendido.estoque}`,
);
ok(
  "venda de kit NÃO baixa os componentes de novo",
  estKit(cruz) === 2 && estKit(vela) === 17,
  `cruz=${estKit(cruz)} vela=${estKit(vela)}`,
);

// Caso 13: estoque negativo é permitido.
const { data: vendaNegativa, error: erroNegativo } = await db.rpc(
  "registrar_venda",
  {
    payload: {
      itens: [{ produto_id: vela, quantidade: 99 }],
      forma_pagamento_id: pix,
    },
  },
);
if (vendaNegativa) criados.vendas.push(vendaNegativa);
const { data: velaNeg } = await db
  .from("vw_produtos")
  .select("estoque, estoque_negativo")
  .eq("id", vela)
  .single();
ok(
  "venda que negativa o estoque é aceita",
  !erroNegativo,
  erroNegativo?.message,
);
ok(
  "estoque negativo é sinalizado",
  velaNeg.estoque_negativo === true,
  `estoque=${velaNeg.estoque}`,
);

// ---------------------------------------------------------------------------
console.log("\n== Parcelamento e pagamentos ==");

const { data: cliente } = await db
  .from("clientes")
  .insert({ nome: "TESTE- Maria", whatsapp: "28999990000" })
  .select("id")
  .single();
criados.clientes.push(cliente.id);

// 4 terços = R$ 100,00 em 3x -> 33,33 / 33,33 / 33,34 (caso 12).
const { data: vendaParcelada, error: erroParc } = await db.rpc(
  "registrar_venda",
  {
    payload: {
      cliente_id: cliente.id,
      itens: [{ produto_id: terco, quantidade: 4 }],
      forma_pagamento_id: pix,
      parcelas: [
        { numero: 1, valor_centavos: 3333, vencimento: "2026-09-10" },
        { numero: 2, valor_centavos: 3333, vencimento: "2026-10-10" },
        { numero: 3, valor_centavos: 3334, vencimento: "2026-11-10" },
      ],
    },
  },
);
ok("venda parcelada registra", !erroParc, erroParc?.message);
if (vendaParcelada) criados.vendas.push(vendaParcelada);

const { data: parcelas } = await db
  .from("vw_parcelas")
  .select("id, numero, valor_centavos, situacao, atrasada, restante_centavos")
  .eq("venda_id", vendaParcelada)
  .order("numero");

ok("gerou 3 parcelas", parcelas.length === 3);
ok(
  "soma das parcelas bate com o total",
  parcelas.reduce((s, p) => s + p.valor_centavos, 0) === 10000,
);
ok(
  "parcelas nascem pendentes",
  parcelas.every((p) => p.situacao === "pendente"),
);

// A soma das parcelas é validada no banco.
const { error: erroSoma } = await db.rpc("registrar_venda", {
  payload: {
    cliente_id: cliente.id,
    itens: [{ produto_id: terco, quantidade: 1 }],
    parcelas: [{ numero: 1, valor_centavos: 999, vencimento: "2026-09-10" }],
  },
});
ok("banco recusa parcelas que não somam o total", erroSoma !== null);

const { error: erroPag } = await db.rpc("registrar_pagamento", {
  p_parcela_id: parcelas[0].id,
  p_valor_centavos: 2000,
});
ok("pagamento parcial registra", !erroPag, erroPag?.message);

const { data: parcela1 } = await db
  .from("vw_parcelas")
  .select("situacao, pago_centavos, restante_centavos")
  .eq("id", parcelas[0].id)
  .single();

ok(
  "pagamento parcial mostra o restante",
  parcela1.situacao === "parcial" &&
    parcela1.pago_centavos === 2000 &&
    parcela1.restante_centavos === 1333,
  `situacao=${parcela1.situacao} pago=${parcela1.pago_centavos} restante=${parcela1.restante_centavos}`,
);

const { error: erroExcesso } = await db.rpc("registrar_pagamento", {
  p_parcela_id: parcelas[0].id,
  p_valor_centavos: 999999,
});
ok("pagamento acima do restante é recusado", erroExcesso !== null);

const { data: fin } = await db
  .from("vw_clientes_financeiro")
  .select(
    "total_comprado_centavos, total_pago_centavos, total_pendente_centavos, parcelas_total",
  )
  .eq("cliente_id", cliente.id)
  .single();

ok(
  "financeiro do cliente consolida",
  fin.total_comprado_centavos === 10000 &&
    fin.total_pago_centavos === 2000 &&
    fin.total_pendente_centavos === 8000,
  JSON.stringify(fin),
);

// ---------------------------------------------------------------------------
console.log("\n== Congelamento de preço (caso 20) ==");

await db
  .from("produtos")
  .update({ preco_venda_centavos: 9900 })
  .eq("id", terco);

const { data: itemAntigo } = await db
  .from("venda_itens")
  .select("preco_unit_centavos, custo_unit_centavos, nome_snapshot")
  .eq("venda_id", vendaParcelada)
  .single();

ok(
  "venda antiga mantém o preço original",
  itemAntigo.preco_unit_centavos === 2500,
  `preço gravado=${itemAntigo.preco_unit_centavos}`,
);
ok(
  "venda antiga mantém o custo original",
  itemAntigo.custo_unit_centavos === 1200,
);

await db
  .from("produtos")
  .update({ preco_venda_centavos: 2500 })
  .eq("id", terco);

// ---------------------------------------------------------------------------
console.log("\n== Cancelamento (caso 14) ==");

const erroSemConfirmar = await erroDe(
  db.rpc("cancelar_venda", {
    p_venda_id: vendaParcelada,
    p_confirmar_estorno: false,
  }),
);
ok("cancelamento com pagamento exige confirmação", erroSemConfirmar !== null);

const { error: erroCancelar } = await db.rpc("cancelar_venda", {
  p_venda_id: vendaParcelada,
  p_confirmar_estorno: true,
  p_motivo: "Teste de aceitação",
});
ok(
  "cancelamento com confirmação executa",
  !erroCancelar,
  erroCancelar?.message,
);

const { data: tercoCancelado } = await db
  .from("vw_produtos")
  .select("estoque")
  .eq("id", terco)
  .single();
ok(
  "cancelamento devolve o estoque",
  tercoCancelado.estoque === 4,
  `estoque=${tercoCancelado.estoque}`,
);

const { data: parcelasSumiram } = await db
  .from("vw_parcelas")
  .select("id")
  .eq("venda_id", vendaParcelada);
ok("parcelas somem das contas a receber", parcelasSumiram.length === 0);

const { data: finApos } = await db
  .from("vw_clientes_financeiro")
  .select("total_pago_centavos, total_comprado_centavos")
  .eq("cliente_id", cliente.id)
  .single();
ok(
  "estorno zera o pago do cliente",
  finApos.total_pago_centavos === 0,
  JSON.stringify(finApos),
);

// ---------------------------------------------------------------------------
console.log("\n== Vazamento para anônimo (com dados no banco) ==");

// Cliente sem sessão: é exatamente o que qualquer visitante consegue fazer
// com a chave publicável, que viaja no navegador.
const anon = criarCliente();
for (const alvo of [
  "vw_catalogo",
  "estoque_produtos",
  "vw_kits_montaveis",
  "vw_produtos",
  "produtos",
]) {
  const { data, error } = await anon.from(alvo).select("*").limit(3);
  ok(
    `${alvo} fechado para anônimo`,
    Boolean(error) || (data ?? []).length === 0,
    `retornou ${(data ?? []).length} linha(s)`,
  );
}

// ---------------------------------------------------------------------------
console.log("\n== Limpeza ==");

for (const id of criados.vendas) await db.from("vendas").delete().eq("id", id);
await db.from("estoque_movimentos").delete().in("produto_id", criados.produtos);
await db.from("estoque_movimentos").delete().in("kit_id", criados.kits);
await db.from("kit_itens").delete().in("kit_id", criados.kits);
await db.from("kits").delete().in("id", criados.kits);
await db.from("produtos").delete().in("id", criados.produtos);
await db.from("clientes").delete().in("id", criados.clientes);

const { count } = await db
  .from("produtos")
  .select("id", { count: "exact", head: true })
  .like("sku", "TESTE-%");
ok("dados de teste removidos", count === 0, `sobraram ${count}`);

console.log(`\n${passou} passaram, ${falhou} falharam\n`);
process.exit(falhou > 0 ? 1 : 0);

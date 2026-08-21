/**
 * Monta um cenário realista para conferir as telas: produtos com estoque,
 * um kit montado, vendas de evento e uma venda parcelada com parcela
 * atrasada.
 *
 * Tudo marcado com TESTE- para o `limpar-teste.mjs` conseguir remover.
 */
import { entrarComoDona } from "./sessao.mjs";

const { db, usuario } = await entrarComoDona();

const dia = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

async function produto(nome, sku, material, maoObra, preco, minimo, produzir) {
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

  if (produzir > 0) {
    await db
      .from("estoque_movimentos")
      .insert({ produto_id: data.id, delta: produzir, origem: "producao" });
  }
  return data.id;
}

console.log("Criando cenário…");

const terco = await produto(
  "TESTE- Terço de madeira",
  "TESTE-TRC",
  400,
  800,
  2500,
  5,
  12,
);
const cruz = await produto(
  "TESTE- Cruz de parede",
  "TESTE-CRZ",
  300,
  500,
  1500,
  5,
  3,
);
const vela = await produto(
  "TESTE- Vela votiva",
  "TESTE-VLA",
  100,
  100,
  500,
  10,
  40,
);
const santo = await produto(
  "TESTE- Sagrado Coração",
  "TESTE-SGC",
  3500,
  4500,
  15000,
  1,
  2,
);

const { data: kit } = await db
  .from("kits")
  .insert({
    nome: "TESTE- Kit Devoção",
    descricao: "Terço, cruz e vela",
    preco_centavos: 3990,
  })
  .select("id")
  .single();

await db.from("kit_itens").insert([
  { kit_id: kit.id, produto_id: terco, quantidade: 1 },
  { kit_id: kit.id, produto_id: cruz, quantidade: 1 },
  { kit_id: kit.id, produto_id: vela, quantidade: 1 },
]);

await db.rpc("montar_kit", { p_kit_id: kit.id, p_quantidade: 2 });

const { data: evento } = await db
  .from("eventos")
  .insert({
    nome: "TESTE- Festa de São Sebastião",
    local: "Paróquia, Cachoeiro",
    data_inicio: dia(-20),
  })
  .select("id")
  .single();

const { data: formas } = await db.from("formas_pagamento").select("id, nome");
const pix = formas.find((f) => f.nome === "Pix").id;
const dinheiro = formas.find((f) => f.nome === "Dinheiro").id;

// Vendas do evento, à vista.
await db.rpc("registrar_venda", {
  payload: {
    evento_id: evento.id,
    data: dia(-20),
    forma_pagamento_id: pix,
    itens: [{ produto_id: terco, quantidade: 2 }],
  },
});
await db.rpc("registrar_venda", {
  payload: {
    evento_id: evento.id,
    data: dia(-20),
    forma_pagamento_id: dinheiro,
    itens: [{ produto_id: vela, quantidade: 6 }],
  },
});
await db.rpc("registrar_venda", {
  payload: {
    evento_id: evento.id,
    data: dia(-20),
    forma_pagamento_id: pix,
    itens: [{ kit_id: kit.id, quantidade: 1 }],
  },
});

// Cliente com venda parcelada: uma parcela atrasada, uma vencendo, uma longe.
const { data: cliente } = await db
  .from("clientes")
  .insert({
    nome: "TESTE- Maria das Graças",
    whatsapp: "(28) 99999-0000",
    observacoes: "Cliente da paróquia",
  })
  .select("id")
  .single();

const { error: erroParc } = await db.rpc("registrar_venda", {
  payload: {
    cliente_id: cliente.id,
    data: dia(-40),
    forma_pagamento_id: pix,
    itens: [{ produto_id: santo, quantidade: 1 }],
    parcelas: [
      { numero: 1, valor_centavos: 5000, vencimento: dia(-12) },
      { numero: 2, valor_centavos: 5000, vencimento: dia(3) },
      { numero: 3, valor_centavos: 5000, vencimento: dia(33) },
    ],
  },
});
if (erroParc) throw new Error(`venda parcelada: ${erroParc.message}`);

// Pagamento parcial na parcela atrasada.
const { data: parcelas } = await db
  .from("vw_parcelas")
  .select("id, numero")
  .eq("cliente_id", cliente.id)
  .order("numero");

await db.rpc("registrar_pagamento", {
  p_parcela_id: parcelas[0].id,
  p_valor_centavos: 2000,
  p_forma_pagamento_id: pix,
});

console.log("Cenário pronto:");
console.log("  4 produtos (cruz abaixo do mínimo)");
console.log("  1 kit com 2 montados e 1 vendido");
console.log("  1 evento com 3 vendas à vista");
console.log("  1 cliente com venda parcelada em 3x");
console.log("  parcela 1 atrasada, com pagamento parcial de R$ 20,00");

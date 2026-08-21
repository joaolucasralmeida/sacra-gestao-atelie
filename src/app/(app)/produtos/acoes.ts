"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { parseParaCentavos } from "@/lib/dominio/dinheiro";

export type Resultado = { ok?: true; erro?: string };

/** Campo de dinheiro: aceita "25", "25,90", "R$ 25,90", "1.234,56". */
const dinheiro = z.string().transform((valor, ctx) => {
  const centavos = parseParaCentavos(valor || "0");
  if (centavos === null || centavos < 0) {
    ctx.addIssue({ code: "custom", message: "Valor inválido" });
    return z.NEVER;
  }
  return centavos;
});

const esquemaProduto = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  nome: z.string().trim().min(1, "Informe o nome do produto"),
  sku: z.string().trim().optional(),
  categoria_id: z.string().uuid().optional().or(z.literal("")),
  unidade: z.string().trim().default("un"),
  custo_material: dinheiro,
  custo_mao_obra: dinheiro,
  preco_venda: dinheiro,
  estoque_minimo: z.coerce.number().int().min(0).default(0),
  observacoes: z.string().trim().optional(),
});

export async function salvarProduto(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const analise = esquemaProduto.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const dados = analise.data;
  const supabase = await criarClienteServidor();

  const registro = {
    nome: dados.nome,
    sku: dados.sku || null,
    categoria_id: dados.categoria_id || null,
    unidade: dados.unidade || "un",
    custo_material_centavos: dados.custo_material,
    custo_mao_obra_centavos: dados.custo_mao_obra,
    preco_venda_centavos: dados.preco_venda,
    estoque_minimo: dados.estoque_minimo,
    observacoes: dados.observacoes || null,
  };

  const { error } = dados.id
    ? await supabase.from("produtos").update(registro).eq("id", dados.id)
    : await supabase.from("produtos").insert(registro);

  if (error) return { erro: error.message };

  revalidatePath("/produtos");
  return { ok: true };
}

/**
 * Entrada de estoque por produção.
 *
 * Ela fabrica: quando acaba, faz mais. Por isso a origem é `producao` e não
 * `compra` — e por isso o alerta de estoque mínimo diz "produzir", não
 * "repor".
 */
export async function registrarProducao(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const esquema = z.object({
    produto_id: z.string().uuid(),
    quantidade: z.coerce
      .number()
      .int()
      .positive("Informe uma quantidade maior que zero"),
    observacoes: z.string().trim().optional(),
  });

  const analise = esquema.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("estoque_movimentos").insert({
    produto_id: analise.data.produto_id,
    delta: analise.data.quantidade,
    origem: "producao",
    motivo: analise.data.observacoes || null,
  });

  if (error) return { erro: error.message };

  revalidatePath("/produtos");
  return { ok: true };
}

/**
 * Ajuste manual — o motivo é obrigatório, e o banco também exige.
 *
 * Ajuste sem motivo é exatamente o que impede responder "por que só tenho
 * 3?" daqui a três meses.
 */
export async function ajustarEstoque(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const esquema = z.object({
    produto_id: z.string().uuid(),
    delta: z.coerce
      .number()
      .int()
      .refine((n) => n !== 0, "O ajuste não pode ser zero"),
    motivo: z.string().trim().min(3, "Explique o motivo do ajuste"),
  });

  const analise = esquema.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("estoque_movimentos").insert({
    produto_id: analise.data.produto_id,
    delta: analise.data.delta,
    origem: "ajuste",
    motivo: analise.data.motivo,
  });

  if (error) return { erro: error.message };

  revalidatePath("/produtos");
  return { ok: true };
}

/**
 * Produto com histórico nunca é excluído: é desativado.
 *
 * Excluir apagaria o lucro do ano passado junto com o cadastro.
 */
export async function alternarAtivo(
  id: string,
  ativo: boolean,
): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("produtos")
    .update({ ativo })
    .eq("id", id);

  if (error) return { erro: error.message };

  revalidatePath("/produtos");
  return { ok: true };
}

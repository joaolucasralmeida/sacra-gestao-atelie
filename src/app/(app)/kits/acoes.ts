"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { parseParaCentavos } from "@/lib/dominio/dinheiro";

export type Resultado = { ok?: true; erro?: string };

const esquemaKit = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  nome: z.string().trim().min(1, "Informe o nome do kit"),
  descricao: z.string().trim().optional(),
  preco: z.string(),
  /** JSON: [{ produto_id, quantidade }] */
  itens: z.string(),
});

const esquemaItem = z.array(
  z.object({
    produto_id: z.string().uuid(),
    quantidade: z.number().int().positive(),
  }),
);

export async function salvarKit(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const analise = esquemaKit.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const preco = parseParaCentavos(analise.data.preco || "0");
  if (preco === null || preco < 0) return { erro: "Preço inválido" };

  let itens: z.infer<typeof esquemaItem>;
  try {
    itens = esquemaItem.parse(JSON.parse(analise.data.itens));
  } catch {
    return { erro: "Receita do kit inválida" };
  }

  if (itens.length === 0) {
    return { erro: "Escolha pelo menos um produto para o kit" };
  }

  const supabase = await criarClienteServidor();
  const registro = {
    nome: analise.data.nome,
    descricao: analise.data.descricao || null,
    preco_centavos: preco,
  };

  let kitId = analise.data.id || null;

  if (kitId) {
    const { error } = await supabase
      .from("kits")
      .update(registro)
      .eq("id", kitId);
    if (error) return { erro: error.message };
  } else {
    const { data, error } = await supabase
      .from("kits")
      .insert(registro)
      .select("id")
      .single();
    if (error) return { erro: error.message };
    kitId = data.id;
  }

  // A receita é substituída inteira: é mais simples de acertar do que
  // reconciliar diferença item a item, e o kit_itens não guarda histórico
  // (quem guarda é o snapshot da venda).
  const { error: erroLimpar } = await supabase
    .from("kit_itens")
    .delete()
    .eq("kit_id", kitId);
  if (erroLimpar) return { erro: erroLimpar.message };

  const { error: erroItens } = await supabase.from("kit_itens").insert(
    itens.map((item) => ({
      kit_id: kitId,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
    })),
  );
  if (erroItens) return { erro: erroItens.message };

  revalidatePath("/kits");
  return { ok: true };
}

/**
 * Montagem física do kit.
 *
 * Consome os componentes e cria estoque do kit. A função no banco é a
 * fronteira transacional — as duas pontas acontecem juntas ou nenhuma.
 */
export async function montarKit(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const esquema = z.object({
    kit_id: z.string().uuid(),
    quantidade: z.coerce.number().int().positive("Informe quantos kits"),
    tipo: z.enum(["montagem", "desmontagem"]),
    observacoes: z.string().trim().optional(),
  });

  const analise = esquema.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("montar_kit", {
    p_kit_id: analise.data.kit_id,
    p_quantidade: analise.data.quantidade,
    p_tipo: analise.data.tipo,
    p_observacoes: analise.data.observacoes || null,
  });

  if (error) return { erro: error.message };

  revalidatePath("/kits");
  revalidatePath("/produtos");
  return { ok: true };
}

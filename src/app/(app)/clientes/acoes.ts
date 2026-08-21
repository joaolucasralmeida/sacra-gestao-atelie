"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";

export type Resultado = { ok?: true; erro?: string; clienteId?: string };

const esquema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  nome: z.string().trim().min(1, "Informe o nome"),
  cpf_cnpj: z.string().trim().optional(),
  telefone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  email: z.string().trim().optional(),
  endereco: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),
});

export async function salvarCliente(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const analise = esquema.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { id, ...campos } = analise.data;
  const registro = Object.fromEntries(
    Object.entries(campos).map(([chave, valor]) => [chave, valor || null]),
  ) as Record<string, string | null>;
  registro.nome = analise.data.nome;

  const supabase = await criarClienteServidor();

  if (id) {
    const { error } = await supabase
      .from("clientes")
      .update(registro)
      .eq("id", id);
    if (error) return { erro: error.message };
    revalidatePath("/clientes");
    return { ok: true, clienteId: id };
  }

  const { data, error } = await supabase
    .from("clientes")
    .insert(registro)
    .select("id")
    .single();

  if (error) return { erro: error.message };

  revalidatePath("/clientes");
  return { ok: true, clienteId: data.id };
}

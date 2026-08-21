"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { parseParaCentavos } from "@/lib/dominio/dinheiro";

export type Resultado = { ok?: true; erro?: string };

export async function registrarPagamento(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const esquema = z.object({
    parcela_id: z.string().uuid(),
    valor: z.string(),
    data: z.string().optional(),
    forma_pagamento_id: z.string().uuid().optional().or(z.literal("")),
    observacoes: z.string().trim().optional(),
  });

  const analise = esquema.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const centavos = parseParaCentavos(analise.data.valor);
  if (centavos === null || centavos <= 0) {
    return { erro: "Informe um valor válido" };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("registrar_pagamento", {
    p_parcela_id: analise.data.parcela_id,
    p_valor_centavos: centavos,
    p_data: analise.data.data || null,
    p_forma_pagamento_id: analise.data.forma_pagamento_id || null,
    p_observacoes: analise.data.observacoes || null,
  });

  if (error) {
    // O banco recusa valor acima do restante — traduzimos para uma frase
    // que diz o que fazer, em vez de devolver o texto cru do Postgres.
    if (error.message.includes("acima do restante")) {
      return { erro: "Esse valor passa do que falta nesta parcela." };
    }
    if (error.message.includes("já está quitada")) {
      return { erro: "Esta parcela já está paga." };
    }
    return { erro: error.message };
  }

  revalidatePath("/a-receber");
  revalidatePath("/clientes");
  revalidatePath("/");
  return { ok: true };
}

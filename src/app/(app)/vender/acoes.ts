"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";

export type ResultadoVenda = { ok?: true; erro?: string; vendaId?: string };

const esquemaItem = z.object({
  produto_id: z.string().uuid().optional(),
  kit_id: z.string().uuid().optional(),
  quantidade: z.number().int().positive(),
});

const esquemaParcela = z.object({
  numero: z.number().int().positive(),
  valor_centavos: z.number().int().positive(),
  vencimento: z.string(),
});

const esquemaVenda = z.object({
  cliente_id: z.string().uuid().nullable().optional(),
  evento_id: z.string().uuid().nullable().optional(),
  forma_pagamento_id: z.string().uuid().nullable().optional(),
  desconto_centavos: z.number().int().min(0).default(0),
  observacoes: z.string().optional(),
  itens: z.array(esquemaItem).min(1, "A venda precisa de ao menos um item"),
  parcelas: z.array(esquemaParcela).default([]),
});

export type EntradaVenda = z.input<typeof esquemaVenda>;

/**
 * Registra a venda inteira numa chamada só.
 *
 * Venda, itens, baixa de estoque e parcelas acontecem dentro de uma função
 * do Postgres — ou tudo entra, ou nada entra. Feito em chamadas separadas,
 * uma queda de conexão no meio deixaria venda sem baixa de estoque, e isso
 * só apareceria no fechamento do mês.
 *
 * Preço e custo NÃO são enviados daqui: a função lê os valores atuais do
 * banco e os congela no item. O cliente não tem como alterar preço.
 */
export async function registrarVenda(
  entrada: EntradaVenda,
): Promise<ResultadoVenda> {
  const analise = esquemaVenda.safeParse(entrada);
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Venda inválida" };
  }

  const dados = analise.data;

  if (dados.parcelas.length > 0 && !dados.cliente_id) {
    return {
      erro: "Venda parcelada precisa de um cliente — é de quem você vai cobrar.",
    };
  }

  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.rpc("registrar_venda", {
    payload: {
      cliente_id: dados.cliente_id ?? null,
      evento_id: dados.evento_id ?? null,
      forma_pagamento_id: dados.forma_pagamento_id ?? null,
      desconto_centavos: dados.desconto_centavos,
      observacoes: dados.observacoes ?? null,
      itens: dados.itens,
      parcelas: dados.parcelas,
    },
  });

  if (error) return { erro: error.message };

  revalidatePath("/vender");
  revalidatePath("/produtos");
  revalidatePath("/kits");
  revalidatePath("/a-receber");

  return { ok: true, vendaId: data as string };
}

export type ResultadoCancelamento = { ok?: true; erro?: string };

/**
 * Cancela uma venda.
 *
 * A função no banco devolve o estoque item a item, remove as parcelas não
 * pagas e registra o estorno de quem já tinha pago — como lançamento
 * negativo, nunca apagando o pagamento. Dinheiro que entrou não some sem
 * rastro.
 */
export async function cancelarVenda(
  vendaId: string,
  confirmarEstorno: boolean,
  motivo: string,
): Promise<ResultadoCancelamento> {
  if (!motivo.trim()) {
    return { erro: "Diga o motivo do cancelamento." };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("cancelar_venda", {
    p_venda_id: vendaId,
    p_confirmar_estorno: confirmarEstorno,
    p_motivo: motivo.trim(),
  });

  if (error) {
    if (error.message.includes("já recebidos")) {
      return {
        erro: "Esta venda tem pagamento registrado. Marque a confirmação do estorno.",
      };
    }
    if (error.message.includes("já está cancelada")) {
      return { erro: "Esta venda já foi cancelada." };
    }
    return { erro: error.message };
  }

  revalidatePath("/vender");
  revalidatePath("/produtos");
  revalidatePath("/kits");
  revalidatePath("/a-receber");
  revalidatePath("/clientes");
  revalidatePath("/");

  return { ok: true };
}

export type ResultadoEvento = {
  ok?: true;
  erro?: string;
  eventoId?: string;
  nome?: string;
};

export async function criarEvento(
  nome: string,
  local: string,
  dataInicio: string,
): Promise<ResultadoEvento> {
  const esquema = z.object({
    nome: z.string().trim().min(1, "Informe o nome do evento"),
    local: z.string().trim().optional(),
    data_inicio: z.string().min(1, "Informe a data"),
  });

  const analise = esquema.safeParse({ nome, local, data_inicio: dataInicio });
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("eventos")
    .insert({
      nome: analise.data.nome,
      local: analise.data.local || null,
      data_inicio: analise.data.data_inicio,
    })
    .select("id, nome")
    .single();

  if (error) return { erro: error.message };

  revalidatePath("/vender");
  return { ok: true, eventoId: data.id, nome: data.nome };
}

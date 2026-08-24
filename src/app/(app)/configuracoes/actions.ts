"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoSenha = { erro?: string; sucesso?: boolean };

const MINIMO = 8;

export async function definirSenha(
  _anterior: EstadoSenha,
  formData: FormData,
): Promise<EstadoSenha> {
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (senha.length < MINIMO) {
    return { erro: `Use pelo menos ${MINIMO} caracteres.` };
  }

  if (senha !== confirmacao) {
    return { erro: "As duas senhas não são iguais." };
  }

  const supabase = await criarClienteServidor();

  // `updateUser` age sobre a sessão em curso — serve tanto para quem entrou
  // com senha quanto para quem chegou por link de recuperação, que é o caso
  // em que a senha antiga não é conhecida.
  const { error } = await supabase.auth.updateUser({ password: senha });

  if (error) {
    return { erro: error.message };
  }

  revalidatePath("/", "layout");
  return { sucesso: true };
}

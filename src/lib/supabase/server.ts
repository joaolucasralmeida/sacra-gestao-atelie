import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export async function criarClienteServidor() {
  const jar = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (cookiesParaGravar) => {
          try {
            for (const { name, value, options } of cookiesParaGravar) {
              jar.set(name, value, options);
            }
          } catch {
            // Server Component não pode gravar cookie. O middleware já
            // renova a sessão a cada request, então ignorar aqui é seguro.
          }
        },
      },
    },
  );
}

/**
 * Usuário logado com seu papel.
 *
 * `cache` evita repetir a consulta quando vários componentes da mesma
 * página perguntam quem está logado.
 */
export const usuarioAtual = cache(async () => {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, papel")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    nome: perfil?.nome ?? user.email?.split("@")[0] ?? "",
    papel: (perfil?.papel ?? "vendedor") as "dona" | "vendedor",
  };
});

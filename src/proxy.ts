import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  INICIO_DO_VENDEDOR,
  ROTAS_DO_VENDEDOR,
} from "@/components/navegacao/itens";

const ROTAS_PUBLICAS = ["/login", "/auth"];

/**
 * Renova a sessão a cada request e barra as rotas internas.
 *
 * A proteção mora aqui, e não em cada página: uma tela nova nasce protegida
 * por padrão, em vez de depender de alguém lembrar de proteger.
 */
export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem as variáveis, `createServerClient` estoura e a hospedagem devolve um
  // 500 mudo em toda rota — sem pista de qual é o problema. Como elas são
  // embutidas no build, esquecer de configurá-las antes do primeiro deploy é
  // o erro mais fácil de cometer e o mais difícil de diagnosticar.
  if (!url || !chave) {
    return new NextResponse(
      "Configuração ausente: defina NEXT_PUBLIC_SUPABASE_URL e " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY na hospedagem e publique de novo. " +
        "Elas são embutidas durante o build, então só valem a partir do " +
        "próximo deploy.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const supabase = createServerClient(
    url,
    chave,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesParaGravar) => {
          for (const { name, value } of cookiesParaGravar) {
            request.cookies.set(name, value);
          }
          resposta = NextResponse.next({ request });
          for (const { name, value, options } of cookiesParaGravar) {
            resposta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;
  const publica = ROTAS_PUBLICAS.some((rota) => caminho.startsWith(rota));

  if (!user && !publica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    // Guarda para onde a pessoa queria ir, e devolve ela lá depois do login.
    destino.searchParams.set("proximo", caminho);
    return NextResponse.redirect(destino);
  }

  // O papel decide o que ele alcança. A lista vem do próprio menu, então
  // uma tela nova nasce restrita à dona: liberar exige entrar em `itens.ts`
  // e dizer isso em voz alta.
  if (user && !publica) {
    const { data: perfil } = await supabase
      .from("perfis")
      .select("papel")
      .eq("id", user.id)
      .single();

    const permitida = ROTAS_DO_VENDEDOR.some(
      (rota) => caminho === rota || caminho.startsWith(`${rota}/`),
    );

    if (perfil?.papel === "vendedor" && !permitida) {
      const destino = request.nextUrl.clone();
      destino.pathname = INICIO_DO_VENDEDOR;
      destino.search = "";
      return NextResponse.redirect(destino);
    }
  }

  if (user && caminho === "/login") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return resposta;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)",
  ],
};

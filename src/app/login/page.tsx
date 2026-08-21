import { Brasao } from "@/components/marca/brasao";
import { FormularioLogin } from "./formulario";

export default async function PaginaLogin({
  searchParams,
}: PageProps<"/login">) {
  const { proximo } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/*
          O emblema já traz o nome e o lema no anel. Repeti-los em texto logo
          abaixo diria tudo duas vezes — aqui ele tem espaço para ser lido, que
          é justamente onde a versão completa faz sentido.

          `h1` visualmente oculto: a página precisa de um título para leitor de
          tela e para o navegador, mas ele não deve competir com a logo.
        */}
        <h1 className="sr-only">Sacra Studio — entrar no sistema</h1>

        <div className="flex justify-center">
          <Brasao className="h-44 w-44" />
        </div>

        <hr className="fio-ouro my-8" />

        <FormularioLogin
          proximo={typeof proximo === "string" ? proximo : "/"}
        />
      </div>
    </main>
  );
}

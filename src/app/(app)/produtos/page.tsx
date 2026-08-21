import { criarClienteServidor } from "@/lib/supabase/server";
import type { Categoria, ProdutoLinha } from "@/lib/tipos";
import { PainelProdutos } from "./painel-produtos";

export default async function PaginaProdutos() {
  const supabase = await criarClienteServidor();

  const [{ data: produtos, error }, { data: categorias }] = await Promise.all([
    supabase.from("vw_produtos").select("*").order("nome"),
    supabase.from("categorias").select("id, nome").order("nome"),
  ]);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Custo, preço, margem e estoque no mesmo lugar.
      </p>
      {error ? (
        <p className="text-sm text-[color:var(--perigo)]">
          Não consegui carregar os produtos: {error.message}
        </p>
      ) : (
        <PainelProdutos
          produtos={(produtos ?? []) as ProdutoLinha[]}
          categorias={(categorias ?? []) as Categoria[]}
        />
      )}
    </div>
  );
}

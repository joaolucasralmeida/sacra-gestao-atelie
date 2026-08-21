import { criarClienteServidor } from "@/lib/supabase/server";
import type { ProdutoLinha } from "@/lib/tipos";
import { PainelKits, type KitLinha } from "./painel-kits";

export default async function PaginaKits() {
  const supabase = await criarClienteServidor();

  const [{ data: kits, error }, { data: produtos }, { data: receitas }] =
    await Promise.all([
      supabase.from("vw_kits").select("*").order("nome"),
      supabase.from("vw_produtos").select("*").eq("ativo", true).order("nome"),
      supabase.from("kit_itens").select("kit_id, produto_id, quantidade"),
    ]);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Monte antes do evento e leve pronto. O sistema diz quantos dá para
        montar e qual peça está travando.
      </p>
      {error ? (
        <p className="text-sm text-[color:var(--perigo)]">
          Não consegui carregar os kits: {error.message}
        </p>
      ) : (
        <PainelKits
          kits={(kits ?? []) as KitLinha[]}
          produtos={(produtos ?? []) as ProdutoLinha[]}
          receitas={receitas ?? []}
        />
      )}
    </div>
  );
}

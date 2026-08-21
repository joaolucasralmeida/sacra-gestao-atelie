import { criarClienteServidor } from "@/lib/supabase/server";
import { PainelClientes, type ClienteLinha } from "./painel-clientes";

export default async function PaginaClientes() {
  const supabase = await criarClienteServidor();

  const [{ data: clientes, error }, { data: financeiro }] = await Promise.all([
    supabase.from("clientes").select("*").order("nome"),
    supabase.from("vw_clientes_financeiro").select("*"),
  ]);

  const combinados: ClienteLinha[] = (clientes ?? []).map((c) => {
    const fin = (financeiro ?? []).find((f) => f.cliente_id === c.id);
    return {
      ...c,
      total_comprado_centavos: fin?.total_comprado_centavos ?? 0,
      total_pago_centavos: fin?.total_pago_centavos ?? 0,
      total_pendente_centavos: fin?.total_pendente_centavos ?? 0,
      parcelas_atrasadas: fin?.parcelas_atrasadas ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Só quem compra parcelado precisa estar aqui — venda de balcão não exige
        cadastro.
      </p>
      {error ? (
        <p className="text-sm text-[color:var(--perigo)]">
          Não consegui carregar os clientes: {error.message}
        </p>
      ) : (
        <PainelClientes clientes={combinados} />
      )}
    </div>
  );
}

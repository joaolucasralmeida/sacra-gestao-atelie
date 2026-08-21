import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarBRL } from "@/lib/dominio/dinheiro";
import { Selo } from "@/components/selo";

export default async function PaginaCliente({
  params,
}: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const supabase = await criarClienteServidor();

  const [
    { data: cliente },
    { data: fin },
    { data: vendas },
    { data: parcelas },
  ] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("vw_clientes_financeiro")
      .select("*")
      .eq("cliente_id", id)
      .maybeSingle(),
    supabase
      .from("vendas")
      .select("id, data, total_centavos, status, parcelado")
      .eq("cliente_id", id)
      .order("data", { ascending: false }),
    supabase
      .from("vw_parcelas")
      .select("*")
      .eq("cliente_id", id)
      .order("vencimento"),
  ]);

  if (!cliente) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/clientes"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" /> Clientes
      </Link>

      <div>
        <h1 className="font-heading text-3xl">{cliente.nome}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {[cliente.whatsapp, cliente.telefone, cliente.email]
            .filter(Boolean)
            .join(" · ") || "Sem contato cadastrado"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Numero
          rotulo="Total comprado"
          valor={formatarBRL(fin?.total_comprado_centavos ?? 0)}
        />
        <Numero
          rotulo="Já pagou"
          valor={formatarBRL(fin?.total_pago_centavos ?? 0)}
        />
        <Numero
          rotulo="Ainda deve"
          valor={formatarBRL(fin?.total_pendente_centavos ?? 0)}
          destaque
        />
        <Numero
          rotulo="Parcelas"
          valor={`${fin?.parcelas_pagas ?? 0} de ${fin?.parcelas_total ?? 0} pagas`}
        />
      </div>

      <hr className="fio-ouro" />

      <section className="space-y-3">
        <h2 className="font-heading text-2xl">Parcelas</h2>

        {(parcelas ?? []).length === 0 ? (
          <p className="border-border bg-card text-muted-foreground rounded-lg border px-4 py-8 text-center text-sm">
            Nenhuma parcela. As compras dele foram todas à vista.
          </p>
        ) : (
          <div className="border-border bg-card overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border text-muted-foreground border-b text-left text-xs">
                  <th className="px-4 py-3 font-normal">Parcela</th>
                  <th className="px-4 py-3 font-normal">Vencimento</th>
                  <th className="px-4 py-3 text-right font-normal">Valor</th>
                  <th className="px-4 py-3 text-right font-normal">Pago</th>
                  <th className="px-4 py-3 text-right font-normal">Falta</th>
                  <th className="px-4 py-3 font-normal">Situação</th>
                </tr>
              </thead>
              <tbody>
                {(parcelas ?? []).map((p) => (
                  <tr
                    key={p.id}
                    className="border-border/60 border-b last:border-0"
                  >
                    <td className="px-4 py-3">#{p.numero}</td>
                    <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                      {new Date(`${p.vencimento}T12:00:00`).toLocaleDateString(
                        "pt-BR",
                      )}
                    </td>
                    <td className="tabular px-4 py-3 text-right">
                      {formatarBRL(p.valor_centavos)}
                    </td>
                    <td className="tabular text-muted-foreground px-4 py-3 text-right">
                      {formatarBRL(p.pago_centavos)}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-[color:var(--ouro)]">
                      {formatarBRL(p.restante_centavos)}
                    </td>
                    <td className="px-4 py-3">
                      <SeloParcela
                        quitada={p.quitada}
                        atrasada={p.atrasada}
                        situacao={p.situacao}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-2xl">Compras</h2>

        {(vendas ?? []).length === 0 ? (
          <p className="border-border bg-card text-muted-foreground rounded-lg border px-4 py-8 text-center text-sm">
            Nenhuma compra registrada.
          </p>
        ) : (
          <ul className="divide-border/60 border-border bg-card divide-y rounded-lg border">
            {(vendas ?? []).map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm">
                    {new Date(`${v.data}T12:00:00`).toLocaleDateString("pt-BR")}
                  </p>
                  <div className="mt-1 flex gap-1.5">
                    {v.parcelado ? <Selo>Parcelada</Selo> : null}
                    {v.status === "cancelada" ? (
                      <Selo tom="perigo">Cancelada</Selo>
                    ) : null}
                  </div>
                </div>
                <span
                  className={`tabular ${
                    v.status === "cancelada"
                      ? "text-muted-foreground line-through"
                      : "text-[color:var(--ouro)]"
                  }`}
                >
                  {formatarBRL(v.total_centavos)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SeloParcela({
  quitada,
  atrasada,
  situacao,
}: {
  quitada: boolean;
  atrasada: boolean;
  situacao: string;
}) {
  if (quitada) return <Selo tom="sucesso">Pago</Selo>;
  if (atrasada) return <Selo tom="perigo">Atrasado</Selo>;
  if (situacao === "parcial") return <Selo tom="alerta">Parcial</Selo>;
  return <Selo>Pendente</Selo>;
}

function Numero({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="border-border bg-card rounded-lg border px-4 py-3">
      <p
        className={`tabular text-xl ${destaque ? "text-[color:var(--ouro)]" : ""}`}
      >
        {valor}
      </p>
      <p className="text-muted-foreground mt-0.5 text-xs">{rotulo}</p>
    </div>
  );
}

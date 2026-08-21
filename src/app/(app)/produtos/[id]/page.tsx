import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarBRL } from "@/lib/dominio/dinheiro";
import { formatarMargem } from "@/lib/dominio/precificacao";
import {
  ROTULO_ORIGEM,
  type MovimentoLinha,
  type ProdutoLinha,
} from "@/lib/tipos";
import { Selo } from "@/components/selo";

export default async function PaginaProduto({
  params,
}: PageProps<"/produtos/[id]">) {
  const { id } = await params;
  const supabase = await criarClienteServidor();

  const [{ data: produto }, { data: movimentos }] = await Promise.all([
    supabase.from("vw_produtos").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("estoque_movimentos")
      .select("id, delta, origem, motivo, criado_em")
      .eq("produto_id", id)
      .order("criado_em", { ascending: false })
      .limit(200),
  ]);

  if (!produto) notFound();

  const p = produto as ProdutoLinha;
  const linhas = (movimentos ?? []) as MovimentoLinha[];

  return (
    <div className="space-y-6">
      <Link
        href="/produtos"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" /> Produtos
      </Link>

      <div>
        <h1 className="font-heading text-3xl">{p.nome}</h1>
        {p.sku ? (
          <p className="text-muted-foreground text-sm">{p.sku}</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Numero
          rotulo="Custo total"
          valor={formatarBRL(p.custo_total_centavos)}
        />
        <Numero
          rotulo="Preço de venda"
          valor={formatarBRL(p.preco_venda_centavos)}
          destaque
        />
        <Numero rotulo="Lucro" valor={formatarBRL(p.lucro_centavos)} />
        <Numero rotulo="Margem" valor={formatarMargem(p.margem)} />
      </div>

      <hr className="fio-ouro" />

      <section className="space-y-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-heading text-2xl">Extrato de estoque</h2>
          <span className="tabular text-muted-foreground text-sm">
            saldo atual: {p.estoque}
          </span>
        </div>

        {/*
          O extrato existe para responder "por que só tenho 3?". Estoque
          guardado como número solto daria de ombros; como soma de
          movimentos, ele conta a história inteira.
        */}
        {linhas.length === 0 ? (
          <p className="border-border bg-card text-muted-foreground rounded-lg border px-4 py-8 text-center text-sm">
            Nenhuma movimentação ainda.
          </p>
        ) : (
          <div className="border-border bg-card overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border text-muted-foreground border-b text-left text-xs">
                  <th className="px-4 py-3 font-normal">Quando</th>
                  <th className="px-4 py-3 font-normal">Origem</th>
                  <th className="px-4 py-3 font-normal">Motivo</th>
                  <th className="px-4 py-3 text-right font-normal">
                    Movimento
                  </th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((m) => (
                  <tr
                    key={m.id}
                    className="border-border/60 border-b last:border-0"
                  >
                    <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                      {new Date(m.criado_em).toLocaleDateString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Selo tom={m.delta > 0 ? "sucesso" : "neutro"}>
                        {ROTULO_ORIGEM[m.origem]}
                      </Selo>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {m.motivo ?? "—"}
                    </td>
                    <td
                      className={`tabular px-4 py-3 text-right ${
                        m.delta > 0 ? "text-[color:var(--sucesso)]" : ""
                      }`}
                    >
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
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

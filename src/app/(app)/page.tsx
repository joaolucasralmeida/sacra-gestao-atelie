import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Hammer,
  TrendingDown,
} from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarBRL } from "@/lib/dominio/dinheiro";
import { hojeNaLoja } from "@/lib/dominio/parcelas";
import { CartaoNumero } from "@/components/cartao-numero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraficoFaturamento, type PontoMes } from "./grafico-faturamento";

export default async function PaginaInicio() {
  const supabase = await criarClienteServidor();
  const hoje = hojeNaLoja();
  const inicioDoMes = `${hoje.slice(0, 7)}-01`;

  const [
    { data: parcelas },
    { data: pagamentos },
    { data: produtos },
    { data: kits },
    { data: vendas },
  ] = await Promise.all([
    supabase.from("vw_parcelas").select("*"),
    supabase
      .from("pagamentos")
      .select("valor_centavos, data")
      .gte("data", inicioDoMes),
    supabase
      .from("vw_produtos")
      .select(
        "id, nome, estoque, estoque_minimo, abaixo_minimo, estoque_negativo, custo_total_centavos",
      )
      .eq("ativo", true),
    supabase
      .from("vw_kits")
      .select("id, nome, estoque, montaveis, limitante_nome, custo_centavos")
      .eq("ativo", true),
    supabase
      .from("vendas")
      .select("data, total_centavos")
      .eq("status", "ativa")
      .gte("data", seisMesesAtras(hoje)),
  ]);

  const emAberto = (parcelas ?? []).filter((p) => !p.quitada);
  const atrasadas = emAberto.filter((p) => p.atrasada);
  const vencendo = emAberto.filter(
    (p) => !p.atrasada && p.dias_ate_vencer >= 0 && p.dias_ate_vencer <= 7,
  );

  const aReceber = emAberto.reduce((s, p) => s + p.restante_centavos, 0);
  const recebidoNoMes = (pagamentos ?? []).reduce(
    (s, p) => s + p.valor_centavos,
    0,
  );

  // Estoque negativo não vira valor negativo: significa que já foi vendido,
  // não que a loja deve mercadoria a si mesma.
  const valorEstoque =
    (produtos ?? []).reduce(
      (s, p) => s + Math.max(0, p.estoque) * p.custo_total_centavos,
      0,
    ) +
    (kits ?? []).reduce(
      (s, k) => s + Math.max(0, k.estoque) * k.custo_centavos,
      0,
    );

  const totalMontaveis = (kits ?? []).reduce((s, k) => s + k.montaveis, 0);
  const paraProduzir = (produtos ?? []).filter((p) => p.abaixo_minimo);
  const negativos = (produtos ?? []).filter((p) => p.estoque_negativo);

  const temAtencao =
    atrasadas.length > 0 ||
    vencendo.length > 0 ||
    paraProduzir.length > 0 ||
    negativos.length > 0;

  return (
    <div className="space-y-6">
      {/* O nome da página vive no cabeçalho; aqui fica só o recado do dia. */}
      <p className="text-muted-foreground text-sm">
        {temAtencao
          ? "Algumas coisas pedem sua atenção."
          : "Tudo em ordem por aqui."}
      </p>

      {/*
        Atenção vem ANTES dos números e só aparece quando existe algo de
        fato. Tela limpa é a informação de que está tudo em ordem — uma área
        permanentemente presente vira papel de parede em uma semana.
      */}
      {temAtencao ? (
        <Card className="border-[color:var(--ouro-escuro)]">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Atenção</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {atrasadas.length > 0 ? (
                <Alerta
                  icone={
                    <AlertTriangle className="size-4" strokeWidth={1.75} />
                  }
                  tom="perigo"
                  href="/a-receber"
                >
                  <strong>{atrasadas.length}</strong> parcela
                  {atrasadas.length > 1 ? "s" : ""} em atraso, somando{" "}
                  {formatarBRL(
                    atrasadas.reduce((s, p) => s + p.restante_centavos, 0),
                  )}
                  {atrasadas.length <= 3
                    ? ` — ${atrasadas
                        .map((p) => p.cliente_nome)
                        .filter(Boolean)
                        .join(", ")}`
                    : ""}
                </Alerta>
              ) : null}

              {vencendo.length > 0 ? (
                <Alerta
                  icone={
                    <CalendarClock className="size-4" strokeWidth={1.75} />
                  }
                  tom="alerta"
                  href="/a-receber"
                >
                  <strong>{vencendo.length}</strong> parcela
                  {vencendo.length > 1 ? "s" : ""} vencendo nos próximos 7 dias
                </Alerta>
              ) : null}

              {paraProduzir.length > 0 ? (
                <Alerta
                  icone={<Hammer className="size-4" strokeWidth={1.75} />}
                  tom="alerta"
                  href="/produtos"
                >
                  <strong>{paraProduzir.length}</strong> produto
                  {paraProduzir.length > 1 ? "s" : ""} abaixo do mínimo — hora
                  de produzir:{" "}
                  {paraProduzir
                    .slice(0, 4)
                    .map((p) => p.nome)
                    .join(", ")}
                  {paraProduzir.length > 4 ? "…" : ""}
                </Alerta>
              ) : null}

              {negativos.length > 0 ? (
                <Alerta
                  icone={<TrendingDown className="size-4" strokeWidth={1.75} />}
                  tom="perigo"
                  href="/produtos"
                >
                  <strong>{negativos.length}</strong> produto
                  {negativos.length > 1 ? "s" : ""} com estoque negativo — falta
                  registrar produção:{" "}
                  {negativos
                    .slice(0, 4)
                    .map((p) => p.nome)
                    .join(", ")}
                </Alerta>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <CartaoNumero
          rotulo="A receber"
          valor={formatarBRL(aReceber)}
          tom="ouro"
          href="/a-receber"
        />
        <CartaoNumero
          rotulo="Recebido no mês"
          valor={formatarBRL(recebidoNoMes)}
        />
        <CartaoNumero
          rotulo="Valor do estoque"
          valor={formatarBRL(valorEstoque)}
          detalhe="custo do que está pronto para vender"
          href="/produtos"
        />
        <CartaoNumero
          rotulo="Kits que dá para montar"
          valor={String(totalMontaveis)}
          href="/kits"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">
            Faturamento por mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GraficoFaturamento dados={agruparPorMes(vendas ?? [], hoje)} />
        </CardContent>
      </Card>
    </div>
  );
}

function seisMesesAtras(hoje: string): string {
  const [ano, mes] = hoje.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 6, 1));
  return d.toISOString().slice(0, 10);
}

/**
 * Agrupa as vendas nos últimos seis meses.
 *
 * Meses sem venda aparecem zerados de propósito: a lacuna é informação — um
 * mês vazio entre dois cheios conta a história da temporada de festas.
 */
function agruparPorMes(
  vendas: { data: string; total_centavos: number }[],
  hoje: string,
): PontoMes[] {
  const [ano, mes] = hoje.split("-").map(Number);
  const meses: PontoMes[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(ano, mes - 1 - i, 1));
    const chave = d.toISOString().slice(0, 7);

    meses.push({
      chave,
      rotulo: d.toLocaleDateString("pt-BR", {
        month: "short",
        timeZone: "UTC",
      }),
      totalCentavos: vendas
        .filter((v) => v.data.startsWith(chave))
        .reduce((s, v) => s + v.total_centavos, 0),
    });
  }

  return meses;
}

function Alerta({
  icone,
  tom,
  href,
  children,
}: {
  icone: React.ReactNode;
  tom: "perigo" | "alerta";
  href: string;
  children: React.ReactNode;
}) {
  const cor = tom === "perigo" ? "var(--perigo)" : "var(--alerta)";

  return (
    <li>
      <Link
        href={href}
        className="hover:bg-accent flex items-start gap-2 rounded-md px-2 py-1.5"
      >
        <span className="mt-0.5 shrink-0" style={{ color: cor }}>
          {icone}
        </span>
        <span>{children}</span>
      </Link>
    </li>
  );
}

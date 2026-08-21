import { criarClienteServidor } from "@/lib/supabase/server";
import { MODELO_PADRAO } from "@/lib/dominio/cobranca";
import type { FormaPagamento } from "@/lib/tipos";
import { PainelReceber, type ParcelaLinha } from "./painel-receber";

export default async function PaginaAReceber() {
  const supabase = await criarClienteServidor();

  const [{ data: parcelas, error }, { data: formas }, { data: config }] =
    await Promise.all([
      supabase.from("vw_parcelas").select("*").order("vencimento"),
      supabase
        .from("formas_pagamento")
        .select("*")
        .eq("ativo", true)
        .order("ordem"),
      supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "cobranca_whatsapp")
        .maybeSingle(),
    ]);

  // Atrasadas primeiro, depois por vencimento. É a ordem da urgência, e não
  // a ordem do banco: quem está devendo há três semanas precisa aparecer
  // antes de quem vence mês que vem.
  const ordenadas = [...((parcelas ?? []) as ParcelaLinha[])]
    .filter((p) => !p.quitada)
    .sort((a, b) => {
      if (a.atrasada !== b.atrasada) return a.atrasada ? -1 : 1;
      return a.vencimento.localeCompare(b.vencimento);
    });

  const quitadas = ((parcelas ?? []) as ParcelaLinha[])
    .filter((p) => p.quitada)
    .sort((a, b) => b.vencimento.localeCompare(a.vencimento));

  const modelo =
    (config?.valor as { modelo?: string } | null)?.modelo ?? MODELO_PADRAO;

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Quem está devendo, quem está atrasado — e o botão para cobrar sem
        digitar nada.
      </p>
      {error ? (
        <p className="text-sm text-[color:var(--perigo)]">
          Não consegui carregar as parcelas: {error.message}
        </p>
      ) : (
        <PainelReceber
          abertas={ordenadas}
          quitadas={quitadas}
          formas={(formas ?? []) as FormaPagamento[]}
          modeloMensagem={modelo}
        />
      )}
    </div>
  );
}

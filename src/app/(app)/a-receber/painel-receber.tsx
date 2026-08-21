"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Wallet } from "lucide-react";
import { formatarBRL } from "@/lib/dominio/dinheiro";
import { linkCobranca } from "@/lib/dominio/cobranca";
import type { FormaPagamento } from "@/lib/tipos";
import { Button } from "@/components/ui/button";
import { Selo } from "@/components/selo";
import { CartaoNumero } from "@/components/cartao-numero";
import { DialogoPagamento } from "./dialogo-pagamento";

export type ParcelaLinha = {
  id: string;
  venda_id: string;
  numero: number;
  valor_centavos: number;
  vencimento: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  cliente_whatsapp: string | null;
  pago_centavos: number;
  restante_centavos: number;
  quitada: boolean;
  atrasada: boolean;
  situacao: "paga" | "parcial" | "pendente";
  dias_ate_vencer: number;
};

export function PainelReceber({
  abertas,
  quitadas,
  formas,
  modeloMensagem,
}: {
  abertas: ParcelaLinha[];
  quitadas: ParcelaLinha[];
  formas: FormaPagamento[];
  modeloMensagem: string;
}) {
  const [pagando, setPagando] = useState<ParcelaLinha | null>(null);
  const [mostrarPagas, setMostrarPagas] = useState(false);

  const totalAberto = abertas.reduce((s, p) => s + p.restante_centavos, 0);
  const totalAtrasado = abertas
    .filter((p) => p.atrasada)
    .reduce((s, p) => s + p.restante_centavos, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 @xl/main:grid-cols-3">
        <CartaoNumero
          rotulo="Total a receber"
          valor={formatarBRL(totalAberto)}
          tom="ouro"
        />
        <CartaoNumero
          rotulo="Em atraso"
          valor={formatarBRL(totalAtrasado)}
          tom={totalAtrasado > 0 ? "perigo" : "neutro"}
        />
        <CartaoNumero
          rotulo="Parcelas em aberto"
          valor={String(abertas.length)}
        />
      </div>

      {abertas.length === 0 ? (
        <p className="border-border bg-card text-muted-foreground rounded-lg border px-4 py-10 text-center text-sm">
          Ninguém devendo. Está tudo em dia.
        </p>
      ) : (
        <ul className="divide-border/60 border-border bg-card divide-y rounded-lg border">
          {abertas.map((p) => (
            <LinhaParcela
              key={p.id}
              parcela={p}
              modeloMensagem={modeloMensagem}
              aoPagar={() => setPagando(p)}
            />
          ))}
        </ul>
      )}

      {quitadas.length > 0 ? (
        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setMostrarPagas((v) => !v)}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            {mostrarPagas ? "Esconder" : "Ver"} {quitadas.length} parcela
            {quitadas.length > 1 ? "s" : ""} já paga
            {quitadas.length > 1 ? "s" : ""}
          </button>

          {mostrarPagas ? (
            <ul className="divide-border/60 border-border bg-card divide-y rounded-lg border">
              {quitadas.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm">{p.cliente_nome ?? "Sem cliente"}</p>
                    <p className="text-muted-foreground text-xs">
                      Parcela {p.numero} · venceu em{" "}
                      {formatarData(p.vencimento)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular text-muted-foreground text-sm">
                      {formatarBRL(p.valor_centavos)}
                    </span>
                    <Selo tom="sucesso">Pago</Selo>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <DialogoPagamento
        parcela={pagando}
        formas={formas}
        aoFechar={() => setPagando(null)}
      />
    </div>
  );
}

function LinhaParcela({
  parcela,
  modeloMensagem,
  aoPagar,
}: {
  parcela: ParcelaLinha;
  modeloMensagem: string;
  aoPagar: () => void;
}) {
  const link = linkCobranca(
    parcela.cliente_whatsapp,
    {
      cliente: parcela.cliente_nome ?? "",
      numero: parcela.numero,
      valorCentavos: parcela.restante_centavos,
      vencimento: parcela.vencimento,
      atrasada: parcela.atrasada,
    },
    modeloMensagem,
  );

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        {parcela.cliente_id ? (
          <Link
            href={`/clientes/${parcela.cliente_id}`}
            className="text-sm hover:text-[color:var(--ouro-claro)]"
          >
            {parcela.cliente_nome}
          </Link>
        ) : (
          <span className="text-sm">Sem cliente</span>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">
            Parcela {parcela.numero} · {formatarData(parcela.vencimento)}
          </span>
          <SeloSituacao parcela={parcela} />
        </div>
      </div>

      <div className="text-right">
        <p className="tabular text-lg text-[color:var(--ouro)]">
          {formatarBRL(parcela.restante_centavos)}
        </p>
        {parcela.pago_centavos > 0 ? (
          <p className="tabular text-muted-foreground text-xs">
            de {formatarBRL(parcela.valor_centavos)} · pagou{" "}
            {formatarBRL(parcela.pago_centavos)}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2">
        {link ? (
          <Button
            variant="outline"
            size="sm"
            render={<a href={link} target="_blank" rel="noopener noreferrer" />}
          >
            <MessageCircle className="size-4" strokeWidth={1.75} />
            Cobrar
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            title="Cliente sem WhatsApp cadastrado"
          >
            <MessageCircle className="size-4" strokeWidth={1.75} />
            Cobrar
          </Button>
        )}

        <Button size="sm" onClick={aoPagar}>
          <Wallet className="size-4" strokeWidth={1.75} />
          Receber
        </Button>
      </div>
    </li>
  );
}

function SeloSituacao({ parcela }: { parcela: ParcelaLinha }) {
  if (parcela.atrasada) {
    const dias = Math.abs(parcela.dias_ate_vencer);
    return (
      <Selo tom="perigo">
        Atrasado {dias} dia{dias > 1 ? "s" : ""}
      </Selo>
    );
  }
  if (parcela.situacao === "parcial") return <Selo tom="alerta">Parcial</Selo>;
  if (parcela.dias_ate_vencer <= 7) {
    return (
      <Selo tom="alerta">
        {parcela.dias_ate_vencer === 0
          ? "Vence hoje"
          : `Vence em ${parcela.dias_ate_vencer} dia${parcela.dias_ate_vencer > 1 ? "s" : ""}`}
      </Selo>
    );
  }
  return <Selo>Pendente</Selo>;
}

function formatarData(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");
}

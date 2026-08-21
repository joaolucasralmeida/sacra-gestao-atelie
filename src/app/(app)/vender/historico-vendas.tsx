"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { formatarBRL } from "@/lib/dominio/dinheiro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Selo } from "@/components/selo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cancelarVenda } from "./acoes";

export type VendaLinha = {
  id: string;
  data: string;
  total_centavos: number;
  desconto_centavos: number;
  status: "ativa" | "cancelada";
  parcelado: boolean;
  cliente_id: string | null;
  cliente_nome: string | null;
  evento_nome: string | null;
  forma_pagamento: string | null;
  quantidade_itens: number;
  resumo_itens: string;
  pago_centavos: number;
};

export function HistoricoVendas({ vendas }: { vendas: VendaLinha[] }) {
  const [cancelando, setCancelando] = useState<VendaLinha | null>(null);

  if (vendas.length === 0) {
    return (
      <p className="border-border bg-card text-muted-foreground rounded-lg border px-4 py-10 text-center text-sm">
        Nenhuma venda registrada ainda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-border/60 border-border bg-card divide-y rounded-lg border">
        {vendas.map((venda) => {
          const cancelada = venda.status === "cancelada";

          return (
            <li
              key={venda.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm ${cancelada ? "text-muted-foreground line-through" : ""}`}
                >
                  {venda.resumo_itens || "Venda sem itens"}
                </p>

                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span>
                    {new Date(`${venda.data}T12:00:00`).toLocaleDateString(
                      "pt-BR",
                    )}
                  </span>
                  {venda.forma_pagamento ? (
                    <span>· {venda.forma_pagamento}</span>
                  ) : null}
                  {venda.evento_nome ? (
                    <span>· {venda.evento_nome}</span>
                  ) : null}
                  {venda.cliente_id ? (
                    <Link
                      href={`/clientes/${venda.cliente_id}`}
                      className="hover:text-[color:var(--ouro-claro)]"
                    >
                      · {venda.cliente_nome}
                    </Link>
                  ) : null}
                  {venda.parcelado ? <Selo>Parcelada</Selo> : null}
                  {cancelada ? <Selo tom="perigo">Cancelada</Selo> : null}
                </div>
              </div>

              <div className="text-right">
                <p
                  className={`tabular ${
                    cancelada
                      ? "text-muted-foreground line-through"
                      : "text-[color:var(--ouro)]"
                  }`}
                >
                  {formatarBRL(venda.total_centavos)}
                </p>
                {venda.pago_centavos > 0 && !cancelada ? (
                  <p className="tabular text-muted-foreground text-xs">
                    recebido {formatarBRL(venda.pago_centavos)}
                  </p>
                ) : null}
              </div>

              {cancelada ? null : (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Cancelar esta venda"
                  onClick={() => setCancelando(venda)}
                >
                  <Ban className="size-4" strokeWidth={1.75} />
                  Cancelar
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <DialogoCancelar
        venda={cancelando}
        aoFechar={() => setCancelando(null)}
      />
    </div>
  );
}

function DialogoCancelar({
  venda,
  aoFechar,
}: {
  venda: VendaLinha | null;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const [motivo, setMotivo] = useState("");
  const [confirmaEstorno, setConfirmaEstorno] = useState(false);

  if (!venda) return null;

  const temPagamento = venda.pago_centavos > 0;
  const impedido = temPagamento && !confirmaEstorno;

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) {
          setMotivo("");
          setConfirmaEstorno(false);
          aoFechar();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            Cancelar venda
          </DialogTitle>
          <DialogDescription>
            {venda.resumo_itens} — {formatarBRL(venda.total_centavos)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            O estoque volta como estava e as parcelas em aberto somem das contas
            a receber.
          </p>

          {/*
            Dinheiro já recebido não some sem alguém dizer que sabe disso. O
            banco recusa o cancelamento sem esta confirmação; aqui ela aparece
            antes, para não virar erro no meio do caminho.
          */}
          {temPagamento ? (
            <label className="flex items-start gap-2 rounded-md border border-[color:var(--perigo-fraco)] bg-[color:var(--perigo-fraco)] p-3 text-sm">
              <input
                type="checkbox"
                checked={confirmaEstorno}
                onChange={(e) => setConfirmaEstorno(e.target.checked)}
                className="mt-0.5 size-4 accent-[color:var(--perigo)]"
              />
              <span>
                Esta venda tem{" "}
                <strong>{formatarBRL(venda.pago_centavos)}</strong> já
                recebidos. Confirmo o estorno desse valor.
              </span>
            </label>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="motivo_cancelamento">Motivo</Label>
            <Input
              id="motivo_cancelamento"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: cliente devolveu a peça"
              autoFocus
            />
            <p className="text-muted-foreground text-xs">
              Fica registrado no histórico — é o que explica esse cancelamento
              daqui a seis meses.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={enviando}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            disabled={enviando || impedido || !motivo.trim()}
            onClick={() =>
              iniciar(async () => {
                const resultado = await cancelarVenda(
                  venda.id,
                  confirmaEstorno,
                  motivo,
                );

                if (resultado.erro) {
                  toast.error(resultado.erro);
                  return;
                }

                toast.success("Venda cancelada e estoque devolvido.");
                setMotivo("");
                setConfirmaEstorno(false);
                aoFechar();
                router.refresh();
              })
            }
          >
            {enviando ? "Cancelando…" : "Cancelar venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

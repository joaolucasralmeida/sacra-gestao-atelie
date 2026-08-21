"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { formatarBRL, formatarValor } from "@/lib/dominio/dinheiro";
import { hojeNaLoja } from "@/lib/dominio/parcelas";
import type { FormaPagamento } from "@/lib/tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { registrarPagamento, type Resultado } from "./acoes";
import type { ParcelaLinha } from "./painel-receber";

function BotaoReceber() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando…" : "Registrar pagamento"}
    </Button>
  );
}

export function DialogoPagamento({
  parcela,
  formas,
  aoFechar,
}: {
  parcela: ParcelaLinha | null;
  formas: FormaPagamento[];
  aoFechar: () => void;
}) {
  const [estado, acao] = useActionState<Resultado, FormData>(
    registrarPagamento,
    {},
  );

  useEffect(() => {
    if (estado.ok) {
      toast.success("Pagamento registrado.");
      aoFechar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  if (!parcela) return null;

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            Receber parcela
          </DialogTitle>
          <DialogDescription>
            {parcela.cliente_nome} · parcela {parcela.numero} · falta{" "}
            {formatarBRL(parcela.restante_centavos)}
          </DialogDescription>
        </DialogHeader>

        <form key={parcela.id} action={acao} className="space-y-4">
          <input type="hidden" name="parcela_id" value={parcela.id} />

          <div className="space-y-2">
            <Label htmlFor="valor">Valor recebido</Label>
            {/*
              Vem preenchido com o que falta: o caso comum é pagar a parcela
              inteira. Quem pagou menos apaga e digita — quem pagou tudo só
              confirma.
            */}
            <Input
              id="valor"
              name="valor"
              inputMode="decimal"
              defaultValue={formatarValor(parcela.restante_centavos)}
              autoFocus
              required
            />
            <p className="text-muted-foreground text-xs">
              Pode receber menos: o restante continua em aberto.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                name="data"
                type="date"
                defaultValue={hojeNaLoja()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="forma_pagamento_id">Como recebeu</Label>
              <select
                id="forma_pagamento_id"
                name="forma_pagamento_id"
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                defaultValue={formas[0]?.id ?? ""}
              >
                <option value="">Não informar</option>
                {formas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observação</Label>
            <Input id="observacoes" name="observacoes" />
          </div>

          {estado.erro ? (
            <p role="alert" className="text-sm text-[color:var(--perigo)]">
              {estado.erro}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={aoFechar}>
              Cancelar
            </Button>
            <BotaoReceber />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

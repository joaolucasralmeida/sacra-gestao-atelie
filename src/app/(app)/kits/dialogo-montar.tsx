"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
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
import { montarKit, type Resultado } from "./acoes";
import type { KitLinha } from "./painel-kits";

function BotaoConfirmar({ rotulo }: { rotulo: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando…" : rotulo}
    </Button>
  );
}

export function DialogoMontar({
  kit,
  aoFechar,
}: {
  kit: KitLinha | null;
  aoFechar: () => void;
}) {
  const [estado, acao] = useActionState<Resultado, FormData>(montarKit, {});
  const [tipo, setTipo] = useState<"montagem" | "desmontagem">("montagem");
  const [quantidade, setQuantidade] = useState(1);

  useEffect(() => {
    if (estado.ok) {
      toast.success(
        tipo === "montagem" ? "Kits montados." : "Kits desmontados.",
      );
      aoFechar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  useEffect(() => {
    if (kit) {
      setTipo("montagem");
      setQuantidade(1);
    }
  }, [kit]);

  if (!kit) return null;

  const montando = tipo === "montagem";
  const limite = montando ? kit.montaveis : kit.estoque;
  const excede = quantidade > limite;

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            {kit.nome}
          </DialogTitle>
          <DialogDescription>
            {kit.estoque} prontos · dá para montar mais {kit.montaveis}
            {kit.limitante_nome ? ` (${kit.limitante_nome} limita)` : ""}
          </DialogDescription>
        </DialogHeader>

        <form action={acao} className="space-y-4">
          <input type="hidden" name="kit_id" value={kit.id} />
          <input type="hidden" name="tipo" value={tipo} />

          <div className="flex gap-2">
            <Button
              type="button"
              variant={montando ? "default" : "outline"}
              className="flex-1"
              onClick={() => setTipo("montagem")}
            >
              Montar
            </Button>
            <Button
              type="button"
              variant={!montando ? "default" : "outline"}
              className="flex-1"
              onClick={() => setTipo("desmontagem")}
            >
              Desmontar
            </Button>
          </div>

          <p className="text-muted-foreground text-xs">
            {montando
              ? "Montar consome os produtos do estoque e cria kits prontos."
              : "Desmontar devolve os produtos ao estoque — para o que sobrou do evento."}
          </p>

          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantos kits</Label>
            <Input
              id="quantidade"
              name="quantidade"
              type="number"
              min={1}
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              autoFocus
              required
            />

            {/*
              Avisa em vez de bloquear: ela pode ter montado kits antes de
              registrar a produção das peças. Travar aqui a impediria de
              registrar o que de fato aconteceu.
            */}
            {excede ? (
              <p className="text-xs text-[color:var(--alerta)]">
                {montando
                  ? `Isso passa do que o estoque comporta (${limite}). Pode registrar mesmo assim — o estoque vai ficar negativo e aparecer como alerta.`
                  : `Você tem ${limite} kits prontos. Desmontar mais que isso deixa o estoque negativo.`}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observação (opcional)</Label>
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
            <BotaoConfirmar rotulo={montando ? "Montar" : "Desmontar"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

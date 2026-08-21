"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import type { ProdutoLinha } from "@/lib/tipos";
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
import { ajustarEstoque, registrarProducao, type Resultado } from "./acoes";

function BotaoConfirmar({ rotulo }: { rotulo: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando…" : rotulo}
    </Button>
  );
}

export function DialogoEstoque({
  dados,
  aoFechar,
}: {
  dados: { produto: ProdutoLinha; modo: "producao" | "ajuste" } | null;
  aoFechar: () => void;
}) {
  const producao = dados?.modo === "producao";

  const [estado, acao] = useActionState<Resultado, FormData>(
    producao ? registrarProducao : ajustarEstoque,
    {},
  );

  useEffect(() => {
    if (estado.ok) {
      toast.success(producao ? "Produção registrada." : "Estoque ajustado.");
      aoFechar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  if (!dados) return null;

  return (
    <Dialog open onOpenChange={(valor) => !valor && aoFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            {producao ? "Registrar produção" : "Ajustar estoque"}
          </DialogTitle>
          <DialogDescription>
            {dados.produto.nome} — estoque atual: {dados.produto.estoque}
          </DialogDescription>
        </DialogHeader>

        <form
          key={`${dados.produto.id}-${dados.modo}`}
          action={acao}
          className="space-y-4"
        >
          <input type="hidden" name="produto_id" value={dados.produto.id} />

          {producao ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantas peças você fez?</Label>
                <Input
                  id="quantidade"
                  name="quantidade"
                  type="number"
                  min={1}
                  defaultValue={1}
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observação (opcional)</Label>
                <Input id="observacoes" name="observacoes" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="delta">Quanto somar ou subtrair</Label>
                <Input
                  id="delta"
                  name="delta"
                  type="number"
                  placeholder="Ex.: -2 para dar baixa"
                  autoFocus
                  required
                />
                <p className="text-muted-foreground text-xs">
                  Use número negativo para tirar do estoque.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo</Label>
                <Input
                  id="motivo"
                  name="motivo"
                  placeholder="Ex.: peça quebrou no transporte"
                  required
                />
                <p className="text-muted-foreground text-xs">
                  Obrigatório: é o que vai explicar esse número daqui a três
                  meses.
                </p>
              </div>
            </>
          )}

          {estado.erro ? (
            <p role="alert" className="text-sm text-[color:var(--perigo)]">
              {estado.erro}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={aoFechar}>
              Cancelar
            </Button>
            <BotaoConfirmar rotulo={producao ? "Registrar" : "Ajustar"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

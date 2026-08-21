"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { salvarCliente, type Resultado } from "./acoes";
import type { ClienteLinha } from "./painel-clientes";

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando…" : "Salvar"}
    </Button>
  );
}

export function DialogoCliente({
  aberto,
  cliente,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  cliente: Partial<ClienteLinha> | null;
  aoFechar: () => void;
  /** Usado pela tela de Vender, que precisa do id do cliente recém-criado. */
  aoSalvar?: (clienteId: string) => void;
}) {
  const [estado, acao] = useActionState<Resultado, FormData>(salvarCliente, {});

  useEffect(() => {
    if (estado.ok) {
      toast.success(
        cliente?.id ? "Cliente atualizado." : "Cliente cadastrado.",
      );
      if (estado.clienteId) aoSalvar?.(estado.clienteId);
      aoFechar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  // Ver a nota em dialogo-produto.tsx.
  if (!aberto) return null;

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            {cliente?.id ? "Editar cliente" : "Novo cliente"}
          </DialogTitle>
        </DialogHeader>

        <form key={cliente?.id ?? "novo"} action={acao} className="space-y-4">
          <input type="hidden" name="id" value={cliente?.id ?? ""} />

          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              name="nome"
              defaultValue={cliente?.nome ?? ""}
              required
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                inputMode="tel"
                placeholder="28999990000"
                defaultValue={cliente?.whatsapp ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                name="telefone"
                inputMode="tel"
                defaultValue={cliente?.telefone ?? ""}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">CPF / CNPJ</Label>
              <Input
                id="cpf_cnpj"
                name="cpf_cnpj"
                defaultValue={cliente?.cpf_cnpj ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={cliente?.email ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              name="endereco"
              defaultValue={cliente?.endereco ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Input
              id="observacoes"
              name="observacoes"
              defaultValue={cliente?.observacoes ?? ""}
            />
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
            <BotaoSalvar />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

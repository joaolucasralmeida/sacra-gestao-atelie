"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { definirSenha, type EstadoSenha } from "./actions";

function BotaoSalvar() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando…" : "Salvar senha"}
    </Button>
  );
}

export function FormularioSenha() {
  const [estado, acao] = useActionState<EstadoSenha, FormData>(
    definirSenha,
    {},
  );

  return (
    <form action={acao} className="max-w-sm space-y-5">
      <div className="space-y-2">
        <Label htmlFor="senha">Nova senha</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-muted-foreground text-xs">Pelo menos 8 caracteres.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmacao">Repita a senha</Label>
        <Input
          id="confirmacao"
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {estado.erro ? (
        <p
          role="alert"
          className="rounded-md border border-[color:var(--perigo-fraco)] bg-[color:var(--perigo-fraco)] px-3 py-2 text-sm text-[color:var(--perigo)]"
        >
          {estado.erro}
        </p>
      ) : null}

      {estado.sucesso ? (
        <p role="status" className="text-sm text-[color:var(--sucesso)]">
          Senha salva. Use ela no próximo acesso.
        </p>
      ) : null}

      <BotaoSalvar />
    </form>
  );
}

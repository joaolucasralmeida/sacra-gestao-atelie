"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { entrar, type EstadoLogin } from "./actions";

function BotaoEntrar() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Entrando…" : "Entrar"}
    </Button>
  );
}

export function FormularioLogin({ proximo }: { proximo: string }) {
  const [estado, acao] = useActionState<EstadoLogin, FormData>(entrar, {});

  return (
    <form action={acao} className="space-y-5">
      <input type="hidden" name="proximo" value={proximo} />

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
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

      <BotaoEntrar />
    </form>
  );
}

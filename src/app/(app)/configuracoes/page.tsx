import { usuarioAtual } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormularioSenha } from "./formulario-senha";

export default async function PaginaConfiguracoes() {
  const usuario = await usuarioAtual();

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Sua conta e o acesso ao sistema.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Senha</CardTitle>
          <CardDescription>
            Vale para {usuario?.email}. Não é preciso saber a senha atual — se
            você entrou por um link de recuperação, defina a nova aqui mesmo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioSenha />
        </CardContent>
      </Card>
    </div>
  );
}

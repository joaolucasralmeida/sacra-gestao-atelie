import Link from "next/link";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Cartão de número, no formato do dashboard-01: rótulo pequeno em cima,
 * número grande embaixo.
 *
 * O número é o que ela procura ao bater o olho, então ele domina; o rótulo
 * é contexto. Dourado fica reservado ao valor que ela mais consulta em cada
 * tela — se todos forem dourados, nenhum é destaque.
 */
export function CartaoNumero({
  rotulo,
  valor,
  detalhe,
  tom = "neutro",
  href,
  acao,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  tom?: "neutro" | "ouro" | "perigo";
  href?: string;
  acao?: React.ReactNode;
}) {
  const conteudo = (
    <Card className="@container/card h-full">
      <CardHeader>
        <CardDescription>{rotulo}</CardDescription>
        <CardTitle
          className={cn(
            "text-2xl font-semibold tabular-nums @[250px]/card:text-3xl",
            tom === "ouro" && "text-[color:var(--ouro)]",
            tom === "perigo" && "text-[color:var(--perigo)]",
          )}
        >
          {valor}
        </CardTitle>
        {detalhe ? (
          <p className="text-muted-foreground text-xs">{detalhe}</p>
        ) : null}
        {acao ? <CardAction>{acao}</CardAction> : null}
      </CardHeader>
    </Card>
  );

  return href ? (
    <Link
      href={href}
      className="rounded-xl transition-colors hover:[&_[data-slot=card]]:border-[color:var(--ouro-escuro)]"
    >
      {conteudo}
    </Link>
  ) : (
    conteudo
  );
}

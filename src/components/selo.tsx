import { cn } from "@/lib/utils";

type Tom = "neutro" | "sucesso" | "alerta" | "perigo" | "ouro";

const TONS: Record<Tom, string> = {
  neutro: "border-border text-muted-foreground",
  sucesso:
    "border-[color:var(--sucesso-fraco)] bg-[color:var(--sucesso-fraco)] text-[color:var(--sucesso)]",
  alerta:
    "border-[color:var(--alerta-fraco)] bg-[color:var(--alerta-fraco)] text-[color:var(--alerta)]",
  perigo:
    "border-[color:var(--perigo-fraco)] bg-[color:var(--perigo-fraco)] text-[color:var(--perigo)]",
  ouro: "border-[color:var(--ouro-escuro)] text-[color:var(--ouro)]",
};

/**
 * Selo de estado.
 *
 * O rótulo é obrigatório e a cor é sempre acompanhante, nunca a informação
 * sozinha: a barraquinha fica em sol aberto, onde tom sobre fundo escuro
 * some, e cor isolada também falha para quem tem daltonismo. "Atrasado"
 * precisa ser lido, não deduzido.
 */
export function Selo({
  children,
  tom = "neutro",
  className,
}: {
  children: React.ReactNode;
  tom?: Tom;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs whitespace-nowrap",
        TONS[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}

"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import {
  formatarBRL,
  formatarValor,
  parseParaCentavos,
} from "@/lib/dominio/dinheiro";
import { formatarMargem, precoParaMargem } from "@/lib/dominio/precificacao";
import {
  calcularMontabilidade,
  resumirKit,
  type ComponenteKit,
} from "@/lib/dominio/kits";
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
import { salvarKit, type Resultado } from "./acoes";
import type { KitLinha, ReceitaItem } from "./painel-kits";

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando…" : "Salvar kit"}
    </Button>
  );
}

export function DialogoKit({
  aberto,
  kit,
  produtos,
  receita,
  aoFechar,
}: {
  aberto: boolean;
  kit: KitLinha | null;
  produtos: ProdutoLinha[];
  receita: ReceitaItem[];
  aoFechar: () => void;
}) {
  const [estado, acao] = useActionState<Resultado, FormData>(salvarKit, {});
  const [itens, setItens] = useState<Record<string, number>>({});
  const [preco, setPreco] = useState("");

  // Recarrega a receita ao abrir num kit diferente.
  useEffect(() => {
    if (!aberto) return;
    setItens(
      Object.fromEntries(receita.map((r) => [r.produto_id, r.quantidade])),
    );
    setPreco(kit ? formatarValor(kit.preco_centavos) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, kit?.id]);

  useEffect(() => {
    if (estado.ok) {
      toast.success(kit ? "Kit atualizado." : "Kit criado.");
      aoFechar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  const componentes: ComponenteKit[] = useMemo(
    () =>
      Object.entries(itens)
        .filter(([, qtd]) => qtd > 0)
        .map(([produtoId, quantidade]) => {
          const p = produtos.find((x) => x.id === produtoId)!;
          return {
            produtoId,
            nome: p.nome,
            quantidade,
            estoque: p.estoque,
            custoMaterialCentavos: p.custo_material_centavos,
            custoMaoObraCentavos: p.custo_mao_obra_centavos,
            precoVendaCentavos: p.preco_venda_centavos,
          };
        }),
    [itens, produtos],
  );

  const precoCentavos = parseParaCentavos(preco || "0") ?? 0;
  const resumo = resumirKit(componentes, precoCentavos);
  const montabilidade = calcularMontabilidade(componentes);

  // Sugestões: economico 30%, recomendado 45%, premium 60% de margem.
  const sugestoes = [
    { rotulo: "Econômico", margem: 0.3 },
    { rotulo: "Recomendado", margem: 0.45 },
    { rotulo: "Premium", margem: 0.6 },
  ].map((s) => ({
    ...s,
    valor: precoParaMargem(resumo.custoCentavos, s.margem) ?? 0,
  }));

  const ajustar = (id: string, delta: number) =>
    setItens((atual) => {
      const proximo = (atual[id] ?? 0) + delta;
      if (proximo <= 0) {
        const { [id]: _removido, ...resto } = atual;
        return resto;
      }
      return { ...atual, [id]: proximo };
    });

  // Ver a nota em dialogo-produto.tsx: desmontar é mais confiável que
  // depender da animação de saída do Base UI.
  if (!aberto) return null;

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            {kit ? "Editar kit" : "Novo kit"}
          </DialogTitle>
          <DialogDescription>
            Escolha os produtos e a quantidade de cada um. O custo é calculado a
            partir deles.
          </DialogDescription>
        </DialogHeader>

        <form action={acao} className="space-y-5">
          <input type="hidden" name="id" value={kit?.id ?? ""} />
          <input
            type="hidden"
            name="itens"
            value={JSON.stringify(
              Object.entries(itens)
                .filter(([, q]) => q > 0)
                .map(([produto_id, quantidade]) => ({
                  produto_id,
                  quantidade,
                })),
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do kit</Label>
              <Input
                id="nome"
                name="nome"
                defaultValue={kit?.nome ?? ""}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                name="descricao"
                defaultValue={kit?.descricao ?? ""}
              />
            </div>
          </div>

          <section className="space-y-2">
            <Label>Produtos do kit</Label>
            <div className="border-border max-h-56 overflow-y-auto rounded-md border">
              {produtos.length === 0 ? (
                <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                  Cadastre produtos antes de montar um kit.
                </p>
              ) : (
                produtos.map((p) => (
                  <div
                    key={p.id}
                    className="border-border/60 flex items-center gap-3 border-b px-3 py-2 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{p.nome}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatarBRL(p.preco_venda_centavos)} · estoque{" "}
                        {p.estoque}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Tirar um ${p.nome}`}
                        onClick={() => ajustar(p.id, -1)}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <span className="tabular w-6 text-center text-sm">
                        {itens[p.id] ?? 0}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Somar um ${p.nome}`}
                        onClick={() => ajustar(p.id, 1)}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="preco">Preço do kit</Label>
              <Input
                id="preco"
                name="preco"
                inputMode="decimal"
                placeholder="0,00"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
              />

              {resumo.custoCentavos > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {sugestoes.map((s) => (
                    <button
                      key={s.rotulo}
                      type="button"
                      onClick={() => setPreco(formatarValor(s.valor))}
                      className="hover:bg-accent rounded-full border border-[color:var(--ouro-escuro)] px-2 py-0.5 text-xs text-[color:var(--ouro)]"
                      title={`Lucro de ${formatarBRL(s.valor - resumo.custoCentavos)}`}
                    >
                      {s.rotulo}: {formatarBRL(s.valor)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <dl className="border-border bg-background space-y-1 rounded-md border p-3 text-sm">
              <Resumo
                rotulo="Itens separados"
                valor={formatarBRL(resumo.precoSomadoCentavos)}
              />
              <Resumo
                rotulo="Custo"
                valor={formatarBRL(resumo.custoCentavos)}
              />
              <Resumo
                rotulo="Desconto"
                valor={formatarBRL(resumo.descontoCentavos)}
              />
              <Resumo
                rotulo="Lucro"
                valor={formatarBRL(resumo.lucroCentavos)}
                alerta={resumo.lucroCentavos < 0}
              />
              <Resumo rotulo="Margem" valor={formatarMargem(resumo.margem)} />
              <Resumo
                rotulo="Dá para montar"
                valor={`${montabilidade.maximo}${
                  montabilidade.limitante
                    ? ` (${montabilidade.limitante.nome})`
                    : ""
                }`}
              />
            </dl>
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

function Resumo({
  rotulo,
  valor,
  alerta,
}: {
  rotulo: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className={`tabular ${alerta ? "text-[color:var(--perigo)]" : ""}`}>
        {valor}
      </dd>
    </div>
  );
}

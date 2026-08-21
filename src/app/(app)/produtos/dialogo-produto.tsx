"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { formatarValor } from "@/lib/dominio/dinheiro";
import type { Categoria, ProdutoLinha } from "@/lib/tipos";
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
import { salvarProduto, type Resultado } from "./acoes";

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando…" : "Salvar"}
    </Button>
  );
}

export function DialogoProduto({
  aberto,
  produto,
  categorias,
  aoFechar,
}: {
  aberto: boolean;
  produto: ProdutoLinha | null;
  categorias: Categoria[];
  aoFechar: () => void;
}) {
  const [estado, acao] = useActionState<Resultado, FormData>(salvarProduto, {});

  useEffect(() => {
    if (estado.ok) {
      toast.success(produto ? "Produto atualizado." : "Produto cadastrado.");
      aoFechar();
    }
    // `estado` só muda quando a ação retorna; não queremos reagir a aoFechar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  /*
    Desmonta de vez em vez de deixar o Base UI fechar com animação.
    O portal dele só é removido quando o `animationend` da saída dispara, e
    essa animação nem sempre conclui — quando não conclui, o diálogo fica
    logicamente fechado (`data-closed`) e visível na tela para sempre.
  */
  if (!aberto) return null;

  return (
    <Dialog open onOpenChange={(valor) => !valor && aoFechar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            {produto ? "Editar produto" : "Novo produto"}
          </DialogTitle>
          <DialogDescription>
            O custo separa material e mão de obra — é o que mostra quando uma
            peça está pagando o seu tempo.
          </DialogDescription>
        </DialogHeader>

        {/* `key` força o formulário a renascer ao trocar de produto, em vez
            de manter o valor do anterior nos campos. */}
        <form key={produto?.id ?? "novo"} action={acao} className="space-y-4">
          <input type="hidden" name="id" value={produto?.id ?? ""} />

          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              name="nome"
              defaultValue={produto?.nome ?? ""}
              required
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sku">Código / SKU</Label>
              <Input id="sku" name="sku" defaultValue={produto?.sku ?? ""} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria_id">Categoria</Label>
              <select
                id="categoria_id"
                name="categoria_id"
                defaultValue={produto?.categoria_id ?? ""}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="">Sem categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="custo_material">Custo do material</Label>
              <Input
                id="custo_material"
                name="custo_material"
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={
                  produto ? formatarValor(produto.custo_material_centavos) : ""
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custo_mao_obra">Custo da mão de obra</Label>
              <Input
                id="custo_mao_obra"
                name="custo_mao_obra"
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={
                  produto ? formatarValor(produto.custo_mao_obra_centavos) : ""
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="preco_venda">Preço de venda</Label>
              <Input
                id="preco_venda"
                name="preco_venda"
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={
                  produto ? formatarValor(produto.preco_venda_centavos) : ""
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estoque_minimo">Estoque mínimo</Label>
              <Input
                id="estoque_minimo"
                name="estoque_minimo"
                type="number"
                min={0}
                defaultValue={produto?.estoque_minimo ?? 0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Input
                id="unidade"
                name="unidade"
                defaultValue={produto?.unidade ?? "un"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Input
              id="observacoes"
              name="observacoes"
              defaultValue={produto?.observacoes ?? ""}
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

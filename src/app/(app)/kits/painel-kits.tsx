"use client";

import { useState } from "react";
import { Hammer, Pencil, Plus } from "lucide-react";
import { formatarBRL } from "@/lib/dominio/dinheiro";
import { formatarMargem } from "@/lib/dominio/precificacao";
import type { ProdutoLinha } from "@/lib/tipos";
import { Button } from "@/components/ui/button";
import { Selo } from "@/components/selo";
import { DialogoKit } from "./dialogo-kit";
import { DialogoMontar } from "./dialogo-montar";

export type KitLinha = {
  id: string;
  nome: string;
  descricao: string | null;
  preco_centavos: number;
  ativo: boolean;
  custo_centavos: number;
  preco_somado_centavos: number;
  desconto_centavos: number;
  lucro_centavos: number;
  margem: number;
  estoque: number;
  montaveis: number;
  limitante_nome: string | null;
};

export type ReceitaItem = {
  kit_id: string;
  produto_id: string;
  quantidade: number;
};

export function PainelKits({
  kits,
  produtos,
  receitas,
}: {
  kits: KitLinha[];
  produtos: ProdutoLinha[];
  receitas: ReceitaItem[];
}) {
  const [emEdicao, setEmEdicao] = useState<KitLinha | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const [montando, setMontando] = useState<KitLinha | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setNovoAberto(true)}>
          <Plus className="size-4" /> Novo kit
        </Button>
      </div>

      {kits.length === 0 ? (
        <p className="border-border bg-card text-muted-foreground rounded-lg border px-4 py-10 text-center text-sm">
          Nenhum kit ainda. Um kit é a combinação que você embala antes do
          evento — terço, cruz e vela numa caixinha, por exemplo.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {kits.map((kit) => {
            const itens = receitas.filter((r) => r.kit_id === kit.id);

            return (
              <article
                key={kit.id}
                className="border-border bg-card rounded-lg border p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-2xl">{kit.nome}</h2>
                    {kit.descricao ? (
                      <p className="text-muted-foreground mt-0.5 text-sm">
                        {kit.descricao}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Montar ou desmontar"
                      aria-label={`Montar ${kit.nome}`}
                      onClick={() => setMontando(kit)}
                    >
                      <Hammer className="size-4" strokeWidth={1.75} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      aria-label={`Editar ${kit.nome}`}
                      onClick={() => setEmEdicao(kit)}
                    >
                      <Pencil className="size-4" strokeWidth={1.75} />
                    </Button>
                  </div>
                </div>

                <ul className="text-muted-foreground mt-4 space-y-1 text-sm">
                  {itens.map((item) => {
                    const produto = produtos.find(
                      (p) => p.id === item.produto_id,
                    );
                    return (
                      <li key={item.produto_id}>
                        {item.quantidade}× {produto?.nome ?? "Produto removido"}
                      </li>
                    );
                  })}
                  {itens.length === 0 ? <li>Sem receita cadastrada</li> : null}
                </ul>

                <hr className="fio-ouro my-4" />

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <Linha
                    rotulo="Itens separados"
                    valor={formatarBRL(kit.preco_somado_centavos)}
                  />
                  <Linha
                    rotulo="Preço do kit"
                    valor={formatarBRL(kit.preco_centavos)}
                    destaque
                  />
                  <Linha
                    rotulo="Desconto"
                    valor={formatarBRL(kit.desconto_centavos)}
                  />
                  <Linha
                    rotulo="Custo"
                    valor={formatarBRL(kit.custo_centavos)}
                  />
                  <Linha
                    rotulo="Lucro"
                    valor={formatarBRL(kit.lucro_centavos)}
                  />
                  <Linha rotulo="Margem" valor={formatarMargem(kit.margem)} />
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Selo tom="ouro">Prontos: {kit.estoque}</Selo>

                  {/*
                    "Dá para montar 5" manda ela conferir o estoque inteiro.
                    "A cruz limita em 5" manda ela fazer cruzes.
                  */}
                  <Selo tom={kit.montaveis > 0 ? "neutro" : "alerta"}>
                    Dá para montar: {kit.montaveis}
                    {kit.limitante_nome
                      ? ` — ${kit.limitante_nome} limita`
                      : ""}
                  </Selo>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <DialogoKit
        aberto={novoAberto || emEdicao !== null}
        kit={emEdicao}
        produtos={produtos}
        receita={
          emEdicao ? receitas.filter((r) => r.kit_id === emEdicao.id) : []
        }
        aoFechar={() => {
          setNovoAberto(false);
          setEmEdicao(null);
        }}
      />

      <DialogoMontar kit={montando} aoFechar={() => setMontando(null)} />
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className={`tabular ${destaque ? "text-[color:var(--ouro)]" : ""}`}>
        {valor}
      </dd>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Hammer, Pencil, Plus, Scale, Search } from "lucide-react";
import { formatarBRL } from "@/lib/dominio/dinheiro";
import { formatarMargem } from "@/lib/dominio/precificacao";
import type { Categoria, ProdutoLinha } from "@/lib/tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Selo } from "@/components/selo";
import { DialogoProduto } from "./dialogo-produto";
import { DialogoEstoque } from "./dialogo-estoque";
import { GaleriaProdutos } from "./galeria-produtos";

export function PainelProdutos({
  produtos,
  categorias,
}: {
  produtos: ProdutoLinha[];
  categorias: Categoria[];
}) {
  const [busca, setBusca] = useState("");
  const [emEdicao, setEmEdicao] = useState<ProdutoLinha | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const [estoqueDe, setEstoqueDe] = useState<{
    produto: ProdutoLinha;
    modo: "producao" | "ajuste";
  } | null>(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) ||
        (p.sku ?? "").toLowerCase().includes(termo),
    );
  }, [produtos, busca]);

  return (
    <Tabs defaultValue="lista" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <TabsList variant="line">
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="fotos">Fotos</TabsTrigger>
        </TabsList>

        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou código"
            className="pl-9"
            aria-label="Buscar produto"
          />
        </div>

        <Button onClick={() => setNovoAberto(true)}>
          <Plus className="size-4" /> Novo produto
        </Button>
      </div>

      <TabsContent value="lista" className="space-y-4">
        {filtrados.length === 0 ? (
          <p className="border-border bg-card text-muted-foreground rounded-lg border px-4 py-10 text-center text-sm">
            {produtos.length === 0
              ? "Nenhum produto cadastrado ainda. Comece pelo que mais sai na barraquinha."
              : "Nenhum produto encontrado para essa busca."}
          </p>
        ) : (
          <div className="border-border bg-card overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border text-muted-foreground border-b text-left text-xs">
                  <th className="px-4 py-3 font-normal">Produto</th>
                  <th className="px-4 py-3 text-right font-normal">Custo</th>
                  <th className="px-4 py-3 text-right font-normal">Preço</th>
                  <th className="px-4 py-3 text-right font-normal">Lucro</th>
                  <th className="px-4 py-3 text-right font-normal">Margem</th>
                  <th className="px-4 py-3 text-right font-normal">Estoque</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {filtrados.map((produto) => (
                  <tr
                    key={produto.id}
                    className="border-border/60 border-b last:border-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/produtos/${produto.id}`}
                        className="hover:text-[color:var(--ouro-claro)]"
                      >
                        {produto.nome}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {produto.sku ? (
                          <span className="text-muted-foreground text-xs">
                            {produto.sku}
                          </span>
                        ) : null}
                        {!produto.ativo ? <Selo>Inativo</Selo> : null}
                      </div>
                    </td>

                    <td className="tabular text-muted-foreground px-4 py-3 text-right">
                      {formatarBRL(produto.custo_total_centavos)}
                      <div className="text-xs">
                        {formatarBRL(produto.custo_material_centavos)} +{" "}
                        {formatarBRL(produto.custo_mao_obra_centavos)} mão de
                        obra
                      </div>
                    </td>

                    <td className="tabular px-4 py-3 text-right text-[color:var(--ouro)]">
                      {formatarBRL(produto.preco_venda_centavos)}
                    </td>

                    <td
                      className={`tabular px-4 py-3 text-right ${
                        produto.lucro_centavos < 0
                          ? "text-[color:var(--perigo)]"
                          : ""
                      }`}
                    >
                      {formatarBRL(produto.lucro_centavos)}
                    </td>

                    <td className="tabular text-muted-foreground px-4 py-3 text-right">
                      {formatarMargem(produto.margem)}
                    </td>

                    <td className="tabular px-4 py-3 text-right">
                      <span
                        className={
                          produto.estoque_negativo
                            ? "text-[color:var(--perigo)]"
                            : ""
                        }
                      >
                        {produto.estoque}
                      </span>
                      {produto.estoque_negativo ? (
                        <div className="mt-1">
                          <Selo tom="perigo">Estoque negativo</Selo>
                        </div>
                      ) : produto.abaixo_minimo ? (
                        <div className="mt-1">
                          <Selo tom="alerta">Produzir</Selo>
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Registrar produção de ${produto.nome}`}
                          title="Produzi mais"
                          onClick={() =>
                            setEstoqueDe({ produto, modo: "producao" })
                          }
                        >
                          <Hammer className="size-4" strokeWidth={1.75} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Ajustar estoque de ${produto.nome}`}
                          title="Ajustar estoque"
                          onClick={() =>
                            setEstoqueDe({ produto, modo: "ajuste" })
                          }
                        >
                          <Scale className="size-4" strokeWidth={1.75} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${produto.nome}`}
                          title="Editar"
                          onClick={() => setEmEdicao(produto)}
                        >
                          <Pencil className="size-4" strokeWidth={1.75} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      {/*
        `keepMounted={false}` é necessário, não é otimização: o BlurFade
        anima quando o elemento entra em vista, e um painel de aba nasce com
        `display: none`. O observador media enquanto estava escondido,
        concluía que nunca apareceu e deixava as fotos travadas em
        `opacity: 0` — a aba abria vazia. Desmontando o painel inativo, a
        galeria monta no momento em que a aba é aberta, já visível.
      */}
      <TabsContent value="fotos" keepMounted={false}>
        <GaleriaProdutos produtos={filtrados} />
      </TabsContent>

      <DialogoProduto
        aberto={novoAberto || emEdicao !== null}
        produto={emEdicao}
        categorias={categorias}
        aoFechar={() => {
          setNovoAberto(false);
          setEmEdicao(null);
        }}
      />

      <DialogoEstoque dados={estoqueDe} aoFechar={() => setEstoqueDe(null)} />
    </Tabs>
  );
}

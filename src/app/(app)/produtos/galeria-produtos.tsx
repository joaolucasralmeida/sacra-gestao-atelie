"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BlurFade } from "@/components/ui/blur-fade";
import { formatarBRL } from "@/lib/dominio/dinheiro";
import type { ProdutoLinha } from "@/lib/tipos";
import { Button } from "@/components/ui/button";
import { Selo } from "@/components/selo";
import { enviarFoto, removerFoto } from "./acoes-foto";

/**
 * Galeria das fotos dos produtos.
 *
 * Layout em colunas (masonry) em vez de grade: peça de artesanato tem
 * proporção imprevisível — terço é alto, quadro é largo — e a grade obrigaria
 * a cortar ou a deixar buracos. Em coluna, cada foto entra na altura que tem.
 *
 * O BlurFade escalona a entrada em 50ms por item. Numa vitrine de peças
 * religiosas isso vale mais que em um painel comum: dá o tempo de olhar cada
 * peça, em vez de despejar tudo de uma vez.
 */
export function GaleriaProdutos({ produtos }: { produtos: ProdutoLinha[] }) {
  const comFoto = produtos.filter((p) => p.foto_url);
  const semFoto = produtos.filter((p) => !p.foto_url);

  return (
    <div className="space-y-8">
      {produtos.length === 0 ? (
        <p className="border-border bg-card text-muted-foreground rounded-lg border px-4 py-10 text-center text-sm">
          Cadastre produtos para começar a montar a vitrine.
        </p>
      ) : null}

      {comFoto.length > 0 ? (
        <section id="fotos">
          <div className="columns-2 gap-4 sm:columns-3">
            {comFoto.map((produto, indice) => (
              <BlurFade key={produto.id} delay={0.25 + indice * 0.05} inView>
                <CartaoFoto produto={produto} />
              </BlurFade>
            ))}
          </div>
        </section>
      ) : null}

      {semFoto.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-xl">
            Sem foto ainda
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              {semFoto.length} produto{semFoto.length > 1 ? "s" : ""}
            </span>
          </h2>

          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {semFoto.map((produto) => (
              <li
                key={produto.id}
                className="border-border bg-card flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{produto.nome}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatarBRL(produto.preco_venda_centavos)}
                  </p>
                </div>
                <BotaoEnviar produtoId={produto.id} rotulo="Adicionar" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function CartaoFoto({ produto }: { produto: ProdutoLinha }) {
  const [removendo, iniciarRemocao] = useTransition();

  return (
    <figure className="group border-border bg-card mb-4 break-inside-avoid overflow-hidden rounded-lg border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={produto.foto_url!}
        alt={produto.nome}
        loading="lazy"
        className="size-full object-contain"
      />

      <figcaption className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm">{produto.nome}</p>
          <p className="tabular text-sm text-[color:var(--ouro)]">
            {formatarBRL(produto.preco_venda_centavos)}
          </p>
          {produto.abaixo_minimo ? (
            <Selo tom="alerta" className="mt-1">
              Produzir
            </Selo>
          ) : null}
        </div>

        {/* Some no desktop até o cursor chegar; no celular fica sempre
            visível, porque não existe hover para revelar. */}
        <div className="flex shrink-0 gap-1 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <BotaoEnviar produtoId={produto.id} rotulo="Trocar" apenasIcone />
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remover foto de ${produto.nome}`}
            disabled={removendo}
            onClick={() =>
              iniciarRemocao(async () => {
                const r = await removerFoto(produto.id);
                if (r.erro) toast.error(r.erro);
                else toast.success("Foto removida.");
              })
            }
          >
            <Trash2 className="size-4" strokeWidth={1.75} />
          </Button>
        </div>
      </figcaption>
    </figure>
  );
}

function BotaoEnviar({
  produtoId,
  rotulo,
  apenasIcone,
}: {
  produtoId: string;
  rotulo: string;
  apenasIcone?: boolean;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, iniciar] = useTransition();
  const [chave, setChave] = useState(0);

  function aoEscolher(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    const dados = new FormData();
    dados.set("produto_id", produtoId);
    dados.set("foto", arquivo);

    iniciar(async () => {
      const resultado = await enviarFoto({}, dados);
      if (resultado.erro) toast.error(resultado.erro);
      else toast.success("Foto enviada.");
      // Remonta o input para o mesmo arquivo poder ser escolhido de novo.
      setChave((k) => k + 1);
    });
  }

  return (
    <>
      <input
        key={chave}
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={aoEscolher}
      />

      <Button
        variant={apenasIcone ? "ghost" : "outline"}
        size={apenasIcone ? "icon" : "sm"}
        disabled={enviando}
        aria-label={`${rotulo} foto`}
        onClick={() => entrada.current?.click()}
      >
        <ImagePlus className="size-4" strokeWidth={1.75} />
        {apenasIcone ? null : enviando ? "Enviando…" : rotulo}
      </Button>
    </>
  );
}

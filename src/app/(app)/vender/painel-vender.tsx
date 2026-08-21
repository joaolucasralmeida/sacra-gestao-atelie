"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, Trash2, X } from "lucide-react";
import { formatarBRL, parseParaCentavos } from "@/lib/dominio/dinheiro";
import { gerarParcelas } from "@/lib/dominio/parcelamento";
import { hojeNaLoja } from "@/lib/dominio/parcelas";
import type { Evento, FormaPagamento } from "@/lib/tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Selo } from "@/components/selo";
import { DialogoCliente } from "@/app/(app)/clientes/dialogo-cliente";
import { criarEvento, registrarVenda } from "./acoes";

export type ItemVendavel = {
  tipo: "produto" | "kit";
  id: string;
  nome: string;
  busca: string;
  precoCentavos: number;
  estoque: number;
};

type ItemCarrinho = ItemVendavel & { quantidade: number };

type ClienteResumo = { id: string; nome: string; whatsapp: string | null };

export function PainelVender({
  itens,
  formas,
  eventos,
  clientes,
}: {
  itens: ItemVendavel[];
  formas: FormaPagamento[];
  eventos: Evento[];
  clientes: ClienteResumo[];
}) {
  const router = useRouter();
  const [enviando, iniciarEnvio] = useTransition();
  const campoBusca = useRef<HTMLInputElement>(null);

  const [eventoId, setEventoId] = useState("");
  const [criandoEvento, setCriandoEvento] = useState(false);

  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [formaId, setFormaId] = useState(formas[0]?.id ?? "");
  const [desconto, setDesconto] = useState("");

  const [parcelado, setParcelado] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [novoCliente, setNovoCliente] = useState(false);
  const [qtdParcelas, setQtdParcelas] = useState(2);
  const [primeiroVenc, setPrimeiroVenc] = useState(hojeNaLoja());

  // Contador da sessão: dá a sensação de progresso quando ela está
  // despejando 25 vendas do fim de semana.
  const [lancadas, setLancadas] = useState({ quantidade: 0, totalCentavos: 0 });

  const sugestoes = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];
    return itens.filter((i) => i.busca.includes(termo)).slice(0, 6);
  }, [busca, itens]);

  const subtotal = carrinho.reduce(
    (soma, item) => soma + item.precoCentavos * item.quantidade,
    0,
  );
  const descontoCentavos = parseParaCentavos(desconto || "0") ?? 0;
  const total = Math.max(0, subtotal - descontoCentavos);

  const parcelas = useMemo(() => {
    if (!parcelado || total <= 0) return [];
    try {
      return gerarParcelas(total, qtdParcelas, primeiroVenc);
    } catch {
      return [];
    }
  }, [parcelado, total, qtdParcelas, primeiroVenc]);

  function adicionar(item: ItemVendavel) {
    setCarrinho((atual) => {
      const existente = atual.find(
        (i) => i.id === item.id && i.tipo === item.tipo,
      );
      if (existente) {
        return atual.map((i) =>
          i.id === item.id && i.tipo === item.tipo
            ? { ...i, quantidade: i.quantidade + 1 }
            : i,
        );
      }
      return [...atual, { ...item, quantidade: 1 }];
    });
    setBusca("");
    campoBusca.current?.focus();
  }

  function limpar() {
    setCarrinho([]);
    setDesconto("");
    setBusca("");
    setParcelado(false);
    setClienteId("");
    setQtdParcelas(2);
    campoBusca.current?.focus();
  }

  function lancar() {
    if (carrinho.length === 0) {
      toast.error("Adicione ao menos um item.");
      return;
    }

    iniciarEnvio(async () => {
      const resultado = await registrarVenda({
        cliente_id: clienteId || null,
        evento_id: eventoId || null,
        forma_pagamento_id: formaId || null,
        desconto_centavos: descontoCentavos,
        itens: carrinho.map((i) =>
          i.tipo === "produto"
            ? { produto_id: i.id, quantidade: i.quantidade }
            : { kit_id: i.id, quantidade: i.quantidade },
        ),
        parcelas: parcelas.map((p) => ({
          numero: p.numero,
          valor_centavos: p.valorCentavos,
          vencimento: p.vencimento,
        })),
      });

      if (resultado.erro) {
        toast.error(resultado.erro);
        return;
      }

      const negativou = carrinho.some((i) => i.quantidade > i.estoque);

      setLancadas((atual) => ({
        quantidade: atual.quantidade + 1,
        totalCentavos: atual.totalCentavos + total,
      }));

      toast.success(`Venda de ${formatarBRL(total)} registrada.`, {
        description: negativou
          ? "Atenção: o estoque de algum item ficou negativo. Registre a produção que faltou."
          : undefined,
      });

      limpar();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <section className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="evento">Evento</Label>
          <select
            id="evento"
            value={eventoId}
            onChange={(e) => setEventoId(e.target.value)}
            className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">
              Sem evento (WhatsApp, Instagram, encomenda)
            </option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.nome}
                {ev.local ? ` — ${ev.local}` : ""}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">
            Escolha uma vez e lance todas as vendas daquele fim de semana.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setCriandoEvento(true)}
        >
          <Plus className="size-4" /> Novo evento
        </Button>

        {lancadas.quantidade > 0 ? (
          <div className="rounded-md border border-[color:var(--ouro-escuro)] px-3 py-2 text-center">
            <p className="tabular text-lg text-[color:var(--ouro)]">
              {formatarBRL(lancadas.totalCentavos)}
            </p>
            <p className="text-muted-foreground text-xs">
              {lancadas.quantidade} venda{lancadas.quantidade > 1 ? "s" : ""}{" "}
              nesta sessão
            </p>
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <section className="border-border bg-card space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="busca">Produto ou kit</Label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="busca"
                ref={campoBusca}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  // Enter adiciona o primeiro resultado: digitar duas letras
                  // e apertar Enter é o gesto mais rápido possível.
                  if (e.key === "Enter" && sugestoes[0]) {
                    e.preventDefault();
                    adicionar(sugestoes[0]);
                  }
                }}
                placeholder="Digite duas letras e aperte Enter"
                className="pl-9"
                autoFocus
              />
            </div>

            {sugestoes.length > 0 ? (
              <ul className="divide-border/60 border-border divide-y rounded-md border">
                {sugestoes.map((item) => (
                  <li key={`${item.tipo}-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => adicionar(item)}
                      className="hover:bg-accent flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {item.nome}
                        {item.tipo === "kit" ? (
                          <Selo tom="ouro" className="ml-2">
                            Kit
                          </Selo>
                        ) : null}
                      </span>
                      <span className="tabular text-muted-foreground shrink-0">
                        {formatarBRL(item.precoCentavos)} · {item.estoque} em
                        estoque
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {carrinho.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Nada nesta venda ainda.
            </p>
          ) : (
            <ul className="divide-border/60 divide-y">
              {carrinho.map((item) => {
                const semEstoque = item.quantidade > item.estoque;

                return (
                  <li
                    key={`${item.tipo}-${item.id}`}
                    className="flex items-center gap-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{item.nome}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatarBRL(item.precoCentavos)} cada
                      </p>
                      {semEstoque ? (
                        <Selo tom="alerta" className="mt-1">
                          Estoque tem só {item.estoque}
                        </Selo>
                      ) : null}
                    </div>

                    <Input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      aria-label={`Quantidade de ${item.nome}`}
                      onChange={(e) =>
                        setCarrinho((atual) =>
                          atual.map((i) =>
                            i.id === item.id && i.tipo === item.tipo
                              ? {
                                  ...i,
                                  quantidade: Math.max(
                                    1,
                                    Number(e.target.value),
                                  ),
                                }
                              : i,
                          ),
                        )
                      }
                      className="tabular w-20 text-center"
                    />

                    <span className="tabular w-24 text-right text-sm">
                      {formatarBRL(item.precoCentavos * item.quantidade)}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Tirar ${item.nome} da venda`}
                      onClick={() =>
                        setCarrinho((atual) =>
                          atual.filter(
                            (i) => !(i.id === item.id && i.tipo === item.tipo),
                          ),
                        )
                      }
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="border-border bg-card space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label>Forma de pagamento</Label>
            <div className="flex flex-wrap gap-1.5">
              {formas.map((forma) => (
                <button
                  key={forma.id}
                  type="button"
                  onClick={() => setFormaId(forma.id)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    formaId === forma.id
                      ? "border-[color:var(--ouro)] bg-[color:var(--alerta-fraco)] text-[color:var(--ouro)]"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {forma.nome}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desconto">Desconto</Label>
            <Input
              id="desconto"
              inputMode="decimal"
              placeholder="0,00"
              value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
            />
          </div>

          <hr className="fio-ouro" />

          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular">{formatarBRL(subtotal)}</dd>
            </div>
            {descontoCentavos > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Desconto</dt>
                <dd className="tabular">− {formatarBRL(descontoCentavos)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between text-lg">
              <dt>Total</dt>
              <dd className="tabular text-[color:var(--ouro)]">
                {formatarBRL(total)}
              </dd>
            </div>
          </dl>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={parcelado}
              onChange={(e) => setParcelado(e.target.checked)}
              className="size-4 accent-[color:var(--ouro)]"
            />
            Parcelar esta venda
          </label>

          {/*
            O parcelamento só aparece quando pedido. São 5% das vendas —
            deixá-lo sempre visível atrasaria os outros 95%.
          */}
          {parcelado ? (
            <div className="border-border bg-background space-y-3 rounded-md border p-3">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente</Label>
                <div className="flex gap-2">
                  <select
                    id="cliente"
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="border-input h-9 min-w-0 flex-1 rounded-md border bg-transparent px-2 text-sm"
                  >
                    <option value="">Escolha…</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Cadastrar cliente"
                    onClick={() => setNovoCliente(true)}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="qtd_parcelas">Parcelas</Label>
                  <Input
                    id="qtd_parcelas"
                    type="number"
                    min={2}
                    max={24}
                    value={qtdParcelas}
                    onChange={(e) =>
                      setQtdParcelas(Math.max(2, Number(e.target.value)))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primeiro_venc">1ª vence em</Label>
                  <Input
                    id="primeiro_venc"
                    type="date"
                    value={primeiroVenc}
                    onChange={(e) => setPrimeiroVenc(e.target.value)}
                  />
                </div>
              </div>

              {parcelas.length > 0 ? (
                <ul className="text-muted-foreground space-y-0.5 text-xs">
                  {parcelas.map((p) => (
                    <li key={p.numero} className="flex justify-between">
                      <span>
                        {p.numero}ª —{" "}
                        {new Date(
                          `${p.vencimento}T12:00:00`,
                        ).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="tabular">
                        {formatarBRL(p.valorCentavos)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={limpar}
              disabled={enviando}
              aria-label="Limpar venda"
            >
              <X className="size-4" />
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={lancar}
              disabled={enviando || carrinho.length === 0}
            >
              {enviando ? "Registrando…" : "Registrar venda"}
            </Button>
          </div>
        </aside>
      </div>

      <DialogoNovoEvento
        aberto={criandoEvento}
        aoFechar={() => setCriandoEvento(false)}
        aoCriar={(id) => {
          setEventoId(id);
          router.refresh();
        }}
      />

      <DialogoCliente
        aberto={novoCliente}
        cliente={null}
        aoFechar={() => setNovoCliente(false)}
        aoSalvar={(id) => {
          setClienteId(id);
          router.refresh();
        }}
      />
    </div>
  );
}

function DialogoNovoEvento({
  aberto,
  aoFechar,
  aoCriar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoCriar: (id: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [local, setLocal] = useState("");
  const [data, setData] = useState(hojeNaLoja());
  const [salvando, iniciar] = useTransition();

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="border-border bg-card w-full max-w-sm space-y-4 rounded-lg border p-5">
        <h2 className="font-heading text-2xl">Novo evento</h2>
        <p className="text-muted-foreground text-sm">
          Depois dá para ver quanto rendeu cada festa.
        </p>

        <div className="space-y-2">
          <Label htmlFor="ev_nome">Nome</Label>
          <Input
            id="ev_nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Festa de São Sebastião"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ev_local">Local</Label>
          <Input
            id="ev_local"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Paróquia, Cachoeiro"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ev_data">Data</Label>
          <Input
            id="ev_data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            disabled={salvando}
            onClick={() =>
              iniciar(async () => {
                const resultado = await criarEvento(nome, local, data);
                if (resultado.erro) {
                  toast.error(resultado.erro);
                  return;
                }
                toast.success("Evento criado.");
                if (resultado.eventoId) aoCriar(resultado.eventoId);
                setNome("");
                setLocal("");
                aoFechar();
              })
            }
          >
            {salvando ? "Salvando…" : "Criar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

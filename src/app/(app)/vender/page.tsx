import { criarClienteServidor, usuarioAtual } from "@/lib/supabase/server";
import type { Evento, FormaPagamento } from "@/lib/tipos";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PainelVender, type ItemVendavel } from "./painel-vender";
import { HistoricoVendas, type VendaLinha } from "./historico-vendas";

export default async function PaginaVender() {
  const supabase = await criarClienteServidor();
  const usuario = await usuarioAtual();
  const eDona = usuario?.papel === "dona";

  const [{ data: formas }, { data: eventos }] = await Promise.all([
    supabase
      .from("formas_pagamento")
      .select("*")
      .eq("ativo", true)
      .order("ordem"),
    supabase
      .from("eventos")
      .select("id, nome, local, data_inicio, data_fim")
      .order("data_inicio", { ascending: false }),
  ]);

  let vendaveis: ItemVendavel[] = [];

  if (eDona) {
    const [{ data: produtos }, { data: kits }] = await Promise.all([
      supabase
        .from("vw_produtos")
        .select("id, nome, sku, preco_venda_centavos, estoque")
        .eq("ativo", true)
        .order("nome"),
      supabase
        .from("vw_kits")
        .select("id, nome, preco_centavos, estoque")
        .eq("ativo", true)
        .order("nome"),
    ]);

    vendaveis = [
      ...(produtos ?? []).map((p) => ({
        tipo: "produto" as const,
        id: p.id,
        nome: p.nome,
        busca: `${p.nome} ${p.sku ?? ""}`.toLowerCase(),
        precoCentavos: p.preco_venda_centavos,
        estoque: p.estoque,
      })),
      ...(kits ?? []).map((k) => ({
        tipo: "kit" as const,
        id: k.id,
        nome: k.nome,
        busca: k.nome.toLowerCase(),
        precoCentavos: k.preco_centavos,
        estoque: k.estoque,
      })),
    ];
  } else {
    // `vw_produtos` e `vw_kits` carregam custo e margem, e o RLS as fecha para
    // o vendedor — consultá-las aqui devolveria lista vazia, sem dizer por quê.
    // As duas views de catálogo mostram o mesmo acervo sem os números que ele
    // não deve ver.
    const [{ data: catalogo }, { data: catalogoKits }] = await Promise.all([
      supabase
        .from("vw_catalogo")
        .select("id, nome, sku, preco_venda_centavos, estoque")
        .eq("ativo", true)
        .order("nome"),
      supabase
        .from("vw_catalogo_kits")
        .select("id, nome, preco_centavos, estoque")
        .eq("ativo", true)
        .order("nome"),
    ]);

    vendaveis = [
      ...(catalogo ?? []).map((p) => ({
        tipo: "produto" as const,
        id: p.id,
        nome: p.nome,
        busca: `${p.nome} ${p.sku ?? ""}`.toLowerCase(),
        precoCentavos: p.preco_venda_centavos,
        estoque: p.estoque,
      })),
      ...(catalogoKits ?? []).map((k) => ({
        tipo: "kit" as const,
        id: k.id,
        nome: k.nome,
        busca: k.nome.toLowerCase(),
        precoCentavos: k.preco_centavos,
        estoque: k.estoque,
      })),
    ];
  }

  // Sem `clientes` o painel não oferece parcelamento — que é o certo, já que
  // o vendedor não tem leitura da tabela nem das parcelas.
  const { data: clientes } = eDona
    ? await supabase.from("clientes").select("id, nome, whatsapp").order("nome")
    : { data: [] };

  const painel = (
    <>
      <p className="text-muted-foreground text-sm">
        Escolha o evento uma vez e vá lançando. Cada venda entra e o campo já
        fica pronto para a próxima.
      </p>
      <PainelVender
        itens={vendaveis}
        formas={(formas ?? []) as FormaPagamento[]}
        eventos={(eventos ?? []) as Evento[]}
        clientes={clientes ?? []}
      />
    </>
  );

  // O histórico lê `vw_vendas`, fechada para o vendedor. Em vez de uma aba
  // que abre vazia, ele não vê aba nenhuma.
  if (!eDona) {
    return <div className="space-y-4">{painel}</div>;
  }

  // As 100 últimas: o histórico existe para achar a venda lançada errada há
  // pouco, não para servir de relatório — isso é a Fase 2.
  const { data: vendas } = await supabase
    .from("vw_vendas")
    .select("*")
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(100);

  return (
    <Tabs defaultValue="lancar" className="space-y-4">
      <TabsList variant="line">
        <TabsTrigger value="lancar">Lançar</TabsTrigger>
        <TabsTrigger value="historico">Histórico</TabsTrigger>
      </TabsList>

      <TabsContent value="lancar" className="space-y-4">
        {painel}
      </TabsContent>

      <TabsContent value="historico" className="space-y-4">
        <p className="text-muted-foreground text-sm">
          As últimas vendas. Cancelar devolve o estoque e desfaz as parcelas.
        </p>
        <HistoricoVendas vendas={(vendas ?? []) as VendaLinha[]} />
      </TabsContent>
    </Tabs>
  );
}

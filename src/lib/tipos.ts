/**
 * Formato das linhas que vêm do banco.
 *
 * Escrito à mão porque gerar tipos exige a CLI do Supabase, que não está
 * disponível nesta máquina. Quando ela entrar, isto vira `supabase gen
 * types` e some.
 */

export type Papel = "dona" | "vendedor";

export type Categoria = { id: string; nome: string };

export type ProdutoLinha = {
  id: string;
  nome: string;
  sku: string | null;
  categoria_id: string | null;
  descricao: string | null;
  unidade: string;
  custo_material_centavos: number;
  custo_mao_obra_centavos: number;
  preco_venda_centavos: number;
  estoque_minimo: number;
  foto_url: string | null;
  observacoes: string | null;
  ativo: boolean;
  criado_em: string;
  custo_total_centavos: number;
  lucro_centavos: number;
  margem: number;
  estoque: number;
  abaixo_minimo: boolean;
  estoque_negativo: boolean;
};

export type MovimentoLinha = {
  id: string;
  delta: number;
  origem:
    | "producao"
    | "compra"
    | "venda"
    | "montagem"
    | "desmontagem"
    | "ajuste"
    | "devolucao"
    | "cancelamento";
  motivo: string | null;
  criado_em: string;
};

export const ROTULO_ORIGEM: Record<MovimentoLinha["origem"], string> = {
  producao: "Produção",
  compra: "Compra",
  venda: "Venda",
  montagem: "Montagem de kit",
  desmontagem: "Desmontagem de kit",
  ajuste: "Ajuste manual",
  devolucao: "Devolução",
  cancelamento: "Cancelamento de venda",
};

export type FormaPagamento = {
  id: string;
  nome: string;
  ativo: boolean;
  ordem: number;
};

export type Evento = {
  id: string;
  nome: string;
  local: string | null;
  data_inicio: string;
  data_fim: string | null;
};

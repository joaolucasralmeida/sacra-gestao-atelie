-- Sacra Studio — visões derivadas
--
-- Tudo que pode ser calculado é calculado. Estoque, situação de parcela e
-- montabilidade de kit nunca são gravados: campo derivado gravado é campo
-- que um dia diverge da realidade e ninguém percebe.

-- ---------------------------------------------------------------------------
-- Estoque = soma dos movimentos
-- ---------------------------------------------------------------------------

create view estoque_produtos as
select
  p.id as produto_id,
  coalesce(sum(m.delta), 0)::integer as quantidade
from produtos p
left join estoque_movimentos m on m.produto_id = p.id
group by p.id;

create view estoque_kits as
select
  k.id as kit_id,
  coalesce(sum(m.delta), 0)::integer as quantidade
from kits k
left join estoque_movimentos m on m.kit_id = k.id
group by k.id;

-- ---------------------------------------------------------------------------
-- Produtos
-- ---------------------------------------------------------------------------

create view vw_produtos as
select
  p.*,
  (p.custo_material_centavos + p.custo_mao_obra_centavos) as custo_total_centavos,
  (p.preco_venda_centavos - p.custo_material_centavos - p.custo_mao_obra_centavos)
    as lucro_centavos,
  case
    when p.preco_venda_centavos > 0
    then (p.preco_venda_centavos - p.custo_material_centavos - p.custo_mao_obra_centavos)::numeric
         / p.preco_venda_centavos
    else 0
  end as margem,
  e.quantidade as estoque,
  (e.quantidade <= p.estoque_minimo) as abaixo_minimo,
  (e.quantidade < 0) as estoque_negativo
from produtos p
join estoque_produtos e on e.produto_id = p.id;

comment on view vw_produtos is
  'Margem = lucro / preço de venda (não markup), conforme definido na spec.';

-- Catálogo sem custo nem margem: é o que o papel `vendedor` enxerga.
-- A tabela `produtos` fica fechada para ele por RLS; esta view é a porta.
create view vw_catalogo
with (security_invoker = false) as
select
  p.id,
  p.nome,
  p.sku,
  p.categoria_id,
  p.descricao,
  p.unidade,
  p.preco_venda_centavos,
  p.foto_url,
  p.ativo,
  e.quantidade as estoque
from produtos p
join estoque_produtos e on e.produto_id = p.id;

-- ---------------------------------------------------------------------------
-- Kits
-- ---------------------------------------------------------------------------

create view vw_kit_custos as
select
  k.id as kit_id,
  coalesce(sum(
    (p.custo_material_centavos + p.custo_mao_obra_centavos) * ki.quantidade
  ), 0)::bigint as custo_centavos,
  coalesce(sum(p.preco_venda_centavos * ki.quantidade), 0)::bigint
    as preco_somado_centavos
from kits k
left join kit_itens ki on ki.kit_id = k.id
left join produtos p on p.id = ki.produto_id
group by k.id;

-- Quantos kits ainda dá para montar, e quem está travando.
--
-- Saber *qual* item limita é metade do valor: "dá para montar 5" manda ela
-- conferir o estoque inteiro; "a cruz limita em 5" manda ela fazer cruzes.
create view vw_kits_montaveis as
with possiveis as (
  select
    ki.kit_id,
    ki.produto_id,
    p.nome as produto_nome,
    greatest(floor(e.quantidade::numeric / ki.quantidade)::integer, 0) as possiveis
  from kit_itens ki
  join produtos p on p.id = ki.produto_id
  join estoque_produtos e on e.produto_id = ki.produto_id
),
minimos as (
  select
    kit_id,
    min(possiveis) as maximo
  from possiveis
  group by kit_id
)
select
  k.id as kit_id,
  coalesce(m.maximo, 0) as maximo,
  lim.produto_id as limitante_produto_id,
  lim.produto_nome as limitante_nome
from kits k
left join minimos m on m.kit_id = k.id
left join lateral (
  select pos.produto_id, pos.produto_nome
  from possiveis pos
  where pos.kit_id = k.id and pos.possiveis = m.maximo
  order by pos.produto_nome
  limit 1
) lim on true;

create view vw_kits as
select
  k.*,
  c.custo_centavos,
  c.preco_somado_centavos,
  greatest(c.preco_somado_centavos - k.preco_centavos, 0) as desconto_centavos,
  (k.preco_centavos - c.custo_centavos) as lucro_centavos,
  case
    when k.preco_centavos > 0
    then (k.preco_centavos - c.custo_centavos)::numeric / k.preco_centavos
    else 0
  end as margem,
  e.quantidade as estoque,
  mo.maximo as montaveis,
  mo.limitante_nome
from kits k
join vw_kit_custos c on c.kit_id = k.id
join estoque_kits e on e.kit_id = k.id
join vw_kits_montaveis mo on mo.kit_id = k.id;

-- ---------------------------------------------------------------------------
-- Contas a receber
-- ---------------------------------------------------------------------------

-- Situação derivada, no fuso da loja. O servidor roda em UTC: sem o fuso,
-- entre 21h e meia-noite de Cachoeiro o sistema marcaria como atrasada uma
-- parcela que vence hoje — justo no horário em que ela lança as vendas.
create view vw_parcelas as
with pago as (
  select parcela_id, coalesce(sum(valor_centavos), 0)::bigint as pago_centavos
  from pagamentos
  group by parcela_id
)
select
  pa.id,
  pa.venda_id,
  pa.numero,
  pa.valor_centavos,
  pa.vencimento,
  v.cliente_id,
  c.nome as cliente_nome,
  c.whatsapp as cliente_whatsapp,
  coalesce(pg.pago_centavos, 0) as pago_centavos,
  greatest(pa.valor_centavos - coalesce(pg.pago_centavos, 0), 0) as restante_centavos,
  (coalesce(pg.pago_centavos, 0) >= pa.valor_centavos) as quitada,
  (
    coalesce(pg.pago_centavos, 0) < pa.valor_centavos
    and pa.vencimento < (now() at time zone 'America/Sao_Paulo')::date
  ) as atrasada,
  case
    when coalesce(pg.pago_centavos, 0) >= pa.valor_centavos then 'paga'
    when coalesce(pg.pago_centavos, 0) > 0 then 'parcial'
    else 'pendente'
  end as situacao,
  (pa.vencimento - (now() at time zone 'America/Sao_Paulo')::date) as dias_ate_vencer
from parcelas pa
join vendas v on v.id = pa.venda_id
left join clientes c on c.id = v.cliente_id
left join pago pg on pg.parcela_id = pa.id
where v.status = 'ativa';

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------

create view vw_clientes_financeiro as
select
  c.id as cliente_id,
  c.nome,
  coalesce(compras.total_comprado, 0)::bigint as total_comprado_centavos,
  coalesce(p.total_parcelado, 0)::bigint as total_parcelado_centavos,
  coalesce(p.total_pago, 0)::bigint as total_pago_centavos,
  coalesce(p.total_pendente, 0)::bigint as total_pendente_centavos,
  coalesce(p.parcelas_total, 0) as parcelas_total,
  coalesce(p.parcelas_pagas, 0) as parcelas_pagas,
  coalesce(p.parcelas_atrasadas, 0) as parcelas_atrasadas,
  coalesce(compras.qtd_compras, 0) as qtd_compras,
  compras.ultima_compra
from clientes c
left join lateral (
  select
    sum(v.total_centavos) as total_comprado,
    count(*) as qtd_compras,
    max(v.data) as ultima_compra
  from vendas v
  where v.cliente_id = c.id and v.status = 'ativa'
) compras on true
left join lateral (
  select
    sum(vp.valor_centavos) as total_parcelado,
    sum(vp.pago_centavos) as total_pago,
    sum(vp.restante_centavos) as total_pendente,
    count(*) as parcelas_total,
    count(*) filter (where vp.quitada) as parcelas_pagas,
    count(*) filter (where vp.atrasada) as parcelas_atrasadas
  from vw_parcelas vp
  where vp.cliente_id = c.id
) p on true;

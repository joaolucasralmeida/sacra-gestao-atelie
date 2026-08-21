-- Histórico de vendas para a tela de lançamento.
--
-- Reúne numa consulta só o que a lista precisa mostrar: o que foi vendido,
-- para quem, em qual evento e quanto já foi recebido. Sem isto seriam
-- quatro consultas encadeadas por linha da tabela.
--
-- `pago_centavos` importa mais do que parece: é ele que decide se cancelar
-- a venda exige confirmação de estorno.

create or replace view vw_vendas
with (security_invoker = true) as
select
  v.id,
  v.data,
  v.total_centavos,
  v.subtotal_centavos,
  v.desconto_centavos,
  v.status,
  v.parcelado,
  v.observacoes,
  v.criado_em,
  v.cancelada_em,
  v.cliente_id,
  c.nome as cliente_nome,
  v.evento_id,
  e.nome as evento_nome,
  fp.nome as forma_pagamento,
  coalesce(itens.quantidade_itens, 0) as quantidade_itens,
  coalesce(itens.resumo, '') as resumo_itens,
  coalesce(pagos.pago_centavos, 0) as pago_centavos
from vendas v
left join clientes c on c.id = v.cliente_id
left join eventos e on e.id = v.evento_id
left join formas_pagamento fp on fp.id = v.forma_pagamento_id
left join lateral (
  select
    sum(vi.quantidade)::integer as quantidade_itens,
    -- "2× Terço de madeira, 1× Kit Devoção" — o suficiente para ela
    -- reconhecer a venda sem precisar abrir.
    string_agg(vi.quantidade || '× ' || vi.nome_snapshot, ', ' order by vi.nome_snapshot) as resumo
  from venda_itens vi
  where vi.venda_id = v.id
) itens on true
left join lateral (
  select coalesce(sum(pg.valor_centavos), 0)::bigint as pago_centavos
  from pagamentos pg
  join parcelas pa on pa.id = pg.parcela_id
  where pa.venda_id = v.id
) pagos on true;

revoke all on vw_vendas from anon;

-- Sacra Studio — operações transacionais
--
-- Registrar uma venda toca quatro tabelas (venda, itens, movimentos de
-- estoque, parcelas). Feito em chamadas separadas pelo cliente, uma queda de
-- conexão no meio deixaria venda sem baixa de estoque — o tipo de
-- inconsistência que só aparece no fechamento do mês. Estas funções são a
-- fronteira transacional: ou tudo acontece, ou nada.
--
-- Todas são SECURITY DEFINER de propósito. `registrar_venda` precisa ler o
-- custo do produto para congelar o snapshot, e o papel `vendedor` não tem
-- (nem deve ter) acesso a essa coluna. A função é a única porta: ela lê o
-- custo, grava, e nunca devolve esse número para quem chamou.

alter table estoque_movimentos alter column usuario_id set default auth.uid();
alter table vendas alter column usuario_id set default auth.uid();
alter table pagamentos alter column usuario_id set default auth.uid();
alter table montagens_kit alter column usuario_id set default auth.uid();

-- ---------------------------------------------------------------------------
-- Venda
-- ---------------------------------------------------------------------------

create or replace function registrar_venda(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venda_id uuid;
  v_item jsonb;
  v_parcela jsonb;
  v_subtotal bigint := 0;
  v_desconto bigint := coalesce((payload ->> 'desconto_centavos')::bigint, 0);
  v_total bigint;
  v_soma_parcelas bigint := 0;
  v_parcelado boolean := jsonb_array_length(coalesce(payload -> 'parcelas', '[]'::jsonb)) > 0;
  v_nome text;
  v_preco bigint;
  v_custo bigint;
  v_qtd integer;
begin
  if auth.uid() is null then
    raise exception 'Sem sessão';
  end if;

  if jsonb_array_length(coalesce(payload -> 'itens', '[]'::jsonb)) = 0 then
    raise exception 'A venda precisa de ao menos um item';
  end if;

  -- Preço e custo vêm SEMPRE do banco, nunca do cliente. Além de impedir
  -- adulteração, garante que o snapshot gravado é o preço que valia agora.
  for v_item in select * from jsonb_array_elements(payload -> 'itens') loop
    v_qtd := (v_item ->> 'quantidade')::integer;
    if v_qtd is null or v_qtd <= 0 then
      raise exception 'Quantidade inválida no item';
    end if;

    -- Primeira passada: só apura o total, para poder validar o desconto
    -- antes de gravar qualquer coisa.
    if nullif(v_item ->> 'produto_id', '') is not null then
      select p.preco_venda_centavos into v_preco
        from produtos p where p.id = (v_item ->> 'produto_id')::uuid;
    else
      select k.preco_centavos into v_preco
        from kits k where k.id = (v_item ->> 'kit_id')::uuid;
    end if;

    if v_preco is null then
      raise exception 'Item inexistente na venda';
    end if;

    v_subtotal := v_subtotal + v_preco * v_qtd;
  end loop;

  v_total := v_subtotal - v_desconto;
  if v_total < 0 then
    raise exception 'Desconto maior que o valor da venda';
  end if;

  insert into vendas (
    cliente_id, evento_id, data, subtotal_centavos, desconto_centavos,
    total_centavos, forma_pagamento_id, parcelado, observacoes
  ) values (
    nullif(payload ->> 'cliente_id', '')::uuid,
    nullif(payload ->> 'evento_id', '')::uuid,
    coalesce((payload ->> 'data')::date, (now() at time zone 'America/Sao_Paulo')::date),
    v_subtotal, v_desconto, v_total,
    nullif(payload ->> 'forma_pagamento_id', '')::uuid,
    v_parcelado,
    nullif(payload ->> 'observacoes', '')
  )
  returning id into v_venda_id;

  for v_item in select * from jsonb_array_elements(payload -> 'itens') loop
    v_qtd := (v_item ->> 'quantidade')::integer;

    if nullif(v_item ->> 'produto_id', '') is not null then
      select p.nome, p.preco_venda_centavos,
             p.custo_material_centavos + p.custo_mao_obra_centavos
        into v_nome, v_preco, v_custo
        from produtos p where p.id = (v_item ->> 'produto_id')::uuid;

      insert into venda_itens (
        venda_id, produto_id, quantidade, nome_snapshot,
        preco_unit_centavos, custo_unit_centavos
      ) values (
        v_venda_id, (v_item ->> 'produto_id')::uuid, v_qtd, v_nome, v_preco, v_custo
      );

      -- Estoque pode ficar negativo, de propósito: se ela esqueceu de
      -- registrar a produção, bloquear o lançamento a impediria de
      -- registrar a verdade num domingo à noite. O alerta aparece depois.
      insert into estoque_movimentos (produto_id, delta, origem, venda_id)
      values ((v_item ->> 'produto_id')::uuid, -v_qtd, 'venda', v_venda_id);
    else
      select k.nome, k.preco_centavos, c.custo_centavos
        into v_nome, v_preco, v_custo
        from kits k
        join vw_kit_custos c on c.kit_id = k.id
       where k.id = (v_item ->> 'kit_id')::uuid;

      if v_nome is null then
        raise exception 'Kit inexistente na venda';
      end if;

      insert into venda_itens (
        venda_id, kit_id, quantidade, nome_snapshot,
        preco_unit_centavos, custo_unit_centavos
      ) values (
        v_venda_id, (v_item ->> 'kit_id')::uuid, v_qtd, v_nome, v_preco, v_custo
      );

      -- Kit baixa o estoque DO KIT, nunca dos componentes: eles já saíram
      -- na montagem. Baixar de novo contaria a mesma peça duas vezes.
      insert into estoque_movimentos (kit_id, delta, origem, venda_id)
      values ((v_item ->> 'kit_id')::uuid, -v_qtd, 'venda', v_venda_id);
    end if;
  end loop;

  if v_parcelado then
    for v_parcela in select * from jsonb_array_elements(payload -> 'parcelas') loop
      v_soma_parcelas := v_soma_parcelas + (v_parcela ->> 'valor_centavos')::bigint;

      insert into parcelas (venda_id, numero, valor_centavos, vencimento)
      values (
        v_venda_id,
        (v_parcela ->> 'numero')::integer,
        (v_parcela ->> 'valor_centavos')::bigint,
        (v_parcela ->> 'vencimento')::date
      );
    end loop;

    -- As parcelas são calculadas no cliente por função testada; aqui é a
    -- rede de segurança. Se a soma não bater com o total, a venda não entra.
    if v_soma_parcelas <> v_total then
      raise exception 'Soma das parcelas (%) difere do total da venda (%)',
        v_soma_parcelas, v_total;
    end if;
  end if;

  return v_venda_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Kits
-- ---------------------------------------------------------------------------

create or replace function montar_kit(
  p_kit_id uuid,
  p_quantidade integer,
  p_tipo text default 'montagem',
  p_observacoes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_montagem_id uuid;
  v_sinal integer;
  v_itens integer;
begin
  if not e_dona() then
    raise exception 'Sem permissão para montar kits';
  end if;
  if p_quantidade <= 0 then
    raise exception 'Quantidade deve ser maior que zero';
  end if;
  if p_tipo not in ('montagem', 'desmontagem') then
    raise exception 'Tipo inválido: %', p_tipo;
  end if;

  select count(*) into v_itens from kit_itens where kit_id = p_kit_id;
  if v_itens = 0 then
    raise exception 'Kit sem receita: cadastre os produtos que o compõem';
  end if;

  -- Montar consome componentes e cria kits; desmontar faz o inverso.
  v_sinal := case when p_tipo = 'montagem' then 1 else -1 end;

  insert into montagens_kit (kit_id, quantidade, tipo, observacoes)
  values (p_kit_id, p_quantidade, p_tipo, p_observacoes)
  returning id into v_montagem_id;

  insert into estoque_movimentos (produto_id, delta, origem, montagem_id)
  select
    ki.produto_id,
    -1 * v_sinal * ki.quantidade * p_quantidade,
    p_tipo,
    v_montagem_id
  from kit_itens ki
  where ki.kit_id = p_kit_id;

  insert into estoque_movimentos (kit_id, delta, origem, montagem_id)
  values (p_kit_id, v_sinal * p_quantidade, p_tipo, v_montagem_id);

  return v_montagem_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Pagamentos
-- ---------------------------------------------------------------------------

create or replace function registrar_pagamento(
  p_parcela_id uuid,
  p_valor_centavos bigint,
  p_data date default null,
  p_forma_pagamento_id uuid default null,
  p_observacoes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pagamento_id uuid;
  v_restante bigint;
begin
  if not e_dona() then
    raise exception 'Sem permissão para registrar pagamentos';
  end if;
  if p_valor_centavos <= 0 then
    raise exception 'Valor do pagamento deve ser maior que zero';
  end if;

  select restante_centavos into v_restante from vw_parcelas where id = p_parcela_id;

  if v_restante is null then
    raise exception 'Parcela não encontrada';
  end if;
  if v_restante = 0 then
    raise exception 'Esta parcela já está quitada';
  end if;

  -- Recusar valor acima do restante pega o erro de digitação (R$ 1.000 no
  -- lugar de R$ 100) na hora, e não três meses depois no relatório.
  if p_valor_centavos > v_restante then
    raise exception 'Valor acima do restante da parcela (restante: %)', v_restante;
  end if;

  insert into pagamentos (
    parcela_id, valor_centavos, data, forma_pagamento_id, observacoes
  ) values (
    p_parcela_id,
    p_valor_centavos,
    coalesce(p_data, (now() at time zone 'America/Sao_Paulo')::date),
    p_forma_pagamento_id,
    p_observacoes
  )
  returning id into v_pagamento_id;

  return v_pagamento_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancelamento
-- ---------------------------------------------------------------------------

create or replace function cancelar_venda(
  p_venda_id uuid,
  p_confirmar_estorno boolean default false,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_pago bigint;
begin
  if not e_dona() then
    raise exception 'Sem permissão para cancelar vendas';
  end if;

  select status into v_status from vendas where id = p_venda_id;

  if v_status is null then
    raise exception 'Venda não encontrada';
  end if;
  if v_status = 'cancelada' then
    raise exception 'Venda já está cancelada';
  end if;

  select coalesce(sum(pg.valor_centavos), 0) into v_pago
  from pagamentos pg
  join parcelas pa on pa.id = pg.parcela_id
  where pa.venda_id = p_venda_id;

  -- Dinheiro já recebido nunca some sem alguém dizer que sabe disso.
  if v_pago > 0 and not p_confirmar_estorno then
    raise exception
      'Esta venda tem % centavos já recebidos. Confirme o estorno para cancelar.',
      v_pago;
  end if;

  -- Devolve ao estoque exatamente o que a venda tirou, item a item.
  insert into estoque_movimentos (produto_id, kit_id, delta, origem, venda_id, motivo)
  select
    m.produto_id,
    m.kit_id,
    -m.delta,
    'cancelamento',
    p_venda_id,
    coalesce(p_motivo, 'Cancelamento da venda')
  from estoque_movimentos m
  where m.venda_id = p_venda_id and m.origem = 'venda';

  -- Estorno entra como lançamento negativo, não como exclusão: o histórico
  -- continua contando que o dinheiro entrou e depois voltou.
  if v_pago > 0 then
    insert into pagamentos (parcela_id, valor_centavos, estorno, observacoes)
    select
      pg.parcela_id,
      -pg.valor_centavos,
      true,
      coalesce(p_motivo, 'Estorno por cancelamento da venda')
    from pagamentos pg
    join parcelas pa on pa.id = pg.parcela_id
    where pa.venda_id = p_venda_id and not pg.estorno;
  end if;

  update vendas
     set status = 'cancelada',
         cancelada_em = now(),
         observacoes = coalesce(observacoes || ' | ', '') || coalesce(p_motivo, 'Cancelada')
   where id = p_venda_id;
end;
$$;

-- Sacra Studio — schema base
--
-- Convenções:
--   * dinheiro é sempre bigint em CENTAVOS, nunca numeric/float;
--   * datas de calendário (vencimento, data da venda) são `date`, sem hora;
--   * carimbos de auditoria são `timestamptz`;
--   * estoque não é coluna: é a soma de `estoque_movimentos`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Usuários e papéis
-- ---------------------------------------------------------------------------

create table perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  papel text not null default 'vendedor' check (papel in ('dona', 'vendedor')),
  criado_em timestamptz not null default now()
);

comment on table perfis is
  'Papel do usuário. `vendedor` nunca enxerga custo, margem ou financeiro.';

-- Lê o papel do usuário logado sem disparar RLS sobre `perfis` — consultar a
-- própria tabela dentro da política dela mesma causaria recursão infinita.
create or replace function papel_atual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select papel from perfis where id = auth.uid();
$$;

create or replace function e_dona()
returns boolean
language sql
stable
as $$
  select coalesce(papel_atual() = 'dona', false);
$$;

-- Todo usuário do Auth ganha um perfil. A primeira conta criada é a dona;
-- as seguintes entram como vendedor e podem ser promovidas manualmente.
create or replace function criar_perfil_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into perfis (id, nome, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    case when (select count(*) from perfis) = 0 then 'dona' else 'vendedor' end
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function criar_perfil_para_novo_usuario();

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------

create table categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  criado_em timestamptz not null default now()
);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sku text unique,
  categoria_id uuid references categorias (id) on delete set null,
  descricao text,
  unidade text not null default 'un',

  -- Custo separado de propósito: ela fabrica, e o tempo dela tem preço.
  -- Na Fase 3 `custo_material_centavos` passa a ser calculado por ficha
  -- técnica; `custo_mao_obra_centavos` continua digitado.
  custo_material_centavos bigint not null default 0 check (custo_material_centavos >= 0),
  custo_mao_obra_centavos bigint not null default 0 check (custo_mao_obra_centavos >= 0),
  preco_venda_centavos bigint not null default 0 check (preco_venda_centavos >= 0),

  estoque_minimo integer not null default 0 check (estoque_minimo >= 0),
  foto_url text,
  observacoes text,
  -- Produto com histórico nunca é excluído: é desativado. Excluir apagaria
  -- o lucro do ano passado junto.
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index produtos_ativo_idx on produtos (ativo);
create index produtos_categoria_idx on produtos (categoria_id);

create table kits (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  preco_centavos bigint not null default 0 check (preco_centavos >= 0),
  foto_url text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- A receita do kit.
create table kit_itens (
  kit_id uuid not null references kits (id) on delete cascade,
  produto_id uuid not null references produtos (id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  primary key (kit_id, produto_id)
);

-- ---------------------------------------------------------------------------
-- Estoque
-- ---------------------------------------------------------------------------

create table montagens_kit (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references kits (id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  tipo text not null check (tipo in ('montagem', 'desmontagem')),
  observacoes text,
  usuario_id uuid references perfis (id),
  criado_em timestamptz not null default now()
);

create table estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references produtos (id) on delete restrict,
  kit_id uuid references kits (id) on delete restrict,

  -- Positivo entra, negativo sai. O estoque atual é a soma.
  delta integer not null check (delta <> 0),

  origem text not null check (
    origem in (
      'producao',     -- ela fabricou
      'compra',       -- comprou pronto de terceiro
      'venda',
      'montagem',     -- consumiu componentes / gerou kits
      'desmontagem',
      'ajuste',       -- correção manual, exige motivo
      'devolucao',
      'cancelamento'
    )
  ),

  venda_id uuid,
  montagem_id uuid references montagens_kit (id) on delete set null,
  motivo text,
  usuario_id uuid references perfis (id),
  criado_em timestamptz not null default now(),

  -- Um movimento é de produto OU de kit, nunca dos dois nem de nenhum.
  constraint movimento_tem_um_alvo check (
    (produto_id is not null) <> (kit_id is not null)
  ),
  -- Ajuste sem motivo é exatamente o que impede responder "por que só
  -- tenho 3?" daqui a três meses.
  constraint ajuste_exige_motivo check (
    origem <> 'ajuste' or (motivo is not null and length(trim(motivo)) > 0)
  )
);

create index movimentos_produto_idx on estoque_movimentos (produto_id);
create index movimentos_kit_idx on estoque_movimentos (kit_id);
create index movimentos_venda_idx on estoque_movimentos (venda_id);
create index movimentos_data_idx on estoque_movimentos (criado_em desc);

-- ---------------------------------------------------------------------------
-- Pessoas e eventos
-- ---------------------------------------------------------------------------

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf_cnpj text,
  telefone text,
  whatsapp text,
  email text,
  endereco text,
  observacoes text,
  criado_em timestamptz not null default now()
);

create index clientes_nome_idx on clientes (lower(nome));

-- Não estava no briefing. Existe para responder "quanto vendi na Festa de
-- São Sebastião" — o relatório que ela mais vai querer ver.
create table eventos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  local text,
  data_inicio date not null,
  data_fim date,
  observacoes text,
  criado_em timestamptz not null default now()
);

create index eventos_data_idx on eventos (data_inicio desc);

create table formas_pagamento (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  ordem integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Vendas
-- ---------------------------------------------------------------------------

create table vendas (
  id uuid primary key default gen_random_uuid(),

  -- Ambos opcionais de propósito. Na barraquinha, quem compra é
  -- desconhecido e não volta; exigir cadastro criaria centenas de
  -- "Cliente Balcão" e faria ela desistir de lançar.
  cliente_id uuid references clientes (id) on delete restrict,
  evento_id uuid references eventos (id) on delete set null,

  data date not null default (now() at time zone 'America/Sao_Paulo')::date,
  subtotal_centavos bigint not null check (subtotal_centavos >= 0),
  desconto_centavos bigint not null default 0 check (desconto_centavos >= 0),
  total_centavos bigint not null check (total_centavos >= 0),
  forma_pagamento_id uuid references formas_pagamento (id),
  parcelado boolean not null default false,
  status text not null default 'ativa' check (status in ('ativa', 'cancelada')),
  observacoes text,
  usuario_id uuid references perfis (id),
  criado_em timestamptz not null default now(),
  cancelada_em timestamptz,

  -- Venda parcelada precisa saber de quem cobrar.
  constraint parcelada_exige_cliente check (not parcelado or cliente_id is not null)
);

create index vendas_data_idx on vendas (data desc);
create index vendas_cliente_idx on vendas (cliente_id);
create index vendas_evento_idx on vendas (evento_id);
create index vendas_status_idx on vendas (status);

alter table estoque_movimentos
  add constraint movimentos_venda_fk
  foreign key (venda_id) references vendas (id) on delete set null;

create table venda_itens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references vendas (id) on delete cascade,
  produto_id uuid references produtos (id) on delete restrict,
  kit_id uuid references kits (id) on delete restrict,
  quantidade integer not null check (quantidade > 0),

  -- Congelados no momento da venda. Mudar o preço do terço amanhã não pode
  -- reescrever o lucro do evento do mês passado — e isso vale para o custo
  -- também, que o briefing esqueceu.
  nome_snapshot text not null,
  preco_unit_centavos bigint not null check (preco_unit_centavos >= 0),
  custo_unit_centavos bigint not null check (custo_unit_centavos >= 0),

  constraint item_tem_um_alvo check (
    (produto_id is not null) <> (kit_id is not null)
  )
);

create index venda_itens_venda_idx on venda_itens (venda_id);
create index venda_itens_produto_idx on venda_itens (produto_id);
create index venda_itens_kit_idx on venda_itens (kit_id);

-- ---------------------------------------------------------------------------
-- Contas a receber
-- ---------------------------------------------------------------------------

create table parcelas (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references vendas (id) on delete cascade,
  numero integer not null check (numero > 0),
  valor_centavos bigint not null check (valor_centavos > 0),
  vencimento date not null,
  criado_em timestamptz not null default now(),
  unique (venda_id, numero)
  -- Sem coluna de situação: "atrasada" é derivado da data. Uma coluna
  -- gravada exigiria um cron para virar o dia, e o dia vira mesmo quando o
  -- cron falha.
);

create index parcelas_vencimento_idx on parcelas (vencimento);

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  parcela_id uuid not null references parcelas (id) on delete cascade,
  valor_centavos bigint not null check (valor_centavos <> 0),
  data date not null default (now() at time zone 'America/Sao_Paulo')::date,
  forma_pagamento_id uuid references formas_pagamento (id),
  -- Estorno entra como valor negativo, nunca como exclusão: dinheiro que
  -- entrou não some sem rastro.
  estorno boolean not null default false,
  observacoes text,
  usuario_id uuid references perfis (id),
  criado_em timestamptz not null default now()
);

create index pagamentos_parcela_idx on pagamentos (parcela_id);
create index pagamentos_data_idx on pagamentos (data desc);

create table configuracoes (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);

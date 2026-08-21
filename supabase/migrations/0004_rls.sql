-- Sacra Studio — Row Level Security
--
-- Regra central: o papel `vendedor` nunca enxerga custo, margem nem
-- financeiro. Isso é garantido no BANCO, não na tela — esconder um número
-- só no React deixa o dado a uma chamada de API de distância.
--
-- Na Fase 1 só existe a dona. A estrutura fica pronta para o dia em que ela
-- quiser dar acesso a alguém, e é barata agora.

-- ---------------------------------------------------------------------------
-- Views: quem respeita RLS e quem não respeita
-- ---------------------------------------------------------------------------
--
-- Uma view no Postgres roda, por padrão, com as permissões do DONO — o que
-- faria toda view furar a RLS da tabela por baixo. As views que expõem custo
-- ou financeiro passam a rodar como QUEM CHAMA, herdando a RLS.

alter view vw_produtos set (security_invoker = true);
alter view vw_kit_custos set (security_invoker = true);
alter view vw_kits set (security_invoker = true);
alter view vw_parcelas set (security_invoker = true);
alter view vw_clientes_financeiro set (security_invoker = true);

-- As demais (estoque_produtos, estoque_kits, vw_catalogo, vw_kits_montaveis)
-- permanecem rodando como dono de propósito: não expõem custo, e são
-- justamente a porta pela qual o vendedor enxerga o catálogo sem tocar na
-- tabela `produtos`.

-- ---------------------------------------------------------------------------
alter table perfis                enable row level security;
alter table categorias            enable row level security;
alter table produtos              enable row level security;
alter table kits                  enable row level security;
alter table kit_itens             enable row level security;
alter table montagens_kit         enable row level security;
alter table estoque_movimentos    enable row level security;
alter table clientes              enable row level security;
alter table eventos               enable row level security;
alter table formas_pagamento      enable row level security;
alter table vendas                enable row level security;
alter table venda_itens           enable row level security;
alter table parcelas              enable row level security;
alter table pagamentos            enable row level security;
alter table configuracoes         enable row level security;

-- ---------------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------------

create policy "ver o próprio perfil"
  on perfis for select
  using (id = auth.uid() or e_dona());

create policy "dona administra perfis"
  on perfis for all
  using (e_dona()) with check (e_dona());

-- ---------------------------------------------------------------------------
-- Domínio da dona
-- ---------------------------------------------------------------------------
--
-- `produtos` fica fechado inclusive para leitura: as colunas de custo vivem
-- nele. O vendedor lê `vw_catalogo`, que não as expõe.

create policy "dona no catálogo"        on categorias         for all using (e_dona()) with check (e_dona());
create policy "dona nos produtos"       on produtos           for all using (e_dona()) with check (e_dona());
create policy "dona nos kits"           on kits               for all using (e_dona()) with check (e_dona());
create policy "dona na receita"         on kit_itens          for all using (e_dona()) with check (e_dona());
create policy "dona nas montagens"      on montagens_kit      for all using (e_dona()) with check (e_dona());
create policy "dona no estoque"         on estoque_movimentos for all using (e_dona()) with check (e_dona());
create policy "dona nos clientes"       on clientes           for all using (e_dona()) with check (e_dona());
create policy "dona nas vendas"         on vendas             for all using (e_dona()) with check (e_dona());
create policy "dona nos itens"          on venda_itens        for all using (e_dona()) with check (e_dona());
create policy "dona nas parcelas"       on parcelas           for all using (e_dona()) with check (e_dona());
create policy "dona nos pagamentos"     on pagamentos         for all using (e_dona()) with check (e_dona());
create policy "dona nas configurações"  on configuracoes      for all using (e_dona()) with check (e_dona());

-- ---------------------------------------------------------------------------
-- O que o vendedor precisa para conseguir vender
-- ---------------------------------------------------------------------------
--
-- Nada de custo aqui: só o necessário para montar uma venda na tela.

create policy "todos leem eventos"
  on eventos for select using (auth.uid() is not null);

create policy "dona administra eventos"
  on eventos for all using (e_dona()) with check (e_dona());

create policy "todos leem formas de pagamento"
  on formas_pagamento for select using (auth.uid() is not null);

create policy "dona administra formas de pagamento"
  on formas_pagamento for all using (e_dona()) with check (e_dona());

-- O vendedor não recebe INSERT direto em `vendas`: ele vende pela função
-- `registrar_venda`, que é SECURITY DEFINER. Assim a gravação continua
-- possível sem abrir a tabela — e sem abrir a coluna de custo junto.

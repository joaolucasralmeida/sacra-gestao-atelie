-- Ajuste pontual de contas — rodar UMA VEZ no SQL Editor do Supabase.
--
-- Contexto: a primeira conta criada foi promovida a `dona` pelo trigger
-- `ao_criar_usuario`, mas era o e-mail errado. Este script remove aquela
-- conta, promove a correta e dispensa a confirmação de e-mail dela.
--
-- Não é uma migration: é uma correção de dados desta instalação. Por isso
-- fica fora de `migrations/`.

-- 1) Remove a conta criada por engano.
--    `perfis.id` referencia `auth.users` com ON DELETE CASCADE, então o
--    perfil sai junto.
delete from auth.users where email = 'outra-conta@exemplo.com';

-- 2) Confirma o e-mail da conta correta, dispensando o link.
update auth.users
   set email_confirmed_at = coalesce(email_confirmed_at, now())
 where email = 'dona@exemplo.com';

-- 3) Promove a conta correta a dona.
update perfis
   set papel = 'dona', nome = 'João Lucas'
 where id = (select id from auth.users where email = 'dona@exemplo.com');

-- 4) Confere o resultado: deve sobrar exatamente uma linha, com papel `dona`.
select u.email, p.nome, p.papel, u.email_confirmed_at is not null as confirmado
  from perfis p
  join auth.users u on u.id = p.id;

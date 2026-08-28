-- Catálogo de kits para o vendedor.
--
-- `vw_kits` carrega custo, lucro e margem, e por isso roda com
-- security_invoker = true: a RLS a fecha para quem não é dona. O resultado é
-- que o vendedor não conseguia vender kit nenhum — a lista dele chegava
-- vazia, sem dizer por quê.
--
-- Esta view é o equivalente de `vw_catalogo` para kits: mesmo catálogo, sem
-- nenhuma coluna de dinheiro que o vendedor não deva ver. Roda como DONO,
-- que é o que permite ler `kits` sem dar acesso à tabela.

create or replace view vw_catalogo_kits
with (security_invoker = false) as
select
  k.id,
  k.nome,
  k.descricao,
  k.preco_centavos,
  k.foto_url,
  k.ativo,
  e.quantidade as estoque
from kits k
join estoque_kits e on e.kit_id = k.id;

-- Rodar como dono significa ignorar a RLS para TODOS os papéis, inclusive
-- `anon` — e a chave publicável, que carrega o papel `anon`, vai no
-- navegador de qualquer visitante. Sem este revoke, nome, preço e estoque
-- de todos os kits ficariam legíveis por quem soubesse montar a URL.
--
-- Mesmo motivo do 0006. Com o banco vazio, esquecer isto não quebra teste
-- nenhum: apareceria depois, com o catálogo cheio, sem ninguém olhando.
revoke all on vw_catalogo_kits from anon;

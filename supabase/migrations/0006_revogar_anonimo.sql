-- Fecha a porta do anônimo nas views que rodam como dono.
--
-- Quatro views (estoque_produtos, estoque_kits, vw_catalogo,
-- vw_kits_montaveis) rodam com as permissões do DONO de propósito: é assim
-- que o papel `vendedor` enxerga o catálogo sem receber acesso à tabela
-- `produtos`, onde moram as colunas de custo.
--
-- O efeito colateral é que elas também ignoram a RLS para o papel `anon` —
-- e `anon` é literalmente qualquer pessoa que abra o site, já que a chave
-- publicável vai no navegador. Sem este revoke, nome, preço e estoque de
-- todos os produtos ficariam legíveis por quem soubesse montar a URL.
--
-- Com as tabelas vazias isso não aparece em teste nenhum. Apareceria
-- depois, com o catálogo cheio, e ninguém estaria olhando.

revoke all on estoque_produtos   from anon;
revoke all on estoque_kits       from anon;
revoke all on vw_catalogo        from anon;
revoke all on vw_kits_montaveis  from anon;

-- As demais views usam security_invoker = true e já herdam a RLS das
-- tabelas; ainda assim, negar explicitamente custa nada e documenta a
-- intenção.
revoke all on vw_produtos            from anon;
revoke all on vw_kits                from anon;
revoke all on vw_kit_custos          from anon;
revoke all on vw_parcelas            from anon;
revoke all on vw_clientes_financeiro from anon;

-- Nenhuma das funções transacionais deve ser chamável sem sessão.
revoke execute on function registrar_venda(jsonb)                               from anon;
revoke execute on function montar_kit(uuid, integer, text, text)                from anon;
revoke execute on function registrar_pagamento(uuid, bigint, date, uuid, text)  from anon;
revoke execute on function cancelar_venda(uuid, boolean, text)                  from anon;

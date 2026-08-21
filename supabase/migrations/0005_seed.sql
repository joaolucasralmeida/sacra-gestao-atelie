-- Sacra Studio — dados iniciais
--
-- Apenas o mínimo para o sistema ser utilizável no primeiro login. Nada de
-- produto ou cliente fictício: dado de mentira em base de produção vira
-- dado de verdade no relatório do mês seguinte.

insert into formas_pagamento (nome, ordem) values
  ('Pix', 1),
  ('Dinheiro', 2),
  ('Cartão', 3),
  ('Transferência', 4),
  ('Boleto', 5)
on conflict (nome) do nothing;

insert into categorias (nome) values
  ('Terços'),
  ('Imagens e estátuas'),
  ('Velas'),
  ('Cruzes e medalhas'),
  ('Kits')
on conflict (nome) do nothing;

insert into configuracoes (chave, valor) values
  (
    'cobranca_whatsapp',
    jsonb_build_object(
      'modelo',
      'Oi {cliente}, tudo bem? Passando para lembrar da parcela {numero} ' ||
      '({valor}), que vence em {vencimento}. Qualquer coisa é só me chamar. 🙏'
    )
  )
on conflict (chave) do nothing;

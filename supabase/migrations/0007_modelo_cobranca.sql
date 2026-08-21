-- Ajusta o modelo da mensagem de cobrança.
--
-- O texto anterior era fixo em "que vence em {vencimento}". Mandado numa
-- parcela atrasada há doze dias, dizia que a conta vence no passado — soa
-- automático, e a pessoa percebe que ninguém olhou antes de cobrar.
--
-- O novo marcador `{quando}` vira "vence em 23/08" ou "venceu em 08/08"
-- conforme a situação real da parcela.

update configuracoes
   set valor = jsonb_build_object(
         'modelo',
         'Oi {cliente}, tudo bem? Passando para lembrar da parcela {numero} ' ||
         '({valor}), que {quando}. Qualquer coisa é só me chamar. 🙏'
       ),
       atualizado_em = now()
 where chave = 'cobranca_whatsapp';

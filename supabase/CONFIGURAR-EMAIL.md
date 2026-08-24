# Configurar o envio de e-mail

## Por que trocar o padrão

O Supabase já envia e-mail sem nenhuma configuração, mas o serviço embutido
existe só para desenvolvimento. Duas limitações o inviabilizam em produção:

- **Poucos envios por hora** — na faixa de dois. Basta a dona errar a senha
  duas vezes seguidas para o sistema travar até a hora seguinte.
- **Só entrega para membros do projeto.** Um e-mail para a cliente, que não
  tem conta no Supabase, é descartado silenciosamente.

Enquanto isso não for resolvido, a proprietária depende do desenvolvedor para
qualquer troca de senha.

## Por que Brevo

Sem domínio próprio, Resend e Amazon SES só entregam para o e-mail do dono da
conta — o mesmo problema de novo. O Brevo valida um **remetente avulso** (um
Gmail, por exemplo) e entrega para qualquer destinatário. O plano gratuito dá
300 e-mails por dia, muito acima do necessário aqui.

Quando o domínio próprio existir, vale migrar para Resend com domínio
verificado: a entrega melhora e o remetente deixa de ser um endereço pessoal.

## Passo a passo

### 1. No Brevo

1. Crie a conta em `brevo.com`.
2. Em **Senders, Domains & Dedicated IPs → Senders**, cadastre o e-mail que
   será o remetente e confirme pelo link que chega nele.
3. Em **SMTP & API → SMTP**, gere uma chave. Ela aparece **uma vez só**.

Anote três coisas: o *login* SMTP (algo como `8xxxxx@smtp-brevo.com`), a chave
gerada e o e-mail do remetente.

### 2. No Supabase

Em **Authentication → Emails → SMTP Settings**, ligue *Enable Custom SMTP*:

| Campo | Valor |
| --- | --- |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | o login SMTP do Brevo |
| Password | a chave gerada |
| Sender email | o remetente verificado |
| Sender name | `Sacra Studio` |

> Confira host e porta na própria tela de SMTP do Brevo antes de salvar — são
> os valores atuais, mas quem manda é o painel dele.

Logo abaixo, em **Rate Limits**, o limite de e-mails por hora ainda vale e
continua baixo por padrão. Suba para algo como 30.

### 3. Templates

Em **Authentication → Emails → Templates**, cole o conteúdo dos arquivos desta
pasta no campo *Message body* de cada tipo:

| Template do Supabase | Arquivo |
| --- | --- |
| Reset Password | `templates/recuperar-senha.html` |
| Magic Link | `templates/link-magico.html` |
| Invite user | `templates/convite.html` |

Assuntos sugeridos, no campo *Subject*:

- Reset Password — `Redefinir sua senha — Sacra Studio`
- Magic Link — `Seu acesso ao Sacra Studio`
- Invite user — `Você foi convidada para o Sacra Studio`

Os demais templates podem ficar no padrão: o sistema não usa confirmação de
cadastro nem troca de e-mail.

### 4. Conferir

Peça uma recuperação de senha para um endereço que **não** seja membro do
projeto Supabase — é justamente o caso que o serviço embutido não atendia. O
e-mail deve chegar em segundos, com o brasão em texto e o botão dourado.

Se não chegar, o Brevo mostra a tentativa e o motivo em **Transactional →
Logs**.

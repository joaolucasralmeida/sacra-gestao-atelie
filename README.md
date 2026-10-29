# Sacra Studio — sistema de gestão

Sistema interno para um ateliê de artigos religiosos em Cachoeiro de
Itapemirim (ES). A proprietária **fabrica** as peças — terços, cruzes,
estátuas, velas — e vende por WhatsApp, Instagram e em barraquinhas nos
eventos da diocese.

O sistema centraliza produção, estoque, kits, vendas e contas a receber.

> **Construído em cerca de uma semana** (20 a 28 ago 2026) com o
> [Claude Code](https://claude.com/claude-code) como par de programação.
> Eu levantei o problema com a cliente, tomei as decisões de produto descritas
> abaixo e revisei cada entrega. O agente escreveu o código e os testes.

---

## O problema real, e por que ele muda o desenho

O briefing original descrevia um painel administrativo comum. Conversando
com o cliente, três fatos mudaram o projeto inteiro:

**Ela fabrica, não revende.** "Custo" não vem de nota fiscal: é material mais
o tempo dela. Por isso o custo é separado em `custo_material` e
`custo_mao_obra` — é o que revela quando uma peça está sendo vendida no
prejuízo do próprio trabalho. E "estoque abaixo do mínimo" significa *hora de
produzir*, não *hora de comprar*.

**O lançamento acontece depois do evento.** Ela chega em casa no domingo com
uma lista de papel e precisa digitar 25 vendas. Um modal por venda levaria 40
minutos e ela desistiria na décima. A tela de vendas é feita para repetição:
duas letras, Enter, próxima.

**A maioria das vendas não tem cliente.** Na barraquinha quem compra é
desconhecido e não volta. Cliente é opcional; obrigá-lo criaria centenas de
"Cliente Balcão".

---

## Decisões técnicas que sustentam o resto

**Dinheiro é sempre inteiro em centavos.** R$ 100 em 3× gera 33,33 / 33,33 /
33,34, com a sobra na última parcela — a soma bate com o total por
construção, não por sorte de arredondamento.

**Estoque é um livro-razão, não uma coluna.** Cada movimento vira uma linha
com origem (`producao`, `venda`, `montagem`, `ajuste`, `cancelamento`…), e o
saldo é a soma. Quando ela pergunta "por que só tenho 3?", o sistema mostra a
história em vez de dar de ombros.

**Situação de parcela é derivada, nunca gravada.** "Atrasada" é uma consulta
com fuso `America/Sao_Paulo`. Uma coluna gravada exigiria um cron para virar
o dia — e o dia vira mesmo quando o cron falha.

**A venda congela nome, preço e custo.** Mudar o preço do terço amanhã não
pode reescrever o lucro do evento do mês passado. Vale para o custo também.

**Kit vendido baixa o estoque do kit, nunca dos componentes.** Eles já saíram
na montagem; baixar de novo contaria a mesma peça duas vezes.

**Estoque negativo é permitido, com alerta.** Se ela esqueceu de registrar a
produção, bloquear o lançamento a impediria de registrar a verdade num
domingo à noite. O sistema avisa e aceita.

**Operações que tocam várias tabelas são funções no Postgres.** Registrar uma
venda mexe em venda, itens, estoque e parcelas. Feito em chamadas separadas,
uma queda de conexão no meio deixaria venda sem baixa de estoque — o tipo de
inconsistência que só aparece no fechamento do mês.

**RLS separa os papéis no banco, não na tela.** O papel `vendedor` não
enxerga custo nem financeiro; a tabela `produtos` fica fechada para ele e o
acesso passa por uma view sem as colunas de custo. Esconder só no React
deixaria o dado a uma chamada de API de distância.

---

## Stack

- **Next.js 16** (App Router, Server Actions) · React 19 · TypeScript
- **Tailwind CSS 4** + shadcn/ui (Base UI)
- **Supabase** — Postgres, Auth, Storage, RLS
- **Vitest** para o núcleo de domínio

---

## Rodando localmente

```bash
npm install
cp .env.local.example .env.local   # preencha com a URL e a chave do Supabase
npm run dev
```

O sistema sobe em `http://localhost:3100`. No Windows há também o atalho
`ABRIR-SISTEMA.bat`, que instala as dependências na primeira vez e abre o
navegador sozinho — ver [COMO-RODAR.md](COMO-RODAR.md).

### Banco

As migrations em `supabase/migrations/` são aplicadas em ordem no SQL Editor
do Supabase. Elas criam schema, views derivadas, funções transacionais,
políticas de RLS e o bucket das fotos.

---

## Testes

```bash
npm run test    # 30 testes do núcleo de domínio
```

Cobrem o que quebra um sistema financeiro em silêncio: arredondamento de
parcelas em valores quebrados, virada do dia no fuso certo, 31/01 + 1 mês
caindo em 28/02, margem sobre preço (e não markup), item limitante do kit e
normalização de telefone para a cobrança.

Há ainda um roteiro de aceitação que roda contra o Postgres de verdade:

```bash
$env:SACRA_EMAIL = "..."; $env:SACRA_SENHA = "..."
node scripts/aceitacao.mjs    # 47 verificações, com limpeza ao final
```

Ele exercita os fluxos completos — venda de kit sem baixar componentes duas
vezes, cancelamento com estorno, pagamento parcial, congelamento de preço — e
confirma que nenhuma tabela ou view responde a quem não está autenticado.

### Outros scripts

| Script | Para quê |
| --- | --- |
| `cenario-teste.mjs` | Popula um cenário realista para conferir as telas |
| `conferir-fotos.mjs` | Acha fotos órfãs no storage (`--remover` limpa) |
| `limpar-teste.mjs` | Remove só o que está marcado como `TESTE-` |
| `limpar-tudo.mjs` | Zera os dados operacionais, preserva configurações |

Todos leem as credenciais de `SACRA_EMAIL` e `SACRA_SENHA` no ambiente.

---

## Estrutura

```
src/
  app/(app)/          telas internas, uma pasta por área
  app/login/          autenticação
  components/         shell, navegação, componentes compartilhados
  lib/dominio/        regras puras e testadas — dinheiro, parcelas, kits
  lib/supabase/       clientes de servidor e navegador
  proxy.ts            protege as rotas internas
supabase/migrations/  schema, views, funções, RLS
```

O diretório `lib/dominio` não importa React nem Supabase de propósito: são
funções puras, e é por isso que dá para testá-las sem subir nada.

---

## Como a IA entrou no processo

- **O briefing virou regras antes de virar código.** As decisões acima (dinheiro
  em centavos, estoque como livro-razão, RLS por papel) foram fechadas em
  conversa e só depois implementadas, para o agente seguir o mesmo modelo em
  todas as telas.
- **Domínio puro e testado.** `lib/dominio` não importa React nem Supabase. Assim
  dá para pedir ao agente uma mudança de regra e conferir pelos testes que nada
  quebrou em silêncio.
- **Aceitação contra o banco real.** O `scripts/aceitacao.mjs` roda 47
  verificações de ponta a ponta, inclusive se um usuário anônimo consegue ler
  alguma tabela.

---

*E-mails e dados de contas foram trocados por valores de exemplo nesta versão
pública.*

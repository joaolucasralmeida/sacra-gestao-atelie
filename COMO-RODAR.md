# Como abrir o Sacra Studio no seu computador

## O que você faz

Dois cliques em **`ABRIR-SISTEMA.bat`**.

Abre uma janela preta com letras — é o motor do sistema, deixe aberta. Alguns
segundos depois o navegador abre sozinho na tela de login.

Entre com o e-mail e a senha da sua conta.

Para desligar, feche a janela preta.

> **Trocar a senha:** dentro do sistema, em *Configurações*. Não é preciso
> saber a senha atual.
>
> **Senha esquecida:** peça um link de recuperação no painel do Supabase, em
> *Authentication → Users*. O link abre o sistema já logado; vá em
> *Configurações* e defina a nova senha.
>
> Nunca guarde a senha neste arquivo — ele vai para o repositório.

---

## Onde ficam as coisas

| O quê | Onde |
|---|---|
| O projeto | `C:\Users\usuario\Documents\sacra-studio` |
| Endereço local | `http://localhost:3100` |
| Banco de dados | Supabase (nuvem), projeto `cscbqkaqployecefdxkl` |
| Migrations do banco | `supabase\migrations\` |
| A spec e o plano | Na pasta `Claude Code`, em `docs\superpowers\specs\` |

A porta **3100** foi escolhida para não brigar com o Portal Duo, que usa a 5174.
Os dois podem ficar abertos ao mesmo tempo.

---

## Por que fora do OneDrive

O projeto mora em `Documents`, e não na pasta do OneDrive, de propósito. A pasta
`node_modules` tem mais de cinquenta mil arquivos; o OneDrive tenta sincronizar
todos eles, o que deixa o build lento, consome banda à toa e chega a corromper
arquivos no meio de uma gravação. Foi exatamente isso que aconteceu com o
repositório git da pasta antiga.

---

## O que esperar

- **Os dados ficam gravados.** Diferente da fase inicial do Portal Duo, aqui
  tudo vai para um banco de verdade e sobrevive a atualizar a página.
- **A tela atualiza sozinha quando eu mexo no código.** Pode deixar aberto
  enquanto trabalhamos.
- **Todas as telas da Fase 1 já existem.** Início, Produtos, Kits, Vender,
  A receber e Clientes estão construídas e ligadas ao banco. Relatórios ficou
  para a Fase 2 e ainda não aparece no menu.
- **O que falta é acabamento.** A logo definitiva ainda não chegou, então o
  brasão que aparece hoje é um marcador de lugar.

---

## Se der errado

| O que aparece | O que fazer |
|---|---|
| "Nao encontrei o Node.js" | Me avise. O Node saiu do lugar e eu reinstalo. |
| "Falta o arquivo .env.local" | Me avise; é a configuração do banco. |
| A janela preta abre e fecha na hora | Me avise e diga o que apareceu escrito. |
| "Port 3100 is already in use" | Já tem outra janela preta aberta. Feche a antiga. |
| O navegador não abre sozinho | Digite `localhost:3100` na barra de endereço. |
| "Invalid API key" ou erro de login | O projeto do Supabase pode ter sido pausado por inatividade. Entre no painel do Supabase e clique em despausar. |
| A página abre em `localhost:3000` e diz que não consegue conectar | O endereço de retorno do login está apontando para a porta errada. Me avise: o ajuste é no painel do Supabase, em *Authentication → URL Configuration*. |

Em qualquer caso: tire um print da janela preta e me mande. O texto de erro dela
diz exatamente o que houve.

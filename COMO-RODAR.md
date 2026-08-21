# Como abrir o Sacra Studio no seu computador

## O que você faz

Dois cliques em **`ABRIR-SISTEMA.bat`**.

Abre uma janela preta com letras — é o motor do sistema, deixe aberta. Alguns
segundos depois o navegador abre sozinho na tela de login.

Entre com:

- **E-mail:** `(removido)`
- **Senha:** `(removido)`

Para desligar, feche a janela preta.

> A senha acima é provisória e foi definida por mim. Troque quando puder, pelo
> painel do Supabase em *Authentication → Users*.

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
- **Nem todas as telas existem ainda.** Produtos está pronto. Kits, Vender,
  A receber, Clientes e Início ainda vão ser construídos — os itens do menu
  já aparecem, mas levam a páginas vazias.

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

Em qualquer caso: tire um print da janela preta e me mande. O texto de erro dela
diz exatamente o que houve.

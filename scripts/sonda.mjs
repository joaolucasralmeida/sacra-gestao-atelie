/**
 * Sonda de segurança e sanidade do schema.
 *
 * Usa a chave publicável SEM sessão — exatamente o que qualquer pessoa que
 * abrir o site consegue fazer. Tudo que responder com dados aqui é dado
 * público, quer a gente queira ou não.
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const alvos = [
  "produtos",
  "clientes",
  "vendas",
  "parcelas",
  "pagamentos",
  "estoque_movimentos",
  "formas_pagamento",
  "eventos",
  "vw_catalogo",
  "vw_catalogo_kits",
  "vw_produtos",
  "vw_parcelas",
  "vw_kits",
  "vw_kits_montaveis",
  "estoque_produtos",
  "estoque_kits",
  "vw_clientes_financeiro",
  "categorias",
  "configuracoes",
  "perfis",
];

console.log("Anônimo (sem login) — o que vaza:\n");

for (const alvo of alvos) {
  const resposta = await fetch(`${URL_BASE}/rest/v1/${alvo}?select=*&limit=3`, {
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` },
  });

  const corpo = await resposta.text();
  let veredito;

  if (!resposta.ok) {
    veredito = `bloqueado (${resposta.status})`;
  } else {
    const linhas = JSON.parse(corpo);
    veredito =
      linhas.length === 0 ? "0 linhas (ok)" : `VAZOU ${linhas.length} linha(s)`;
  }

  console.log(`  ${alvo.padEnd(24)} ${veredito}`);
}

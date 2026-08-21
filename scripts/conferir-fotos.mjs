/**
 * Confere se o bucket de fotos está coerente com o cadastro.
 *
 * O que interessa é achar arquivo órfão: foto que ficou no storage depois de
 * o produto ter sido apagado ou a foto trocada. Órfão não quebra nada, mas
 * consome a cota de 1 GB do plano gratuito em silêncio.
 */
import { entrarComoDona } from "./sessao.mjs";

const { db, usuario } = await entrarComoDona();

const { data: produtos } = await db
  .from("produtos")
  .select("id, nome, foto_url");
const emUso = new Set(
  (produtos ?? [])
    .map((p) => p.foto_url)
    .filter(Boolean)
    .map((url) => url.split("/storage/v1/object/public/produtos/")[1]),
);

// O bucket guarda uma pasta por produto.
const { data: pastas, error } = await db.storage
  .from("produtos")
  .list("", { limit: 1000 });
if (error) {
  console.error("Não consegui ler o bucket:", error.message);
  process.exit(1);
}

const arquivos = [];
for (const pasta of pastas ?? []) {
  const { data: dentro } = await db.storage
    .from("produtos")
    .list(pasta.name, { limit: 1000 });
  for (const arquivo of dentro ?? []) {
    arquivos.push(`${pasta.name}/${arquivo.name}`);
  }
}

const orfaos = arquivos.filter((a) => !emUso.has(a));

console.log(`Produtos com foto no cadastro: ${emUso.size}`);
console.log(`Arquivos no bucket:            ${arquivos.length}`);
console.log(`Órfãos:                        ${orfaos.length}`);

if (orfaos.length > 0) {
  for (const o of orfaos) console.log(`  ${o}`);

  if (process.argv.includes("--remover")) {
    const { error: erroRemocao } = await db.storage
      .from("produtos")
      .remove(orfaos);
    console.log(
      erroRemocao ? `Falhou: ${erroRemocao.message}` : "Órfãos removidos.",
    );
  } else {
    console.log("\nRode com --remover para apagá-los.");
  }
}

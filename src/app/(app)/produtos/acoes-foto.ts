"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type ResultadoFoto = { ok?: true; erro?: string; url?: string };

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const TAMANHO_MAXIMO = 5 * 1024 * 1024;

export async function enviarFoto(
  _anterior: ResultadoFoto,
  formData: FormData,
): Promise<ResultadoFoto> {
  const produtoId = String(formData.get("produto_id") ?? "");
  const arquivo = formData.get("foto");

  if (!produtoId) return { erro: "Produto não informado" };
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Escolha uma imagem" };
  }

  // Validado aqui e também no bucket. A checagem no servidor dá uma
  // mensagem em português; a do bucket é a que vale se alguém chamar a API
  // por fora.
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    return { erro: "Formato não aceito. Use JPG, PNG ou WEBP." };
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    return { erro: "Imagem muito grande. O limite é 5 MB." };
  }

  const supabase = await criarClienteServidor();

  // Guarda a foto atual para apagar depois que a nova estiver no lugar.
  // Sem isso, cada troca deixa um arquivo órfão consumindo a cota de 1 GB
  // do plano gratuito — em silêncio, porque nada na tela indica que ele
  // continua lá.
  const { data: anterior } = await supabase
    .from("produtos")
    .select("foto_url")
    .eq("id", produtoId)
    .maybeSingle();

  // Nome novo a cada envio: sobrescrever o mesmo caminho faria a foto
  // antiga continuar aparecendo por causa do cache do navegador.
  const extensao = arquivo.name.split(".").pop()?.toLowerCase() || "jpg";
  const caminho = `${produtoId}/${Date.now()}.${extensao}`;

  const { error: erroUpload } = await supabase.storage
    .from("produtos")
    .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });

  if (erroUpload) {
    if (erroUpload.message.toLowerCase().includes("bucket not found")) {
      return {
        erro: "O armazenamento de fotos ainda não foi criado. Rode a migration 0008 no Supabase.",
      };
    }
    return { erro: erroUpload.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("produtos").getPublicUrl(caminho);

  const { error: erroBanco } = await supabase
    .from("produtos")
    .update({ foto_url: publicUrl })
    .eq("id", produtoId);

  if (erroBanco) return { erro: erroBanco.message };

  // Só agora: se apagássemos antes e o update falhasse, o produto ficaria
  // apontando para um arquivo que não existe mais.
  const caminhoAnterior = caminhoNaUrl(anterior?.foto_url ?? null);
  if (caminhoAnterior && caminhoAnterior !== caminho) {
    await supabase.storage.from("produtos").remove([caminhoAnterior]);
  }

  revalidatePath("/produtos");
  return { ok: true, url: publicUrl };
}

/**
 * Extrai o caminho dentro do bucket a partir da URL pública.
 *
 * Devolve null quando a URL tem outro formato — nesse caso preferimos
 * deixar um arquivo órfão a arriscar apagar algo que não é nosso.
 */
function caminhoNaUrl(url: string | null): string | null {
  if (!url) return null;

  const marcador = "/storage/v1/object/public/produtos/";
  const posicao = url.indexOf(marcador);
  if (posicao < 0) return null;

  return url.slice(posicao + marcador.length) || null;
}

export async function removerFoto(produtoId: string): Promise<ResultadoFoto> {
  const supabase = await criarClienteServidor();

  const { data: produto } = await supabase
    .from("produtos")
    .select("foto_url")
    .eq("id", produtoId)
    .maybeSingle();

  // Se a URL tiver outro formato, seguimos limpando o cadastro mesmo assim:
  // uma imagem órfã no bucket incomoda menos que um produto preso a uma
  // foto que ninguém consegue tirar.
  const caminho = caminhoNaUrl(produto?.foto_url ?? null);
  if (caminho) {
    await supabase.storage.from("produtos").remove([caminho]);
  }

  const { error } = await supabase
    .from("produtos")
    .update({ foto_url: null })
    .eq("id", produtoId);

  if (error) return { erro: error.message };

  revalidatePath("/produtos");
  return { ok: true };
}

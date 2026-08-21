import { formatarBRL } from "./dinheiro";

/**
 * `{quando}` vira "vence em 23/08" ou "venceu em 08/08" conforme o caso.
 *
 * Um texto fixo com "vence em" mandado numa parcela atrasada há doze dias
 * soa errado e enfraquece a cobrança — a pessoa percebe que é automático e
 * que ninguém olhou.
 */
export const MODELO_PADRAO =
  "Oi {cliente}, tudo bem? Passando para lembrar da parcela {numero} ({valor}), " +
  "que {quando}. Qualquer coisa é só me chamar. 🙏";

/**
 * Monta o link de cobrança no WhatsApp.
 *
 * É a funcionalidade mais valiosa do módulo de contas a receber. São poucos
 * clientes parcelados; o trabalho não é calcular a dívida, é ter coragem de
 * cobrar. Com a mensagem pronta, cobrar vira um clique — sem ela, a cobrança
 * fica para amanhã indefinidamente.
 */
export function linkCobranca(
  whatsapp: string | null,
  dados: {
    cliente: string;
    numero: number;
    valorCentavos: number;
    vencimento: string;
    atrasada?: boolean;
  },
  modelo: string = MODELO_PADRAO,
): string | null {
  const numero = apenasDigitos(whatsapp);
  if (!numero) return null;

  const data = formatarData(dados.vencimento);
  const quando = dados.atrasada ? `venceu em ${data}` : `vence em ${data}`;

  const mensagem = modelo
    .replaceAll("{cliente}", primeiroNome(dados.cliente))
    .replaceAll("{numero}", String(dados.numero))
    .replaceAll("{valor}", formatarBRL(dados.valorCentavos))
    .replaceAll("{quando}", quando)
    // Mantido para modelos antigos, que traziam a data solta.
    .replaceAll("{vencimento}", data);

  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

/**
 * Normaliza o telefone para o formato que o wa.me espera.
 *
 * Ela digita "(28) 99999-0000". O link precisa de "5528999990000". O 55 só é
 * acrescentado quando não está lá — número já com DDI não pode virar
 * "5555...".
 */
function apenasDigitos(telefone: string | null): string | null {
  if (!telefone) return null;

  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10) return null;

  return digitos.startsWith("55") ? digitos : `55${digitos}`;
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

function formatarData(iso: string): string {
  // Meio-dia evita que o fuso empurre a data para o dia anterior.
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");
}

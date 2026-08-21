import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logo oficial da Sacra Studio.
 *
 * Existem duas peças porque elas resolvem problemas diferentes:
 *
 * - `Brasao` é o emblema completo, com o anel de texto ("SACRA STUDIO" e
 *   "A ARTE É UM CAMINHO PARA DEUS"). Esse texto é ilegível abaixo de uns
 *   80px, então ele só aparece onde tem espaço para respirar — hoje, a tela
 *   de login.
 *
 * - `Simbolo` é o recorte do miolo: raios, cruz e coração. É o que vai no
 *   menu e no favicon, onde o nome da loja já está escrito ao lado e repetir
 *   a palavra dentro de um anel de 28px só produziria borrão.
 *
 * Os dois saem do mesmo arquivo enviado pela cliente, sem alterar cor,
 * proporção ou elementos — apenas aparados. O briefing prevê o recorte do
 * símbolo para telas menores.
 */

export function Brasao({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-sacra.png"
      alt="Sacra Studio"
      width={313}
      height={313}
      priority
      className={cn("object-contain", className)}
    />
  );
}

export function Simbolo({ className }: { className?: string }) {
  return (
    <Image
      src="/simbolo-sacra.png"
      alt=""
      aria-hidden
      width={156}
      height={156}
      className={cn("object-contain", className)}
    />
  );
}

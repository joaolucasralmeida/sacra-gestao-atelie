"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ITENS_NAV } from "@/components/navegacao/itens";

/**
 * Cabeçalho com o nome da página atual.
 *
 * O título vem da mesma lista que alimenta o menu — assim não existe a
 * chance de o menu dizer "A receber" e o cabeçalho dizer outra coisa.
 */
export function SiteHeader() {
  const pathname = usePathname();

  const item =
    ITENS_NAV.find((i) => i.href !== "/" && pathname.startsWith(i.href)) ??
    ITENS_NAV[0];

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">{item.rotulo}</h1>
      </div>
    </header>
  );
}

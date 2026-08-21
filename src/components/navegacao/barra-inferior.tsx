"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ITENS_NAV } from "./itens";

/**
 * Barra inferior no celular.
 *
 * Menu lateral fixo não funciona em tela de 375px, e o celular é onde ela
 * consulta preço e estoque. Os quatro destinos frequentes ficam ao alcance
 * do polegar; o resto vai para "Mais".
 */
export function BarraInferior() {
  const pathname = usePathname();
  const principais = ITENS_NAV.filter((item) => item.principal);
  const secundarios = ITENS_NAV.filter((item) => !item.principal);

  const ativo = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="border-sidebar-border bg-sidebar sticky bottom-0 z-40 flex border-t pb-[env(safe-area-inset-bottom)] md:hidden">
      {principais.map(({ href, rotulo, icone: Icone }) => (
        <Link
          key={href}
          href={href}
          aria-current={ativo(href) ? "page" : undefined}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]",
            ativo(href) ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Icone className="size-5" strokeWidth={1.75} />
          {rotulo}
        </Link>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger className="text-muted-foreground flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]">
          <MoreHorizontal className="size-5" strokeWidth={1.75} />
          Mais
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top">
          {secundarios.map(({ href, rotulo, icone: Icone }) => (
            <DropdownMenuItem
              key={href}
              render={<Link href={href} />}
              className="flex items-center gap-2"
            >
              <Icone className="size-4" strokeWidth={1.75} />
              {rotulo}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

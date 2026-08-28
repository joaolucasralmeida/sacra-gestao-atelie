"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Simbolo } from "@/components/marca/brasao";
import {
  INICIO_DO_VENDEDOR,
  itensDoPapel,
  type Papel,
} from "@/components/navegacao/itens";
import { sair } from "@/app/login/actions";

export function AppSidebar({
  usuario,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  usuario: { nome: string; papel: Papel };
}) {
  const pathname = usePathname();

  const itens = itensDoPapel(usuario.papel);

  // A dona começa no painel; o vendedor não tem acesso a ele.
  const inicio = usuario.papel === "dona" ? "/" : INICIO_DO_VENDEDOR;

  const ativo = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[slot=sidebar-menu-button]:!p-1.5"
              render={<Link href={inicio} />}
            >
              <Simbolo className="size-7 shrink-0" />
              <span className="font-heading text-lg tracking-wide">
                Sacra Studio
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {itens.map(({ href, rotulo, icone: Icone }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={ativo(href)}
                    tooltip={rotulo}
                    render={<Link href={href} />}
                  >
                    <Icone strokeWidth={1.75} />
                    <span>{rotulo}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm">{usuario.nome}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {usuario.papel === "dona" ? "Administradora" : "Vendedor"}
                </p>
              </div>

              <form action={sair}>
                <button
                  type="submit"
                  aria-label="Sair do sistema"
                  title="Sair"
                  className="text-muted-foreground hover:bg-sidebar-accent hover:text-foreground rounded-md p-1.5"
                >
                  <LogOut className="size-4" strokeWidth={1.75} />
                </button>
              </form>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

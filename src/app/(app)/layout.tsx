import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { BarraInferior } from "@/components/navegacao/barra-inferior";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  const usuario = await usuarioAtual();

  // O proxy já barra quem não tem sessão; isto é a segunda tranca, para o
  // caso de o matcher deixar passar alguma rota nova.
  if (!usuario) redirect("/login");

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" usuario={usuario} />

      <SidebarInset>
        <SiteHeader />

        <div className="@container/main flex flex-1 flex-col gap-4 p-4 pb-20 md:gap-6 md:p-6 md:pb-6">
          {children}
        </div>

        {/* No celular o menu lateral vira gaveta; a barra inferior mantém os
            quatro destinos frequentes ao alcance do polegar. */}
        <BarraInferior papel={usuario.papel} />
      </SidebarInset>
    </SidebarProvider>
  );
}

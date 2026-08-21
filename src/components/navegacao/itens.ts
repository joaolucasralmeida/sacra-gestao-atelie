import {
  Boxes,
  Gem,
  Home,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ItemNav = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Aparece na barra inferior do celular. */
  principal?: boolean;
};

/**
 * O menu é organizado por TAREFA, não por tabela do banco.
 *
 * O briefing pedia "Estoque" e "Produtos e preços" como áreas separadas —
 * são a mesma entidade vista duas vezes, e ninguém lembraria em qual delas
 * se muda o preço. E escondia a venda dentro de "Contas a receber", como se
 * registrar venda fosse subcaso de cobrança; é a ação mais frequente do
 * sistema e ganhou lugar próprio.
 *
 * "Relatórios" entra na Fase 2, junto com o conteúdo.
 */
export const ITENS_NAV: ItemNav[] = [
  { href: "/", rotulo: "Início", icone: Home, principal: true },
  { href: "/vender", rotulo: "Vender", icone: ShoppingBag, principal: true },
  { href: "/a-receber", rotulo: "A receber", icone: Wallet, principal: true },
  { href: "/produtos", rotulo: "Produtos", icone: Boxes, principal: true },
  { href: "/kits", rotulo: "Kits", icone: Gem },
  { href: "/clientes", rotulo: "Clientes", icone: Users },
  { href: "/configuracoes", rotulo: "Configurações", icone: Settings },
];

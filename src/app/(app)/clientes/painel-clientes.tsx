"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search } from "lucide-react";
import { formatarBRL } from "@/lib/dominio/dinheiro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Selo } from "@/components/selo";
import { DialogoCliente } from "./dialogo-cliente";

export type ClienteLinha = {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  observacoes: string | null;
  criado_em: string;
  total_comprado_centavos: number;
  total_pago_centavos: number;
  total_pendente_centavos: number;
  parcelas_atrasadas: number;
};

export function PainelClientes({ clientes }: { clientes: ClienteLinha[] }) {
  const [busca, setBusca] = useState("");
  const [emEdicao, setEmEdicao] = useState<ClienteLinha | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(termo) ||
        (c.whatsapp ?? "").includes(termo) ||
        (c.telefone ?? "").includes(termo),
    );
  }, [clientes, busca]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou telefone"
            className="pl-9"
            aria-label="Buscar cliente"
          />
        </div>

        <Button onClick={() => setNovoAberto(true)}>
          <Plus className="size-4" /> Novo cliente
        </Button>
      </div>

      {filtrados.length === 0 ? (
        <p className="border-border bg-card text-muted-foreground rounded-lg border px-4 py-10 text-center text-sm">
          {clientes.length === 0
            ? "Nenhum cliente cadastrado. Eles entram quando houver venda parcelada."
            : "Nenhum cliente encontrado."}
        </p>
      ) : (
        <div className="border-border bg-card overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-left text-xs">
                <th className="px-4 py-3 font-normal">Cliente</th>
                <th className="px-4 py-3 text-right font-normal">Comprou</th>
                <th className="px-4 py-3 text-right font-normal">Pagou</th>
                <th className="px-4 py-3 text-right font-normal">Deve</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr
                  key={c.id}
                  className="border-border/60 border-b last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="hover:text-[color:var(--ouro-claro)]"
                    >
                      {c.nome}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {c.whatsapp ? (
                        <span className="text-muted-foreground text-xs">
                          {c.whatsapp}
                        </span>
                      ) : null}
                      {c.parcelas_atrasadas > 0 ? (
                        <Selo tom="perigo">
                          {c.parcelas_atrasadas} parcela
                          {c.parcelas_atrasadas > 1 ? "s" : ""} em atraso
                        </Selo>
                      ) : null}
                    </div>
                  </td>
                  <td className="tabular text-muted-foreground px-4 py-3 text-right">
                    {formatarBRL(c.total_comprado_centavos)}
                  </td>
                  <td className="tabular text-muted-foreground px-4 py-3 text-right">
                    {formatarBRL(c.total_pago_centavos)}
                  </td>
                  <td
                    className={`tabular px-4 py-3 text-right ${
                      c.total_pendente_centavos > 0
                        ? "text-[color:var(--ouro)]"
                        : ""
                    }`}
                  >
                    {formatarBRL(c.total_pendente_centavos)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${c.nome}`}
                      onClick={() => setEmEdicao(c)}
                    >
                      <Pencil className="size-4" strokeWidth={1.75} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DialogoCliente
        aberto={novoAberto || emEdicao !== null}
        cliente={emEdicao}
        aoFechar={() => {
          setNovoAberto(false);
          setEmEdicao(null);
        }}
      />
    </div>
  );
}

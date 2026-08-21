"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarBRL } from "@/lib/dominio/dinheiro";

export type PontoMes = {
  chave: string;
  rotulo: string;
  totalCentavos: number;
};

export function GraficoFaturamento({ dados }: { dados: PontoMes[] }) {
  const vazio = dados.every((d) => d.totalCentavos === 0);

  if (vazio) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        Sem vendas registradas ainda.
      </p>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={dados}
          margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
        >
          <CartesianGrid
            strokeDasharray="2 4"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="rotulo"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={70}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(v: number) => formatarBRL(v).replace(/\s/g, " ")}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)" }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
            formatter={(valor) => [
              formatarBRL(Number(valor ?? 0)),
              "Faturamento",
            ]}
          />
          {/*
            Uma série só, em dourado. O gráfico existe para mostrar a
            temporada de festas — não para virar painel de BI.
          */}
          <Bar
            dataKey="totalCentavos"
            fill="var(--ouro)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

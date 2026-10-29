"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { digitosDe, pad } from "@/data/config";
import type { RifaCliente } from "./tipos";

interface RifaCtx {
  rifa: RifaCliente;
  /** Cantidad de boletos vendidos o apartados (los números no se envían al navegador) */
  vendidos: number;
  setVendidos: (n: number | ((prev: number) => number)) => void;
  /** Formatea un número de boleto con ceros a la izquierda (007) */
  num: (n: number) => string;
}

const Ctx = createContext<RifaCtx | null>(null);

export function RifaProvider({
  rifa,
  vendidosIniciales,
  children,
}: {
  rifa: RifaCliente;
  vendidosIniciales: number;
  children: React.ReactNode;
}) {
  const [vendidos, setVendidos] = useState(vendidosIniciales);
  const valor = useMemo(() => {
    const digitos = digitosDe(rifa);
    return { rifa, vendidos, setVendidos, num: (n: number) => pad(n, digitos) };
  }, [rifa, vendidos]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useRifa() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRifa debe usarse dentro de <RifaProvider>");
  return ctx;
}

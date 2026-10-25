"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { digitosDe, pad } from "@/data/config";
import type { RifaCliente } from "./tipos";

interface RifaCtx {
  rifa: RifaCliente;
  vendidos: Set<number>;
  marcarVendidos: (numeros: number[]) => void;
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
  vendidosIniciales: number[];
  children: React.ReactNode;
}) {
  const [vendidos, setVendidos] = useState(() => new Set(vendidosIniciales));
  const marcarVendidos = useCallback(
    (numeros: number[]) => setVendidos((prev) => new Set([...prev, ...numeros])),
    [],
  );
  const valor = useMemo(() => {
    const digitos = digitosDe(rifa);
    return { rifa, vendidos, marcarVendidos, num: (n: number) => pad(n, digitos) };
  }, [rifa, vendidos, marcarVendidos]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useRifa() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRifa debe usarse dentro de <RifaProvider>");
  return ctx;
}

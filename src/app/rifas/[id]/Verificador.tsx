"use client";

import { useState } from "react";
import { waLink } from "@/data/config";
import { useRifa } from "./RifaContext";
import { Ticket } from "./Ticket";
import type { OrdenPublica } from "./tipos";

type Resultado = { tipo: "cargando" } | { tipo: "error" } | { tipo: "ok"; ordenes: OrdenPublica[] };

export function Verificador() {
  const { rifa } = useRifa();
  const [q, setQ] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const digitos = q.replace(/\D/g, "");
    if (!digitos) return;
    setResultado({ tipo: "cargando" });
    try {
      const res = await fetch(`/api/verificar?rifa=${encodeURIComponent(rifa.id)}&q=${digitos}`);
      const { ordenes } = (await res.json()) as { ordenes: OrdenPublica[] };
      setResultado({ tipo: "ok", ordenes });
    } catch {
      setResultado({ tipo: "error" });
    }
  }

  const aviso = (contenido: React.ReactNode) => (
    <p style={{ color: "var(--muted)", textAlign: "center" }}>{contenido}</p>
  );

  return (
    <section className="section" id="verificador">
      <div className="container verify">
        <h2 className="section-title">
          VERIFICADOR DE <span>BOLETOS</span>
        </h2>
        <p className="section-sub">Ingresa tu número de teléfono o número de boleto</p>
        <form onSubmit={buscar}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            inputMode="numeric"
            placeholder="Teléfono o # de boleto"
            required
          />
          <button className="btn btn-primary">Buscar</button>
        </form>
        <div className="verify-result">
          {resultado?.tipo === "cargando" && aviso("Buscando…")}
          {resultado?.tipo === "error" && aviso("No se pudo consultar. Intenta de nuevo.")}
          {resultado?.tipo === "ok" &&
            (resultado.ordenes.length
              ? resultado.ordenes.map((o) => <Ticket key={o.id} orden={o} />)
              : aviso(
                  <>
                    No encontramos boletos con ese dato. ¿Dudas?{" "}
                    <a href={waLink()} target="_blank" rel="noopener" className="red">
                      Escríbenos
                    </a>
                  </>,
                ))}
        </div>
      </div>
    </section>
  );
}

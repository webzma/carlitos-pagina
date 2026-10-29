"use client";

import { useRifa } from "./RifaContext";
import { ESTADO_TEXTO, type OrdenPublica } from "./tipos";

export function Ticket({ orden }: { orden: OrdenPublica }) {
  const { num } = useRifa();
  return (
    <div className="ticket">
      <div>
        <div style={{ fontWeight: 700 }}>
          {orden.nombre} <small style={{ color: "var(--muted)" }}>· Orden {orden.id}</small>
        </div>
        {orden.numeros ? (
          <div className="nums" style={{ marginTop: 6 }}>
            {orden.numeros.map((n) => (
              <b key={n}>{num(n)}</b>
            ))}
          </div>
        ) : (
          <div className="ticket-note">
            {orden.cantidad} boleto{orden.cantidad === 1 ? "" : "s"} · tus números te llegarán por WhatsApp al aprobarse el pago
          </div>
        )}
      </div>
      <span className={`status ${orden.estado}`}>{ESTADO_TEXTO[orden.estado]}</span>
    </div>
  );
}

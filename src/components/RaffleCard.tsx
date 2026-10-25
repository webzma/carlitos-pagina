import Link from "next/link";
import { IconCalendarEvent, IconTicket, IconTrophy } from "@tabler/icons-react";
import { type Rifa, money, fmtDate } from "@/data/config";
import { IconoPremio } from "./IconoPremio";

export function RaffleCard({ rifa, vendidos }: { rifa: Rifa; vendidos: number }) {
  const activa = rifa.estado === "activa";
  const pct = Math.round((vendidos / rifa.totalBoletos) * 100);

  return (
    <article className="card">
      <div className={`card-img ${rifa.estilo ?? ""}`}>
        <span className={`badge ${activa ? "live" : "done"}`}>{activa ? "En venta" : "Finalizada"}</span>
        <IconoPremio icono={rifa.icono} stroke={1.25} />
      </div>
      <div className="card-body">
        <h3>{rifa.titulo}</h3>
        <p style={{ color: "var(--muted)", fontSize: ".92rem" }}>{rifa.descripcion}</p>
        <div className="meta">
          <span>
            <IconCalendarEvent /> {fmtDate(rifa.fecha)}
          </span>
          <span>
            Boleto: <b>{money(rifa.precio)}</b>
          </span>
        </div>
        {activa ? (
          <>
            <div className="progress">
              <div style={{ width: `${pct}%` }} />
            </div>
            <div className="progress-label">
              <span>Vendidos</span>
              <span>{pct}%</span>
            </div>
            <Link href={`/rifas/${rifa.id}`} className="btn btn-primary btn-block">
              <IconTicket /> Boletos disponibles
            </Link>
          </>
        ) : (
          <>
            {rifa.ganador && (
              <div className="meta">
                <span>
                  <IconTrophy /> Ganador
                </span>
                <b>{rifa.ganador}</b>
              </div>
            )}
            <Link href={`/rifas/${rifa.id}`} className="btn btn-ghost btn-block">
              Ver evento
            </Link>
          </>
        )}
      </div>
    </article>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/auth";
import { conteoVendidos, listarRifas, resumenPorRifa, ESTADOS } from "@/lib/db";
import { money, fmtDate } from "@/data/config";
import { AdminFrame } from "../AdminFrame";
import { ConfirmSubmit } from "../ClientButtons";
import { eliminarRifa } from "./actions";

export const metadata: Metadata = { title: "Rifas", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RifasAdminPage({ searchParams }: { searchParams: SearchParams }) {
  if (!(await esAdmin())) redirect("/admin");
  const sp = await searchParams;
  const msg = typeof sp.msg === "string" ? sp.msg : "";
  const tipo = sp.tipo === "err" ? "err" : "ok";

  const [rifas, vendidos, resumenes] = await Promise.all([listarRifas(), conteoVendidos(), resumenPorRifa()]);

  return (
    <AdminFrame logueado>
      <main className="container admin-main">
        <div className="admin-head">
          <h1>RIFAS</h1>
          <Link className="btn btn-primary" href="/admin/rifas/nueva">
            + Nueva rifa
          </Link>
        </div>

        {msg && <div className={`flash-msg ${tipo}`}>{msg}</div>}

        <div className="table-wrap">
          {rifas.length === 0 ? (
            <p className="empty">Todavía no hay rifas. Crea la primera.</p>
          ) : (
            <table className="orders">
              <thead>
                <tr>
                  <th>Rifa</th>
                  <th>Estado</th>
                  <th>Sorteo</th>
                  <th>Precio</th>
                  <th>Vendidos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rifas.map((r) => {
                  const st = resumenes[r.id];
                  const ordenes = st ? ESTADOS.reduce((n, e) => n + st[e].ordenes, 0) : 0;
                  return (
                    <tr key={r.id}>
                      <td className="who">
                        <b>
                          {r.icono} {r.titulo}
                        </b>
                        <small>{r.descripcion}</small>
                        <Link className="link" href={`/rifas/${r.id}`} target="_blank">
                          /rifas/{r.id} ↗
                        </Link>
                      </td>
                      <td>
                        <span className={`status ${r.estado === "activa" ? "aprobado" : "rechazado"}`}>
                          {r.estado === "activa" ? "Activa" : "Finalizada"}
                        </span>
                        {r.ganador && <span className="muted">🏆 {r.ganador}</span>}
                      </td>
                      <td>
                        {fmtDate(r.fecha)}
                        <span className="muted">{r.loteria}</span>
                      </td>
                      <td>
                        <b>{money(r.precio)}</b>
                      </td>
                      <td>
                        {vendidos[r.id] ?? 0} / {r.totalBoletos}
                        <span className="muted">{ordenes} orden(es)</span>
                      </td>
                      <td>
                        <div className="actions">
                          <Link className="act-reset" href={`/admin/rifas/${r.id}`}>
                            ✎ Editar
                          </Link>
                          {ordenes === 0 && (
                            <form action={eliminarRifa}>
                              <input type="hidden" name="id" value={r.id} />
                              <ConfirmSubmit className="act-no" mensaje={`¿Borrar la rifa "${r.titulo}"? No se puede deshacer.`}>
                                🗑 Borrar
                              </ConfirmSubmit>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: ".85rem" }}>
          Las rifas con órdenes no se pueden borrar; márcalas como finalizadas e indica el ganador.
        </p>
      </main>
    </AdminFrame>
  );
}

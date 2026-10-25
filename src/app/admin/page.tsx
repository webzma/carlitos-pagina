import type { Metadata } from "next";
import Link from "next/link";
import { esAdmin } from "@/lib/auth";
import {
  listarOrdenes,
  resumen,
  resumenPorRifa,
  resumenVacio,
  ESTADOS,
  type Estado,
  type Orden,
} from "@/lib/db";
import { RIFAS, SITE, money, digitosDe, pad } from "@/data/config";
import { actualizarEstado, login, logout } from "./actions";
import { ConfirmSubmit, CopyNumbers } from "./ClientButtons";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const ESTADO_TEXTO: Record<Estado, string> = { pendiente: "Pendiente", aprobado: "Aprobado", rechazado: "Rechazado" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const param = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  if (!(await esAdmin())) return <Login error={param("error") !== ""} />;

  const rifa = param("rifa");
  const estado = ESTADOS.includes(param("estado") as Estado) ? (param("estado") as Estado) : undefined;
  const q = param("q");
  const msg = param("msg");
  const tipo = param("tipo") === "err" ? "err" : "ok";

  const [ordenes, stats, resumenes] = await Promise.all([
    listarOrdenes({ rifa: rifa || undefined, estado, q }),
    resumen(rifa || undefined),
    resumenPorRifa(),
  ]);

  // URL actual sin el mensaje, para volver tras una acción
  const base = new URLSearchParams();
  if (rifa) base.set("rifa", rifa);
  if (estado) base.set("estado", estado);
  if (q) base.set("q", q);
  const volver = `/admin${base.size ? `?${base}` : ""}`;

  const tabHref = (e: string) => {
    const u = new URLSearchParams(base);
    if (e) u.set("estado", e);
    else u.delete("estado");
    return `/admin${u.size ? `?${u}` : ""}`;
  };

  return (
    <AdminFrame logueado>
      <main className="container admin-main">
        <h1>ÓRDENES Y PAGOS</h1>

        {msg && <div className={`flash-msg ${tipo}`}>{msg}</div>}

        <div className="kpis">
          <div className="kpi warn">
            <span>Por validar</span>
            <strong>{stats.pendiente.ordenes}</strong>
            <small className="muted">
              {money(stats.pendiente.total)} · {stats.pendiente.boletos} boletos
            </small>
          </div>
          <div className="kpi ok">
            <span>Recaudado (aprobado)</span>
            <strong>{money(stats.aprobado.total)}</strong>
            <small className="muted">{stats.aprobado.ordenes} órdenes</small>
          </div>
          <div className="kpi">
            <span>Boletos aprobados</span>
            <strong>{stats.aprobado.boletos}</strong>
            <small className="muted">+{stats.pendiente.boletos} apartados</small>
          </div>
          <div className="kpi">
            <span>Rechazadas</span>
            <strong>{stats.rechazado.ordenes}</strong>
            <small className="muted">Números liberados</small>
          </div>
        </div>

        <section className="export">
          <h2>Exportar boletos para el sorteo</h2>
          <p className="muted">
            Solo se exportan los boletos <b>aprobados</b>. Valida los pendientes antes de exportar.
          </p>
          <div className="export-list">
            {RIFAS.map((r) => {
              const st = resumenes[r.id] ?? resumenVacio();
              const vacio = st.aprobado.boletos === 0;
              return (
                <div className="export-row" key={r.id}>
                  <div>
                    <b>{r.titulo}</b>
                    <span className="muted">
                      {st.aprobado.boletos} boletos aprobados
                      {st.pendiente.boletos > 0 && (
                        <span className="warn-text"> · ⚠ {st.pendiente.boletos} pendientes por validar</span>
                      )}
                    </span>
                  </div>
                  <div className="export-actions">
                    <a className="btn btn-dark btn-sm" href={`/api/admin/exportar?rifa=${r.id}&formato=csv`} aria-disabled={vacio}>
                      ⬇ Excel
                    </a>
                    <a className="btn btn-ghost btn-sm" href={`/api/admin/exportar?rifa=${r.id}&formato=txt`} aria-disabled={vacio}>
                      ⬇ TXT
                    </a>
                    <CopyNumbers rifaId={r.id} disabled={vacio} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <form className="filters" method="get">
          <select name="rifa" defaultValue={rifa}>
            <option value="">Todas las rifas</option>
            {RIFAS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.titulo}
              </option>
            ))}
          </select>
          {estado && <input type="hidden" name="estado" value={estado} />}
          <input name="q" defaultValue={q} placeholder="Buscar por nombre, cédula, teléfono, referencia, orden o # de boleto" />
          <button className="btn btn-dark">Buscar</button>
          {(q || rifa || estado) && (
            <Link className="btn btn-ghost" href="/admin">
              Limpiar
            </Link>
          )}
        </form>

        <nav className="tabs">
          <Link href={tabHref("")} className={!estado ? "on" : undefined}>
            Todas
          </Link>
          {ESTADOS.map((e) => (
            <Link key={e} href={tabHref(e)} className={estado === e ? "on" : undefined}>
              {ESTADO_TEXTO[e]}
            </Link>
          ))}
        </nav>

        <div className="table-wrap">
          {ordenes.length === 0 ? (
            <p className="empty">No hay órdenes con estos filtros.</p>
          ) : (
            <table className="orders">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Comprador</th>
                  <th>Rifa / boletos</th>
                  <th>Total</th>
                  <th>Pago</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((o) => (
                  <FilaOrden key={o.id} orden={o} volver={volver} />
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: ".85rem" }}>
          {ordenes.length} orden(es) mostradas.
        </p>
      </main>
    </AdminFrame>
  );
}

function FilaOrden({ orden: o, volver }: { orden: Orden; volver: string }) {
  const rifa = RIFAS.find((r) => r.id === o.rifa_id);
  const digitos = rifa ? digitosDe(rifa) : 3;
  const wa = `https://wa.me/${o.telefono}?text=${encodeURIComponent(
    `Hola ${o.nombre.split(" ")[0]}, te escribimos de ${SITE.marca} sobre tu orden ${o.id}.`,
  )}`;

  const accion = (estado: Estado, className: string, texto: string, confirmar?: string) => (
    <form action={actualizarEstado}>
      <input type="hidden" name="id" value={o.id} />
      <input type="hidden" name="estado" value={estado} />
      <input type="hidden" name="volver" value={volver} />
      {confirmar ? (
        <ConfirmSubmit className={className} mensaje={confirmar}>
          {texto}
        </ConfirmSubmit>
      ) : (
        <button className={className}>{texto}</button>
      )}
    </form>
  );

  return (
    <tr>
      <td>
        <b>{o.id}</b>
        <span className="muted">{fechaVE(o.creado)}</span>
      </td>
      <td className="who">
        <b>{o.nombre}</b>
        {o.cedula && <small>C.I. {o.cedula}</small>}
        <a className="link" href={wa} target="_blank" rel="noopener">
          +{o.telefono}
        </a>
        {o.email && <small>{o.email}</small>}
      </td>
      <td>
        <span className="muted">{rifa?.titulo ?? o.rifa_id}</span>
        <div className="nums" style={{ marginTop: 4 }}>
          {o.numeros.map((n) => (
            <b key={n}>{pad(n, digitos)}</b>
          ))}
        </div>
      </td>
      <td>
        <b>{money(o.total)}</b>
      </td>
      <td>
        {o.referencia ? (
          <div>
            Ref: <b>{o.referencia}</b>
          </div>
        ) : (
          <span className="muted">Sin referencia</span>
        )}
        {o.comprobante ? (
          <a href={`/api/admin/comprobante/${o.id}`} target="_blank" rel="noopener" title="Ver comprobante">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada servida por la API */}
            <img className="thumb" src={`/api/admin/comprobante/${o.id}`} alt="Comprobante" loading="lazy" />
          </a>
        ) : (
          <span className="muted">Sin captura</span>
        )}
      </td>
      <td>
        <span className={`status ${o.estado}`}>{ESTADO_TEXTO[o.estado]}</span>
      </td>
      <td>
        <div className="actions">
          {o.estado !== "aprobado" && accion("aprobado", "act-ok", "✓ Aprobar")}
          {o.estado !== "rechazado" &&
            accion("rechazado", "act-no", "✕ Rechazar", `¿Rechazar la orden ${o.id}? Sus números quedarán libres.`)}
          {o.estado !== "pendiente" && accion("pendiente", "act-reset", "↺ Pendiente")}
        </div>
      </td>
    </tr>
  );
}

function fechaVE(s: string) {
  return new Date(`${s.replace(" ", "T")}Z`).toLocaleString("es-VE", {
    timeZone: "America/Caracas",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminFrame({ logueado, children }: { logueado: boolean; children: React.ReactNode }) {
  return (
    <div className="admin-body">
      <header className="admin-top">
        <div className="container">
          <Link href="/admin" className="logo">
            <span className="logo-mark">🏆</span>
            <span>
              PANEL <b>EL TRIUNFO</b>
            </span>
          </Link>
          {logueado && (
            <form action={logout}>
              <button>Cerrar sesión</button>
            </form>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}

function Login({ error }: { error: boolean }) {
  return (
    <AdminFrame logueado={false}>
      <main className="container">
        <form className="login-box" action={login}>
          <h1 style={{ fontFamily: "var(--display)", fontSize: "2.2rem", letterSpacing: 1 }}>ACCESO ADMIN</h1>
          <p>Ingresa la contraseña para ver las órdenes y validar pagos.</p>
          {error && <p className="error">Contraseña incorrecta</p>}
          <div className="field" style={{ textAlign: "left" }}>
            <label>Contraseña</label>
            <input type="password" name="password" required autoFocus autoComplete="current-password" />
          </div>
          <button className="btn btn-primary btn-block">Entrar</button>
        </form>
      </main>
    </AdminFrame>
  );
}

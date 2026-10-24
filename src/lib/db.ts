// Base de datos SQLite (módulo nativo node:sqlite, sin dependencias externas).
// Solo se importa desde código de servidor.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "astro:env/server";

export type Estado = "pendiente" | "aprobado" | "rechazado";
export const ESTADOS: Estado[] = ["pendiente", "aprobado", "rechazado"];

export interface Orden {
  id: string;
  rifa_id: string;
  nombre: string;
  cedula: string;
  telefono: string;
  email: string;
  referencia: string;
  numeros: number[];
  total: number;
  comprobante: string | null;
  estado: Estado;
  creado: string;
}

type OrdenRow = Omit<Orden, "numeros"> & { numeros: string };

export const UPLOAD_DIR = path.resolve(DATA_DIR, "comprobantes");
mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(path.resolve(DATA_DIR, "rifa.db"));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS ordenes (
    id          TEXT PRIMARY KEY,
    rifa_id     TEXT NOT NULL,
    nombre      TEXT NOT NULL,
    cedula      TEXT NOT NULL DEFAULT '',
    telefono    TEXT NOT NULL,
    email       TEXT NOT NULL DEFAULT '',
    referencia  TEXT NOT NULL DEFAULT '',
    numeros     TEXT NOT NULL,           -- JSON con los números de la orden
    total       REAL NOT NULL,
    comprobante TEXT,                    -- nombre del archivo en UPLOAD_DIR
    estado      TEXT NOT NULL DEFAULT 'pendiente',
    creado      TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS ordenes_rifa ON ordenes (rifa_id, estado);

  -- Un número solo puede pertenecer a una orden activa (pendiente o aprobada)
  CREATE TABLE IF NOT EXISTS boletos (
    rifa_id  TEXT NOT NULL,
    numero   INTEGER NOT NULL,
    orden_id TEXT NOT NULL REFERENCES ordenes (id) ON DELETE CASCADE,
    PRIMARY KEY (rifa_id, numero)
  );
`);

const toOrden = (r: OrdenRow): Orden => ({ ...r, numeros: JSON.parse(r.numeros) });

function transaction<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

function nuevoId() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const exists = db.prepare("SELECT 1 FROM ordenes WHERE id = ?");
  for (;;) {
    let id = "T-";
    for (let i = 0; i < 6; i++) id += abc[Math.floor(Math.random() * abc.length)];
    if (!exists.get(id)) return id;
  }
}

// ---------- Boletos ----------

export function vendidos(rifaId: string): number[] {
  return db
    .prepare("SELECT numero FROM boletos WHERE rifa_id = ? ORDER BY numero")
    .all(rifaId)
    .map((r) => Number(r.numero));
}

export function conteoVendidos(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of db.prepare("SELECT rifa_id, COUNT(*) n FROM boletos GROUP BY rifa_id").all()) {
    out[String(r.rifa_id)] = Number(r.n);
  }
  return out;
}

function ocupados(rifaId: string, numeros: number[]): number[] {
  const q = db.prepare("SELECT 1 FROM boletos WHERE rifa_id = ? AND numero = ?");
  return numeros.filter((n) => q.get(rifaId, n));
}

function reservar(rifaId: string, numeros: number[], ordenId: string) {
  const ins = db.prepare("INSERT INTO boletos (rifa_id, numero, orden_id) VALUES (?, ?, ?)");
  for (const n of numeros) ins.run(rifaId, n, ordenId);
}

// ---------- Órdenes ----------

export type NuevaOrden = Omit<Orden, "id" | "estado" | "creado">;

export function crearOrden(data: NuevaOrden): { orden: Orden } | { conflicto: number[] } {
  return transaction(() => {
    const tomados = ocupados(data.rifa_id, data.numeros);
    if (tomados.length) return { conflicto: tomados };

    const id = nuevoId();
    db.prepare(
      `INSERT INTO ordenes (id, rifa_id, nombre, cedula, telefono, email, referencia, numeros, total, comprobante)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id, data.rifa_id, data.nombre, data.cedula, data.telefono, data.email,
      data.referencia, JSON.stringify(data.numeros), data.total, data.comprobante,
    );
    reservar(data.rifa_id, data.numeros, id);
    return { orden: obtenerOrden(id)! };
  });
}

export function obtenerOrden(id: string): Orden | null {
  const r = db.prepare("SELECT * FROM ordenes WHERE id = ?").get(id) as OrdenRow | undefined;
  return r ? toOrden(r) : null;
}

/**
 * Cambia el estado de una orden. Rechazar libera sus números;
 * reactivar una rechazada intenta reservarlos de nuevo.
 */
export function cambiarEstado(id: string, estado: Estado): { ok: true } | { error: string } {
  return transaction(() => {
    const o = obtenerOrden(id);
    if (!o) return { error: "La orden no existe" };
    if (o.estado === estado) return { ok: true };

    if (estado === "rechazado") {
      db.prepare("DELETE FROM boletos WHERE orden_id = ?").run(id);
    } else if (o.estado === "rechazado") {
      const tomados = ocupados(o.rifa_id, o.numeros);
      if (tomados.length) {
        return { error: `No se puede reactivar: los números ${tomados.join(", ")} ya fueron tomados por otra orden` };
      }
      reservar(o.rifa_id, o.numeros, id);
    }
    db.prepare("UPDATE ordenes SET estado = ? WHERE id = ?").run(estado, id);
    return { ok: true };
  });
}

export interface FiltroOrdenes {
  rifa?: string;
  estado?: Estado;
  q?: string; // nombre, cédula, teléfono, referencia, orden o número de boleto
}

export function listarOrdenes(f: FiltroOrdenes = {}): Orden[] {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (f.rifa) { where.push("rifa_id = ?"); params.push(f.rifa); }
  if (f.estado) { where.push("estado = ?"); params.push(f.estado); }
  const q = f.q?.trim();
  if (q) {
    const like = `%${q}%`;
    const parts = ["nombre LIKE ?", "cedula LIKE ?", "telefono LIKE ?", "referencia LIKE ?", "id LIKE ?"];
    params.push(like, like, like, like, like);
    if (/^\d+$/.test(q)) {
      parts.push("EXISTS (SELECT 1 FROM json_each(ordenes.numeros) WHERE value = ?)");
      params.push(Number(q));
    }
    where.push(`(${parts.join(" OR ")})`);
  }
  const sql = `SELECT * FROM ordenes ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY creado DESC, id DESC`;
  return (db.prepare(sql).all(...params) as OrdenRow[]).map(toOrden);
}

/** Búsqueda pública del verificador: por teléfono o número de boleto. */
export function buscarParaVerificador(rifaId: string, q: string): Orden[] {
  const digits = q.replace(/\D/g, "");
  if (!digits) return [];
  const rows = db
    .prepare(
      `SELECT * FROM ordenes
       WHERE rifa_id = ? AND (
         (length(?) >= 7 AND telefono LIKE '%' || ?)
         OR EXISTS (SELECT 1 FROM json_each(ordenes.numeros) WHERE value = ?)
       )
       ORDER BY creado DESC LIMIT 20`,
    )
    .all(rifaId, digits, digits.replace(/^0+/, ""), Number(digits)) as OrdenRow[];
  return rows.map(toOrden);
}

export function resumen(rifa?: string) {
  const where = rifa ? "WHERE rifa_id = ?" : "";
  const params = rifa ? [rifa] : [];
  const rows = db
    .prepare(`SELECT estado, COUNT(*) n, COALESCE(SUM(total), 0) total, COALESCE(SUM(json_array_length(numeros)), 0) boletos
              FROM ordenes ${where} GROUP BY estado`)
    .all(...params);
  const out = Object.fromEntries(ESTADOS.map((e) => [e, { ordenes: 0, total: 0, boletos: 0 }])) as Record<
    Estado,
    { ordenes: number; total: number; boletos: number }
  >;
  for (const r of rows) {
    const e = r.estado as Estado;
    if (out[e]) out[e] = { ordenes: Number(r.n), total: Number(r.total), boletos: Number(r.boletos) };
  }
  return out;
}

export function guardarComprobante(id: string, archivo: string) {
  db.prepare("UPDATE ordenes SET comprobante = ? WHERE id = ?").run(archivo, id);
}

export interface BoletoExport {
  numero: number;
  orden: string;
  nombre: string;
  cedula: string;
  telefono: string;
}

/** Boletos de órdenes aprobadas de una rifa, ordenados por número (para el sorteo). */
export function boletosAprobados(rifaId: string): BoletoExport[] {
  return db
    .prepare(
      `SELECT b.numero, o.id orden, o.nombre, o.cedula, o.telefono
       FROM boletos b JOIN ordenes o ON o.id = b.orden_id
       WHERE b.rifa_id = ? AND o.estado = 'aprobado'
       ORDER BY b.numero`,
    )
    .all(rifaId)
    .map((r) => ({
      numero: Number(r.numero),
      orden: String(r.orden),
      nombre: String(r.nombre),
      cedula: String(r.cedula),
      telefono: String(r.telefono),
    }));
}

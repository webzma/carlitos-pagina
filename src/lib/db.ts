// Base de datos: Turso (libSQL) en producción, archivo SQLite local en desarrollo.
// Solo se importa desde código de servidor.

import { createClient, type InStatement, type Row } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } from "astro:env/server";

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
  comprobante: string | null; // tipo MIME de la captura, si se subió
  estado: Estado;
  creado: string;
}

export interface Comprobante {
  tipo: string;
  datos: Uint8Array<ArrayBuffer>;
}

if (TURSO_DATABASE_URL.startsWith("file:")) mkdirSync("./data", { recursive: true });

const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN });

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS ordenes (
    id          TEXT PRIMARY KEY,
    rifa_id     TEXT NOT NULL,
    nombre      TEXT NOT NULL,
    cedula      TEXT NOT NULL DEFAULT '',
    telefono    TEXT NOT NULL,
    email       TEXT NOT NULL DEFAULT '',
    referencia  TEXT NOT NULL DEFAULT '',
    numeros     TEXT NOT NULL,           -- JSON con los números de la orden
    total       REAL NOT NULL,
    comprobante TEXT,                    -- tipo MIME de la captura (datos en la tabla comprobantes)
    estado      TEXT NOT NULL DEFAULT 'pendiente',
    creado      TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS ordenes_rifa ON ordenes (rifa_id, estado)`,
  // Un número solo puede pertenecer a una orden activa (pendiente o aprobada)
  `CREATE TABLE IF NOT EXISTS boletos (
    rifa_id  TEXT NOT NULL,
    numero   INTEGER NOT NULL,
    orden_id TEXT NOT NULL,
    PRIMARY KEY (rifa_id, numero)
  )`,
  `CREATE INDEX IF NOT EXISTS boletos_orden ON boletos (orden_id)`,
  `CREATE TABLE IF NOT EXISTS comprobantes (
    orden_id TEXT PRIMARY KEY,
    tipo     TEXT NOT NULL,
    datos    BLOB NOT NULL
  )`,
];

// Crea las tablas la primera vez que se usa la base en cada instancia
let listo: Promise<unknown> | undefined;
async function db() {
  listo ??= client.batch(SCHEMA, "write").catch((e) => {
    listo = undefined;
    throw e;
  });
  await listo;
  return client;
}

const toOrden = (r: Row): Orden => ({
  id: String(r.id),
  rifa_id: String(r.rifa_id),
  nombre: String(r.nombre),
  cedula: String(r.cedula),
  telefono: String(r.telefono),
  email: String(r.email),
  referencia: String(r.referencia),
  numeros: JSON.parse(String(r.numeros)),
  total: Number(r.total),
  comprobante: r.comprobante == null ? null : String(r.comprobante),
  estado: String(r.estado) as Estado,
  creado: String(r.creado),
});

const esConflicto = (e: unknown) => /CONSTRAINT/i.test(String((e as { code?: string }).code ?? e));

function nuevoId() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "T-";
  for (let i = 0; i < 6; i++) id += abc[Math.floor(Math.random() * abc.length)];
  return id;
}

const insertarBoletos = (rifaId: string, numeros: number[], ordenId: string): InStatement => ({
  sql: `INSERT INTO boletos (rifa_id, numero, orden_id) VALUES ${numeros.map(() => "(?, ?, ?)").join(", ")}`,
  args: numeros.flatMap((n) => [rifaId, n, ordenId]),
});

// ---------- Boletos ----------

export async function vendidos(rifaId: string): Promise<number[]> {
  const rs = await (await db()).execute({
    sql: "SELECT numero FROM boletos WHERE rifa_id = ? ORDER BY numero",
    args: [rifaId],
  });
  return rs.rows.map((r) => Number(r.numero));
}

export async function conteoVendidos(): Promise<Record<string, number>> {
  const rs = await (await db()).execute("SELECT rifa_id, COUNT(*) n FROM boletos GROUP BY rifa_id");
  return Object.fromEntries(rs.rows.map((r) => [String(r.rifa_id), Number(r.n)]));
}

async function ocupados(rifaId: string, numeros: number[]): Promise<number[]> {
  const rs = await (await db()).execute({
    sql: `SELECT numero FROM boletos WHERE rifa_id = ? AND numero IN (${numeros.map(() => "?").join(", ")})`,
    args: [rifaId, ...numeros],
  });
  return rs.rows.map((r) => Number(r.numero)).sort((a, b) => a - b);
}

// ---------- Órdenes ----------

export type NuevaOrden = Omit<Orden, "id" | "estado" | "creado" | "comprobante"> & {
  comprobante: Comprobante | null;
};

/**
 * Crea la orden y reserva sus números en una sola operación atómica.
 * Si otro comprador ya tomó algún número, no guarda nada y devuelve cuáles.
 */
export async function crearOrden(data: NuevaOrden): Promise<{ orden: Orden } | { conflicto: number[] }> {
  const c = await db();
  for (let intento = 0; intento < 5; intento++) {
    const id = nuevoId();
    const stmts: InStatement[] = [
      {
        sql: `INSERT INTO ordenes (id, rifa_id, nombre, cedula, telefono, email, referencia, numeros, total, comprobante)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id, data.rifa_id, data.nombre, data.cedula, data.telefono, data.email,
          data.referencia, JSON.stringify(data.numeros), data.total, data.comprobante?.tipo ?? null,
        ],
      },
      insertarBoletos(data.rifa_id, data.numeros, id),
    ];
    if (data.comprobante) {
      stmts.push({
        sql: "INSERT INTO comprobantes (orden_id, tipo, datos) VALUES (?, ?, ?)",
        args: [id, data.comprobante.tipo, data.comprobante.datos],
      });
    }
    try {
      await c.batch(stmts, "write");
      return { orden: (await obtenerOrden(id))! };
    } catch (e) {
      if (!esConflicto(e)) throw e;
      const tomados = await ocupados(data.rifa_id, data.numeros);
      if (tomados.length) return { conflicto: tomados };
      // Si no hubo números tomados, chocó el id de la orden: se reintenta con otro
    }
  }
  throw new Error("No se pudo generar un id de orden único");
}

export async function obtenerOrden(id: string): Promise<Orden | null> {
  const rs = await (await db()).execute({ sql: "SELECT * FROM ordenes WHERE id = ?", args: [id] });
  return rs.rows[0] ? toOrden(rs.rows[0]) : null;
}

export async function obtenerComprobante(ordenId: string): Promise<Comprobante | null> {
  const rs = await (await db()).execute({
    sql: "SELECT tipo, datos FROM comprobantes WHERE orden_id = ?",
    args: [ordenId],
  });
  const r = rs.rows[0];
  if (!r) return null;
  return { tipo: String(r.tipo), datos: new Uint8Array(r.datos as ArrayBuffer) };
}

/**
 * Cambia el estado de una orden. Rechazar libera sus números;
 * reactivar una rechazada intenta reservarlos de nuevo.
 */
export async function cambiarEstado(id: string, estado: Estado): Promise<{ ok: true } | { error: string }> {
  const o = await obtenerOrden(id);
  if (!o) return { error: "La orden no existe" };
  if (o.estado === estado) return { ok: true };

  const actualizar: InStatement = { sql: "UPDATE ordenes SET estado = ? WHERE id = ?", args: [estado, id] };
  const c = await db();

  if (estado === "rechazado") {
    await c.batch([{ sql: "DELETE FROM boletos WHERE orden_id = ?", args: [id] }, actualizar], "write");
  } else if (o.estado === "rechazado") {
    try {
      await c.batch([insertarBoletos(o.rifa_id, o.numeros, id), actualizar], "write");
    } catch (e) {
      if (!esConflicto(e)) throw e;
      const tomados = await ocupados(o.rifa_id, o.numeros);
      return { error: `No se puede reactivar: los números ${tomados.join(", ")} ya fueron tomados por otra orden` };
    }
  } else {
    await c.execute(actualizar);
  }
  return { ok: true };
}

export interface FiltroOrdenes {
  rifa?: string;
  estado?: Estado;
  q?: string; // nombre, cédula, teléfono, referencia, orden o número de boleto
}

export async function listarOrdenes(f: FiltroOrdenes = {}): Promise<Orden[]> {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (f.rifa) { where.push("rifa_id = ?"); args.push(f.rifa); }
  if (f.estado) { where.push("estado = ?"); args.push(f.estado); }
  const q = f.q?.trim();
  if (q) {
    const like = `%${q}%`;
    const parts = ["nombre LIKE ?", "cedula LIKE ?", "telefono LIKE ?", "referencia LIKE ?", "id LIKE ?"];
    args.push(like, like, like, like, like);
    if (/^\d+$/.test(q)) {
      parts.push("EXISTS (SELECT 1 FROM json_each(ordenes.numeros) WHERE value = ?)");
      args.push(Number(q));
    }
    where.push(`(${parts.join(" OR ")})`);
  }
  const sql = `SELECT * FROM ordenes ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY creado DESC, id DESC`;
  const rs = await (await db()).execute({ sql, args });
  return rs.rows.map(toOrden);
}

/** Búsqueda pública del verificador: por teléfono o número de boleto. */
export async function buscarParaVerificador(rifaId: string, q: string): Promise<Orden[]> {
  const digits = q.replace(/\D/g, "");
  if (!digits) return [];
  const rs = await (await db()).execute({
    sql: `SELECT * FROM ordenes
          WHERE rifa_id = ? AND (
            (length(?) >= 7 AND telefono LIKE '%' || ?)
            OR EXISTS (SELECT 1 FROM json_each(ordenes.numeros) WHERE value = ?)
          )
          ORDER BY creado DESC LIMIT 20`,
    args: [rifaId, digits, digits.replace(/^0+/, ""), Number(digits)],
  });
  return rs.rows.map(toOrden);
}

export type Resumen = Record<Estado, { ordenes: number; total: number; boletos: number }>;

/** Totales por estado. Sin rifa, devuelve el global; con rifa, solo esa. */
export async function resumen(rifa?: string): Promise<Resumen> {
  const rs = await (await db()).execute({
    sql: `SELECT estado, COUNT(*) n, COALESCE(SUM(total), 0) total, COALESCE(SUM(json_array_length(numeros)), 0) boletos
          FROM ordenes ${rifa ? "WHERE rifa_id = ?" : ""} GROUP BY estado`,
    args: rifa ? [rifa] : [],
  });
  return armarResumen(rs.rows);
}

/** Totales por estado de todas las rifas en una sola consulta. */
export async function resumenPorRifa(): Promise<Record<string, Resumen>> {
  const rs = await (await db()).execute(
    `SELECT rifa_id, estado, COUNT(*) n, COALESCE(SUM(total), 0) total, COALESCE(SUM(json_array_length(numeros)), 0) boletos
     FROM ordenes GROUP BY rifa_id, estado`,
  );
  const grupos: Record<string, Row[]> = {};
  for (const r of rs.rows) (grupos[String(r.rifa_id)] ??= []).push(r);
  return Object.fromEntries(Object.entries(grupos).map(([id, rows]) => [id, armarResumen(rows)]));
}

export function resumenVacio(): Resumen {
  return armarResumen([]);
}

function armarResumen(rows: Row[]): Resumen {
  const out = Object.fromEntries(ESTADOS.map((e) => [e, { ordenes: 0, total: 0, boletos: 0 }])) as Resumen;
  for (const r of rows) {
    const e = String(r.estado) as Estado;
    if (out[e]) out[e] = { ordenes: Number(r.n), total: Number(r.total), boletos: Number(r.boletos) };
  }
  return out;
}

export interface BoletoExport {
  numero: number;
  orden: string;
  nombre: string;
  cedula: string;
  telefono: string;
}

/** Boletos de órdenes aprobadas de una rifa, ordenados por número (para el sorteo). */
export async function boletosAprobados(rifaId: string): Promise<BoletoExport[]> {
  const rs = await (await db()).execute({
    sql: `SELECT b.numero, o.id orden, o.nombre, o.cedula, o.telefono
          FROM boletos b JOIN ordenes o ON o.id = b.orden_id
          WHERE b.rifa_id = ? AND o.estado = 'aprobado'
          ORDER BY b.numero`,
    args: [rifaId],
  });
  return rs.rows.map((r) => ({
    numero: Number(r.numero),
    orden: String(r.orden),
    nombre: String(r.nombre),
    cedula: String(r.cedula),
    telefono: String(r.telefono),
  }));
}

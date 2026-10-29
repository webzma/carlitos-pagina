// Base de datos: Turso (libSQL) en producción, archivo SQLite local en desarrollo.
// Solo se importa desde código de servidor.

import "server-only";
import { createClient, type InStatement, type Row } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { env } from "./env";
import { RIFAS_INICIALES, type Rifa } from "@/data/config";

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

// El cliente se crea al primer uso (no al compilar) para leer las variables de entorno en tiempo de ejecución
let client: ReturnType<typeof createClient> | undefined;
function cliente() {
  if (!client) {
    if (env.TURSO_DATABASE_URL.startsWith("file:")) mkdirSync("./data", { recursive: true });
    client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
  }
  return client;
}

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
  `CREATE TABLE IF NOT EXISTS rifas (
    id             TEXT PRIMARY KEY,
    titulo         TEXT NOT NULL,
    icono          TEXT NOT NULL,
    descripcion    TEXT NOT NULL,
    precio         REAL NOT NULL,
    total_boletos  INTEGER NOT NULL,
    fecha          TEXT NOT NULL,           -- ISO con zona horaria, p. ej. 2026-10-31T21:00:00-04:00
    loteria        TEXT NOT NULL,
    estado         TEXT NOT NULL DEFAULT 'activa',
    ganador        TEXT,
    estilo         TEXT,
    premios        TEXT,                    -- JSON; NULL = premio único con la descripción
    paquetes       TEXT,                    -- JSON; NULL = paquetes por defecto
    creado         TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // Migraciones de datos ya aplicadas (para no volver a cargar las rifas iniciales si se borran)
  `CREATE TABLE IF NOT EXISTS migraciones (id TEXT PRIMARY KEY)`,
];

const COLUMNAS_RIFA = "id, titulo, icono, descripcion, precio, total_boletos, fecha, loteria, estado, ganador, estilo, premios, paquetes";
const valoresRifa = (r: Rifa) => [
  r.id, r.titulo, r.icono, r.descripcion, r.precio, r.totalBoletos, r.fecha, r.loteria, r.estado,
  r.ganador || null, r.estilo || null,
  r.premios?.length ? JSON.stringify(r.premios) : null,
  r.paquetes?.length ? JSON.stringify(r.paquetes) : null,
];

// Carga RIFAS_INICIALES una sola vez, en la misma transacción que marca la migración
const MIGRACION_RIFAS = "rifas-iniciales";
const SEMILLA: InStatement[] = [
  ...RIFAS_INICIALES.map((r) => ({
    sql: `INSERT OR IGNORE INTO rifas (${COLUMNAS_RIFA})
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          WHERE NOT EXISTS (SELECT 1 FROM migraciones WHERE id = ?)`,
    args: [...valoresRifa(r), MIGRACION_RIFAS],
  })),
  { sql: "INSERT OR IGNORE INTO migraciones (id) VALUES (?)", args: [MIGRACION_RIFAS] },
];

// Crea las tablas la primera vez que se usa la base en cada instancia
let listo: Promise<unknown> | undefined;
async function db() {
  listo ??= cliente().batch([...SCHEMA, ...SEMILLA], "write").catch((e) => {
    listo = undefined;
    throw e;
  });
  await listo;
  return cliente();
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

// ---------- Rifas ----------

const toRifa = (r: Row): Rifa => ({
  id: String(r.id),
  titulo: String(r.titulo),
  icono: String(r.icono),
  descripcion: String(r.descripcion),
  precio: Number(r.precio),
  totalBoletos: Number(r.total_boletos),
  fecha: String(r.fecha),
  loteria: String(r.loteria),
  estado: String(r.estado) as Rifa["estado"],
  ganador: r.ganador == null ? undefined : String(r.ganador),
  estilo: r.estilo == null ? undefined : (String(r.estilo) as Rifa["estilo"]),
  premios: r.premios == null ? undefined : JSON.parse(String(r.premios)),
  paquetes: r.paquetes == null ? undefined : JSON.parse(String(r.paquetes)),
});

/** Activas primero (la más próxima arriba), luego finalizadas (la más reciente arriba). */
export async function listarRifas(): Promise<Rifa[]> {
  const rs = await (await db()).execute(
    `SELECT * FROM rifas
     ORDER BY estado = 'activa' DESC, CASE WHEN estado = 'activa' THEN fecha END ASC, fecha DESC`,
  );
  return rs.rows.map(toRifa);
}

export async function obtenerRifa(id: string): Promise<Rifa | null> {
  const rs = await (await db()).execute({ sql: "SELECT * FROM rifas WHERE id = ?", args: [id] });
  return rs.rows[0] ? toRifa(rs.rows[0]) : null;
}

export async function crearRifa(r: Rifa): Promise<{ ok: true } | { error: string }> {
  try {
    await (await db()).execute({
      sql: `INSERT INTO rifas (${COLUMNAS_RIFA}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: valoresRifa(r),
    });
    return { ok: true };
  } catch (e) {
    if (esConflicto(e)) return { error: `Ya existe una rifa con el identificador "${r.id}"` };
    throw e;
  }
}

/** Actualiza una rifa. No permite dejar fuera de rango números que ya fueron reservados. */
export async function actualizarRifa(r: Rifa): Promise<{ ok: true } | { error: string }> {
  const c = await db();
  const rs = await c.execute({ sql: "SELECT MAX(numero) m FROM boletos WHERE rifa_id = ?", args: [r.id] });
  const mayor = rs.rows[0]?.m;
  if (mayor != null && Number(mayor) >= r.totalBoletos) {
    return { error: `Ya hay boletos reservados hasta el número ${mayor}: la rifa necesita al menos ${Number(mayor) + 1} boletos` };
  }
  const [, ...valores] = valoresRifa(r);
  const rsu = await c.execute({
    sql: `UPDATE rifas SET titulo = ?, icono = ?, descripcion = ?, precio = ?, total_boletos = ?, fecha = ?, loteria = ?,
          estado = ?, ganador = ?, estilo = ?, premios = ?, paquetes = ? WHERE id = ?`,
    args: [...valores, r.id],
  });
  return rsu.rowsAffected ? { ok: true } : { error: "La rifa no existe" };
}

/** Borra una rifa solo si no tiene órdenes (para no perder registros de pagos). */
export async function borrarRifa(id: string): Promise<{ ok: true } | { error: string }> {
  const c = await db();
  const rs = await c.execute({ sql: "SELECT COUNT(*) n FROM ordenes WHERE rifa_id = ?", args: [id] });
  if (Number(rs.rows[0].n) > 0) {
    return { error: "No se puede borrar una rifa con órdenes registradas. Márcala como finalizada." };
  }
  await c.execute({ sql: "DELETE FROM rifas WHERE id = ?", args: [id] });
  return { ok: true };
}

// ---------- Boletos ----------

export async function vendidos(rifaId: string): Promise<number[]> {
  const rs = await (await db()).execute({
    sql: "SELECT numero FROM boletos WHERE rifa_id = ? ORDER BY numero",
    args: [rifaId],
  });
  return rs.rows.map((r) => Number(r.numero));
}

export async function contarVendidos(rifaId: string): Promise<number> {
  const rs = await (await db()).execute({ sql: "SELECT COUNT(*) n FROM boletos WHERE rifa_id = ?", args: [rifaId] });
  return Number(rs.rows[0].n);
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

/**
 * Crea la orden con números libres elegidos al azar (el comprador no los elige ni los ve).
 * Si otro comprador toma alguno en el mismo instante, vuelve a sortear.
 */
export async function crearOrdenAlAzar(
  data: Omit<NuevaOrden, "numeros">,
  cantidad: number,
  totalBoletos: number,
): Promise<{ orden: Orden } | { disponibles: number }> {
  for (let intento = 0; intento < 5; intento++) {
    const ocupados = new Set(await vendidos(data.rifa_id));
    const libres: number[] = [];
    for (let n = 0; n < totalBoletos; n++) if (!ocupados.has(n)) libres.push(n);
    if (libres.length < cantidad) return { disponibles: libres.length };

    // Fisher-Yates parcial: los primeros `cantidad` quedan al azar
    for (let i = 0; i < cantidad; i++) {
      const j = i + Math.floor(Math.random() * (libres.length - i));
      [libres[i], libres[j]] = [libres[j], libres[i]];
    }
    const numeros = libres.slice(0, cantidad).sort((a, b) => a - b);
    const r = await crearOrden({ ...data, numeros });
    if ("orden" in r) return r;
  }
  throw new Error("No se pudieron asignar números libres");
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

/**
 * Búsqueda pública del verificador: por teléfono o número de boleto.
 * Por número solo encuentra órdenes aprobadas (antes de aprobar, los números no se revelan).
 */
export async function buscarParaVerificador(rifaId: string, q: string): Promise<Orden[]> {
  const digits = q.replace(/\D/g, "");
  if (!digits) return [];
  const rs = await (await db()).execute({
    sql: `SELECT * FROM ordenes
          WHERE rifa_id = ? AND (
            (length(?) >= 7 AND telefono LIKE '%' || ?)
            OR (estado = 'aprobado' AND EXISTS (SELECT 1 FROM json_each(ordenes.numeros) WHERE value = ?))
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

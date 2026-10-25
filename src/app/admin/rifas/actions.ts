"use server";

import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/auth";
import { actualizarRifa, borrarRifa, crearRifa } from "@/lib/db";
import type { Paquete, Premio, Rifa } from "@/data/config";
import { esIcono, claveIcono, ICONO_DEFECTO } from "@/components/IconoPremio";

export interface EstadoFormRifa {
  error: string;
  valores?: Record<string, string>; // lo enviado, para no perderlo si hay un error
}

const MAX_BOLETOS = 10000; // la página de la rifa dibuja todos los números
const ESTILOS = ["", "alt", "gray"];

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** Una línea por premio: Lugar | Icono | Título | Detalle (sin ícono usa el de la rifa) */
function leerPremios(texto: string, iconoRifa: string): Premio[] | string {
  const premios: Premio[] = [];
  for (const [i, linea] of texto.split("\n").entries()) {
    if (!linea.trim()) continue;
    const [lugar, icono, titulo, detalle = ""] = linea.split("|").map((p) => p.trim());
    if (!lugar || !titulo) return `Premio en la línea ${i + 1}: usa el formato Lugar | Icono | Título | Detalle`;
    const clave = icono ? claveIcono(icono.toLowerCase()) : iconoRifa;
    if (icono && clave === ICONO_DEFECTO && icono.toLowerCase() !== ICONO_DEFECTO) {
      return `Premio en la línea ${i + 1}: el ícono "${icono}" no existe (mira "Ver claves de íconos")`;
    }
    premios.push({ lugar, icono: clave, titulo, detalle });
  }
  return premios;
}

/** Una línea por paquete: Cantidad | Descuento % | Etiqueta */
function leerPaquetes(texto: string): Paquete[] | string {
  const paquetes: Paquete[] = [];
  for (const [i, linea] of texto.split("\n").entries()) {
    if (!linea.trim()) continue;
    const [cant, desc = "0", tag] = linea.split("|").map((p) => p.trim());
    const c = Number(cant);
    const d = Number(desc.replace("%", "").replace(",", "."));
    if (!Number.isInteger(c) || c < 1 || !Number.isFinite(d) || d < 0 || d >= 100) {
      return `Paquete en la línea ${i + 1}: usa el formato Cantidad | Descuento % | Etiqueta (p. ej. 10 | 15 | MÁS VENDIDO)`;
    }
    paquetes.push({ cant: c, desc: d / 100, ...(tag ? { tag } : {}) });
  }
  return paquetes.sort((a, b) => a.cant - b.cant);
}

export async function guardarRifa(_prev: EstadoFormRifa, fd: FormData): Promise<EstadoFormRifa> {
  if (!(await esAdmin())) redirect("/admin");

  const valores = Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));
  const campo = (k: string, max = 200) => (valores[k] ?? "").trim().slice(0, max);
  const fallo = (error: string) => ({ error, valores });

  const nueva = campo("modo") === "crear";
  const id = nueva ? slug(campo("id") || campo("titulo")) : campo("id");
  const titulo = campo("titulo", 80);
  const precio = Number(campo("precio").replace(",", "."));
  const totalBoletos = Number(campo("totalBoletos"));
  const fecha = campo("fecha");
  const estado = campo("estado") === "finalizada" ? "finalizada" : "activa";
  const estilo = campo("estilo");
  const icono = esIcono(campo("icono")) ? campo("icono") : ICONO_DEFECTO;

  if (titulo.length < 3) return fallo("Escribe el título de la rifa");
  if (!id) return fallo("El identificador solo puede tener letras, números y guiones");
  if (id === "nueva") return fallo('"nueva" no se puede usar como identificador');
  if (!campo("descripcion")) return fallo("Escribe una descripción corta del premio");
  if (!Number.isFinite(precio) || precio <= 0) return fallo("El precio por boleto debe ser mayor que 0");
  if (!Number.isInteger(totalBoletos) || totalBoletos < 10 || totalBoletos > MAX_BOLETOS) {
    return fallo(`La cantidad de boletos debe ser un número entero entre 10 y ${MAX_BOLETOS}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fecha)) return fallo("Indica la fecha y hora del sorteo");
  if (!campo("loteria")) return fallo("Indica con qué lotería se juega");
  if (!ESTILOS.includes(estilo)) return fallo("Color de tarjeta inválido");

  const premios = leerPremios(campo("premios", 5000), icono);
  if (typeof premios === "string") return fallo(premios);
  const paquetes = leerPaquetes(campo("paquetes", 2000));
  if (typeof paquetes === "string") return fallo(paquetes);

  const rifa: Rifa = {
    id,
    titulo,
    icono,
    descripcion: campo("descripcion"),
    precio: Math.round(precio * 100) / 100,
    totalBoletos,
    fecha: `${fecha}:00-04:00`, // hora de Venezuela
    loteria: campo("loteria", 120),
    estado,
    ganador: campo("ganador", 120) || undefined,
    estilo: (estilo || undefined) as Rifa["estilo"],
    premios: premios.length ? premios : undefined,
    paquetes: paquetes.length ? paquetes : undefined,
  };

  const r = nueva ? await crearRifa(rifa) : await actualizarRifa(rifa);
  if ("error" in r) return fallo(r.error);

  redirect(`/admin/rifas?tipo=ok&msg=${encodeURIComponent(`Rifa "${titulo}" ${nueva ? "creada" : "guardada"}`)}`);
}

export async function eliminarRifa(fd: FormData) {
  if (!(await esAdmin())) redirect("/admin");
  const r = await borrarRifa(String(fd.get("id") ?? ""));
  const msg = "error" in r ? r.error : "Rifa eliminada";
  redirect(`/admin/rifas?tipo=${"error" in r ? "err" : "ok"}&msg=${encodeURIComponent(msg)}`);
}

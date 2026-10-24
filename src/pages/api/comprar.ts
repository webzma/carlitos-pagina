import type { APIRoute } from "astro";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { RIFAS, paquetesDe } from "../../data/config";
import { crearOrden, guardarComprobante, UPLOAD_DIR } from "../../lib/db";
import { calcularTotal } from "../../lib/precios";

const MAX_BOLETOS = 200;
const MAX_ARCHIVO = 6 * 1024 * 1024; // 6 MB
const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const texto = (fd: FormData, campo: string, max = 120) => String(fd.get(campo) ?? "").trim().slice(0, max);

export const POST: APIRoute = async ({ request }) => {
  let fd: FormData;
  try {
    fd = await request.formData();
  } catch {
    return json({ error: "Solicitud inválida" }, 400);
  }

  const rifa = RIFAS.find((r) => r.id === texto(fd, "rifa"));
  if (!rifa || rifa.estado !== "activa") return json({ error: "Esta rifa no está disponible" }, 400);
  if (new Date(rifa.fecha).getTime() < Date.now()) return json({ error: "La venta de esta rifa ya cerró" }, 400);

  const numeros = [...new Set(texto(fd, "numeros", 5000).split(",").map(Number))]
    .filter((n) => Number.isInteger(n) && n >= 0 && n < rifa.totalBoletos)
    .sort((a, b) => a - b);
  if (!numeros.length) return json({ error: "Selecciona al menos un boleto" }, 400);
  if (numeros.length > MAX_BOLETOS) return json({ error: `Máximo ${MAX_BOLETOS} boletos por compra` }, 400);

  const nombre = texto(fd, "nombre");
  const codigo = texto(fd, "codigo", 4).replace(/\D/g, "");
  const local = texto(fd, "telefono", 20).replace(/\D/g, "").replace(/^0+/, "");
  if (nombre.length < 3) return json({ error: "Escribe tu nombre completo" }, 400);
  if (local.length < 7 || !codigo) return json({ error: "Escribe un teléfono válido" }, 400);

  const referencia = texto(fd, "referencia", 40);
  const archivo = fd.get("comprobante");
  const tieneArchivo = archivo instanceof File && archivo.size > 0;
  const despues = fd.get("despues") === "1";
  if (!tieneArchivo && !referencia && !despues) {
    return json({ error: "Sube el comprobante, escribe la referencia o marca que lo enviarás después" }, 400);
  }

  let ext: string | undefined;
  if (tieneArchivo) {
    ext = EXTENSIONES[archivo.type];
    if (!ext) return json({ error: "El comprobante debe ser una imagen (JPG, PNG o WEBP)" }, 400);
    if (archivo.size > MAX_ARCHIVO) return json({ error: "La imagen no puede pesar más de 6 MB" }, 400);
  }

  const resultado = crearOrden({
    rifa_id: rifa.id,
    nombre,
    cedula: texto(fd, "cedula", 20),
    telefono: `${codigo}${local}`,
    email: texto(fd, "email"),
    referencia,
    numeros,
    total: calcularTotal(rifa.precio, numeros.length, paquetesDe(rifa)),
    comprobante: null,
  });

  if ("conflicto" in resultado) {
    return json({ error: "Algunos números ya fueron tomados", conflicto: resultado.conflicto }, 409);
  }

  const { orden } = resultado;
  if (tieneArchivo) {
    const nombreArchivo = `${orden.id}.${ext}`;
    await writeFile(path.join(UPLOAD_DIR, nombreArchivo), Buffer.from(await archivo.arrayBuffer()));
    guardarComprobante(orden.id, nombreArchivo);
    orden.comprobante = nombreArchivo;
  }

  return json({ orden: { id: orden.id, nombre: orden.nombre, numeros: orden.numeros, total: orden.total, estado: orden.estado } });
};

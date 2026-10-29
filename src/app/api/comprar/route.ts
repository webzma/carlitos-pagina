import { paquetesDe } from "@/data/config";
import { crearOrdenAlAzar, obtenerRifa } from "@/lib/db";
import { calcularTotal } from "@/lib/precios";

const MAX_BOLETOS = 200;
// Vercel limita el cuerpo de la petición a 4,5 MB; el navegador comprime la captura antes de enviarla
const MAX_ARCHIVO = 4 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp"];

const json = (data: unknown, status = 200) => Response.json(data, { status });
const texto = (fd: FormData, campo: string, max = 120) => String(fd.get(campo) ?? "").trim().slice(0, max);

export async function POST(request: Request) {
  let fd: FormData;
  try {
    fd = await request.formData();
  } catch {
    return json({ error: "Solicitud inválida" }, 400);
  }

  const rifa = await obtenerRifa(texto(fd, "rifa"));
  if (!rifa || rifa.estado !== "activa") return json({ error: "Esta rifa no está disponible" }, 400);
  if (new Date(rifa.fecha).getTime() < Date.now()) return json({ error: "La venta de esta rifa ya cerró" }, 400);

  // El comprador solo indica cuántos boletos quiere; los números se asignan al azar
  const cantidad = Number(texto(fd, "cantidad", 6));
  if (!Number.isInteger(cantidad) || cantidad < 1) return json({ error: "Elige cuántos boletos quieres" }, 400);
  if (cantidad > MAX_BOLETOS) return json({ error: `Máximo ${MAX_BOLETOS} boletos por compra` }, 400);

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
  if (tieneArchivo) {
    if (!TIPOS.includes(archivo.type)) return json({ error: "El comprobante debe ser una imagen (JPG, PNG o WEBP)" }, 400);
    if (archivo.size > MAX_ARCHIVO) return json({ error: "La imagen no puede pesar más de 4 MB" }, 400);
  }

  const resultado = await crearOrdenAlAzar({
    rifa_id: rifa.id,
    nombre,
    cedula: texto(fd, "cedula", 20),
    telefono: `${codigo}${local}`,
    email: texto(fd, "email"),
    referencia,
    total: calcularTotal(rifa.precio, cantidad, paquetesDe(rifa)),
    comprobante: tieneArchivo ? { tipo: archivo.type, datos: new Uint8Array(await archivo.arrayBuffer()) } : null,
  }, cantidad, rifa.totalBoletos);

  if ("disponibles" in resultado) {
    const { disponibles } = resultado;
    const error = disponibles ? `Solo quedan ${disponibles} boletos disponibles` : "Los boletos se agotaron";
    return json({ error, disponibles }, 409);
  }

  // Los números no se envían al comprador hasta que se apruebe el pago
  const { orden } = resultado;
  return json({ orden: { id: orden.id, nombre: orden.nombre, cantidad, total: orden.total, estado: orden.estado } });
}

import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { esAdmin } from "../../../../lib/auth";
import { obtenerOrden, UPLOAD_DIR } from "../../../../lib/db";

const TIPOS: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

export const GET: APIRoute = async ({ params, cookies }) => {
  if (!esAdmin(cookies)) return new Response("No autorizado", { status: 401 });

  const orden = obtenerOrden(params.id ?? "");
  if (!orden?.comprobante) return new Response("Sin comprobante", { status: 404 });

  const archivo = path.basename(orden.comprobante);
  try {
    const data = await readFile(path.join(UPLOAD_DIR, archivo));
    return new Response(data, {
      headers: {
        "Content-Type": TIPOS[archivo.split(".").pop() ?? ""] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Archivo no encontrado", { status: 404 });
  }
};

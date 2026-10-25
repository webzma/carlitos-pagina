import type { APIRoute } from "astro";
import { esAdmin } from "../../../../lib/auth";
import { obtenerComprobante } from "../../../../lib/db";

export const GET: APIRoute = async ({ params, cookies }) => {
  if (!esAdmin(cookies)) return new Response("No autorizado", { status: 401 });

  const comprobante = await obtenerComprobante(params.id ?? "");
  if (!comprobante) return new Response("Sin comprobante", { status: 404 });

  return new Response(comprobante.datos, {
    headers: {
      "Content-Type": comprobante.tipo,
      "Cache-Control": "private, max-age=3600",
    },
  });
};

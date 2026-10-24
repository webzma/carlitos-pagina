import type { APIRoute } from "astro";
import { esAdmin } from "../../../lib/auth";
import { cambiarEstado, ESTADOS, type Estado } from "../../../lib/db";

// Cambia el estado de una orden y vuelve al panel conservando los filtros
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!esAdmin(cookies)) return new Response("No autorizado", { status: 401 });

  const fd = await request.formData();
  const id = String(fd.get("id") ?? "");
  const estado = String(fd.get("estado") ?? "") as Estado;
  const volver = String(fd.get("volver") ?? "/admin");
  const destino = new URL(volver.startsWith("/admin") ? volver : "/admin", "http://x");

  if (!ESTADOS.includes(estado)) {
    destino.searchParams.set("msg", "Estado inválido");
    destino.searchParams.set("tipo", "err");
    return redirect(destino.pathname + destino.search, 303);
  }

  const r = cambiarEstado(id, estado);
  destino.searchParams.set("msg", "error" in r ? r.error : `Orden ${id} marcada como ${estado}`);
  destino.searchParams.set("tipo", "error" in r ? "err" : "ok");
  return redirect(destino.pathname + destino.search, 303);
};

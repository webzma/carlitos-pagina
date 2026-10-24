import type { APIRoute } from "astro";
import { buscarParaVerificador } from "../../lib/db";

// Muestra solo el primer nombre y la inicial del apellido
const enmascarar = (nombre: string) => {
  const [n, a] = nombre.split(/\s+/);
  return a ? `${n} ${a[0]}.` : n;
};

export const GET: APIRoute = ({ url }) => {
  const rifa = url.searchParams.get("rifa") ?? "";
  const q = url.searchParams.get("q") ?? "";
  const ordenes = buscarParaVerificador(rifa, q).map((o) => ({
    id: o.id,
    nombre: enmascarar(o.nombre),
    numeros: o.numeros,
    estado: o.estado,
  }));
  return Response.json({ ordenes });
};

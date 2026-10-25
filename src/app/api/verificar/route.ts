import type { NextRequest } from "next/server";
import { buscarParaVerificador } from "@/lib/db";

// Muestra solo el primer nombre y la inicial del apellido
const enmascarar = (nombre: string) => {
  const [n, a] = nombre.split(/\s+/);
  return a ? `${n} ${a[0]}.` : n;
};

export async function GET(request: NextRequest) {
  const rifa = request.nextUrl.searchParams.get("rifa") ?? "";
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const ordenes = (await buscarParaVerificador(rifa, q)).map((o) => ({
    id: o.id,
    nombre: enmascarar(o.nombre),
    numeros: o.numeros,
    estado: o.estado,
  }));
  return Response.json({ ordenes });
}

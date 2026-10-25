import { esAdmin } from "@/lib/auth";
import { obtenerComprobante } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await esAdmin())) return new Response("No autorizado", { status: 401 });

  const comprobante = await obtenerComprobante((await params).id);
  if (!comprobante) return new Response("Sin comprobante", { status: 404 });

  return new Response(comprobante.datos, {
    headers: {
      "Content-Type": comprobante.tipo,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

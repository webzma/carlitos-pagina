import type { APIRoute } from "astro";
import { esAdmin } from "../../../lib/auth";
import { boletosAprobados } from "../../../lib/db";
import { RIFAS } from "../../../data/config";

// Exporta los boletos aprobados de una rifa para cargarlos en la plataforma del sorteo.
//   formato=csv → Excel (separador ";"), una fila por boleto con los datos del comprador
//   formato=txt → un número por línea
export const GET: APIRoute = ({ url, cookies }) => {
  if (!esAdmin(cookies)) return new Response("No autorizado", { status: 401 });

  const rifa = RIFAS.find((r) => r.id === url.searchParams.get("rifa"));
  if (!rifa) return new Response("Selecciona una rifa", { status: 400 });

  const digitos = String(rifa.totalBoletos - 1).length;
  const num = (n: number) => String(n).padStart(digitos, "0");
  const boletos = boletosAprobados(rifa.id);
  const fecha = new Date().toISOString().slice(0, 10);

  if (url.searchParams.get("formato") === "txt") {
    return new Response(boletos.map((b) => num(b.numero)).join("\r\n"), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${rifa.id}-numeros-${fecha}.txt"`,
      },
    });
  }

  const celda = (v: string) => (/[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const filas = [
    ["Boleto", "Nombre", "Cédula", "Teléfono", "Orden"],
    // El número va como ="007" para que Excel no borre los ceros a la izquierda
    ...boletos.map((b) => [`="${num(b.numero)}"`, celda(b.nombre), celda(b.cedula), `+${b.telefono}`, b.orden]),
  ];
  // BOM para que Excel abra bien los acentos
  const csv = "﻿" + filas.map((f) => f.join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${rifa.id}-boletos-${fecha}.csv"`,
    },
  });
};

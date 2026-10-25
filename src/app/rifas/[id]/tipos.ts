import type { Paquete } from "@/data/config";

/** Datos de la rifa que se envían al navegador. */
export interface RifaCliente {
  id: string;
  titulo: string;
  precio: number;
  totalBoletos: number;
  fecha: string;
  paquetes: Paquete[];
}

export interface OrdenPublica {
  id: string;
  nombre: string;
  numeros: number[];
  total?: number;
  estado: "pendiente" | "aprobado" | "rechazado";
}

export const ESTADO_TEXTO: Record<OrdenPublica["estado"], string> = {
  pendiente: "Pendiente de validación",
  aprobado: "Pago aprobado",
  rechazado: "Rechazado",
};

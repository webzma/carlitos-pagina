import type { Paquete } from "../data/config";

/** Total a pagar aplicando el mayor descuento de paquete que alcance la cantidad. */
export function calcularTotal(precio: number, cantidad: number, paquetes: Paquete[]) {
  const desc = Math.max(0, ...paquetes.filter((p) => cantidad >= p.cant).map((p) => p.desc));
  return Math.round(precio * cantidad * (1 - desc) * 100) / 100;
}

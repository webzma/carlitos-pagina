"use server";

import { redirect } from "next/navigation";
import { cerrarSesion, esAdmin, iniciarSesion, passwordValida } from "@/lib/auth";
import { cambiarEstado, ESTADOS, type Estado } from "@/lib/db";

export async function login(formData: FormData) {
  if (!passwordValida(String(formData.get("password") ?? ""))) redirect("/admin?error=1");
  await iniciarSesion();
  redirect("/admin");
}

export async function logout() {
  await cerrarSesion();
  redirect("/admin");
}

/** Cambia el estado de una orden y vuelve al panel conservando los filtros. */
export async function actualizarEstado(formData: FormData) {
  if (!(await esAdmin())) redirect("/admin");

  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "") as Estado;
  const volver = String(formData.get("volver") ?? "/admin");
  const destino = new URL(volver.startsWith("/admin") ? volver : "/admin", "http://x");

  if (!ESTADOS.includes(estado)) {
    destino.searchParams.set("msg", "Estado inválido");
    destino.searchParams.set("tipo", "err");
  } else {
    const r = await cambiarEstado(id, estado);
    destino.searchParams.set("msg", "error" in r ? r.error : `Orden ${id} marcada como ${estado}`);
    destino.searchParams.set("tipo", "error" in r ? "err" : "ok");
  }
  redirect(destino.pathname + destino.search);
}

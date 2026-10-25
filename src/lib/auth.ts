// Sesión del administrador: cookie firmada con HMAC, sin base de datos.

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";

const COOKIE = "admin_session";
const DURACION_MS = 12 * 60 * 60 * 1000; // 12 horas

const firmar = (valor: string) => createHmac("sha256", env.SESSION_SECRET).update(valor).digest("hex");

function iguales(a: string, b: string) {
  const ha = createHmac("sha256", env.SESSION_SECRET).update(a).digest();
  const hb = createHmac("sha256", env.SESSION_SECRET).update(b).digest();
  return timingSafeEqual(ha, hb);
}

export const passwordValida = (password: string) => iguales(password, env.ADMIN_PASSWORD);

export async function iniciarSesion() {
  const expira = String(Date.now() + DURACION_MS);
  (await cookies()).set(COOKIE, `${expira}.${firmar(expira)}`, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: DURACION_MS / 1000,
  });
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE);
}

export async function esAdmin(): Promise<boolean> {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return false;
  const [expira, firma] = valor.split(".");
  if (!expira || !firma || !iguales(firma, firmar(expira))) return false;
  return Number(expira) > Date.now();
}

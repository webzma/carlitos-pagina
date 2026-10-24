// Sesión del administrador: cookie firmada con HMAC, sin base de datos.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { AstroCookies } from "astro";
import { ADMIN_PASSWORD, SESSION_SECRET } from "astro:env/server";

const COOKIE = "admin_session";
const DURACION_MS = 12 * 60 * 60 * 1000; // 12 horas

const firmar = (valor: string) => createHmac("sha256", SESSION_SECRET).update(valor).digest("hex");

function iguales(a: string, b: string) {
  const ha = createHmac("sha256", SESSION_SECRET).update(a).digest();
  const hb = createHmac("sha256", SESSION_SECRET).update(b).digest();
  return timingSafeEqual(ha, hb);
}

export const passwordValida = (password: string) => iguales(password, ADMIN_PASSWORD);

export function iniciarSesion(cookies: AstroCookies) {
  const expira = String(Date.now() + DURACION_MS);
  cookies.set(COOKIE, `${expira}.${firmar(expira)}`, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: import.meta.env.PROD,
    maxAge: DURACION_MS / 1000,
  });
}

export function cerrarSesion(cookies: AstroCookies) {
  cookies.delete(COOKIE, { path: "/" });
}

export function esAdmin(cookies: AstroCookies): boolean {
  const valor = cookies.get(COOKIE)?.value;
  if (!valor) return false;
  const [expira, firma] = valor.split(".");
  if (!expira || !firma || !iguales(firma, firmar(expira))) return false;
  return Number(expira) > Date.now();
}

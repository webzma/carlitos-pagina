import type { APIRoute } from "astro";
import { cerrarSesion } from "../../../lib/auth";

export const POST: APIRoute = ({ cookies, redirect }) => {
  cerrarSesion(cookies);
  return redirect("/admin", 303);
};

import type { APIRoute } from "astro";
import { iniciarSesion, passwordValida } from "../../../lib/auth";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const fd = await request.formData();
  if (!passwordValida(String(fd.get("password") ?? ""))) return redirect("/admin?error=1", 303);
  iniciarSesion(cookies);
  return redirect("/admin", 303);
};

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/auth";
import { AdminFrame } from "../../AdminFrame";
import { FormRifa } from "../FormRifa";

export const metadata: Metadata = { title: "Nueva rifa", robots: { index: false, follow: false } };

export default async function NuevaRifaPage() {
  if (!(await esAdmin())) redirect("/admin");
  return (
    <AdminFrame logueado>
      <main className="container admin-main">
        <h1>NUEVA RIFA</h1>
        <FormRifa />
      </main>
    </AdminFrame>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { esAdmin } from "@/lib/auth";
import { obtenerRifa } from "@/lib/db";
import { AdminFrame } from "../../AdminFrame";
import { FormRifa } from "../FormRifa";

export const metadata: Metadata = { title: "Editar rifa", robots: { index: false, follow: false } };

export default async function EditarRifaPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await esAdmin())) redirect("/admin");
  const rifa = await obtenerRifa((await params).id);
  if (!rifa) notFound();

  return (
    <AdminFrame logueado>
      <main className="container admin-main">
        <h1>EDITAR RIFA</h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          <Link className="link" href={`/rifas/${rifa.id}`} target="_blank">
            /rifas/{rifa.id} ↗
          </Link>
        </p>
        <FormRifa rifa={rifa} />
      </main>
    </AdminFrame>
  );
}

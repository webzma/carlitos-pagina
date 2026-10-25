import Link from "next/link";
import { IconTrophy } from "@tabler/icons-react";
import { logout } from "./actions";

export function AdminFrame({ logueado, children }: { logueado: boolean; children: React.ReactNode }) {
  return (
    <div className="admin-body">
      <header className="admin-top">
        <div className="container">
          <Link href="/admin" className="logo">
            <span className="logo-mark">
              <IconTrophy />
            </span>
            <span>
              PANEL <b>EL TRIUNFO</b>
            </span>
          </Link>
          {logueado && (
            <div className="admin-nav">
              <Link href="/admin">Órdenes</Link>
              <Link href="/admin/rifas">Rifas</Link>
              <form action={logout}>
                <button>Cerrar sesión</button>
              </form>
            </div>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}

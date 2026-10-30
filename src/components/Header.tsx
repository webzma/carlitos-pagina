"use client";

import Link from "next/link";
import { useState } from "react";
import { IconLock, IconMenu2, IconTrophy, IconX } from "@tabler/icons-react";

export type NavLink = { href: string; label: string };

export function Header({ links }: { links: NavLink[] }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <header className="header">
      <div className="container">
        <Link href="/" className="logo">
          <span className="logo-mark">
            <IconTrophy />
          </span>
          <span>
            RIFA <b>EL TRIUNFO</b>
          </span>
        </Link>
        <button className="menu-btn" aria-label="Menú" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
          {abierto ? <IconX /> : <IconMenu2 />}
        </button>
        <nav className={`nav${abierto ? " open" : ""}`}>
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setAbierto(false)}>
              {l.label}
            </a>
          ))}
          <Link href="/admin" className="nav-admin" onClick={() => setAbierto(false)}>
            <IconLock /> Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}

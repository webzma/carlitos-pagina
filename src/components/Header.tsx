"use client";

import Link from "next/link";
import { useState } from "react";

export type NavLink = { href: string; label: string };

export function Header({ links }: { links: NavLink[] }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <header className="header">
      <div className="container">
        <Link href="/" className="logo">
          <span className="logo-mark">🏆</span>
          <span>
            RIFA <b>EL TRIUNFO</b>
          </span>
        </Link>
        <button className="menu-btn" aria-label="Menú" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
          ☰
        </button>
        <nav className={`nav${abierto ? " open" : ""}`}>
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setAbierto(false)}>
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

"use client";

import { useEffect } from "react";

export function Modal({
  abierto,
  onCerrar,
  className = "",
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto, onCerrar]);

  return (
    <div className={`modal${abierto ? " open" : ""}`} onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className={`modal-box ${className}`} role="dialog" aria-modal="true">
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onCerrar}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

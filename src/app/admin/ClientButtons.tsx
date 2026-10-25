"use client";

import { useState } from "react";
import { IconCheck } from "@tabler/icons-react";

/** Botón de envío que pide confirmación antes de enviar el formulario. */
export function ConfirmSubmit({ mensaje, className, children }: { mensaje: string; className?: string; children: React.ReactNode }) {
  return (
    <button className={className} onClick={(e) => !confirm(mensaje) && e.preventDefault()}>
      {children}
    </button>
  );
}

/** Copia la lista de números aprobados (uno por línea) para pegarla en la plataforma del sorteo. */
export function CopyNumbers({ rifaId, disabled }: { rifaId: string; disabled: boolean }) {
  const [texto, setTexto] = useState<React.ReactNode>("Copiar números");

  async function copiar() {
    try {
      const res = await fetch(`/api/admin/exportar?rifa=${encodeURIComponent(rifaId)}&formato=txt`);
      if (!res.ok) throw new Error();
      await navigator.clipboard.writeText(await res.text());
      setTexto(
        <>
          <IconCheck /> Copiado
        </>,
      );
    } catch {
      setTexto("No se pudo copiar");
    }
    setTimeout(() => setTexto("Copiar números"), 2000);
  }

  return (
    <button type="button" className="btn btn-primary btn-sm" disabled={disabled} onClick={copiar}>
      {texto}
    </button>
  );
}

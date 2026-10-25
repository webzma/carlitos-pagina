"use client";

import { toast } from "./Toaster";

export function CopyButton({ texto }: { texto: string }) {
  return (
    <button
      type="button"
      className="copy"
      onClick={() =>
        navigator.clipboard?.writeText(texto).then(
          () => toast(`Copiado: ${texto}`),
          () => toast("No se pudo copiar"),
        )
      }
    >
      Copiar
    </button>
  );
}

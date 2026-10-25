"use client";

import { useEffect, useState } from "react";

const EVENTO = "rifa:toast";

/** Muestra un aviso breve en la parte inferior. Se puede llamar desde cualquier componente de cliente. */
export function toast(mensaje: string) {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: mensaje }));
}

export function Toaster() {
  const [mensaje, setMensaje] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const mostrar = (e: Event) => {
      setMensaje((e as CustomEvent<string>).detail);
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 2400);
    };
    window.addEventListener(EVENTO, mostrar);
    return () => {
      window.removeEventListener(EVENTO, mostrar);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className={`toast${visible ? " show" : ""}`} role="status" aria-live="polite">
      {mensaje}
    </div>
  );
}

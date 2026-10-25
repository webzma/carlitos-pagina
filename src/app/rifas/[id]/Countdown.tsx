"use client";

import { useEffect, useState } from "react";
import { pad } from "@/data/config";

export function Countdown({ fecha }: { fecha: string }) {
  // null hasta montar en el navegador, para no generar diferencias con el HTML del servidor
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    const fin = new Date(fecha).getTime();
    const tick = () => setRestante(Math.max(0, Math.floor((fin - Date.now()) / 1000)));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [fecha]);

  const s = restante ?? 0;
  const partes: [number, string][] = [
    [Math.floor(s / 86400), "Días"],
    [Math.floor(s / 3600) % 24, "Horas"],
    [Math.floor(s / 60) % 60, "Min"],
    [s % 60, "Seg"],
  ];

  return (
    <div className="countdown">
      {partes.map(([v, label]) => (
        <div key={label}>
          <b>{pad(v, 2)}</b>
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}

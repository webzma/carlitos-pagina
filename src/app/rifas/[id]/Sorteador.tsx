"use client";

import { useRef, useState } from "react";
import { toast } from "@/components/Toaster";
import { useRifa } from "./RifaContext";

export function Sorteador() {
  const { rifa, num } = useRifa();
  const [valor, setValor] = useState(() => num(0));
  const [girando, setGirando] = useState(false);
  const ultimo = useRef(valor);

  function iniciar() {
    setGirando(true);
    let t = 0;
    const iv = setInterval(() => {
      ultimo.current = num(Math.floor(Math.random() * rifa.totalBoletos));
      setValor(ultimo.current);
      if (++t > 30) {
        clearInterval(iv);
        setGirando(false);
        toast(`🎉 ¡Salió el ${ultimo.current}!`);
      }
    }, 70);
  }

  return (
    <section className="section alt" id="sorteador">
      <div className="container sorteador">
        <h2 className="section-title">
          SORTEADOR DE <span>BOLETOS</span>
        </h2>
        <p className="section-sub">Simulador: prueba tu suerte antes del sorteo oficial</p>
        <div className="display">{valor}</div>
        <button className="btn btn-dark" onClick={iniciar} disabled={girando}>
          🎲 Iniciar
        </button>
      </div>
    </section>
  );
}

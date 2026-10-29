"use client";

import { useRifa } from "./RifaContext";

export function Disponibles() {
  const { rifa, vendidos } = useRifa();
  return (
    <strong>
      {rifa.totalBoletos - vendidos} / {rifa.totalBoletos}
    </strong>
  );
}

export function Progreso() {
  const { rifa, vendidos } = useRifa();
  const pct = Math.round((vendidos / rifa.totalBoletos) * 100);
  return (
    <>
      <div className="progress">
        <div style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-label" style={{ marginTop: 6 }}>
        <span>Boletos vendidos</span>
        <span>{pct}%</span>
      </div>
    </>
  );
}

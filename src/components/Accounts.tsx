import { CopyButton } from "./CopyButton";
import { CUENTAS } from "@/data/config";

export function Accounts({ subtitle = "Toca “Copiar” para copiar cada dato en tu app del banco." }: { subtitle?: string }) {
  return (
    <section className="section" id="cuentas">
      <div className="container">
        <h2 className="section-title">
          CUENTAS <span>DE PAGO</span>
        </h2>
        <p className="section-sub">{subtitle}</p>
        <div className="accounts">
          {CUENTAS.map((c) => (
            <div className="account" key={c.nombre}>
              <div className="account-head">
                <div className="account-logo" style={{ background: c.color }}>
                  {c.sigla}
                </div>
                <div>
                  <h4>{c.nombre}</h4>
                  <small>{c.sub}</small>
                </div>
              </div>
              {c.datos.map(([k, v]) => (
                <div className="account-row" key={k}>
                  <span>{k}</span>
                  <div>
                    {v} <CopyButton texto={v} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

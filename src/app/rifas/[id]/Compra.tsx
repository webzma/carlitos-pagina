"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { toast } from "@/components/Toaster";
import { CUENTAS, money, waLink } from "@/data/config";
import { calcularTotal } from "@/lib/precios";
import { comprimirImagen } from "@/lib/imagen";
import { Modal } from "./Modal";
import { Ticket } from "./Ticket";
import { useRifa } from "./RifaContext";
import type { OrdenPublica } from "./tipos";

const MAX_ARCHIVO = 4 * 1024 * 1024;
const PAISES = [
  ["58", "🇻🇪"], ["57", "🇨🇴"], ["51", "🇵🇪"], ["56", "🇨🇱"],
  ["1", "🇺🇸"], ["34", "🇪🇸"], ["52", "🇲🇽"], ["593", "🇪🇨"],
];

export function Compra() {
  const { rifa, vendidos, marcarVendidos, num } = useRifa();
  const [seleccion, setSeleccion] = useState<Set<number>>(() => new Set());
  const [soloLibres, setSoloLibres] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [compraAbierta, setCompraAbierta] = useState(false);
  const [ordenOk, setOrdenOk] = useState<OrdenPublica | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [archivo, setArchivo] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const ordenados = useMemo(() => [...seleccion].sort((a, b) => a - b), [seleccion]);
  const total = calcularTotal(rifa.precio, seleccion.size, rifa.paquetes);
  const cerrarCompra = useCallback(() => setCompraAbierta(false), []);
  const cerrarOk = useCallback(() => setOrdenOk(null), []);

  function alternar(n: number) {
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (s.has(n)) s.delete(n);
      else s.add(n);
      return s;
    });
  }

  function elegirAlAzar(cantidad: number, reemplazar = false) {
    const base = reemplazar ? new Set<number>() : new Set(seleccion);
    const libres: number[] = [];
    for (let i = 0; i < rifa.totalBoletos; i++) if (!vendidos.has(i) && !base.has(i)) libres.push(i);
    if (!libres.length) return toast("No quedan boletos disponibles 😢");
    for (let k = 0; k < cantidad && libres.length; k++) {
      base.add(libres.splice(Math.floor(Math.random() * libres.length), 1)[0]);
    }
    setSeleccion(base);
  }

  function buscar() {
    const v = busqueda.trim();
    if (!/^\d+$/.test(v) || +v >= rifa.totalBoletos) {
      return toast(`Ingresa un número entre ${num(0)} y ${rifa.totalBoletos - 1}`);
    }
    const n = +v;
    if (vendidos.has(n)) return toast(`😕 El #${num(n)} ya fue vendido`);
    setSeleccion((prev) => new Set(prev).add(n));
    const b = gridRef.current?.querySelector<HTMLElement>(`[data-n="${n}"]`);
    if (b) {
      b.scrollIntoView({ behavior: "smooth", block: "center" });
      b.classList.add("flash");
      setTimeout(() => b.classList.remove("flash"), 1700);
    }
    toast(`✅ #${num(n)} disponible y agregado`);
  }

  async function confirmar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = new FormData(form);
    const captura = body.get("comprobante");
    const tieneCaptura = captura instanceof File && captura.size > 0;
    if (!tieneCaptura && !String(body.get("referencia") ?? "").trim() && !body.get("despues")) {
      return toast("Sube la captura, escribe la referencia o marca que la enviarás después");
    }

    setEnviando(true);
    try {
      if (tieneCaptura) {
        const comprimida = await comprimirImagen(captura);
        if (comprimida.size > MAX_ARCHIVO) return toast("La captura es muy pesada (máx. 4 MB). Envía una más liviana.");
        body.set("comprobante", comprimida);
      } else {
        body.delete("comprobante");
      }
      body.set("rifa", rifa.id);
      body.set("numeros", ordenados.join(","));

      const res = await fetch("/api/comprar", { method: "POST", body });
      const data = await res.json();

      if (res.status === 409 && Array.isArray(data.conflicto)) {
        // Otro comprador tomó algunos números mientras tanto
        const tomados = data.conflicto as number[];
        marcarVendidos(tomados);
        setSeleccion((prev) => new Set([...prev].filter((n) => !tomados.includes(n))));
        setCompraAbierta(false);
        return toast(`😕 Ya vendieron: ${tomados.map(num).join(", ")}. Elige otros.`);
      }
      if (!res.ok) return toast(data.error ?? "No se pudo registrar la compra");

      const orden = data.orden as OrdenPublica;
      marcarVendidos(orden.numeros);
      setSeleccion(new Set());
      form.reset();
      setArchivo(null);
      setCompraAbierta(false);
      setOrdenOk(orden);
    } catch {
      toast("Error de conexión. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const celdas = [];
  for (let i = 0; i < rifa.totalBoletos; i++) {
    const vendido = vendidos.has(i);
    if (soloLibres && vendido) continue;
    celdas.push(
      <button key={i} className={`num${seleccion.has(i) ? " sel" : ""}`} data-n={i} disabled={vendido}>
        {num(i)}
      </button>,
    );
  }

  return (
    <>
      <div className="packs">
        {rifa.paquetes.map((p) => (
          <button
            key={p.cant}
            className="pack"
            onClick={() => {
              elegirAlAzar(p.cant, true);
              toast(`🎲 ${p.cant} boletos elegidos a la suerte`);
            }}
          >
            {p.tag && <span className="tag">{p.tag}</span>}
            <b>{p.cant}</b>
            <small>boletos</small>
            <span className="price">{money(rifa.precio * p.cant * (1 - p.desc))}</span>
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="picker-tools">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
            inputMode="numeric"
            maxLength={String(rifa.totalBoletos - 1).length}
            placeholder="Busca tu número (ej. 777)"
          />
          <button className="btn btn-ghost" onClick={buscar}>
            Buscar
          </button>
          <button className="btn btn-dark" onClick={() => elegirAlAzar(1)}>
            🎲 Elegir a la suerte
          </button>
          <button className="btn btn-ghost" onClick={() => setSeleccion(new Set())}>
            Limpiar
          </button>
        </div>
        <div className="legend">
          <span><i className="l-free" />Disponible</span>
          <span><i className="l-sel" />Seleccionado</span>
          <span><i className="l-sold" />Vendido</span>
          <label>
            <input type="checkbox" checked={soloLibres} onChange={(e) => setSoloLibres(e.target.checked)} /> Mostrar
            solo disponibles
          </label>
        </div>
        <div
          className="grid-numbers"
          ref={gridRef}
          onClick={(e) => {
            const b = (e.target as HTMLElement).closest<HTMLButtonElement>(".num");
            if (b && !b.disabled) alternar(Number(b.dataset.n));
          }}
        >
          {celdas}
        </div>
      </div>

      <div className="cart">
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="cart-total">
            Seleccionados: <b>{seleccion.size}</b> · Total: <b>{money(total)}</b>
          </div>
          <div className="cart-chips">
            {ordenados.map((n) => (
              <span key={n} title="Quitar" onClick={() => alternar(n)}>
                {num(n)} ✕
              </span>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" disabled={seleccion.size === 0} onClick={() => setCompraAbierta(true)}>
          Continuar →
        </button>
      </div>

      <Modal abierto={compraAbierta} onCerrar={cerrarCompra}>
        <h3>CONFIRMA TU COMPRA</h3>
        <p className="muted">Tus boletos quedan apartados al enviar el formulario mientras validamos el pago.</p>

        <form onSubmit={confirmar}>
          <div className="form-step-title">1 · Datos personales</div>
          <div className="field">
            <label>Nombres y apellidos *</label>
            <input name="nombre" required minLength={3} maxLength={120} />
          </div>
          <div className="field">
            <label>Cédula</label>
            <input name="cedula" inputMode="numeric" maxLength={20} />
          </div>
          <div className="field">
            <label>Teléfono (WhatsApp) *</label>
            <div className="row-2">
              <select name="codigo">
                {PAISES.map(([code, flag]) => (
                  <option key={code} value={code}>
                    {flag} +{code}
                  </option>
                ))}
              </select>
              <input name="telefono" inputMode="numeric" required placeholder="4120000000" maxLength={20} />
            </div>
          </div>
          <div className="field">
            <label>Correo electrónico</label>
            <input name="email" type="email" maxLength={120} />
          </div>

          <div className="form-step-title">2 · Realiza el pago</div>
          {CUENTAS.map((c) => (
            <div className="pay-detail" style={{ marginBottom: 10 }} key={c.nombre}>
              <b>{c.nombre}</b> · {c.sub}
              {c.datos.map(([k, v]) => (
                <div key={k}>
                  {k}: <b>{v}</b> <CopyButton texto={v} />
                </div>
              ))}
              <span className="note">
                Monto a pagar: <b className="red">{money(total)}</b>. Si pagas en bolívares, usa la tasa BCV del día.
              </span>
            </div>
          ))}

          <div className="form-step-title">3 · Comprobante de pago</div>
          <div className="field">
            <label>Número de referencia</label>
            <input name="referencia" inputMode="numeric" maxLength={40} placeholder="Últimos dígitos de la referencia" />
          </div>
          <label className="upload">
            <span>{archivo ? `✅ ${archivo}` : "📎 Toca para subir la captura del pago"}</span>
            <input
              type="file"
              name="comprobante"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => setArchivo(e.target.files?.[0]?.name ?? null)}
            />
          </label>
          <label className="check" style={{ marginTop: 10 }}>
            <input type="checkbox" name="despues" value="1" /> Enviaré el comprobante más tarde por WhatsApp
          </label>

          <div className="summary-box">
            <span>
              {ordenados.length} boleto(s): {ordenados.slice(0, 8).map(num).join(", ")}
              {ordenados.length > 8 ? "…" : ""}
            </span>
            <b>{money(total)}</b>
          </div>

          <label className="check">
            <input type="checkbox" required /> Autorizo el uso de mis datos personales para este sorteo.
          </label>
          <label className="check">
            <input type="checkbox" required /> Acepto los términos y condiciones.
          </label>

          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} disabled={enviando}>
            {enviando ? "Enviando…" : "Confirmar"}
          </button>
        </form>
      </Modal>

      <Modal abierto={ordenOk !== null} onCerrar={cerrarOk} className="success">
        {ordenOk && (
          <>
            <div className="ico">🎉</div>
            <h3>¡BOLETOS REGISTRADOS!</h3>
            <p className="muted">
              {ordenOk.nombre}, tus boletos quedaron apartados. Te confirmaremos por WhatsApp cuando validemos el pago.
            </p>
            <div className="verify-result">
              <Ticket orden={ordenOk} />
            </div>
            <a
              className="btn btn-dark btn-block"
              target="_blank"
              rel="noopener"
              href={waLink(
                `Hola! Compré boletos de ${rifa.titulo} 🏆\nOrden: ${ordenOk.id}\nNombre: ${ordenOk.nombre}\nNúmeros: ${ordenOk.numeros.map(num).join(", ")}\nTotal: ${money(ordenOk.total ?? 0)}`,
              )}
            >
              Enviar comprobante por WhatsApp
            </a>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={cerrarOk}>
              Cerrar
            </button>
          </>
        )}
      </Modal>
    </>
  );
}

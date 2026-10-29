"use client";

import { useCallback, useState } from "react";
import {
  IconArrowRight,
  IconBrandWhatsapp,
  IconCircleCheck,
  IconConfetti,
  IconDice5,
  IconMinus,
  IconPaperclip,
  IconPlus,
} from "@tabler/icons-react";
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
const MAX_BOLETOS = 200; // igual que en /api/comprar
const PAISES = [
  ["58", "VE"], ["57", "CO"], ["51", "PE"], ["56", "CL"],
  ["1", "US"], ["34", "ES"], ["52", "MX"], ["593", "EC"],
];

export function Compra() {
  const { rifa, vendidos, setVendidos } = useRifa();
  const disponibles = rifa.totalBoletos - vendidos;
  const maximo = Math.min(MAX_BOLETOS, disponibles);
  const [cantidad, setCantidad] = useState(1);
  const [compraAbierta, setCompraAbierta] = useState(false);
  const [ordenOk, setOrdenOk] = useState<OrdenPublica | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [archivo, setArchivo] = useState<string | null>(null);

  const total = calcularTotal(rifa.precio, cantidad, rifa.paquetes);
  const sinDescuento = rifa.precio * cantidad;
  const cerrarCompra = useCallback(() => setCompraAbierta(false), []);
  const cerrarOk = useCallback(() => setOrdenOk(null), []);
  const elegir = (n: number) => setCantidad(Math.max(1, Math.min(maximo, Math.floor(n) || 1)));

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
      body.set("cantidad", String(cantidad));

      const res = await fetch("/api/comprar", { method: "POST", body });
      const data = await res.json();

      if (res.status === 409 && typeof data.disponibles === "number") {
        // Otros compradores se llevaron boletos mientras tanto
        setVendidos(rifa.totalBoletos - data.disponibles);
        setCantidad((c) => Math.max(1, Math.min(c, data.disponibles)));
        setCompraAbierta(false);
        return toast(data.error);
      }
      if (!res.ok) return toast(data.error ?? "No se pudo registrar la compra");

      const orden = data.orden as OrdenPublica;
      setVendidos((v) => v + orden.cantidad);
      setCantidad(1);
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

  if (disponibles <= 0) {
    return <p className="section-sub">¡Boletos agotados! Gracias a todos por participar.</p>;
  }

  return (
    <>
      <div className="packs">
        {rifa.paquetes
          .filter((p) => p.cant <= maximo)
          .map((p) => (
            <button
              key={p.cant}
              type="button"
              className={`pack${cantidad === p.cant ? " on" : ""}`}
              aria-pressed={cantidad === p.cant}
              onClick={() => setCantidad(p.cant)}
            >
              {p.tag && <span className="tag">{p.tag}</span>}
              <b>{p.cant}</b>
              <small>{p.cant === 1 ? "boleto" : "boletos"}</small>
              <span className="price">{money(calcularTotal(rifa.precio, p.cant, rifa.paquetes))}</span>
            </button>
          ))}
      </div>

      <div className="panel cantidad">
        <div className="cantidad-fila">
          <label htmlFor="cantidad">¿Cuántos boletos quieres?</label>
          <div className="stepper">
            <button type="button" aria-label="Quitar un boleto" disabled={cantidad <= 1} onClick={() => elegir(cantidad - 1)}>
              <IconMinus />
            </button>
            <input
              id="cantidad"
              type="number"
              inputMode="numeric"
              min={1}
              max={maximo}
              value={cantidad}
              onChange={(e) => elegir(Number(e.target.value))}
            />
            <button type="button" aria-label="Agregar un boleto" disabled={cantidad >= maximo} onClick={() => elegir(cantidad + 1)}>
              <IconPlus />
            </button>
          </div>
        </div>
        <p className="cantidad-nota">
          <IconDice5 /> Tus números se asignan al azar y te llegan por WhatsApp cuando validemos tu pago.
        </p>
      </div>

      <div className="cart">
        <div className="cart-total">
          {cantidad} boleto{cantidad === 1 ? "" : "s"} · Total: <b>{money(total)}</b>
          {total < sinDescuento && <s>{money(sinDescuento)}</s>}
        </div>
        <button className="btn btn-primary" onClick={() => setCompraAbierta(true)}>
          Continuar <IconArrowRight />
        </button>
      </div>

      <Modal abierto={compraAbierta} onCerrar={cerrarCompra}>
        <h3>CONFIRMA TU COMPRA</h3>
        <p className="muted">
          Tus boletos quedan apartados al enviar el formulario. Te enviaremos tus números por WhatsApp cuando validemos el pago.
        </p>

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
                {PAISES.map(([code, pais]) => (
                  <option key={code} value={code}>
                    {pais} +{code}
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
            <span>
              {archivo ? (
                <>
                  <IconCircleCheck /> {archivo}
                </>
              ) : (
                <>
                  <IconPaperclip /> Toca para subir la captura del pago
                </>
              )}
            </span>
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
              {cantidad} boleto{cantidad === 1 ? "" : "s"} (números al azar)
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
            <div className="ico">
              <IconConfetti stroke={1.5} />
            </div>
            <h3>¡BOLETOS REGISTRADOS!</h3>
            <p className="muted">
              {ordenOk.nombre}, tus boletos quedaron apartados. Te enviaremos tus números por WhatsApp cuando validemos el pago.
            </p>
            <div className="verify-result">
              <Ticket orden={ordenOk} />
            </div>
            <a
              className="btn btn-dark btn-block"
              target="_blank"
              rel="noopener"
              href={waLink(
                `Hola! Compré boletos de ${rifa.titulo} 🏆\nOrden: ${ordenOk.id}\nNombre: ${ordenOk.nombre}\nBoletos: ${ordenOk.cantidad}\nTotal: ${money(ordenOk.total ?? 0)}`,
              )}
            >
              <IconBrandWhatsapp /> Enviar comprobante por WhatsApp
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

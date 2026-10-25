"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Rifa } from "@/data/config";
import { ICONOS, claveIcono } from "@/components/IconoPremio";
import { guardarRifa, type EstadoFormRifa } from "./actions";

// Venezuela usa UTC-4 todo el año
const aHoraVE = (iso: string) => new Date(new Date(iso).getTime() - 4 * 3600_000).toISOString().slice(0, 16);

const premiosATexto = (r?: Rifa) =>
  (r?.premios ?? [])
    .map((p) => [p.lugar, claveIcono(p.icono), p.titulo, p.detalle].filter((x, i) => i < 3 || x).join(" | "))
    .join("\n");

const paquetesATexto = (r?: Rifa) =>
  (r?.paquetes ?? []).map((p) => [p.cant, Math.round(p.desc * 100), p.tag].filter((x) => x !== undefined).join(" | ")).join("\n");

export function FormRifa({ rifa }: { rifa?: Rifa }) {
  const [estado, accion, enviando] = useActionState<EstadoFormRifa, FormData>(guardarRifa, { error: "" });
  // Tras un error se muestran los valores enviados en lugar de los originales
  const v = (k: string, inicial: string | number = "") => estado.valores?.[k] ?? String(inicial);

  return (
    <form action={accion} className="rifa-form">
      <input type="hidden" name="modo" value={rifa ? "editar" : "crear"} />
      {rifa && <input type="hidden" name="id" value={rifa.id} />}

      {estado.error && <div className="flash-msg err">{estado.error}</div>}

      <fieldset>
        <legend>Datos generales</legend>
        <div className="grid-form">
          <div className="field span-2">
            <label>Título *</label>
            <input name="titulo" required maxLength={80} defaultValue={v("titulo", rifa?.titulo)} placeholder="Gran Combo 8.0" />
          </div>
          {!rifa && (
            <div className="field">
              <label>Identificador (URL)</label>
              <input name="id" maxLength={60} defaultValue={v("id")} placeholder="Se genera a partir del título" />
              <small className="muted">/rifas/identificador · no se puede cambiar después</small>
            </div>
          )}
          <div className="field span-2">
            <label>Descripción corta *</label>
            <input
              name="descripcion"
              required
              maxLength={200}
              defaultValue={v("descripcion", rifa?.descripcion)}
              placeholder="Moto 0 km + iPhone 16 + $500 en efectivo"
            />
          </div>
          <div className="field">
            <label>Precio por boleto ($) *</label>
            <input name="precio" type="number" min="0.01" step="0.01" required defaultValue={v("precio", rifa?.precio)} />
          </div>
          <div className="field">
            <label>Cantidad de boletos *</label>
            <input
              name="totalBoletos"
              type="number"
              min="10"
              max="10000"
              step="1"
              required
              defaultValue={v("totalBoletos", rifa?.totalBoletos ?? 1000)}
            />
            <small className="muted">Números del 0 al total − 1 (1000 → 000 a 999)</small>
          </div>
          <div className="field">
            <label>Fecha y hora del sorteo (hora de Venezuela) *</label>
            <input name="fecha" type="datetime-local" required defaultValue={v("fecha", rifa ? aHoraVE(rifa.fecha) : "")} />
          </div>
          <div className="field">
            <label>Lotería *</label>
            <input name="loteria" required maxLength={120} defaultValue={v("loteria", rifa?.loteria)} placeholder="Lotería del Táchira (Triple A)" />
          </div>
          <div className="field span-2">
            <label>Ícono</label>
            <div className="icon-picker">
              {Object.entries(ICONOS).map(([clave, { nombre, Icono }]) => (
                <label key={clave} title={nombre}>
                  <input
                    type="radio"
                    name="icono"
                    value={clave}
                    defaultChecked={v("icono", claveIcono(rifa?.icono)) === clave}
                  />
                  <Icono stroke={1.5} />
                  <span>{nombre}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Color de la tarjeta</label>
            <select name="estilo" defaultValue={v("estilo", rifa?.estilo ?? "")}>
              <option value="">Rojo</option>
              <option value="alt">Alternativo</option>
              <option value="gray">Gris</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Estado</legend>
        <div className="grid-form">
          <div className="field">
            <label>Estado</label>
            <select name="estado" defaultValue={v("estado", rifa?.estado ?? "activa")}>
              <option value="activa">Activa (en venta)</option>
              <option value="finalizada">Finalizada</option>
            </select>
          </div>
          <div className="field">
            <label>Ganador (al finalizar)</label>
            <input name="ganador" maxLength={120} defaultValue={v("ganador", rifa?.ganador)} placeholder="#457 — María G." />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Premios</legend>
        <div className="field">
          <label>Uno por línea: Lugar | Icono | Título | Detalle</label>
          <textarea
            name="premios"
            rows={4}
            defaultValue={v("premios", premiosATexto(rifa))}
            placeholder={"1er Premio | moto | Moto Bera SBR 0 km | Con papeles y casco incluido\n2do Premio | celular | iPhone 16 128GB | Nuevo, sellado en caja"}
          />
          <small className="muted">
            Vacío = premio único con la descripción corta. Si el ícono queda vacío se usa el de la rifa.
          </small>
          <details className="icon-keys">
            <summary>Ver claves de íconos</summary>
            <div>
              {Object.entries(ICONOS).map(([clave, { Icono }]) => (
                <span key={clave}>
                  <Icono stroke={1.5} /> {clave}
                </span>
              ))}
            </div>
          </details>
        </div>
      </fieldset>

      <fieldset>
        <legend>Paquetes de boletos</legend>
        <div className="field">
          <label>Uno por línea: Cantidad | Descuento % | Etiqueta (opcional)</label>
          <textarea
            name="paquetes"
            rows={4}
            defaultValue={v("paquetes", paquetesATexto(rifa))}
            placeholder={"2 | 0\n5 | 10 | -10%\n10 | 15 | MÁS VENDIDO\n20 | 20 | -20%"}
          />
          <small className="muted">Vacío = paquetes por defecto (2, 5 con -10%, 10 con -15%, 20 con -20%).</small>
        </div>
      </fieldset>

      <div className="form-actions">
        <Link className="btn btn-ghost" href="/admin/rifas">
          Cancelar
        </Link>
        <button className="btn btn-primary" disabled={enviando}>
          {enviando ? "Guardando…" : rifa ? "Guardar cambios" : "Crear rifa"}
        </button>
      </div>
    </form>
  );
}

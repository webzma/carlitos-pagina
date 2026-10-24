// Lógica de la página de una rifa: selección de números, compra y verificador.
// Los boletos vendidos vienen del servidor y las compras se envían a /api/comprar.

import type { Paquete } from "../data/config";
import { calcularTotal } from "../lib/precios";
import { toast, pad } from "./ui";

interface RifaData {
  id: string;
  titulo: string;
  precio: number;
  totalBoletos: number;
  fecha: string;
  paquetes: Paquete[];
  vendidos: number[];
  whatsapp: string;
  moneda: string;
}

interface OrdenPublica {
  id: string;
  nombre: string;
  numeros: number[];
  total?: number;
  estado: "pendiente" | "aprobado" | "rechazado";
}

const ESTADO_TEXTO = { pendiente: "Pendiente de validación", aprobado: "Pago aprobado", rechazado: "Rechazado" };

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const $$ = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)];
const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function initRifa() {
  const rifa: RifaData = JSON.parse($("#rifa-data")!.textContent!);
  const DIGITS = String(rifa.totalBoletos - 1).length;
  const num = (n: number) => pad(n, DIGITS);
  const money = (n: number) => `${rifa.moneda}${n.toLocaleString("es", { maximumFractionDigits: 2 })}`;
  const waLink = (msg = "") => `https://wa.me/${rifa.whatsapp}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;

  const sold = new Set(rifa.vendidos);
  const selected = new Set<number>();

  // ---------- Resumen ----------
  function updateStats() {
    const pct = Math.round((sold.size / rifa.totalBoletos) * 100);
    $("#r-progress")!.style.width = `${pct}%`;
    $("#r-pct")!.textContent = `${pct}%`;
    $("#r-available")!.textContent = `${rifa.totalBoletos - sold.size} / ${rifa.totalBoletos}`;
  }

  // ---------- Cuenta regresiva ----------
  function tick() {
    const s = Math.floor(Math.max(0, new Date(rifa.fecha).getTime() - Date.now()) / 1000);
    const vals: Record<string, number> = {
      d: Math.floor(s / 86400),
      h: Math.floor(s / 3600) % 24,
      m: Math.floor(s / 60) % 60,
      s: s % 60,
    };
    $$("[data-cd]").forEach((el) => (el.textContent = pad(vals[el.dataset.cd!], 2)));
  }
  tick();
  setInterval(tick, 1000);

  // ---------- Verificador ----------
  const ticketHTML = (o: OrdenPublica) => `<div class="ticket">
    <div>
      <div style="font-weight:700">${escape(o.nombre)} <small style="color:var(--muted)">· Orden ${o.id}</small></div>
      <div class="nums" style="margin-top:6px">${o.numeros.map((n) => `<b>${num(n)}</b>`).join("")}</div>
    </div>
    <span class="status ${o.estado}">${ESTADO_TEXTO[o.estado]}</span>
  </div>`;

  $("#verify-form")!.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = $<HTMLInputElement>("#verify-input")!.value.replace(/\D/g, "");
    const out = $("#verify-result")!;
    if (!q) return;
    out.innerHTML = `<p style="color:var(--muted);text-align:center">Buscando…</p>`;
    try {
      const res = await fetch(`/api/verificar?rifa=${encodeURIComponent(rifa.id)}&q=${q}`);
      const { ordenes } = (await res.json()) as { ordenes: OrdenPublica[] };
      out.innerHTML = ordenes.length
        ? ordenes.map(ticketHTML).join("")
        : `<p style="color:var(--muted);text-align:center">No encontramos boletos con ese dato. ¿Dudas? <a href="${waLink()}" target="_blank" class="red">Escríbenos</a></p>`;
    } catch {
      out.innerHTML = `<p style="color:var(--muted);text-align:center">No se pudo consultar. Intenta de nuevo.</p>`;
    }
  });

  // ---------- Sorteador ----------
  $("#btn-draw")!.addEventListener("click", (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const display = $("#draw-display")!;
    btn.disabled = true;
    let t = 0;
    const iv = setInterval(() => {
      display.textContent = num(Math.floor(Math.random() * rifa.totalBoletos));
      if (++t > 30) {
        clearInterval(iv);
        btn.disabled = false;
        toast(`🎉 ¡Salió el ${display.textContent}!`);
      }
    }, 70);
  });

  // ---------- Modales ----------
  const openModal = (id: string) => $(id)!.classList.add("open");
  const closeModals = () => $$(".modal").forEach((m) => m.classList.remove("open"));
  document.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.matches("[data-close]") || t.classList.contains("modal")) closeModals();
  });
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeModals());

  // Rifa finalizada: no hay zona de compra
  const grid = $("#grid");
  if (!grid) return;

  // ---------- Cuadrícula ----------
  const onlyFree = $<HTMLInputElement>("#only-free")!;
  function renderGrid() {
    let html = "";
    for (let i = 0; i < rifa.totalBoletos; i++) {
      const isSold = sold.has(i);
      if (onlyFree.checked && isSold) continue;
      html += `<button class="num${selected.has(i) ? " sel" : ""}" data-n="${i}" ${isSold ? "disabled" : ""}>${num(i)}</button>`;
    }
    grid!.innerHTML = html;
  }
  renderGrid();
  onlyFree.addEventListener("change", renderGrid);

  grid.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>(".num");
    if (!b || b.disabled) return;
    const n = +b.dataset.n!;
    selected.has(n) ? selected.delete(n) : selected.add(n);
    b.classList.toggle("sel");
    updateCart();
  });

  function pickRandom(qty: number) {
    const free: number[] = [];
    for (let i = 0; i < rifa.totalBoletos; i++) if (!sold.has(i) && !selected.has(i)) free.push(i);
    if (!free.length) return toast("No quedan boletos disponibles 😢");
    for (let k = 0; k < qty && free.length; k++) {
      selected.add(free.splice(Math.floor(Math.random() * free.length), 1)[0]);
    }
    renderGrid();
    updateCart();
  }

  $("#packs")!.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-pack]");
    if (!b) return;
    const p = rifa.paquetes[+b.dataset.pack!];
    selected.clear();
    pickRandom(p.cant);
    toast(`🎲 ${p.cant} boletos elegidos a la suerte`);
  });
  $("#btn-lucky")!.addEventListener("click", () => pickRandom(1));
  $("#btn-clear")!.addEventListener("click", () => {
    selected.clear();
    renderGrid();
    updateCart();
  });

  // ---------- Buscador ----------
  const search = $<HTMLInputElement>("#search")!;
  function searchNumber() {
    const v = search.value.trim();
    if (!/^\d+$/.test(v) || +v >= rifa.totalBoletos)
      return toast(`Ingresa un número entre ${num(0)} y ${rifa.totalBoletos - 1}`);
    const n = +v;
    if (sold.has(n)) return toast(`😕 El #${num(n)} ya fue vendido`);
    const b = grid!.querySelector<HTMLElement>(`[data-n="${n}"]`);
    if (b) {
      b.scrollIntoView({ behavior: "smooth", block: "center" });
      b.classList.add("flash", "sel");
      setTimeout(() => b.classList.remove("flash"), 1700);
    }
    selected.add(n);
    updateCart();
    toast(`✅ #${num(n)} disponible y agregado`);
  }
  $("#btn-search")!.addEventListener("click", searchNumber);
  search.addEventListener("keydown", (e) => e.key === "Enter" && searchNumber());

  // ---------- Carrito ----------
  const total = () => calcularTotal(rifa.precio, selected.size, rifa.paquetes);
  const sortedSelection = () => [...selected].sort((a, b) => a - b);

  function updateCart() {
    $("#sel-count")!.textContent = String(selected.size);
    $("#sel-total")!.textContent = money(total());
    $("#chips")!.innerHTML = sortedSelection()
      .map((n) => `<span data-rm="${n}" title="Quitar">${num(n)} ✕</span>`)
      .join("");
    $<HTMLButtonElement>("#btn-continue")!.disabled = selected.size === 0;
  }
  $("#chips")!.addEventListener("click", (e) => {
    const c = (e.target as HTMLElement).closest<HTMLElement>("[data-rm]");
    if (!c) return;
    selected.delete(+c.dataset.rm!);
    grid!.querySelector(`[data-n="${c.dataset.rm}"]`)?.classList.remove("sel");
    updateCart();
  });

  // ---------- Compra ----------
  $("#btn-continue")!.addEventListener("click", () => {
    const nums = sortedSelection().map(num);
    $("#sum-nums")!.textContent = `${nums.length} boleto(s): ${nums.slice(0, 8).join(", ")}${nums.length > 8 ? "…" : ""}`;
    $("#sum-total")!.textContent = money(total());
    $$(".pay-amount").forEach((el) => (el.textContent = money(total())));
    openModal("#modal-buy");
  });

  const upload = $<HTMLInputElement>("#upload")!;
  const uploadText = $("#upload-text")!;
  const UPLOAD_DEFAULT = uploadText.textContent!;
  upload.addEventListener("change", () => {
    const f = upload.files?.[0];
    uploadText.textContent = f ? `✅ ${f.name}` : UPLOAD_DEFAULT;
  });

  const form = $<HTMLFormElement>("#buy-form")!;
  const confirmBtn = $<HTMLButtonElement>("#btn-confirm")!;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const referencia = (form.elements.namedItem("referencia") as HTMLInputElement).value.trim();
    if (!upload.files?.length && !referencia && !$<HTMLInputElement>("#later")!.checked) {
      return toast("Sube la captura, escribe la referencia o marca que la enviarás después");
    }

    $<HTMLInputElement>("#f-numeros")!.value = sortedSelection().join(",");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Enviando…";

    try {
      const res = await fetch("/api/comprar", { method: "POST", body: new FormData(form) });
      const data = await res.json();

      if (res.status === 409 && data.conflicto) {
        // Otro comprador tomó algunos números mientras tanto
        (data.conflicto as number[]).forEach((n) => {
          sold.add(n);
          selected.delete(n);
        });
        renderGrid();
        updateCart();
        updateStats();
        closeModals();
        return toast(`😕 Ya vendieron: ${(data.conflicto as number[]).map(num).join(", ")}. Elige otros.`);
      }
      if (!res.ok) return toast(data.error ?? "No se pudo registrar la compra");

      const orden = data.orden as OrdenPublica;
      orden.numeros.forEach((n) => sold.add(n));
      selected.clear();
      renderGrid();
      updateCart();
      updateStats();

      form.reset();
      uploadText.textContent = UPLOAD_DEFAULT;

      $("#ok-msg")!.textContent = `${orden.nombre}, tus boletos quedaron apartados. Te confirmaremos por WhatsApp cuando validemos el pago.`;
      $("#ok-ticket")!.innerHTML = ticketHTML(orden);
      $<HTMLAnchorElement>("#ok-wa")!.href = waLink(
        `Hola! Compré boletos de ${rifa.titulo} 🏆\nOrden: ${orden.id}\nNombre: ${orden.nombre}\nNúmeros: ${orden.numeros.map(num).join(", ")}\nTotal: ${money(orden.total ?? 0)}`,
      );
      closeModals();
      openModal("#modal-ok");
    } catch {
      toast("Error de conexión. Intenta de nuevo.");
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirmar";
    }
  });

  updateCart();
}

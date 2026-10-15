// Lógica de la página de una rifa.
// Demo sin backend: las compras se guardan en localStorage del navegador.

import type { Cuenta, Paquete } from "../data/config";
import { toast, pad } from "./ui";

interface RifaData {
  id: string;
  titulo: string;
  precio: number;
  totalBoletos: number;
  vendidosPct: number;
  fecha: string;
  paquetes: Paquete[];
  cuentas: Cuenta[];
  whatsapp: string;
  moneda: string;
}

interface Compra {
  id: string;
  nombre: string;
  telefono: string;
  telefonoLocal: string;
  pago: string;
  numeros: number[];
  total: number;
  fecha: string;
}

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const $$ = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)];

export function initRifa() {
  const rifa: RifaData = JSON.parse($("#rifa-data")!.textContent!);
  const DIGITS = String(rifa.totalBoletos - 1).length;
  const STORE_KEY = `trebol_compras_${rifa.id}`;
  const num = (n: number) => pad(n, DIGITS);
  const money = (n: number) => `${rifa.moneda}${n.toLocaleString("es", { maximumFractionDigits: 2 })}`;
  const waLink = (msg = "") => `https://wa.me/${rifa.whatsapp}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;

  // ---------- Almacenamiento ----------
  const loadPurchases = (): Compra[] => {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
    } catch {
      return [];
    }
  };
  const savePurchases = (list: Compra[]) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
    } catch {}
  };

  // Boletos vendidos de demo: pseudoaleatorio estable por rifa
  const sold = new Set<number>();
  let seed = [...rifa.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < rifa.totalBoletos; i++) if (rand() < rifa.vendidosPct) sold.add(i);
  loadPurchases().forEach((p) => p.numeros.forEach((n) => sold.add(n)));

  const selected = new Set<number>();

  // ---------- Resumen ----------
  function updateStats() {
    const pct = Math.round((sold.size / rifa.totalBoletos) * 100);
    $("#r-progress")!.style.width = `${pct}%`;
    $("#r-pct")!.textContent = `${pct}%`;
    $("#r-available")!.textContent = `${rifa.totalBoletos - sold.size} / ${rifa.totalBoletos}`;
  }
  updateStats();

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
  const ticketHTML = (c: Compra) => `<div class="ticket">
    <div>
      <div style="font-weight:700">${c.nombre} <small style="color:var(--muted)">· Orden ${c.id}</small></div>
      <div class="nums" style="margin-top:6px">${c.numeros.map((n) => `<b>${num(n)}</b>`).join("")}</div>
    </div>
    <span class="status pending">Pendiente de validación</span>
  </div>`;

  $("#verify-form")!.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $<HTMLInputElement>("#verify-input")!.value.replace(/\D/g, "");
    const out = $("#verify-result")!;
    if (!q) return;
    const asTicket = q.length <= DIGITS ? +q : null;
    const found = loadPurchases().filter(
      (c) => c.telefono.endsWith(q) || c.telefonoLocal === q || (asTicket !== null && c.numeros.includes(asTicket)),
    );
    if (found.length) {
      out.innerHTML = found.map(ticketHTML).join("");
    } else if (asTicket !== null && sold.has(asTicket)) {
      out.innerHTML = `<div class="ticket"><div>Boleto <b style="color:var(--gold)">#${num(asTicket)}</b> registrado a otro participante.</div><span class="status ok">Vendido</span></div>`;
    } else {
      out.innerHTML = `<p style="color:var(--muted);text-align:center">No encontramos boletos con ese dato. ¿Dudas? <a href="${waLink()}" target="_blank" style="color:var(--gold)">Escríbenos</a></p>`;
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
    toast(`🍀 ${p.cant} boletos elegidos a la suerte`);
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
  function total() {
    const qty = selected.size;
    const best = rifa.paquetes.filter((p) => qty >= p.cant).sort((a, b) => b.desc - a.desc)[0];
    return rifa.precio * qty * (1 - (best?.desc ?? 0));
  }
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
    openModal("#modal-buy");
  });

  const payDetail = $("#pay-detail")!;
  $("#pay-opts")!.addEventListener("change", (e) => {
    const c = rifa.cuentas[+(e.target as HTMLInputElement).value];
    payDetail.innerHTML =
      `<b>${c.nombre}</b> · ${c.sub}<br>` +
      c.datos
        .map(([k, v]) => `${k}: <b>${v}</b> <button type="button" class="copy" data-copy="${v}">Copiar</button>`)
        .join("<br>") +
      `<br><span style="color:var(--gold)">Monto a pagar: <b>${money(total())}</b></span>`;
    payDetail.classList.add("show");
  });

  const upload = $<HTMLInputElement>("#upload")!;
  const uploadText = $("#upload-text")!;
  const UPLOAD_DEFAULT = uploadText.textContent!;
  upload.addEventListener("change", () => {
    const f = upload.files?.[0];
    if (f) uploadText.textContent = `✅ ${f.name}`;
  });

  $<HTMLFormElement>("#buy-form")!.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    if (!upload.files?.length && !$<HTMLInputElement>("#later")!.checked) {
      return toast("Sube el comprobante o marca que lo enviarás más tarde");
    }
    const fd = new FormData(form);
    const telefonoLocal = String(fd.get("telefono")).replace(/\D/g, "");
    const compra: Compra = {
      id: Date.now().toString(36).toUpperCase(),
      nombre: String(fd.get("nombre")),
      telefono: `${fd.get("codigo")}${telefonoLocal}`,
      telefonoLocal,
      pago: rifa.cuentas[+String(fd.get("pago"))].nombre,
      numeros: sortedSelection(),
      total: total(),
      fecha: new Date().toISOString(),
    };
    savePurchases([...loadPurchases(), compra]);
    compra.numeros.forEach((n) => sold.add(n));
    selected.clear();
    renderGrid();
    updateCart();
    updateStats();

    form.reset();
    payDetail.classList.remove("show");
    uploadText.textContent = UPLOAD_DEFAULT;

    $("#ok-msg")!.textContent = `${compra.nombre}, tus boletos quedaron apartados. Te confirmaremos por WhatsApp cuando validemos el pago.`;
    $("#ok-ticket")!.innerHTML = ticketHTML(compra);
    $<HTMLAnchorElement>("#ok-wa")!.href = waLink(
      `Hola! Compré boletos de ${rifa.titulo} 🍀\nOrden: ${compra.id}\nNombre: ${compra.nombre}\nNúmeros: ${compra.numeros.map(num).join(", ")}\nTotal: ${money(compra.total)} (${compra.pago})`,
    );
    closeModals();
    openModal("#modal-ok");
  });

  updateCart();
}

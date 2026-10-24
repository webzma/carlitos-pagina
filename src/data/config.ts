// =====================================================
//  CONFIGURACIÓN DEMO — cambia aquí marca, rifas y cuentas
// =====================================================

export interface Premio {
  lugar: string;
  icono: string;
  titulo: string;
  detalle: string;
}

export interface Paquete {
  cant: number;
  desc: number; // 0.1 = 10% de descuento
  tag?: string;
}

export interface Rifa {
  id: string;
  titulo: string;
  icono: string;
  descripcion: string;
  precio: number;
  totalBoletos: number;
  fecha: string;
  loteria: string;
  estado: "activa" | "finalizada";
  ganador?: string;
  estilo?: "" | "alt" | "gray";
  premios?: Premio[];
  paquetes?: Paquete[];
}

export interface Cuenta {
  nombre: string;
  sub: string;
  color: string;
  sigla: string;
  datos: [string, string][];
}

export const SITE = {
  marca: "Rifa El Triunfo",
  ciudad: "Venezuela",
  whatsapp: "584245983346", // solo números, con código de país
  email: "ctortozalugo@gmail.com",
  instagram: "#",
  tiktok: "#",
  moneda: "$",
};

const PAQUETES_DEFAULT: Paquete[] = [
  { cant: 2, desc: 0 },
  { cant: 5, desc: 0.1, tag: "-10%" },
  { cant: 10, desc: 0.15, tag: "MÁS VENDIDO" },
  { cant: 20, desc: 0.2, tag: "-20%" },
];

export const RIFAS: Rifa[] = [
  {
    id: "gran-combo-7",
    titulo: "Gran Combo 7.0",
    icono: "🏍️",
    descripcion: "Moto 0 km + iPhone 16 + $500 en efectivo",
    precio: 2,
    totalBoletos: 1000,
    fecha: "2026-10-31T21:00:00",
    loteria: "Lotería del Táchira (Triple A)",
    estado: "activa",
    premios: [
      { lugar: "1er Premio", icono: "🏍️", titulo: "Moto Bera SBR 0 km", detalle: "Con papeles y casco incluido" },
      { lugar: "2do Premio", icono: "📱", titulo: "iPhone 16 128GB", detalle: "Nuevo, sellado en caja" },
      { lugar: "3er Premio", icono: "💵", titulo: "$500 en efectivo", detalle: "Pago móvil, Zelle o Binance" },
    ],
  },
  {
    id: "dolares-express",
    titulo: "Dólares Express",
    icono: "💰",
    descripcion: "$1.000 directos a tu cuenta",
    precio: 1,
    totalBoletos: 1000,
    fecha: "2026-11-08T21:00:00",
    loteria: "Lotería de Oriente",
    estado: "activa",
    estilo: "alt",
  },
  {
    id: "gran-combo-6",
    titulo: "Gran Combo 6.0",
    icono: "📺",
    descripcion: 'Smart TV 65" + PS5',
    precio: 2,
    totalBoletos: 1000,
    fecha: "2026-10-10T21:00:00",
    loteria: "Lotería del Táchira",
    estado: "finalizada",
    ganador: "#457 — María G.",
    estilo: "gray",
  },
  {
    id: "gran-combo-5",
    titulo: "Gran Combo 5.0",
    icono: "🚗",
    descripcion: "Chevrolet Aveo 2015",
    precio: 5,
    totalBoletos: 1000,
    fecha: "2026-09-20T21:00:00",
    loteria: "Lotería del Zulia",
    estado: "finalizada",
    ganador: "#082 — José R.",
    estilo: "gray",
  },
];

export const CUENTAS: Cuenta[] = [
  {
    nombre: "Pago Móvil",
    sub: "Banco de Venezuela (0102)",
    color: "#d90429",
    sigla: "PM",
    datos: [
      ["Banco", "Banco de Venezuela"],
      ["Cédula", "31050248"],
      ["Teléfono", "04245983346"],
      ["Email", "ctortozalugo@gmail.com"],
    ],
  },
];

// ---------- Helpers ----------
export const premiosDe = (r: Rifa): Premio[] =>
  r.premios ?? [{ lugar: "Premio único", icono: r.icono, titulo: r.descripcion, detalle: r.loteria }];

export const paquetesDe = (r: Rifa): Paquete[] => r.paquetes ?? PAQUETES_DEFAULT;

export const money = (n: number) =>
  `${SITE.moneda}${Number(n).toLocaleString("es", { maximumFractionDigits: 2 })}`;

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

export const waLink = (msg = "") =>
  `https://wa.me/${SITE.whatsapp}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;

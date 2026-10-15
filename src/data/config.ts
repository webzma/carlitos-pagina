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
  vendidosPct: number; // demo: % de boletos ocupados
  fecha: string;
  loteria: string;
  estado: "activa" | "finalizada";
  ganador?: string;
  estilo?: "" | "gold" | "gray";
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
  marca: "Sorteos El Trébol",
  ciudad: "Caracas, Venezuela",
  whatsapp: "584120000000", // solo números, con código de país
  email: "contacto@eltrebol.com",
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
    vendidosPct: 0.62,
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
    vendidosPct: 0.35,
    fecha: "2026-11-08T21:00:00",
    loteria: "Lotería de Oriente",
    estado: "activa",
    estilo: "gold",
  },
  {
    id: "gran-combo-6",
    titulo: "Gran Combo 6.0",
    icono: "📺",
    descripcion: 'Smart TV 65" + PS5',
    precio: 2,
    totalBoletos: 1000,
    vendidosPct: 1,
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
    vendidosPct: 1,
    fecha: "2026-09-20T21:00:00",
    loteria: "Lotería del Zulia",
    estado: "finalizada",
    ganador: "#082 — José R.",
    estilo: "gray",
  },
];

export const CUENTAS: Cuenta[] = [
  { nombre: "Pago Móvil", sub: "Banco de Venezuela", color: "#c8102e", sigla: "PM",
    datos: [["Teléfono", "0412-000-0000"], ["Cédula", "V-00.000.000"], ["Titular", "Nombre Apellido"]] },
  { nombre: "Zelle", sub: "Estados Unidos", color: "#6d1ed4", sigla: "Z",
    datos: [["Correo", "pagos@eltrebol.com"], ["Titular", "Nombre Apellido"]] },
  { nombre: "Binance", sub: "USDT · Binance Pay", color: "#f0b90b", sigla: "B",
    datos: [["Pay ID", "000000000"], ["Titular", "Nombre Apellido"]] },
  { nombre: "Nequi", sub: "Colombia", color: "#e6007e", sigla: "N",
    datos: [["Número", "300 000 0000"], ["Titular", "Nombre Apellido"]] },
  { nombre: "Yape", sub: "Perú", color: "#742284", sigla: "Y",
    datos: [["Número", "900 000 000"], ["Titular", "Nombre Apellido"]] },
  { nombre: "Bizum", sub: "España", color: "#05c3dd", sigla: "BZ",
    datos: [["Teléfono", "+34 600 000 000"], ["Titular", "Nombre Apellido"]] },
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

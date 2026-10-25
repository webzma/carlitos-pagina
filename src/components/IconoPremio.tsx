import {
  IconAirConditioning, IconArmchair, IconBed, IconBike, IconCamera, IconCar, IconCash, IconCoins, IconCreditCard,
  IconCrown, IconDeviceGamepad2, IconDeviceLaptop, IconDeviceMobile, IconDeviceSpeaker, IconDeviceTv, IconDeviceWatch,
  IconDiamond, IconFridge, IconGift, IconHeadphones, IconHome, IconMicrowave, IconMoneybag, IconMotorbike,
  IconPerfume, IconPlane, IconScooter, IconShirt, IconShoppingCart, IconStar, IconTicket, IconTool, IconTrophy,
  IconTruck, IconWashMachine,
  type Icon,
} from "@tabler/icons-react";

/** Íconos que el admin puede elegir para una rifa o un premio (se guarda la clave). */
export const ICONOS = {
  regalo: { nombre: "Regalo", Icono: IconGift },
  trofeo: { nombre: "Trofeo", Icono: IconTrophy },
  moto: { nombre: "Moto", Icono: IconMotorbike },
  scooter: { nombre: "Scooter", Icono: IconScooter },
  carro: { nombre: "Carro", Icono: IconCar },
  camioneta: { nombre: "Camioneta", Icono: IconTruck },
  bicicleta: { nombre: "Bicicleta", Icono: IconBike },
  celular: { nombre: "Celular", Icono: IconDeviceMobile },
  laptop: { nombre: "Laptop", Icono: IconDeviceLaptop },
  tv: { nombre: "TV", Icono: IconDeviceTv },
  consola: { nombre: "Consola", Icono: IconDeviceGamepad2 },
  audifonos: { nombre: "Audífonos", Icono: IconHeadphones },
  corneta: { nombre: "Corneta", Icono: IconDeviceSpeaker },
  reloj: { nombre: "Reloj", Icono: IconDeviceWatch },
  camara: { nombre: "Cámara", Icono: IconCamera },
  efectivo: { nombre: "Efectivo", Icono: IconCash },
  dinero: { nombre: "Bolsa de dinero", Icono: IconMoneybag },
  monedas: { nombre: "Monedas", Icono: IconCoins },
  tarjeta: { nombre: "Tarjeta", Icono: IconCreditCard },
  compras: { nombre: "Compras", Icono: IconShoppingCart },
  casa: { nombre: "Casa", Icono: IconHome },
  viaje: { nombre: "Viaje", Icono: IconPlane },
  nevera: { nombre: "Nevera", Icono: IconFridge },
  lavadora: { nombre: "Lavadora", Icono: IconWashMachine },
  aire: { nombre: "Aire acondicionado", Icono: IconAirConditioning },
  microondas: { nombre: "Microondas", Icono: IconMicrowave },
  cama: { nombre: "Cama", Icono: IconBed },
  mueble: { nombre: "Mueble", Icono: IconArmchair },
  joya: { nombre: "Joya", Icono: IconDiamond },
  perfume: { nombre: "Perfume", Icono: IconPerfume },
  ropa: { nombre: "Ropa", Icono: IconShirt },
  herramientas: { nombre: "Herramientas", Icono: IconTool },
  corona: { nombre: "Corona", Icono: IconCrown },
  estrella: { nombre: "Estrella", Icono: IconStar },
  boleto: { nombre: "Boleto", Icono: IconTicket },
} satisfies Record<string, { nombre: string; Icono: Icon }>;

export type ClaveIcono = keyof typeof ICONOS;
export const ICONO_DEFECTO: ClaveIcono = "regalo";

// Rifas guardadas antes de usar Tabler tenían emojis
const EMOJIS: Record<string, ClaveIcono> = {
  "🏍": "moto", "🛵": "scooter", "🚗": "carro", "🚙": "camioneta", "🚲": "bicicleta", "📱": "celular",
  "💻": "laptop", "📺": "tv", "🎮": "consola", "🎧": "audifonos", "⌚": "reloj", "📷": "camara", "💵": "efectivo",
  "💰": "dinero", "🪙": "monedas", "💳": "tarjeta", "🏠": "casa", "✈": "viaje", "💎": "joya", "🏆": "trofeo",
  "👑": "corona", "⭐": "estrella", "🎟": "boleto", "🎁": "regalo",
};

export const esIcono = (v: string): v is ClaveIcono => Object.hasOwn(ICONOS, v);

/** Clave válida para un valor guardado (clave, emoji antiguo o vacío). */
export function claveIcono(valor: string | undefined): ClaveIcono {
  const v = (valor ?? "").trim();
  if (esIcono(v)) return v;
  return EMOJIS[v.replace(/️/g, "")] ?? ICONO_DEFECTO;
}

export function IconoPremio({ icono, className, stroke = 1.5 }: { icono?: string; className?: string; stroke?: number }) {
  const { Icono, nombre } = ICONOS[claveIcono(icono)];
  return <Icono className={className} stroke={stroke} aria-label={nombre} role="img" />;
}

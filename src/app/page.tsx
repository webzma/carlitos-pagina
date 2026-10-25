import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { RaffleCard } from "@/components/RaffleCard";
import { Accounts } from "@/components/Accounts";
import { Faq } from "@/components/Faq";
import { SITE, money } from "@/data/config";
import { conteoVendidos, listarRifas } from "@/lib/db";

// Lee la base de datos en cada visita (los vendidos cambian constantemente)
export const dynamic = "force-dynamic";

const LINKS = [
  { href: "#inicio", label: "INICIO" },
  { href: "#rifas", label: "RIFAS" },
  { href: "#como", label: "CÓMO PARTICIPAR" },
  { href: "#cuentas", label: "CUENTAS DE PAGO" },
  { href: "#preguntas", label: "PREGUNTAS" },
  { href: "#contacto", label: "CONTACTO" },
];

const PASOS = [
  ["Elige tu rifa", "Selecciona la rifa activa que más te guste."],
  ["Escoge tus números", "Búscalos en la lista o deja que la suerte elija por ti."],
  ["Paga y sube tu comprobante", "Haz el Pago Móvil y adjunta la captura con la referencia."],
  ["¡Espera el sorteo!", "Verifica tus boletos y sigue el resultado con la lotería oficial."],
];

export default async function Home() {
  const [rifas, vendidos] = await Promise.all([listarRifas(), conteoVendidos()]);
  const activas = rifas.filter((r) => r.estado === "activa");
  const finalizadas = rifas.filter((r) => r.estado !== "activa");
  const destacada = activas[0] ?? rifas[0];
  const precioMin = Math.min(...(activas.length ? activas : rifas).map((r) => r.precio));

  return (
    <SiteShell links={LINKS}>
      <section className="hero" id="inicio">
        <div className="container">
          <div>
            <div className="hero-tag">📍 {SITE.ciudad} · Sorteos con lotería oficial</div>
            <h1>
              RIFA<span>EL TRIUNFO</span>
            </h1>
            <p>
              Elige tus números de la suerte, paga por Pago Móvil y sigue el sorteo en vivo. ¡Tu próximo premio puede
              estar a un boleto de distancia!
            </p>
            <div className="hero-actions">
              <Link href={destacada ? `/rifas/${destacada.id}` : "#rifas"} className="btn btn-primary">
                🎟️ Comprar boletos
              </Link>
              {destacada && (
                <Link href={`/rifas/${destacada.id}#verificador`} className="btn btn-ghost">
                  Verificar mis boletos
                </Link>
              )}
            </div>
          </div>
          <div className="hero-art">
            <div className="big">🏆</div>
            {destacada && (
              <>
                <div className="chip c1">
                  {destacada.icono} {destacada.descripcion.split("+")[0].trim()}
                  <small>{destacada.titulo}</small>
                </div>
                <div className="chip c2">
                  Desde {money(precioMin)}
                  <small>por boleto</small>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="container">
        <div className="stats">
          <div className="stat">
            <strong>+120</strong>
            <span>Sorteos realizados</span>
          </div>
          <div className="stat">
            <strong>+8.500</strong>
            <span>Ganadores felices</span>
          </div>
          <div className="stat">
            <strong>24/7</strong>
            <span>Atención por WhatsApp</span>
          </div>
          <div className="stat">
            <strong>100%</strong>
            <span>Transparente</span>
          </div>
        </div>
      </div>

      <section className="section" id="rifas">
        <div className="container">
          <h2 className="section-title">
            RIFAS <span>DISPONIBLES</span>
          </h2>
          <p className="section-sub">¡Participa! Los boletos vuelan 🔥</p>
          {activas.length ? (
            <div className="cards">
              {activas.map((r) => (
                <RaffleCard key={r.id} rifa={r} vendidos={vendidos[r.id] ?? 0} />
              ))}
            </div>
          ) : (
            <p className="section-sub">Pronto anunciaremos una nueva rifa. ¡Mantente atento!</p>
          )}

          {finalizadas.length > 0 && (
            <>
              <h2 className="section-title" style={{ marginTop: 72 }}>
                RIFAS <span>FINALIZADAS</span>
              </h2>
              <p className="section-sub">Conoce a nuestros últimos ganadores</p>
              <div className="cards">
                {finalizadas.map((r) => (
                  <RaffleCard key={r.id} rifa={r} vendidos={vendidos[r.id] ?? 0} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="section alt" id="como">
        <div className="container">
          <h2 className="section-title">
            ¿CÓMO <span>PARTICIPAR?</span>
          </h2>
          <p className="section-sub">En 4 pasos sencillos</p>
          <div className="steps">
            {PASOS.map(([t, d], i) => (
              <div className="step" key={t}>
                <div className="n">{i + 1}</div>
                <h4>{t}</h4>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Accounts />
      <Faq />
    </SiteShell>
  );
}

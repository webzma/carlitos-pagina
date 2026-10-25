import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { Accounts } from "@/components/Accounts";
import { premiosDe, paquetesDe, money, fmtDate } from "@/data/config";
import { obtenerRifa, vendidos } from "@/lib/db";
import { RifaProvider } from "./RifaContext";
import { Disponibles, Progreso } from "./Disponibilidad";
import { Countdown } from "./Countdown";
import { Compra } from "./Compra";
import { Verificador } from "./Verificador";
import { Sorteador } from "./Sorteador";
import type { RifaCliente } from "./tipos";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/", label: "INICIO" },
  { href: "#boletos", label: "BOLETOS" },
  { href: "#premios", label: "PREMIOS" },
  { href: "#verificador", label: "VERIFICADOR" },
  { href: "#cuentas", label: "PAGO" },
  { href: "#contacto", label: "CONTACTO" },
];

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const rifa = await obtenerRifa(id);
  if (!rifa) return {};
  return {
    title: rifa.titulo,
    description: `${rifa.titulo}: ${rifa.descripcion}. Boletos a ${money(rifa.precio)}.`,
  };
}

export default async function RifaPage({ params }: Props) {
  const { id } = await params;
  const rifa = await obtenerRifa(id);
  if (!rifa) notFound();

  const activa = rifa.estado === "activa";
  const premios = premiosDe(rifa);
  const ocupados = await vendidos(rifa.id);

  const rifaCliente: RifaCliente = {
    id: rifa.id,
    titulo: rifa.titulo,
    precio: rifa.precio,
    totalBoletos: rifa.totalBoletos,
    fecha: rifa.fecha,
    paquetes: paquetesDe(rifa),
  };

  return (
    <SiteShell links={LINKS}>
      <RifaProvider rifa={rifaCliente} vendidosIniciales={ocupados}>
        {/* Resumen */}
        <section className="raffle-hero">
          <div className="container raffle-top">
            <div className="prize-visual">
              <span className={`badge ${activa ? "live" : "done"}`}>{activa ? "En venta" : "Finalizada"}</span>
              {rifa.icono}
            </div>
            <div className="raffle-info">
              <h1>{rifa.titulo}</h1>
              <p className="lead">{rifa.descripcion}</p>
              <div className="info-grid">
                <div className="info-box">
                  <span>Precio por boleto</span>
                  <strong className="red">{money(rifa.precio)}</strong>
                </div>
                <div className="info-box">
                  <span>Fecha del sorteo</span>
                  <strong>{fmtDate(rifa.fecha)}</strong>
                </div>
                <div className="info-box">
                  <span>Juega con</span>
                  <strong style={{ fontSize: "1rem" }}>{rifa.loteria}</strong>
                </div>
                <div className="info-box">
                  <span>Disponibles</span>
                  <Disponibles />
                </div>
              </div>
              <Countdown fecha={rifa.fecha} />
              <Progreso />
            </div>
          </div>
        </section>

        {/* Selección de boletos */}
        <section className="section" id="boletos" style={{ paddingTop: 30 }}>
          <div className="container">
            <h2 className="section-title">
              ELIGE TUS <span>BOLETOS</span>
            </h2>
            {activa ? (
              <>
                <p className="section-sub">Compra un paquete o escoge tus números uno por uno</p>
                <Compra />
              </>
            ) : (
              <p className="section-sub">
                Esta rifa ya finalizó.
                {rifa.ganador && (
                  <>
                    {" "}
                    🏆 Ganador: <b className="red">{rifa.ganador}</b>
                  </>
                )}
                <br />
                <br />
                <Link className="btn btn-primary" href="/#rifas">
                  Ver rifas disponibles
                </Link>
              </p>
            )}
          </div>
        </section>

        {/* Premios */}
        <section className="section alt" id="premios">
          <div className="container">
            <h2 className="section-title">
              LISTA DE <span>PREMIOS</span>
            </h2>
            <p className="section-sub">Se sortean con la {rifa.loteria}</p>
            <div className={`prizes-list${premios.length < 3 ? " single" : ""}`}>
              {premios.map((p) => (
                <div className="prize" key={p.lugar}>
                  <div className="place">{p.lugar}</div>
                  <div className="ico">{p.icono}</div>
                  <h4>{p.titulo}</h4>
                  <p>{p.detalle}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Verificador />
        <Sorteador />
        <Accounts subtitle="¡Mucha suerte! 🏆" />
      </RifaProvider>
    </SiteShell>
  );
}

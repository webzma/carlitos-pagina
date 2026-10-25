import Link from "next/link";
import {
  IconBrandInstagram,
  IconBrandTiktok,
  IconBrandWhatsapp,
  IconMail,
  IconMapPin,
  IconPhone,
  IconTrophy,
} from "@tabler/icons-react";
import { SITE, waLink } from "@/data/config";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <>
      <footer className="footer" id="contacto">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Link href="/" className="logo" style={{ marginBottom: 14 }}>
                <span className="logo-mark">
                  <IconTrophy />
                </span>
                <span>
                  RIFA <b>EL TRIUNFO</b>
                </span>
              </Link>
              <p>
                Rifas transparentes, sorteadas con loterías oficiales. Cada boleto es una oportunidad real de ganar. ¡La
                suerte está de tu lado!
              </p>
            </div>
            <div>
              <h5>Contacto</h5>
              <ul>
                <li>
                  <IconMapPin /> {SITE.ciudad}
                </li>
                <li>
                  <a href={waLink()} target="_blank" rel="noopener">
                    <IconPhone /> +{SITE.whatsapp}
                  </a>
                </li>
                <li>
                  <IconMail /> {SITE.email}
                </li>
              </ul>
            </div>
            <div>
              <h5>Síguenos</h5>
              <div className="socials">
                <a href={SITE.instagram} aria-label="Instagram">
                  <IconBrandInstagram />
                </a>
                <a href={SITE.tiktok} aria-label="TikTok">
                  <IconBrandTiktok />
                </a>
                <a href={waLink()} target="_blank" rel="noopener" aria-label="WhatsApp">
                  <IconBrandWhatsapp />
                </a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {year} {SITE.marca}. Todos los derechos reservados.
            </span>
            <nav>
              <a href="#">Condiciones</a>
              <a href="#">Privacidad</a>
              <a href="#">Responsabilidad</a>
            </nav>
          </div>
        </div>
      </footer>

      <a className="wa-float" href={waLink("Hola, quiero información sobre las rifas 🏆")} target="_blank" rel="noopener">
        <IconBrandWhatsapp />
        <span>Chat</span>
      </a>
    </>
  );
}

import Link from "next/link";
import { Icon } from "./Icon";
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
                <span className="logo-mark">🏆</span>
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
                <li>📍 {SITE.ciudad}</li>
                <li>
                  <a href={waLink()} target="_blank" rel="noopener">
                    📞 +{SITE.whatsapp}
                  </a>
                </li>
                <li>✉️ {SITE.email}</li>
              </ul>
            </div>
            <div>
              <h5>Síguenos</h5>
              <div className="socials">
                <a href={SITE.instagram} aria-label="Instagram">
                  <Icon name="ig" />
                </a>
                <a href={SITE.tiktok} aria-label="TikTok">
                  <Icon name="tt" />
                </a>
                <a href={waLink()} target="_blank" rel="noopener" aria-label="WhatsApp">
                  <Icon name="wa" />
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
        <Icon name="wa" />
        <span>Chat</span>
      </a>
    </>
  );
}

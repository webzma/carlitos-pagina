import { Header, type NavLink } from "./Header";
import { Footer } from "./Footer";

/** Estructura de las páginas públicas: cabecera, contenido y pie. */
export function SiteShell({ links, children }: { links: NavLink[]; children: React.ReactNode }) {
  return (
    <>
      <Header links={links} />
      <main>{children}</main>
      <Footer />
    </>
  );
}

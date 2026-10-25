import "server-only";

// Variables de entorno del servidor. Se leen al usarlas (no al compilar)
// para que `next build` no exija tenerlas definidas.
function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

export const env = {
  get ADMIN_PASSWORD() {
    return requerida("ADMIN_PASSWORD");
  },
  get SESSION_SECRET() {
    return requerida("SESSION_SECRET");
  },
  // Turso en producción; sin valor usa un archivo SQLite local (solo desarrollo)
  get TURSO_DATABASE_URL() {
    return process.env.TURSO_DATABASE_URL || "file:./data/rifa.db";
  },
  get TURSO_AUTH_TOKEN() {
    return process.env.TURSO_AUTH_TOKEN || undefined;
  },
};

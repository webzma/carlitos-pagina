// Utilidades de interfaz compartidas en el navegador

let hideTimer: ReturnType<typeof setTimeout>;

export function toast(msg: string) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

export const pad = (n: number, len = 3) => String(n).padStart(len, "0");

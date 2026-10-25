/**
 * Reduce la captura a máx. 1600 px en JPEG para no pasar el límite de 4,5 MB de Vercel
 * y que suba rápido con datos móviles. Si el navegador no puede leerla, se envía tal cual.
 */
export async function comprimirImagen(file: File): Promise<File> {
  const MAX_LADO = 1600;
  try {
    const bmp = await createImageBitmap(file);
    const escala = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.8));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

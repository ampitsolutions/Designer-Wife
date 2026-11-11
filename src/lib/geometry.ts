/** Turns an AI box [ymin, xmin, ymax, xmax] (0–1000) into a padded pixel crop inside the image. */
export function boxToCrop(box: number[], w: number, h: number, pad = 0.03) {
  const [y0, x0, y1, x1] = box.map((n) => n / 1000);
  const px = pad * w;
  const py = pad * h;
  const left = Math.max(0, Math.floor(x0 * w - px));
  const top = Math.max(0, Math.floor(y0 * h - py));
  const right = Math.min(w, Math.ceil(x1 * w + px));
  const bottom = Math.min(h, Math.ceil(y1 * h + py));
  return { originX: left, originY: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

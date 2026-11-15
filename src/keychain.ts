// The picture that is printed on a person's keychain: their drawing (or their photo, only if they allowed it),
// big, in the project's colors (purple and gold). Square 1200 x 1200 with the purple going all the way to the edges,
// so a print shop can cut a round keychain from it (or leave it square) without a white border. The design stays
// inside the central circle, with a purple margin, so the cut can be a little off. No name is printed on it.

const PURPLE = '#4E1A6E';
const GOLD = '#EDB438';
const CREAM = '#FFF8E1';
export const KEYCHAIN_SIZE = 1200;

const EMOJI_FONTS = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';

async function loadPhoto(dataUrl: string): Promise<ImageBitmap> {
  const blob = await (await fetch(dataUrl)).blob();
  return createImageBitmap(blob);
}

/** The keychain picture as a PNG. `glyph` is the drawing (an emoji); `photo` is a JPEG data URL and wins when both are given. */
export async function keychainPng(opts: { glyph?: string | null; photo?: string | null }, size = KEYCHAIN_SIZE): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) throw new Error('canvas');
  const mid = size / 2;

  g.fillStyle = PURPLE;
  g.fillRect(0, 0, size, size);

  g.beginPath();
  g.arc(mid, mid, size * 0.4, 0, Math.PI * 2);
  g.fillStyle = GOLD;
  g.fill();

  const r = size * 0.37;
  g.save();
  g.beginPath();
  g.arc(mid, mid, r, 0, Math.PI * 2);
  g.closePath();
  g.clip();
  g.fillStyle = CREAM;
  g.fillRect(0, 0, size, size);

  if (opts.photo) {
    const img = await loadPhoto(opts.photo);
    const k = Math.max((2 * r) / img.width, (2 * r) / img.height); // cover the circle
    const w = img.width * k;
    const h = img.height * k;
    g.drawImage(img, mid - w / 2, mid - h / 2, w, h);
  } else if (opts.glyph) {
    g.font = `${Math.round(size * 0.52)}px ${EMOJI_FONTS}`;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    const m = g.measureText(opts.glyph);
    // Center what is drawn, not the line box: emoji fonts differ in where their baseline sits.
    const y = mid + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    g.fillText(opts.glyph, mid, y);
  }
  g.restore();

  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png');
  });
}

/** Saves a file from the browser (to the Downloads folder, or the iPhone's download prompt). */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

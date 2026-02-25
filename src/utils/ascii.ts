export const ASCII_CHARS = " .',:;!~+-xmo*#0123456789abcdefghijklmnopqrstuvwx";

export function createAsciiImage(
  sourceImage: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  width: number,
  height: number,
  charSize: number = 8
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  // Calculate scaled dimensions
  const cols = Math.floor(width / charSize);
  const rows = Math.floor(height / charSize);

  // Draw scaled down image to context to get pixel data
  ctx.drawImage(sourceImage, 0, 0, cols, rows);

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, cols, rows);
  const pixels = imageData.data;

  // Clear and prepare for ASCII drawing
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  ctx.font = `bold ${charSize}px monospace`;
  ctx.textBaseline = 'top';

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const index = (y * cols + x) * 4;
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const a = pixels[index + 3];

      if (a === 0) continue;

      // Calculate brightness (0-255)
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
      
      // Map brightness to character index
      const charIndex = Math.floor((brightness / 255) * (ASCII_CHARS.length - 1));
      const char = ASCII_CHARS[charIndex];

      // Draw character with original color
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillText(char, x * charSize, y * charSize);
    }
  }

  return canvas;
}

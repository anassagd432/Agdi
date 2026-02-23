/**
 * Coordinate grid overlay for browser screenshots.
 *
 * Draws a semi-transparent grid with coordinate labels on top of screenshots
 * before sending them to Gemini. This helps the vision model give more
 * precise coordinate references.
 *
 * Uses the existing `sharp` dependency for image compositing.
 */

import sharp from "sharp";

/**
 * Add a coordinate grid overlay to a screenshot.
 *
 * @param buffer - Input screenshot buffer (PNG or JPEG)
 * @param gridSize - Grid cell size in pixels. Default 100.
 * @returns Buffer with the grid overlay drawn on top.
 */
export async function addGridOverlay(
  buffer: Buffer,
  gridSize: number = 100,
): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? 1280;
  const height = metadata.height ?? 720;

  // Build an SVG overlay with grid lines and coordinate labels
  const svg = buildGridSvg(width, height, gridSize);

  // Composite the SVG on top of the screenshot
  const result = await sharp(buffer)
    .composite([
      {
        input: Buffer.from(svg),
        gravity: "northwest",
      },
    ])
    .jpeg({ quality: 85 })
    .toBuffer();

  return result;
}

/**
 * Build an SVG string containing a coordinate grid.
 */
function buildGridSvg(width: number, height: number, gridSize: number): string {
  const lines: string[] = [];

  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
  );

  // Semi-transparent overlay for grid lines
  const lineColor = "rgba(255, 0, 0, 0.25)";
  const textColor = "rgba(255, 0, 0, 0.8)";
  const bgColor = "rgba(0, 0, 0, 0.5)";
  const fontSize = Math.max(9, Math.min(12, Math.floor(gridSize / 8)));

  // Vertical lines
  for (let x = gridSize; x < width; x += gridSize) {
    lines.push(
      `  <line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${lineColor}" stroke-width="1"/>`,
    );
  }

  // Horizontal lines
  for (let y = gridSize; y < height; y += gridSize) {
    lines.push(
      `  <line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${lineColor}" stroke-width="1"/>`,
    );
  }

  // Coordinate labels at grid intersections
  for (let x = 0; x < width; x += gridSize) {
    for (let y = 0; y < height; y += gridSize) {
      // Skip the very first cell (0,0) as it would overlap with content
      if (x === 0 && y === 0) continue;

      const label = `${x},${y}`;
      const labelWidth = label.length * (fontSize * 0.6);
      const labelHeight = fontSize + 4;

      // Background rectangle for readability
      lines.push(
        `  <rect x="${x + 1}" y="${y + 1}" width="${labelWidth + 4}" height="${labelHeight}" fill="${bgColor}" rx="2"/>`,
      );

      // Label text
      lines.push(
        `  <text x="${x + 3}" y="${y + fontSize + 1}" font-family="monospace" font-size="${fontSize}" fill="${textColor}">${label}</text>`,
      );
    }
  }

  lines.push("</svg>");
  return lines.join("\n");
}

export { buildGridSvg };

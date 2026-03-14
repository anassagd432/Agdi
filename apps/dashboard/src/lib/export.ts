/**
 * Generic export utilities for CSV and JSON downloads.
 */

/**
 * Convert an array of objects to CSV string.
 */
export function toCSV(
  data: Record<string, unknown>[],
  columns?: { key: string; label: string }[],
): string {
  if (data.length === 0) return "";

  const cols =
    columns ||
    Object.keys(data[0]).map((key) => ({ key, label: key }));

  const header = cols.map((c) => escapeCSV(c.label)).join(",");

  const rows = data.map((row) =>
    cols
      .map((c) => escapeCSV(String(row[c.key] ?? "")))
      .join(","),
  );

  return [header, ...rows].join("\n");
}

function escapeCSV(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Trigger a file download in the browser.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType = "text/csv",
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Download data as CSV.
 */
export function downloadCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns?: { key: string; label: string }[],
): void {
  const csv = toCSV(data, columns);
  downloadFile(csv, filename, "text/csv;charset=utf-8;");
}

/**
 * Download data as JSON.
 */
export function downloadJSON(
  data: unknown,
  filename: string,
): void {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, filename, "application/json");
}

/**
 * Generate a timestamped filename.
 */
export function exportFilename(
  prefix: string,
  ext: "csv" | "json" = "csv",
): string {
  const date = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  return `${prefix}_${date}.${ext}`;
}

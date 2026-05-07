function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const stringValue = preventCsvFormulaInjection(String(value));
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
  return stringValue;
}

function preventCsvFormulaInjection(value) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function toCsv(rows, columns) {
  const header = columns.map((column) => escapeCsv(column.label)).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCsv(row[column.key])).join(","));
  return [header, ...body].join("\n");
}

export function sendCsv(res, filename, csv) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

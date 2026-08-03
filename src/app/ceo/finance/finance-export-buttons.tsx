"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type ExportRow = Record<string, string | number>;

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: ExportRow[]) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function FinanceExportButtons({
  incomeRows,
  expenseRows,
  summaryRows
}: {
  incomeRows: ExportRow[];
  expenseRows: ExportRow[];
  summaryRows: ExportRow[];
}) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button type="button" variant="secondary" size="sm" onClick={() => downloadCsv("lead-finance-summary.csv", summaryRows)}>
        <Download className="h-4 w-4" />
        Export Summary CSV
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => downloadCsv("lead-income.csv", incomeRows)}>
        <Download className="h-4 w-4" />
        Export Income CSV
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => downloadCsv("lead-expenses.csv", expenseRows)}>
        <Download className="h-4 w-4" />
        Export Expenses CSV
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Print / Save PDF
      </Button>
    </div>
  );
}

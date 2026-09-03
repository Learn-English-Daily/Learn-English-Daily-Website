"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type PaymentRequestData = {
  receiptNumber: string;
  studentName: string;
  courseJoined: string;
  classType: string;
  meetingNumber: number;
  meetingDate: string;
  attendanceStatus: string;
  amountDue: string;
  status: string;
  isGroupInvoice?: boolean;
  billingLabel?: string;
  batchName?: string;
};

function safeFilePart(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
}

export function PaymentRequestActions({ receipt }: { receipt: PaymentRequestData }) {
  const [downloading, setDownloading] = useState(false);

  async function downloadReceipt() {
    setDownloading(true);

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const navy = "#0F172A";
      const blue = "#2563EB";
      const yellow = "#FACC15";
      const gray = "#475569";

      pdf.setFillColor(blue);
      pdf.rect(0, 0, pageWidth, 45, "F");
      pdf.setFillColor(yellow);
      pdf.rect(0, 45, pageWidth, 2.5, "F");

      pdf.setTextColor("#FFFFFF");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(25);
      pdf.text("LEAD", 18, 20);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text("Learn English Daily", 18, 27);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("PAYMENT REQUEST", pageWidth - 18, 18, { align: "right" });
      pdf.setFontSize(9);
      pdf.text(receipt.receiptNumber, pageWidth - 18, 26, { align: "right" });

      pdf.setTextColor(navy);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("PAYMENT FOR", 18, 63);
      pdf.setFontSize(22);
      pdf.text(receipt.studentName, 18, 74);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(gray);
      pdf.text(`${receipt.courseJoined} / ${receipt.classType}`, 18, 82);

      pdf.setFillColor(receipt.status === "Paid" ? "#DCFCE7" : "#FEF9C3");
      pdf.roundedRect(pageWidth - 55, 60, 37, 10, 2, 2, "F");
      pdf.setTextColor(receipt.status === "Paid" ? "#15803D" : "#854D0E");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text(receipt.status === "Paid" ? "PAID" : "PAYMENT DUE", pageWidth - 36.5, 66.5, { align: "center" });

      pdf.setDrawColor("#E2E8F0");
      pdf.line(18, 91, pageWidth - 18, 91);

      const details = receipt.isGroupInvoice
        ? [["BILLING PERIOD", receipt.billingLabel || "Monthly fee"], ["BATCH", receipt.batchName || "Group class"], ["PACKAGE", "12 meetings"]]
        : [["MEETING", `Meeting ${receipt.meetingNumber}`], ["CLASS DATE", receipt.meetingDate], ["ATTENDANCE", receipt.attendanceStatus || "Recorded"]];
      const columnWidth = (pageWidth - 36) / 3;
      details.forEach(([label, value], index) => {
        const x = 18 + columnWidth * index;
        pdf.setTextColor(gray);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text(label, x, 104);
        pdf.setTextColor(navy);
        pdf.setFontSize(10);
        pdf.text(value, x, 112);
      });

      pdf.setFillColor("#EFF6FF");
      pdf.roundedRect(18, 124, pageWidth - 36, 35, 3, 3, "F");
      pdf.setTextColor(blue);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("AMOUNT TO BE PAID", 25, 137);
      pdf.setTextColor(navy);
      pdf.setFontSize(24);
      pdf.text(receipt.amountDue, pageWidth - 25, 148, { align: "right" });

      pdf.setDrawColor("#E2E8F0");
      pdf.roundedRect(18, 171, pageWidth - 36, 38, 3, 3, "S");
      pdf.setTextColor(navy);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Payment note", 25, 183);
      pdf.setTextColor(gray);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      const note = receipt.isGroupInvoice
        ? "Please complete this monthly group fee and send payment confirmation to LEAD. The finance team will update the payment record after confirmation."
        : "Please complete the payment for this meeting and send payment confirmation to LEAD. The finance team will update the payment record after confirmation.";
      pdf.text(pdf.splitTextToSize(note, pageWidth - 50), 25, 192);

      pdf.setDrawColor("#E2E8F0");
      pdf.line(18, 244, pageWidth - 18, 244);
      pdf.setTextColor(navy);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("LEAD - Learn English Daily", 18, 253);
      pdf.setTextColor(gray);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("Speak English with Confidence", 18, 260);
      pdf.setTextColor(blue);
      pdf.text("Lead@learn-english-daily.com / +62 815-7816-1241", 18, 268);

      const studentFileName = safeFilePart(receipt.studentName) || "Student";
      pdf.save(receipt.isGroupInvoice
        ? `LEAD-Group-Monthly-Invoice-${studentFileName}.pdf`
        : `LEAD-Payment-Request-${studentFileName}-Meeting-${receipt.meetingNumber}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <Button type="button" size="lg" onClick={downloadReceipt} disabled={downloading}>
        {downloading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {downloading ? "Preparing PDF..." : "Download Receipt"}
      </Button>
    </div>
  );
}

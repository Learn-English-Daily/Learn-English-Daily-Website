"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type CumulativePaymentMeeting = {
  meetingNumber: number;
  meetingDate: string;
  attendanceStatus: string;
  amountDue: string;
};

type CumulativePaymentRequestData = {
  receiptNumber: string;
  studentName: string;
  courseJoined: string;
  classType: string;
  totalAmountDue: string;
  meetingCount: number;
  meetings: CumulativePaymentMeeting[];
};

function safeFilePart(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
}

export function CumulativePaymentRequestActions({ receipt }: { receipt: CumulativePaymentRequestData }) {
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
      pdf.text("CUMULATIVE PAYMENT REQUEST", pageWidth - 18, 18, { align: "right" });
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

      pdf.setFillColor("#FEF9C3");
      pdf.roundedRect(pageWidth - 62, 60, 44, 10, 2, 2, "F");
      pdf.setTextColor("#854D0E");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("PAYMENT DUE", pageWidth - 40, 66.5, { align: "center" });

      pdf.setDrawColor("#E2E8F0");
      pdf.line(18, 91, pageWidth - 18, 91);

      pdf.setTextColor(gray);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("MEETINGS", 18, 104);
      pdf.text("TOTAL AMOUNT", pageWidth - 18, 104, { align: "right" });
      pdf.setTextColor(navy);
      pdf.setFontSize(13);
      pdf.text(`${receipt.meetingCount} unpaid meetings`, 18, 113);
      pdf.text(receipt.totalAmountDue, pageWidth - 18, 113, { align: "right" });

      pdf.setFillColor("#EFF6FF");
      pdf.roundedRect(18, 124, pageWidth - 36, 30, 3, 3, "F");
      pdf.setTextColor(blue);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("AMOUNT TO BE PAID", 25, 137);
      pdf.setTextColor(navy);
      pdf.setFontSize(24);
      pdf.text(receipt.totalAmountDue, pageWidth - 25, 146, { align: "right" });

      let y = 168;
      pdf.setTextColor(navy);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Included meetings", 18, y);
      y += 9;

      pdf.setFontSize(8);
      pdf.setTextColor(gray);
      pdf.text("MEETING", 18, y);
      pdf.text("DATE", 45, y);
      pdf.text("ATTENDANCE", 110, y);
      pdf.text("AMOUNT", pageWidth - 18, y, { align: "right" });
      y += 6;

      for (const meeting of receipt.meetings) {
        if (y > 255) {
          pdf.addPage();
          y = 24;
        }

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(navy);
        pdf.text(`Meeting ${meeting.meetingNumber}`, 18, y);
        pdf.text(meeting.meetingDate, 45, y);
        pdf.text(meeting.attendanceStatus || "Recorded", 110, y);
        pdf.text(meeting.amountDue, pageWidth - 18, y, { align: "right" });
        y += 7;
      }

      y = Math.min(y + 8, 262);
      pdf.setDrawColor("#E2E8F0");
      pdf.line(18, y, pageWidth - 18, y);
      y += 9;
      pdf.setTextColor(navy);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("LEAD - Learn English Daily", 18, y);
      pdf.setTextColor(gray);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("Speak English with Confidence", 18, y + 7);
      pdf.setTextColor(blue);
      pdf.text("Lead@learn-english-daily.com / +62 815-7816-1241", 18, y + 15);

      const studentFileName = safeFilePart(receipt.studentName) || "Student";
      pdf.save(`LEAD-Cumulative-Payment-Request-${studentFileName}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <Button type="button" size="lg" onClick={downloadReceipt} disabled={downloading}>
        {downloading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {downloading ? "Preparing PDF..." : "Download Cumulative Receipt"}
      </Button>
    </div>
  );
}

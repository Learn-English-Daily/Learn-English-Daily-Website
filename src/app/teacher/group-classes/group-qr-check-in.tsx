"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { Camera, CameraOff, CheckCircle2, QrCode, RefreshCw, Users, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Student = { studentId: string; studentName: string };
type CheckIn = Student & { checkedInAt: string | Date };

function timeLabel(value: string | Date) {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export function GroupQrCheckIn({ sessionId, batchName, meetingNumber, roster, initialCheckIns }: { sessionId: string; batchName: string; meetingNumber: number; roster: Student[]; initialCheckIns: CheckIn[] }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const processingRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [checkIns, setCheckIns] = useState(initialCheckIns);
  const [message, setMessage] = useState("Open the camera when students are ready.");
  const [tone, setTone] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (!running || !videoRef.current) return;
    const reader = new BrowserQRCodeReader();
    let active = true;
    reader.decodeFromVideoDevice(undefined, videoRef.current, async (result) => {
      if (!active || !result || processingRef.current) return;
      processingRef.current = true;
      try {
        const response = await fetch("/api/teacher/group-check-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, qrValue: result.getText() }) });
        const data = await response.json() as { error?: string; duplicate?: boolean; student?: CheckIn };
        if (!response.ok || !data.student) {
          setTone("error"); setMessage(data.error || "This QR code could not be checked in.");
        } else if (data.duplicate) {
          setTone("error"); setMessage(`${data.student.studentName} is already checked in.`);
        } else {
          setCheckIns((current) => current.some((entry) => entry.studentId === data.student?.studentId) ? current : [...current, data.student!]);
          setTone("success"); setMessage(`${data.student.studentName} — attendance recorded!`);
          try { const context = new AudioContext(); const oscillator = context.createOscillator(); oscillator.frequency.value = 880; oscillator.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .14); } catch {}
        }
      } catch { setTone("error"); setMessage("Connection problem. Keep the manual attendance option as the fallback."); }
      setTimeout(() => { processingRef.current = false; }, 1300);
    }).then((controls) => { if (active) controlsRef.current = controls; else controls.stop(); }).catch(() => { setTone("error"); setMessage("Camera could not start. Allow camera access or use manual attendance."); setRunning(false); });
    return () => { active = false; controlsRef.current?.stop(); controlsRef.current = null; };
  }, [running, sessionId]);

  function stop() { controlsRef.current?.stop(); setRunning(false); router.refresh(); }
  return <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-lead-blue">Student QR self-check-in</p><h3 className="mt-1 font-heading text-xl font-extrabold text-lead-navy">{batchName} / Meeting {meetingNumber}</h3><p className="mt-1 text-sm text-lead-gray">Students scan the Parent QR printed on their LEAD ID card. Manual attendance remains available.</p></div><span className="rounded-full bg-white px-3 py-2 text-sm font-bold text-lead-blue"><Users className="mr-1 inline h-4 w-4" /> {checkIns.length}/{roster.length}</span></div>
    {running ? <div className="mt-4 overflow-hidden rounded-2xl bg-slate-950 p-3"><video ref={videoRef} muted playsInline className="mx-auto aspect-[4/3] max-h-[430px] w-full rounded-xl object-cover" /><div className="pointer-events-none relative -mt-[52%] mb-[12%] mx-auto aspect-square w-[54%] rounded-3xl border-4 border-yellow-300 shadow-[0_0_0_999px_rgba(0,0,0,.22)]" /></div> : null}
    <div className={`mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold ${tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-blue-100 bg-white text-lead-gray"}`}>{tone === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : tone === "error" ? <XCircle className="h-5 w-5 shrink-0" /> : <QrCode className="h-5 w-5 shrink-0 text-lead-blue" />}{message}</div>
    <div className="mt-4 flex flex-wrap gap-2">{running ? <Button type="button" variant="secondary" onClick={stop}><CameraOff className="h-4 w-4" />Stop Scanner & Refresh Attendance</Button> : <Button type="button" onClick={() => { setTone("idle"); setMessage("Point the camera at one student ID card at a time."); setRunning(true); }}><Camera className="h-4 w-4" />Start QR Scanner</Button>}<Button type="button" variant="secondary" onClick={() => router.refresh()}><RefreshCw className="h-4 w-4" />Refresh List</Button></div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">{roster.map((student) => { const entry = checkIns.find((item) => item.studentId === student.studentId); return <div key={student.studentId} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${entry ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}><div><p className="font-bold text-lead-navy">{student.studentName}</p><p className="text-xs text-lead-gray">{student.studentId}</p></div><span className={`text-xs font-bold ${entry ? "text-emerald-700" : "text-slate-400"}`}>{entry ? `✓ ${timeLabel(entry.checkedInAt)} WIB` : "Waiting"}</span></div>; })}</div>
    {checkIns.length === roster.length && roster.length ? <p className="mt-4 rounded-xl bg-emerald-600 px-4 py-3 text-center font-bold text-white">All students have checked in. The teacher can review and finalize attendance after class.</p> : null}
  </div>;
}

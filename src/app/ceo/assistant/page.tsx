import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { logoutCeo } from "@/app/ceo/actions";
import { AssistantClient } from "@/app/ceo/assistant/assistant-client";
import { CeoLoginForm } from "@/app/ceo/login-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AssistantDataMode } from "@/lib/ceo-assistant/types";
import { CEO_SESSION_COOKIE, isValidCeoSession } from "@/lib/ceo-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "CEO AI Assistant | LEAD", robots: { index: false, follow: false } };

export default async function CeoAssistantPage() {
  const session = (await cookies()).get(CEO_SESSION_COOKIE)?.value;
  if (!isValidCeoSession(session)) return <main className="grid min-h-screen place-items-center bg-lead-soft px-4 py-10"><Card className="w-full max-w-md p-8"><p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD CEO</p><h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">CEO AI Assistant</h1><p className="mt-3 leading-7 text-lead-gray">Sign in with CEO access to use the private business assistant.</p><CeoLoginForm /></Card></main>;
  const dataMode: AssistantDataMode = process.env.GEMINI_DATA_MODE === "aggregates" ? "aggregates" : "synthetic";
  return <main className="min-h-screen bg-lead-soft">
    <header className="border-b border-slate-200 bg-white"><div className="container-shell flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD CEO</p><h1 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">AI Business Assistant</h1><p className="mt-2 text-sm text-lead-gray">Read-only answers grounded in bounded business tools.</p></div><div className="flex gap-2"><Button asChild variant="secondary"><Link href="/ceo"><ArrowLeft className="h-4 w-4" />CEO Dashboard</Link></Button><form action={logoutCeo}><Button type="submit" variant="secondary"><LogOut className="h-4 w-4" />Logout</Button></form></div></div></header>
    <div className="container-shell py-8"><AssistantClient dataMode={dataMode} configured={Boolean(process.env.GEMINI_API_KEY)} /></div>
  </main>;
}

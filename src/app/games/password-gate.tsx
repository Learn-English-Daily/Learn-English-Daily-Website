import Image from "next/image";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { GamesLoginForm } from "@/app/games/login-form";
import { Card } from "@/components/ui/card";

export function GamesPasswordGate({
  redirectTo,
  title = "LEAD Games"
}: {
  redirectTo: string;
  title?: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_52%,#fff7d6_100%)] px-4 py-10">
      <Card className="w-full max-w-md overflow-hidden shadow-soft">
        <div className="bg-lead-blue p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
              <Image src="/images/brand-icon-cropped.png" alt="Wisey the owl" width={44} height={44} className="h-11 w-11 object-contain" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">Private Practice</p>
              <h1 className="font-heading text-2xl font-extrabold">{title}</h1>
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-yellow-50 text-yellow-700">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-heading text-3xl font-extrabold text-lead-navy">Enter games password</h2>
          <p className="mt-3 leading-7 text-lead-gray">
            This page is for LEAD students and teachers. Ask your teacher or admin for the current games password.
          </p>
          <GamesLoginForm redirectTo={redirectTo} />
          <Link href="/en" className="mt-5 inline-flex text-sm font-bold text-lead-blue hover:text-blue-700">
            Back to LEAD website
          </Link>
        </div>
      </Card>
    </main>
  );
}

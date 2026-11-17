import { DemoApp } from "@/components/demo-app";
import { DemoStoreProvider } from "@/demo/store";

export default function Page() {
  const enabled = process.env.NEXT_PUBLIC_DEMO_ENABLED !== "false";
  const expiresAt = process.env.NEXT_PUBLIC_DEMO_EXPIRES_AT || "";
  if (!enabled) return <main className="grid min-h-screen place-items-center bg-lead-soft p-6"><div className="demo-card max-w-xl p-10 text-center"><p className="text-sm font-black uppercase tracking-[.2em] text-lead-blue">Learn English Daily</p><h1 className="mt-4 font-heading text-4xl font-black">Demo currently unavailable</h1><p className="mt-4 leading-7 text-lead-gray">This client demonstration has been disabled. Please contact the LEAD team if you need access.</p></div></main>;
  return <DemoStoreProvider><DemoApp expiresAt={expiresAt} /></DemoStoreProvider>;
}

import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]", className)}
      {...props}
    />
  );
}


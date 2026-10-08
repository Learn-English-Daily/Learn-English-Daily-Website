"use client";

import { FormEvent, Fragment, useMemo, useState } from "react";
import { Bot, Loader2, RotateCcw, Send, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AssistantDataMode, AssistantMessage } from "@/lib/ceo-assistant/types";

type DisplayMessage = AssistantMessage & { id: string; timestamp: Date };

const suggestions = [
  "Give me this month's business overview.",
  "How is attendance this month?",
  "Show this month's financial performance.",
  "What operational items need attention?"
];

function inline(text: string) {
  const pieces = text.split(/(\*\*[^*]+\*\*)/g);
  return pieces.map((piece, index) => piece.startsWith("**") && piece.endsWith("**")
    ? <strong key={index}>{piece.slice(2, -2)}</strong>
    : <Fragment key={index}>{piece}</Fragment>);
}

function Markdown({ value }: { value: string }) {
  const lines = value.split("\n");
  const nodes = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (line.includes("|") && lines[index + 1]?.trim().match(/^\|?\s*:?-+/)) {
      const rows = [];
      const header = line.split("|").map((cell) => cell.trim()).filter(Boolean);
      index += 2;
      while (index < lines.length && lines[index].includes("|")) {
        rows.push(lines[index].split("|").map((cell) => cell.trim()).filter(Boolean));
        index += 1;
      }
      nodes.push(<div key={`table-${index}`} className="my-3 overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead><tr>{header.map((cell) => <th key={cell} className="border border-slate-200 bg-slate-50 p-2">{inline(cell)}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className="border border-slate-200 p-2">{inline(cell)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    if (/^#{1,3}\s/.test(line)) nodes.push(<h3 key={index} className="mt-3 font-heading text-lg font-extrabold text-lead-navy">{inline(line.replace(/^#{1,3}\s+/, ""))}</h3>);
    else if (/^[-*]\s+/.test(line)) nodes.push(<div key={index} className="ml-4 flex gap-2"><span>•</span><span>{inline(line.replace(/^[-*]\s+/, ""))}</span></div>);
    else if (/^\d+\.\s+/.test(line)) nodes.push(<div key={index} className="ml-4">{inline(line)}</div>);
    else if (line) nodes.push(<p key={index}>{inline(line)}</p>);
    else nodes.push(<div key={index} className="h-2" />);
    index += 1;
  }
  return <div className="space-y-2 leading-7">{nodes}</div>;
}

export function AssistantClient({ dataMode, configured }: { dataMode: AssistantDataMode; configured: boolean }) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const modeLabel = dataMode === "aggregates" ? "Production aggregate mode" : "Safe demonstration mode";
  const apiMessages = useMemo(() => messages.slice(-11).map(({ role, content }) => ({ role, content })), [messages]);

  async function submit(question: string) {
    const content = question.trim();
    if (!content || loading) return;
    const userMessage: DisplayMessage = { id: crypto.randomUUID(), role: "user", content, timestamp: new Date() };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/ceo/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [...apiMessages, { role: "user", content }] })
      });
      const result = await response.json() as { answer?: string; error?: string };
      if (!response.ok || !result.answer) throw new Error(result.error || "The assistant did not return an answer.");
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: result.answer || "", timestamp: new Date() }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The assistant is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(input);
  }

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
    <Card className="flex min-h-[650px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-lead-blue"><Bot className="h-5 w-5" /></span><div><p className="font-heading font-extrabold text-lead-navy">LEAD Business Assistant</p><p className="text-xs font-semibold text-lead-gray">{modeLabel}</p></div></div>
        <Button type="button" size="sm" variant="ghost" onClick={() => { setMessages([]); setError(""); }}><RotateCcw className="h-4 w-4" />New chat</Button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 p-4 sm:p-6">
        {!messages.length ? <div className="mx-auto max-w-xl py-16 text-center"><Sparkles className="mx-auto h-10 w-10 text-lead-blue" /><h2 className="mt-4 font-heading text-2xl font-extrabold text-lead-navy">What would you like to understand?</h2><p className="mt-2 leading-7 text-lead-gray">Ask for a concise overview of students, attendance, schedules, finance, or operational follow-ups.</p></div> : null}
        {messages.map((message) => <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
          {message.role === "assistant" ? <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lead-blue text-white"><Bot className="h-4 w-4" /></span> : null}
          <div className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-sm ${message.role === "user" ? "bg-lead-navy text-white" : "border border-slate-200 bg-white text-lead-navy"}`}><Markdown value={message.content} /><p className={`mt-2 text-[11px] ${message.role === "user" ? "text-blue-100" : "text-slate-400"}`}>{message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div>
          {message.role === "user" ? <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lead-yellow text-lead-navy"><UserRound className="h-4 w-4" /></span> : null}
        </div>)}
        {loading ? <div className="flex items-center gap-3 text-sm font-semibold text-lead-gray"><Loader2 className="h-5 w-5 animate-spin text-lead-blue" />Reviewing the requested aggregates…</div> : null}
      </div>
      <form onSubmit={onSubmit} className="border-t border-slate-200 bg-white p-4">
        {error ? <p className="mb-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
        <div className="flex gap-2"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(input); } }} disabled={!configured || loading} maxLength={2000} rows={2} placeholder={configured ? "Ask about LEAD's performance…" : "Add GEMINI_API_KEY on the server to enable chat."} className="focus-ring min-h-12 flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-lead-navy" /><Button type="submit" disabled={!configured || loading || !input.trim()} aria-label="Send question"><Send className="h-4 w-4" /></Button></div>
        <p className="mt-2 text-xs text-lead-gray">Enter to send · Shift+Enter for a new line · History is limited to this browser session</p>
      </form>
    </Card>
    <aside className="space-y-4">
      <Card className="p-5"><div className="flex items-center gap-2 font-heading font-extrabold text-lead-navy"><ShieldCheck className="h-5 w-5 text-emerald-600" />Privacy guard</div><p className="mt-3 text-sm leading-6 text-lead-gray">{dataMode === "synthetic" ? "Only demonstration figures are sent to Gemini. Production data remains disconnected." : "Only aggregate figures are sent. Names, IDs, contacts, and raw records are excluded."}</p></Card>
      <Card className="p-5"><h2 className="font-heading font-extrabold text-lead-navy">Suggested questions</h2><div className="mt-4 grid gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => void submit(suggestion)} disabled={loading || !configured} className="focus-ring rounded-xl border border-slate-200 bg-white p-3 text-left text-sm font-semibold leading-5 text-lead-navy transition hover:border-lead-blue hover:text-lead-blue disabled:opacity-50">{suggestion}</button>)}</div></Card>
    </aside>
  </div>;
}

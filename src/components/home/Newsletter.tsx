"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

// Final-CTA email-capture strip. No actual mailing infrastructure wired up
// yet — submits "complete" with a toast so the slot is in place when an
// email list (Resend/Mailchimp/etc) gets connected later.

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setDone(true);
    toast.success("Thanks — we'll be in touch with stock alerts and offers.");
  };

  return (
    <section className="border-y border-white/10 bg-[radial-gradient(ellipse_at_top,rgba(232,21,27,0.08),transparent_55%)]">
      <div className="mx-auto max-w-site px-[var(--gutter)] py-14">
        <div className="grid items-center gap-6 md:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="eyebrow mb-2">Stay in the loop</div>
            <h2 className="font-head text-2xl font-extrabold uppercase leading-tight text-white sm:text-3xl">
              New drops, <em className="not-italic text-red">first dibs</em>
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/60">
              Restock alerts on hard-to-find parts, member-only deals, and the
              odd build feature from the workshop. No spam about two emails
              a month.
            </p>
          </div>

          {done ? (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              You&apos;re on the list — check your inbox to confirm.
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 flex-1 rounded-md border border-white/15 bg-ink-800 px-3.5 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-red/50"
                required
              />
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-red px-5 font-head text-[13px] font-bold uppercase tracking-wider text-white transition hover:bg-red-dark"
              >
                <Send className="h-3.5 w-3.5" /> Subscribe
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

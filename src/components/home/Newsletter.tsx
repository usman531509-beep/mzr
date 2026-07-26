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
    <section className="border-t border-line bg-soft">
      <div className="h-container">
        <div className="grid items-center gap-6 py-14 md:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-red">
              Stay in the loop
            </div>
            <h2 className="font-head text-3xl uppercase leading-tight tracking-wide text-ink sm:text-4xl">
              New drops, first dibs
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Restock alerts on hard-to-find parts, member-only deals, and the
              odd build feature from the workshop. No spam about two emails
              a month.
            </p>
          </div>

          {done ? (
            <div className="flex items-center gap-3 rounded-xl border border-ok/30 bg-ok/10 px-5 py-4 text-sm font-semibold text-ok">
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
                className="h-12 flex-1 rounded-xl border border-line bg-white px-4 text-[15px] text-ink outline-none transition placeholder:text-muted-foreground/60 focus:border-red focus:ring-4 focus:ring-red/10"
                required
              />
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red px-6 text-[13px] font-extrabold uppercase tracking-wider text-white shadow-[0_10px_24px_-10px_rgba(227,6,19,0.55)] transition hover:bg-red-600"
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

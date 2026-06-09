// Time-of-day greeting helpers. Shared by the admin and customer
// account dashboards so the welcome line stays consistent and the
// timezone fix lives in one place.
//
// Server functions on Vercel run in UTC by default — without an
// explicit timezone the greeting would say "Good morning" at 9pm BST
// for a UK admin. We pin the hour calculation to Europe/London because
// that's where the store and its admins are based.

export function ukHourNow(): number {
  const h = new Date().toLocaleString("en-GB", {
    timeZone: "Europe/London", hour: "numeric", hour12: false,
  });
  return parseInt(h, 10);
}

export function greetingFor(hour: number): string {
  if (hour < 5)  return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Working late";
}

export function firstNameOf(full?: string | null): string {
  const trimmed = (full ?? "").trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

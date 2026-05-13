/**
 * Contact form endpoint.
 * POST /api/contact { name, email, message }
 *
 * Required env vars (set in Vercel Project → Settings → Environment Variables):
 *   RESEND_API_KEY  — get from https://resend.com (free tier OK)
 *   CONTACT_TO      — destination email, e.g. "hi@strictlytheebest.com"
 *   CONTACT_FROM    — sender, must be on a Resend-verified domain
 *                     (use "STB Contact <noreply@yourverified.com>")
 *
 * If env vars are missing the endpoint returns 503 and logs which one is missing,
 * so the frontend stays responsive while you finish configuring.
 */

export default async function handler(req, res) {
  // CORS is unnecessary same-origin, but be explicit
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { name, email, message } = req.body || {};

  // Basic validation — mirrors the frontend check
  if (
    typeof name !== "string" || !name.trim() ||
    typeof email !== "string" || !email.includes("@") ||
    typeof message !== "string" || !message.trim()
  ) {
    return res.status(400).json({ error: "invalid_input" });
  }

  // Hard cap to defeat trivial abuse
  if (name.length > 200 || email.length > 320 || message.length > 5000) {
    return res.status(400).json({ error: "input_too_long" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  const from = process.env.CONTACT_FROM;

  if (!apiKey || !to || !from) {
    const missing = [
      !apiKey && "RESEND_API_KEY",
      !to && "CONTACT_TO",
      !from && "CONTACT_FROM",
    ].filter(Boolean).join(", ");
    console.warn(`[contact] missing env vars: ${missing}`);
    return res.status(503).json({ error: "service_not_configured", missing });
  }

  // Plain-text body; Resend supports text + html fields. Keep it simple.
  const body = [
    `New contact form submission — strictlytheebest.net`,
    ``,
    `Name:    ${name.trim()}`,
    `Email:   ${email.trim()}`,
    ``,
    `Message:`,
    message.trim(),
  ].join("\n");

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email.trim(),
        subject: `STB contact — ${name.trim()}`,
        text: body,
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text().catch(() => "");
      console.error(`[contact] resend ${resendRes.status}: ${detail}`);
      return res.status(502).json({ error: "delivery_failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[contact] exception:", e?.message || e);
    return res.status(502).json({ error: "delivery_failed" });
  }
}

/**
 * Contact form endpoint.
 * POST /api/contact { name, email, message }
 *
 * Sends via Neo SMTP. Required env vars in Vercel:
 *   SMTP_HOST   — e.g. "smtp0001.neo.space"
 *   SMTP_PORT   — "465" (SSL) or "587" (STARTTLS)
 *   SMTP_SECURE — "true" for 465, "false" for 587
 *   SMTP_USER   — mailbox address, e.g. "sales@strictlytheebest.com"
 *   SMTP_PASS   — mailbox password (or app password)
 *   CONTACT_TO  — destination (often same as SMTP_USER)
 */

import nodemailer from "nodemailer";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { name, email, message } = req.body || {};

  if (
    typeof name !== "string" || !name.trim() ||
    typeof email !== "string" || !email.includes("@") ||
    typeof message !== "string" || !message.trim()
  ) {
    return res.status(400).json({ error: "invalid_input" });
  }
  if (name.length > 200 || email.length > 320 || message.length > 5000) {
    return res.status(400).json({ error: "input_too_long" });
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = (process.env.SMTP_SECURE || "true").toLowerCase() === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.CONTACT_TO || user;

  if (!host || !user || !pass) {
    const missing = [
      !host && "SMTP_HOST",
      !user && "SMTP_USER",
      !pass && "SMTP_PASS",
    ].filter(Boolean).join(", ");
    console.warn(`[contact] missing env vars: ${missing}`);
    return res.status(503).json({ error: "service_not_configured", missing });
  }

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
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"STB Contact" <${user}>`,
      to,
      replyTo: email.trim(),
      subject: `STB contact — ${name.trim()}`,
      text: body,
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[contact] smtp send failed:", e?.message || e);
    return res.status(502).json({ error: "delivery_failed" });
  }
}

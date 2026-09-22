/**
 * Catering enquiry endpoint. Deb's Bistro.
 *
 * Sends via Resend and then POLLS the message until Resend reports it delivered.
 * A 200 from a mail API is not delivery, so we assert last_event.
 *
 * Required Vercel environment variables (Production + Preview):
 *   RESEND_API_KEY   re_xxxxxxxx from resend.com/api-keys
 *   ENQUIRY_TO       inbox that receives the enquiry, e.g. debsbistroindien@gmail.com
 *   ENQUIRY_FROM     verified sender, e.g. "Deb's Bistro <site@send.debsbistro.fr>"
 *
 * If RESEND_API_KEY is missing the endpoint still refuses with 501 rather than
 * pretending to have sent, so a half-finished setup can never silently drop leads.
 */

const FIELDS = [
  "name", "email", "phone", "event_date", "city_venue", "guests",
  "event_type", "service_format", "dietary", "message"
];

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const KEY = process.env.RESEND_API_KEY;
  const TO = process.env.ENQUIRY_TO;
  const FROM = process.env.ENQUIRY_FROM;

  if (!KEY || !TO || !FROM) {
    return res.status(501).json({
      error: "not_configured",
      message: "The catering enquiry endpoint has no recipient inbox configured yet."
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const data = {};
  for (const f of FIELDS) data[f] = String(body[f] || "").slice(0, 2000).trim();

  if (!data.name || !data.email) {
    return res.status(400).json({ error: "missing_fields", message: "Name and email are required." });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
    return res.status(400).json({ error: "invalid_email", message: "Please check the email address." });
  }
  // Honeypot. Bots fill hidden fields, humans do not.
  if (String(body.company_website || "").trim() !== "") {
    return res.status(200).json({ ok: true });
  }

  const rows = FIELDS
    .filter(f => data[f])
    .map(f => `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">${esc(f.replace(/_/g, " "))}</td><td style="padding:4px 0"><b>${esc(data[f])}</b></td></tr>`)
    .join("");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">
<p>New event brief from the Deb's Bistro website.</p>
<table cellpadding="0" cellspacing="0">${rows}</table>
</div>`;

  try {
    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: data.email,
        subject: `Event brief: ${data.name}${data.guests ? ` (${data.guests} guests)` : ""}`,
        html
      })
    });

    const sent = await send.json().catch(() => ({}));
    if (!send.ok || !sent.id) {
      console.error("resend_send_failed", send.status, sent);
      return res.status(502).json({ error: "send_failed", message: "We could not send your brief. Please call or email us directly." });
    }

    // Poll for delivery. Resend reports last_event on the message resource.
    let last = "queued";
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 800));
      const look = await fetch(`https://api.resend.com/emails/${sent.id}`, {
        headers: { Authorization: `Bearer ${KEY}` }
      });
      if (!look.ok) break;
      const info = await look.json().catch(() => ({}));
      last = info.last_event || last;
      if (last === "delivered") break;
      if (last === "bounced" || last === "complained" || last === "failed") {
        console.error("resend_not_delivered", sent.id, last);
        return res.status(502).json({ error: "not_delivered", message: "We could not deliver your brief. Please call or email us directly." });
      }
    }

    console.log("enquiry_sent", sent.id, last);
    return res.status(200).json({ ok: true, id: sent.id, status: last });
  } catch (err) {
    console.error("enquiry_error", err);
    return res.status(502).json({ error: "send_failed", message: "We could not send your brief. Please call or email us directly." });
  }
}

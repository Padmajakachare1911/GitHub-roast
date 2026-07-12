import { buildFullReport } from '../../shared/reportBuilder.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function buildHtmlEmail(username, roast, report) {
  const escaped = report.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#0d1117;color:#e6edf3;padding:24px;">
<div style="max-width:520px;margin:0 auto;background:#161b22;border:1px solid #30363d;border-radius:12px;padding:24px;">
<h1 style="color:#f85149;margin:0 0 8px;">GitHub Roast</h1>
<p style="color:#8b949e;">Full report for <strong>@${username}</strong></p>
<blockquote style="border-left:3px solid #f85149;padding-left:16px;font-size:18px;">"${roast.replace(/"/g, '&quot;')}"</blockquote>
<pre style="background:#0d1117;padding:16px;border-radius:8px;font-size:13px;white-space:pre-wrap;">${escaped}</pre>
<p style="color:#8b949e;font-size:13px;"><a href="https://github-roast.pages.dev" style="color:#f85149;">Roast a friend</a></p>
</div></body></html>`;
}

async function sendViaResend(apiKey, from, to, subject, html, text) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend: ${err.slice(0, 180)}`);
  }
}

async function sendViaBrevo(apiKey, to, subject, html, text) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'GitHub Roast', email: 'noreply@github-roast.dev' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo: ${err.slice(0, 180)}`);
  }
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const email = (body.email || '').trim().toLowerCase();
    const { username, roast, stats } = body;

    if (!email?.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid email required.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    if (!username || !roast || !stats) {
      return new Response(JSON.stringify({ error: 'Missing roast data.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const report = buildFullReport(stats, roast);
    const subject = `Your GitHub Roast Report — @${username}`;
    const html = buildHtmlEmail(username, roast, report);

    const resendKey = context.env.RESEND_API_KEY;
    const brevoKey = context.env.BREVO_API_KEY;

    if (!resendKey && !brevoKey) {
      return new Response(
        JSON.stringify({
          ok: true,
          report,
          emailSent: false,
          emailSkipped: true,
          emailError: 'Email service not configured. Report unlocked on page.',
        }),
        { status: 200, headers: corsHeaders },
      );
    }

    try {
      if (resendKey) {
        const from = context.env.RESEND_FROM_EMAIL || 'GitHub Roast <onboarding@resend.dev>';
        await sendViaResend(resendKey, from, email, subject, html, report);
      } else {
        await sendViaBrevo(brevoKey, email, subject, html, report);
      }

      return new Response(JSON.stringify({ ok: true, report, emailSent: true }), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (sendErr) {
      return new Response(
        JSON.stringify({
          ok: true,
          report,
          emailSent: false,
          emailError: sendErr.message,
        }),
        { status: 200, headers: corsHeaders },
      );
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, emailSent: false }), {
      status: 502,
      headers: corsHeaders,
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

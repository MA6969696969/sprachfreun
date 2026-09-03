// Transactional email via Resend. Falls back to logging the code to the
// server console when RESEND_API_KEY isn't set, so local dev keeps working
// without an email account.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = process.env.RESEND_FROM || "Sprachfreund <onboarding@resend.dev>";
const SEND_TIMEOUT_MS = 10000;

export async function sendPasswordResetEmail(toEmail, username, code) {
  if (!RESEND_API_KEY) {
    console.log(`[dev] Password reset code for ${toEmail}: ${code}`);
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: toEmail,
        subject: "Your Sprachfreund password reset code",
        html: `
          <p>Hi ${escapeHtml(username)},</p>
          <p>Your Sprachfreund password reset code is:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:6px;">${code}</p>
          <p>This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
        `,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Resend responded ${res.status}: ${text}`);
    }
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Timed out sending the reset email.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

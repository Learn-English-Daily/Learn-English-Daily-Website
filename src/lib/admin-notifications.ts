type LeadNotification = {
  name: string;
  email: string;
  whatsapp: string;
  goal: string;
  locale: string;
};

type ReviewNotification = {
  name: string;
  role: string;
  course: string;
  rating: number;
  feedback: string;
  locale: string;
};

type NotificationMessage = {
  subject: string;
  preview: string;
  lines: string[];
  adminPath: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function getSiteUrl() {
  if (process.env.ADMIN_DASHBOARD_URL) return process.env.ADMIN_DASHBOARD_URL.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://www.learn-english-daily.com";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textFromLines(lines: string[], adminUrl: string) {
  return [...lines, "", `Open admin: ${adminUrl}`].join("\n");
}

function htmlFromLines(message: NotificationMessage, adminUrl: string) {
  const rows = message.lines
    .map((line) => `<p style="margin:0 0 10px;color:#475569;font-size:14px;line-height:1.6;">${escapeHtml(line)}</p>`)
    .join("");

  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
        <p style="margin:0 0 8px;color:#2563eb;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;">LEAD Admin Notification</p>
        <h1 style="margin:0 0 12px;color:#0f172a;font-size:24px;line-height:1.25;">${escapeHtml(message.subject)}</h1>
        <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">${escapeHtml(message.preview)}</p>
        ${rows}
        <a href="${escapeHtml(adminUrl)}" style="display:inline-block;margin-top:14px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">Open Admin</a>
      </div>
    </div>
  `;
}

async function sendAdminNotification(message: NotificationMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  const from = process.env.NOTIFICATION_FROM_EMAIL || "LEAD Website <onboarding@resend.dev>";

  if (!apiKey || !to) {
    return;
  }

  const adminUrl = `${getSiteUrl()}${message.adminPath}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to,
        subject: message.subject,
        text: textFromLines(message.lines, adminUrl),
        html: htmlFromLines(message, adminUrl)
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error("Admin notification email failed", response.status, errorBody);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function notifyNewLead(lead: LeadNotification) {
  await sendAdminNotification({
    subject: `New LEAD inquiry from ${lead.name}`,
    preview: "A new student inquiry was submitted from the website contact form.",
    adminPath: "/admin",
    lines: [
      `Name: ${lead.name}`,
      `Email: ${lead.email}`,
      `WhatsApp: ${lead.whatsapp}`,
      `Locale: ${lead.locale}`,
      `Goal: ${lead.goal}`
    ]
  });
}

export async function notifyNewReview(review: ReviewNotification) {
  await sendAdminNotification({
    subject: `New LEAD review from ${review.name}`,
    preview: "A new student or parent review is waiting for admin approval.",
    adminPath: "/admin/reviews",
    lines: [
      `Name: ${review.name}`,
      `Role: ${review.role}`,
      `Class/Course: ${review.course}`,
      `Rating: ${review.rating}/5`,
      `Locale: ${review.locale}`,
      `Feedback: ${review.feedback}`
    ]
  });
}

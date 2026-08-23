import { Resend } from "resend";

const resend = new Resend(process.env["RESEND_API_KEY"]);

const FROM_EMAIL = process.env["RESEND_FROM_EMAIL"] || "Traqqy <reminders@traqqy.app>";
const BASE_URL = process.env["TRAQQY_BASE_URL"] || "http://localhost:24210";

export interface SendReminderParams {
  to: string;
  subscriptionName: string;
  amount: number;
  currency: string;
  renewalDate: string; // YYYY-MM-DD
  daysUntilRenewal: number;
}

export async function sendReminderEmail(params: SendReminderParams): Promise<void> {
  const { to, subscriptionName, amount, currency, renewalDate, daysUntilRenewal } = params;

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);

  const renewLabel =
    daysUntilRenewal === 0
      ? "renews today"
      : daysUntilRenewal === 1
        ? "renews tomorrow"
        : `renews in ${daysUntilRenewal} days`;

  const subject = `Reminder: ${subscriptionName} ${renewLabel}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:40px auto;padding:0 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:24px;font-weight:700;color:#1c1917;letter-spacing:-0.5px;">Traqqy</span>
    </div>
    <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#1c1917;">
        ${subscriptionName}
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:#78716c;">
        ${renewLabel.charAt(0).toUpperCase() + renewLabel.slice(1)} — ${formattedAmount}
      </p>
      <div style="background:#f5f5f4;border-radius:8px;padding:16px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:13px;color:#78716c;padding:4px 0;">Amount</td>
            <td style="font-size:13px;color:#1c1917;font-weight:500;text-align:right;padding:4px 0;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#78716c;padding:4px 0;">Renewal date</td>
            <td style="font-size:13px;color:#1c1917;font-weight:500;text-align:right;padding:4px 0;">${renewalDate}</td>
          </tr>
        </table>
      </div>
      <a href="${BASE_URL}/dashboard" style="display:block;text-align:center;background:#f59e0b;color:#1c1917;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
        Open Traqqy
      </a>
    </div>
    <p style="text-align:center;font-size:12px;color:#a8a29e;margin-top:24px;">
      You received this because you set a reminder in Traqqy.
    </p>
  </div>
</body>
</html>`;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject,
    html,
  });

  if (error || !data?.id) {
    const message = error?.message || 'Unknown Resend error';
    throw new Error('Resend rejected the email: ' + message);
  }
}

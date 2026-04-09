import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const hasSmtpConfig = Boolean(
  env.smtpHost && env.smtpUser && env.smtpPass && env.smtpFrom,
);

let transporter = null;

const getTransporter = () => {
  if (!hasSmtpConfig) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
      tls: {
        rejectUnauthorized: env.smtpTlsRejectUnauthorized,
      },
    });
  }

  return transporter;
};

export const isEmailDeliveryConfigured = () => hasSmtpConfig;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDate = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

export const sendOtpEmail = async ({ to, code }) => {
  const mailer = getTransporter();

  if (!mailer) {
    return { delivered: false, mode: "demo" };
  }

  const safeCode = String(code || "").trim();

  await mailer.sendMail({
    from: env.smtpFrom,
    to,
    subject: "BuilderCrux - OTP Verification",
    text: `Your OTP code: ${safeCode}\n\nThank you for choosing Buildercrux.\nThis OTP will expire in 10 minutes.\n\nIf you did not request this OTP, you can ignore this email.\n\nThanks & regards,\nAyush Anand\nFounder - Buildercrux`,
    html: `
      <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6;color:#0f172a;background:#ffffff">
        <div style="max-width:640px;margin:0 auto;padding:22px 20px">
          <div style="margin-bottom:14px">
            <h2 style="margin:10px 0 0;font-size:18px">OTP verification</h2>
            <p style="margin:10px 0 0;color:#334155;font-weight:700">Your OTP code:</p>
            <p style="margin:6px 0 0;font-size:28px;font-weight:900;letter-spacing:6px;color:#0f172a">${safeCode}</p>
            <p style="margin:6px 0 0;color:#475569">Thank you for choosing Buildercrux.</p>
          </div>

          <div style="border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:16px 18px">
            <p style="margin:0 0 10px;color:#334155">Use this OTP to continue. It expires in <strong>10 minutes</strong>.</p>
            <p style="margin:12px 0 0;color:#64748b;font-size:13px">If you did not request this OTP, you can safely ignore this email.</p>
          </div>

          <p style="margin:18px 0 0;color:#0f172a">
            Thanks &amp; regards,<br/>
            <strong>Ayush Anand</strong><br/>
            Founder - Buildercrux
          </p>
        </div>
      </div>
    `,
  });

  return { delivered: true, mode: "smtp" };
};

export const sendBookingInvoiceEmail = async (payload) => {
  const mailer = getTransporter();
  if (!mailer) {
    return { delivered: false, mode: "demo" };
  }

  const {
    to,
    bookingId,
    invoiceDate,
    member,
    bookedBy,
    gym,
    plan,
    booking,
    currency = "INR",
  } = payload || {};

  const safeBookingId = String(bookingId || "").trim();
  const subjectGym = gym?.name ? ` - ${gym.name}` : "";
  const subject = `Membership invoice${subjectGym}`;

  const memberName = member?.fullName || "Member";
  const memberPhone = member?.phone || "";
  const memberEmail = member?.email || "";
  const bookedByText = bookedBy?.fullName ? `${bookedBy.fullName}${bookedBy.phone ? ` (${bookedBy.phone})` : ""}` : "";

  const planTitle = plan?.title || "Membership plan";
  const planDurationLabel = plan?.durationLabel || (plan?.durationDays ? `${plan.durationDays} days` : "");
  const startsAt = booking?.startsAt ? formatDate(booking.startsAt) : "";
  const endsAt = booking?.endsAt ? formatDate(booking.endsAt) : "";
  const amount = Number.isFinite(Number(plan?.price)) ? Number(plan.price) : null;

  const invoiceDateText = formatDate(invoiceDate || new Date());
  const locationText = gym?.location
    ? [gym.location?.addressLine1, gym.location?.addressLine2, gym.location?.city, gym.location?.state, gym.location?.country]
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        .join(", ")
    : "";

  const lines = [
    `Invoice date: ${invoiceDateText}`,
    safeBookingId ? `Booking ID: ${safeBookingId}` : "",
    `Gym: ${gym?.name || ""}${locationText ? `, ${locationText}` : ""}`,
    `Member: ${memberName}${memberPhone ? ` (${memberPhone})` : ""}${memberEmail ? `, ${memberEmail}` : ""}`,
    bookedByText ? `Booked by: ${bookedByText}` : "",
    `Plan: ${planTitle}${planDurationLabel ? ` (${planDurationLabel})` : ""}`,
    startsAt ? `Starts: ${startsAt}` : "",
    endsAt ? `Ends: ${endsAt}` : "",
    amount !== null ? `Amount: ${currency} ${amount.toFixed(2)}` : `Amount: ${currency}`,
  ].filter(Boolean);

  const text = `Gym Management Invoice\n\n${lines.join("\n")}\n\nThanks for choosing us.`;

  const html = `
    <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6;color:#0f172a;background:#ffffff">
      <div style="max-width:720px;margin:0 auto;padding:24px">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:16px">
          <div>
            <h2 style="margin:0 0 6px;font-size:20px">Membership invoice</h2>
            <p style="margin:0;color:#475569">Invoice date: ${escapeHtml(invoiceDateText)}</p>
            ${safeBookingId ? `<p style="margin:0;color:#475569">Booking ID: ${escapeHtml(safeBookingId)}</p>` : ""}
          </div>
          <div style="text-align:right">
            <p style="margin:0;font-weight:700">${escapeHtml(gym?.name || "Gym")}</p>
            ${locationText ? `<p style="margin:2px 0 0;color:#475569">${escapeHtml(locationText)}</p>` : ""}
          </div>
        </div>

        <div style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
          <div style="padding:16px 18px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
            <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b">Member</p>
            <p style="margin:6px 0 0;font-weight:700">${escapeHtml(memberName)}</p>
            <p style="margin:4px 0 0;color:#475569">
              ${escapeHtml([memberPhone, memberEmail].filter(Boolean).join(" • ") || "No contact details")}
            </p>
            ${bookedByText ? `<p style="margin:8px 0 0;color:#64748b">Booked by: ${escapeHtml(bookedByText)}</p>` : ""}
          </div>

          <div style="padding:18px">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
              <thead>
                <tr>
                  <th align="left" style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.06em">Details</th>
                  <th align="right" style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.06em">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:12px 0">
                    <p style="margin:0;font-weight:700">${escapeHtml(planTitle)}</p>
                    <p style="margin:4px 0 0;color:#475569">${escapeHtml([planDurationLabel, startsAt && endsAt ? `${startsAt} → ${endsAt}` : ""].filter(Boolean).join(" • "))}</p>
                  </td>
                  <td align="right" style="padding:12px 0;font-weight:700">
                    ${amount !== null ? `${escapeHtml(currency)} ${escapeHtml(amount.toFixed(2))}` : escapeHtml(currency)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style="margin-top:14px;border-top:1px dashed #cbd5e1;padding-top:12px;display:flex;justify-content:space-between;gap:16px">
              <p style="margin:0;color:#475569">Total</p>
              <p style="margin:0;font-size:16px;font-weight:800">
                ${amount !== null ? `${escapeHtml(currency)} ${escapeHtml(amount.toFixed(2))}` : escapeHtml(currency)}
              </p>
            </div>
          </div>
        </div>

        <p style="margin:16px 0 0;color:#64748b">This is an auto-generated invoice for the slot booking.</p>
      </div>
    </div>
  `;

  await mailer.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    text,
    html,
  });

  return { delivered: true, mode: "smtp" };
};

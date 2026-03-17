const nodemailer = require("nodemailer");
const logger = require("../middleware/logger");

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn("Email credentials not configured. Emails will be skipped.");
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
};

const statusColors = {
  open: "#3B82F6",
  "in-progress": "#F59E0B",
  resolved: "#10B981",
  closed: "#6B7280",
};

const priorityColors = {
  low: "#6B7280",
  medium: "#3B82F6",
  high: "#F59E0B",
  urgent: "#EF4444",
};

const htmlTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; margin: 0; padding: 20px; }
  .container { max-width: 580px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; overflow: hidden; border: 1px solid #2a2a2a; }
  .header { background: linear-gradient(135deg, #1e1e2e 0%, #16213e 100%); padding: 32px; text-align: center; border-bottom: 1px solid #2a2a2a; }
  .header h1 { color: #fff; font-size: 22px; margin: 0; font-weight: 600; }
  .header p { color: #888; font-size: 13px; margin: 8px 0 0; }
  .body { padding: 28px 32px; color: #ccc; font-size: 15px; line-height: 1.6; }
  .ticket-card { background: #111; border: 1px solid #2a2a2a; border-radius: 8px; padding: 20px; margin: 20px 0; }
  .ticket-id { font-family: monospace; color: #60a5fa; font-size: 13px; margin-bottom: 8px; }
  .ticket-title { color: #fff; font-size: 18px; font-weight: 600; margin: 0 0 12px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #fff; }
  .footer { padding: 20px 32px; text-align: center; border-top: 1px solid #2a2a2a; color: #555; font-size: 12px; }
  .btn { display: inline-block; background: #3b82f6; color: #fff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin-top: 16px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🎫 Support Ticket System</h1>
    <p>Automated notification</p>
  </div>
  <div class="body">${content}</div>
  <div class="footer">This is an automated message. Please do not reply to this email.</div>
</div>
</body>
</html>
`;

const sendTicketCreatedEmail = async (user, ticket) => {
  const t = getTransporter();
  if (!t) return;

  const statusColor = statusColors[ticket.status] || "#3B82F6";
  const priorityColor = priorityColors[ticket.priority] || "#6B7280";

  const content = `
    <p>Hi <strong style="color:#fff">${user.name}</strong>,</p>
    <p>Your support ticket has been created successfully. Our team will review it shortly.</p>
    <div class="ticket-card">
      <div class="ticket-id">${ticket.ticketId}</div>
      <div class="ticket-title">${ticket.title}</div>
      <span class="badge" style="background:${statusColor}">${ticket.status}</span>
      <span class="badge" style="background:${priorityColor}; margin-left:6px">${ticket.priority} priority</span>
      <p style="color:#888; font-size:13px; margin: 12px 0 0">${ticket.description.substring(0, 200)}${ticket.description.length > 200 ? "..." : ""}</p>
    </div>
    <p style="color:#888; font-size:13px">We typically respond within 24 hours. You'll receive updates via email.</p>
  `;

  await t.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: user.email,
    subject: `[${ticket.ticketId}] Ticket Created: ${ticket.title}`,
    html: htmlTemplate("Ticket Created", content),
  });

  logger.info(`Ticket created email sent to ${user.email}`);
};

const sendTicketUpdatedEmail = async (ticket) => {
  const t = getTransporter();
  if (!t || !ticket.user?.email) return;

  const statusColor = statusColors[ticket.status] || "#3B82F6";

  const content = `
    <p>Hi <strong style="color:#fff">${ticket.user.name}</strong>,</p>
    <p>Your support ticket has been updated.</p>
    <div class="ticket-card">
      <div class="ticket-id">${ticket.ticketId}</div>
      <div class="ticket-title">${ticket.title}</div>
      <span class="badge" style="background:${statusColor}">Status: ${ticket.status}</span>
      ${ticket.assignedTo ? `<p style="color:#888; font-size:13px; margin:10px 0 0">Assigned to: <strong style="color:#ccc">${ticket.assignedTo.name}</strong></p>` : ""}
    </div>
  `;

  await t.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: ticket.user.email,
    subject: `[${ticket.ticketId}] Status Update: ${ticket.status.toUpperCase()}`,
    html: htmlTemplate("Ticket Updated", content),
  });

  logger.info(`Ticket updated email sent to ${ticket.user.email}`);
};

module.exports = { sendTicketCreatedEmail, sendTicketUpdatedEmail };

import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string | string[]
  subject: string
  html: string
}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("[mailer] GMAIL_USER / GMAIL_APP_PASSWORD not set — email skipped.")
    return
  }
  const recipients = Array.isArray(to) ? to : [to]
  if (recipients.length === 0) return

  await transporter.sendMail({
    from: `"Beeyond Trees" <${process.env.GMAIL_USER}>`,
    to: recipients.join(", "),
    subject,
    html,
  })
}

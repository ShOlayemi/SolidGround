import { Resend } from "resend";

export type EmailInput = { to: string; subject: string; html: string };

/** Send an email through Resend. Missing credentials are treated as a non-fatal skip. */
export async function sendEmail({ to, subject, html }: EmailInput): Promise<{ success: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY is not configured; skipping email", { to, subject });
    return { success: false, error: "Email service is not configured." };
  }
  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "SolidGround AI <noreply@solidground.ai>",
      to: [to], subject, html,
    });
    if (error) {
      console.error("Resend email error:", error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    console.error("Failed to send email:", message);
    return { success: false, error: message };
  }
}

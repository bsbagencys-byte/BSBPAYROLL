function env(name: string) {
  return (process.env[name] ?? "").trim();
}

export type EmailProviderStatus = {
  configured: boolean;
  provider: "smtp" | "none";
  from: string | null;
  host: string | null;
};

export function getEmailProviderStatus(): EmailProviderStatus {
  const host = env("SMTP_HOST");
  const from = env("SMTP_FROM") || env("MAIL_FROM");
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");
  const configured = Boolean(host && from && user && pass);
  return {
    configured,
    provider: configured ? "smtp" : "none",
    from: from || null,
    host: host || null,
  };
}

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string | null;
};

export type SendEmailResult = {
  ok: boolean;
  status: "SENT" | "UNCONFIGURED" | "FAILED";
  provider: string | null;
  error: string | null;
};

function sanitizeError(error: unknown) {
  const raw = error instanceof Error ? error.message : "Email delivery failed.";
  return raw.replace(/pass(word)?=[^&\s]+/gi, "password=***").slice(0, 300);
}

export async function sendTransactionalEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const status = getEmailProviderStatus();
  if (!status.configured || !status.host || !status.from) {
    return {
      ok: false,
      status: "UNCONFIGURED",
      provider: null,
      error: "Email provider is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM.",
    };
  }
  const port = Number(env("SMTP_PORT") || "587");
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");
  try {
    const nodemailer = (await import("nodemailer" as string).catch(() => null)) as
      | {
          createTransport: (opts: Record<string, unknown>) => {
            sendMail: (mail: Record<string, unknown>) => Promise<unknown>;
          };
        }
      | null;
    if (!nodemailer) {
      return {
        ok: false,
        status: "UNCONFIGURED",
        provider: "smtp",
        error: "SMTP library is not installed. Email is not claimed as working.",
      };
    }
    const transporter = nodemailer.createTransport({
      host: status.host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: status.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html || undefined,
    });
    return { ok: true, status: "SENT", provider: "smtp", error: null };
  } catch (error) {
    return { ok: false, status: "FAILED", provider: "smtp", error: sanitizeError(error) };
  }
}

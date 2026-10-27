import { createHmac, timingSafeEqual } from "node:crypto";

export type PaymentProviderName = "NONE" | "RAZORPAY";

export type CheckoutRequest = {
  organizationId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
};

export type CheckoutResult =
  | { configured: false; provider: PaymentProviderName; message: string }
  | {
      configured: true;
      provider: PaymentProviderName;
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
    };

export type VerifiedPayment = {
  provider: PaymentProviderName;
  orderId: string;
  paymentId: string;
  signature: string;
  amount?: number;
  currency?: string;
  status: "SUCCESS" | "FAILED" | "PENDING" | "REFUNDED";
};

export type WebhookResult = {
  provider: PaymentProviderName;
  eventId: string;
  eventType: string;
  signatureValid: boolean;
  paymentId: string | null;
  orderId: string | null;
  status: "SUCCESS" | "FAILED" | "PENDING" | "REFUNDED" | null;
  payload: Record<string, unknown>;
};

function env(name: string) {
  return (process.env[name] ?? "").trim();
}

export function paymentProviderName(): PaymentProviderName {
  const keyId = env("RAZORPAY_KEY_ID");
  const secret = env("RAZORPAY_KEY_SECRET");
  if (keyId && secret) return "RAZORPAY";
  return "NONE";
}

export function isPaymentProviderConfigured() {
  return paymentProviderName() !== "NONE";
}

export function providerStatus() {
  const provider = paymentProviderName();
  if (provider === "NONE") {
    return {
      provider,
      configured: false,
      message: "No payment provider is configured. Checkout cannot mark a subscription paid.",
    };
  }
  return {
    provider,
    configured: true,
    message: "Razorpay credentials are present. Live charges are not claimed until sandbox verification succeeds.",
  };
}

function expectedSignature(orderId: string, paymentId: string, secret: string) {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
  const status = providerStatus();
  if (!status.configured) {
    return { configured: false, provider: "NONE", message: status.message };
  }
  const keyId = env("RAZORPAY_KEY_ID");
  const secret = env("RAZORPAY_KEY_SECRET");
  const auth = Buffer.from(`${keyId}:${secret}`).toString("base64");
  const amountPaise = Math.round(request.amount * 100);
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: request.currency,
      receipt: request.receipt.slice(0, 40),
      notes: {
        organization_id: request.organizationId,
        invoice_id: request.invoiceId,
        ...request.notes,
      },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Payment provider order failed (${response.status}): ${text.slice(0, 200)}`);
  }
  const body = (await response.json()) as { id?: string };
  if (!body.id) throw new Error("Payment provider did not return an order id.");
  return {
    configured: true,
    provider: "RAZORPAY",
    orderId: body.id,
    amount: request.amount,
    currency: request.currency,
    keyId,
  };
}

export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = env("RAZORPAY_KEY_SECRET");
  if (!secret) return false;
  const expected = expectedSignature(input.orderId, input.paymentId, secret);
  return safeEqual(expected, input.signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = env("RAZORPAY_WEBHOOK_SECRET") || env("RAZORPAY_KEY_SECRET");
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export function parseWebhook(rawBody: string, signature: string): WebhookResult {
  const signatureValid = verifyWebhookSignature(rawBody, signature);
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    payload = {};
  }
  const eventType = String(payload.event ?? "unknown");
  const payloadInner = (payload.payload ?? {}) as Record<string, unknown>;
  const paymentEntity = ((payloadInner.payment as Record<string, unknown> | undefined)?.entity ??
    payloadInner.entity ??
    {}) as Record<string, unknown>;
  const paymentId = typeof paymentEntity.id === "string" ? paymentEntity.id : null;
  const orderId = typeof paymentEntity.order_id === "string" ? paymentEntity.order_id : null;
  const entityStatus = String(paymentEntity.status ?? "").toLowerCase();
  let status: WebhookResult["status"] = null;
  if (entityStatus === "captured" || eventType === "payment.captured") status = "SUCCESS";
  else if (entityStatus === "failed" || eventType === "payment.failed") status = "FAILED";
  else if (entityStatus === "refunded" || eventType.startsWith("refund.")) status = "REFUNDED";
  else if (entityStatus === "authorized" || entityStatus === "created") status = "PENDING";
  const eventId =
    (typeof payload.id === "string" && payload.id) ||
    `${eventType}:${paymentId ?? orderId ?? "unknown"}`;
  return {
    provider: "RAZORPAY",
    eventId,
    eventType,
    signatureValid,
    paymentId,
    orderId,
    status,
    payload,
  };
}

export function unconfiguredCheckoutMessage() {
  return "Payment provider is unconfigured. A browser success callback cannot activate or renew a subscription.";
}

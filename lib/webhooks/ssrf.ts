import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTS = new Set(["localhost", "localhost.localdomain", "metadata.google.internal", "metadata"]);

function ipv4ToInt(ip: string) {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function inRange(ip: string, cidr: string) {
  const [base, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

function isPrivateIPv4(ip: string) {
  return (
    inRange(ip, "10.0.0.0/8") ||
    inRange(ip, "127.0.0.0/8") ||
    inRange(ip, "169.254.0.0/16") ||
    inRange(ip, "172.16.0.0/12") ||
    inRange(ip, "192.168.0.0/16") ||
    inRange(ip, "0.0.0.0/8")
  );
}

function isPrivateIPv6(ip: string) {
  const value = ip.toLowerCase();
  return (
    value === "::1" ||
    value === "::" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe80") ||
    value.startsWith("::ffff:127.") ||
    value.startsWith("::ffff:10.") ||
    value.startsWith("::ffff:192.168.") ||
    value.startsWith("::ffff:169.254.")
  );
}

export async function assertSafeWebhookUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Webhook URL is invalid.");
  }
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("Webhook URL must use HTTPS in production.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Webhook URL must be HTTP or HTTPS.");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Webhook URL host is not allowed.");
  }
  const literal = isIP(hostname);
  if (literal === 4 && isPrivateIPv4(hostname)) throw new Error("Webhook URL resolves to a private network.");
  if (literal === 6 && isPrivateIPv6(hostname)) throw new Error("Webhook URL resolves to a private network.");
  if (!literal) {
    let records: { address: string; family: number }[] = [];
    try {
      records = await lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new Error("Webhook URL host could not be resolved.");
    }
    for (const record of records) {
      if (record.family === 4 && isPrivateIPv4(record.address)) {
        throw new Error("Webhook URL resolves to a private network.");
      }
      if (record.family === 6 && isPrivateIPv6(record.address)) {
        throw new Error("Webhook URL resolves to a private network.");
      }
    }
  }
  return url.toString();
}

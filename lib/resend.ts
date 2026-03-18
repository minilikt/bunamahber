// resendClient.ts
import { Resend } from "resend";

const PRIMARY_DOMAIN = "bunamahber.com";

interface ResendClient {
  client: Resend;
  domain: string;
}

/**
 * Lazy initialization of the primary Resend client
 */
function getPrimaryClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY missing at runtime");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * Lazy initialization of fallback clients
 */
function getFallbackClients(): ResendClient[] {
  const clients: ResendClient[] = [];

  if (process.env.RESEND_API_KEY_FALLBACK) {
    clients.push({
      client: new Resend(process.env.RESEND_API_KEY_FALLBACK),
      domain: process.env.RESEND_DOMAIN_FALLBACK || "bunamahber.me",
    });
  }

  if (process.env.RESEND_API_KEY_FALLBACK_2) {
    clients.push({
      client: new Resend(process.env.RESEND_API_KEY_FALLBACK_2),
      domain: process.env.RESEND_DOMAIN_FALLBACK_2 || "pulslabs.tech",
    });
  }

  if (process.env.RESEND_API_KEY_FALLBACK_3) {
    clients.push({
      client: new Resend(process.env.RESEND_API_KEY_FALLBACK_3),
      domain: process.env.RESEND_DOMAIN_FALLBACK_3 || "habeshaprogeny.tech",
    });
  }

  return clients;
}

export interface SendEmailOptions {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Sends an email using primary Resend client first.
 * If it fails, it tries fallbacks in order.
 */
export async function sendEmail(options: SendEmailOptions) {
  const resend = getPrimaryClient();
  const fallbackClients = getFallbackClients();

  // 1️⃣ Try primary client
  try {
    const { data, error } = await resend.emails.send({
      ...options,
      from: options.from || `Buna <hello@${PRIMARY_DOMAIN}>`,
    });

    if (!error) return { data, error: null };
    console.error(`[RESEND] Primary (${PRIMARY_DOMAIN}) failed:`, error);
  } catch (err) {
    console.error(`[RESEND] Primary (${PRIMARY_DOMAIN}) exception:`, err);
  }

  // 2️⃣ Try fallbacks
  for (const fallback of fallbackClients) {
    try {
      console.log(`[RESEND] Attempting fallback with domain: ${fallback.domain}`);

      const fallbackFrom =
        options.from?.replace(PRIMARY_DOMAIN, fallback.domain) ||
        `Buna <hello@${fallback.domain}>`;

      const { data, error } = await fallback.client.emails.send({
        ...options,
        from: fallbackFrom,
      });

      if (!error) return { data, error: null };
      console.error(`[RESEND] Fallback (${fallback.domain}) failed:`, error);
    } catch (err) {
      console.error(`[RESEND] Fallback (${fallback.domain}) exception:`, err);
    }
  }

  return {
    data: null,
    error: { message: "All email providers failed", name: "all_providers_failed" },
  };
}
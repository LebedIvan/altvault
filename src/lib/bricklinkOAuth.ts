import { createHmac, randomBytes } from "crypto";

export interface BrickLinkCredentials {
  consumerKey: string;
  consumerSecret: string;
  tokenValue: string;
  tokenSecret: string;
}

/** Percent-encode per RFC 3986 (more strict than encodeURIComponent). */
function encode(s: string): string {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Build an OAuth 1.0a Authorization header for BrickLink API calls.
 * Uses Node.js built-in `crypto` — no extra dependencies.
 */
export function buildOAuthHeader(
  method: string,
  url: string,
  credentials: BrickLinkCredentials,
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key:     credentials.consumerKey,
    oauth_token:            credentials.tokenValue,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_nonce:            randomBytes(16).toString("hex"),
    oauth_version:          "1.0",
  };

  // Signature base string: METHOD & encoded_url & encoded_params
  const paramString = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encode(k)}=${encode(v)}`)
    .join("&");

  const baseString = [method.toUpperCase(), encode(url), encode(paramString)].join("&");

  const signingKey = `${encode(credentials.consumerSecret)}&${encode(credentials.tokenSecret)}`;
  const signature  = createHmac("sha1", signingKey).update(baseString).digest("base64");

  const allParams = { ...oauthParams, oauth_signature: signature };
  const headerValue = Object.entries(allParams)
    .map(([k, v]) => `${encode(k)}="${encode(v)}"`)
    .join(", ");

  return `OAuth ${headerValue}`;
}

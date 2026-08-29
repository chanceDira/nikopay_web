import { createHash, createPublicKey, verify } from "node:crypto";

import type { PawapayPublicKey } from "@/lib/pawapay/types";

type Algorithm = {
  hash: string;
  padding?: number;
  dsaEncoding?: "ieee-p1363";
  saltLength?: number;
};

const RSA_PSS_PADDING = 6;
const RSA_PKCS1_PADDING = 1;

const ALGORITHMS: Record<string, Algorithm> = {
  "ecdsa-p256-sha256": { hash: "sha256", dsaEncoding: "ieee-p1363" },
  "ecdsa-p384-sha384": { hash: "sha384", dsaEncoding: "ieee-p1363" },
  "rsa-v1_5-sha256": { hash: "sha256", padding: RSA_PKCS1_PADDING },
  "rsa-pss-sha512": {
    hash: "sha512",
    padding: RSA_PSS_PADDING,
    saltLength: 64,
  },
};

const DERIVED = new Set(["@method", "@authority", "@path"]);

export type SignatureInput = {
  label: string;
  components: string[];
  params: string;
  alg: string;
  keyid: string;
  expires: number | null;
};

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export function verifyCallbackSignature(input: {
  method: string;
  url: string;
  headers: Headers;
  rawBody: string;
  keys: PawapayPublicKey[];
  now?: Date;
}): VerifyResult {
  const digest = verifyContentDigest(
    input.headers.get("content-digest"),
    input.rawBody,
  );
  if (!digest.ok) {
    return digest;
  }

  const parsed = parseSignatureInput(input.headers.get("signature-input"));
  if (!parsed) {
    return { ok: false, reason: "signature-input is missing or malformed" };
  }

  const expiredAt = (input.now ?? new Date()).getTime() / 1000;
  if (parsed.expires !== null && parsed.expires < expiredAt) {
    return { ok: false, reason: "signature has expired" };
  }

  const algorithm = ALGORITHMS[parsed.alg];
  if (!algorithm) {
    return { ok: false, reason: "unsupported signature algorithm" };
  }

  const signature = parseSignatureHeader(
    input.headers.get("signature"),
    parsed.label,
  );
  if (!signature) {
    return { ok: false, reason: "signature is missing or malformed" };
  }

  const key = input.keys.find((candidate) => candidate.id === parsed.keyid);
  if (!key) {
    return { ok: false, reason: "signature key is unknown" };
  }

  const base = buildSignatureBase(parsed, {
    method: input.method,
    url: input.url,
    headers: input.headers,
  });
  if (!base) {
    return { ok: false, reason: "signature base is incomplete" };
  }

  return verifyBase({ base, signature, key: key.key, algorithm });
}

export function verifyContentDigest(
  header: string | null,
  rawBody: string,
): VerifyResult {
  if (!header) {
    return { ok: false, reason: "content-digest is missing" };
  }

  const match = /^(sha-256|sha-512)=:(.+):$/.exec(header.trim());
  if (!match) {
    return { ok: false, reason: "content-digest is malformed" };
  }

  const algorithm = match[1] === "sha-256" ? "sha256" : "sha512";
  const expected = createHash(algorithm).update(rawBody, "utf8").digest();
  const provided = Buffer.from(match[2], "base64");

  if (
    provided.length !== expected.length ||
    !timingSafeEquals(provided, expected)
  ) {
    return { ok: false, reason: "content-digest does not match body" };
  }

  return { ok: true };
}

export function parseSignatureInput(
  header: string | null,
): SignatureInput | null {
  if (!header) {
    return null;
  }

  const match = /^([A-Za-z0-9_-]+)=\(([^)]*)\)(.*)$/.exec(header.trim());
  if (!match) {
    return null;
  }

  const components = match[2]
    .split(/\s+/)
    .map((part) => part.replace(/"/g, "").trim())
    .filter(Boolean);
  if (components.length === 0) {
    return null;
  }

  const params = match[3];
  const alg = /alg="([^"]+)"/.exec(params)?.[1];
  const keyid = /keyid="([^"]+)"/.exec(params)?.[1];
  if (!alg || !keyid) {
    return null;
  }

  const expiresRaw = /expires=(\d+)/.exec(params)?.[1];

  return {
    label: match[1],
    components,
    params: `(${match[2]})${params}`,
    alg,
    keyid,
    expires: expiresRaw ? Number(expiresRaw) : null,
  };
}

function parseSignatureHeader(
  header: string | null,
  label: string,
): Buffer | null {
  if (!header) {
    return null;
  }

  const pattern = new RegExp(`${label}=:([^:]+):`);
  const encoded = pattern.exec(header.trim())?.[1];
  if (!encoded) {
    return null;
  }

  return Buffer.from(encoded, "base64");
}

function buildSignatureBase(
  input: SignatureInput,
  request: { method: string; url: string; headers: Headers },
): string | null {
  const lines: string[] = [];

  for (const component of input.components) {
    const value = componentValue(component, request);
    if (value === null) {
      return null;
    }
    lines.push(`"${component}": ${value}`);
  }

  lines.push(`"@signature-params": ${input.params}`);
  return lines.join("\n");
}

function componentValue(
  component: string,
  request: { method: string; url: string; headers: Headers },
): string | null {
  if (DERIVED.has(component)) {
    return derivedValue(component, request);
  }
  return request.headers.get(component)?.trim() ?? null;
}

function derivedValue(
  component: string,
  request: { method: string; url: string },
): string | null {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return null;
  }

  switch (component) {
    case "@method":
      return request.method.toUpperCase();
    case "@authority":
      return url.host;
    case "@path":
      return url.pathname;
    default:
      return null;
  }
}

function verifyBase(input: {
  base: string;
  signature: Buffer;
  key: string;
  algorithm: Algorithm;
}): VerifyResult {
  try {
    const publicKey = createPublicKey(input.key);
    const valid = verify(
      input.algorithm.hash,
      Buffer.from(input.base, "utf8"),
      {
        key: publicKey,
        dsaEncoding: input.algorithm.dsaEncoding,
        padding: input.algorithm.padding,
        saltLength: input.algorithm.saltLength,
      },
      input.signature,
    );

    return valid ? { ok: true } : { ok: false, reason: "signature is invalid" };
  } catch {
    return { ok: false, reason: "signature could not be verified" };
  }
}

function timingSafeEquals(left: Buffer, right: Buffer): boolean {
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left[i] ^ right[i];
  }
  return diff === 0;
}

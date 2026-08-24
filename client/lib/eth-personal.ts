import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";

const SIG_HEX = /^0x[a-fA-F0-9]{130}$/;

export function recoverPersonalSigner(
  message: string,
  signature: string,
): { ok: true; address: string } | { ok: false; reason: string } {
  if (!SIG_HEX.test(signature)) {
    return { ok: false, reason: "signature is invalid" };
  }

  const recovered = recoveredSignatureBytes(signature);
  if (!recovered.ok) {
    return recovered;
  }

  try {
    const publicKey = secp256k1.recoverPublicKey(
      recovered.bytes,
      personalMessageHash(message),
      { prehash: false },
    );
    const uncompressed = secp256k1.Point.fromBytes(publicKey).toBytes(false);
    const hash = keccak_256(uncompressed.subarray(1));
    return { ok: true, address: `0x${toHex(hash.subarray(12))}` };
  } catch {
    return { ok: false, reason: "signature is invalid" };
  }
}

export function personalMessageHash(message: string): Uint8Array {
  const encoded = new TextEncoder().encode(message);
  const prefix = new TextEncoder().encode(
    `\x19Ethereum Signed Message:\n${encoded.length}`,
  );
  const joined = new Uint8Array(prefix.length + encoded.length);
  joined.set(prefix);
  joined.set(encoded, prefix.length);
  return keccak_256(joined);
}

function recoveredSignatureBytes(
  signature: string,
): { ok: true; bytes: Uint8Array } | { ok: false; reason: string } {
  const eth = fromHex(signature.slice(2));
  let recovery = eth[64];
  if (recovery >= 27) {
    recovery -= 27;
  }
  if (recovery !== 0 && recovery !== 1) {
    return { ok: false, reason: "signature is invalid" };
  }

  const recovered = new Uint8Array(65);
  recovered[0] = recovery;
  recovered.set(eth.subarray(0, 64), 1);
  return { ok: true, bytes: recovered };
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

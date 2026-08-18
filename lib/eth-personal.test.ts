import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { describe, expect, it } from "vitest";
import { recoverPersonalSigner } from "@/lib/eth-personal";

describe("recoverPersonalSigner", () => {
  it("recovers the signer of a personal_sign message", () => {
    const secretKey = secp256k1.utils.randomSecretKey();
    const publicKey = secp256k1.getPublicKey(secretKey, false);
    const address = `0x${toHex(keccak_256(publicKey.subarray(1)).subarray(12))}`;
    const message = "NikoPay admin\nSign this to open the ops console.\n1.abc";
    const prefix = new TextEncoder().encode(
      `\x19Ethereum Signed Message:\n${message.length}`,
    );
    const encoded = new TextEncoder().encode(message);
    const joined = new Uint8Array(prefix.length + encoded.length);
    joined.set(prefix);
    joined.set(encoded, prefix.length);
    const hash = keccak_256(joined);
    const signature = secp256k1.sign(hash, secretKey, {
      prehash: false,
      format: "recovered",
    });
    const eth = new Uint8Array(65);
    eth.set(signature.subarray(1), 0);
    eth[64] = signature[0] + 27;
    const ethSig = `0x${toHex(eth)}`;

    expect(recoverPersonalSigner(message, ethSig)).toEqual({
      ok: true,
      address,
    });
  });

  it("rejects a short signature", () => {
    expect(recoverPersonalSigner("hello", "0xab").ok).toBe(false);
  });
});

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

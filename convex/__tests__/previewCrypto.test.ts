import { describe, expect, it } from "vitest";
import { computeProof, verifyProof } from "../lib/previewCrypto";
import { generateSessionId, generateSessionSecret } from "../lib/utils";

describe("generateSessionId", () => {
  it("generates a 64-character hex string", () => {
    const id = generateSessionId();
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique IDs", () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();
    expect(id1).not.toBe(id2);
  });
});

describe("generateSessionSecret", () => {
  it("generates a 64-character hex string", () => {
    const secret = generateSessionSecret();
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique secrets", () => {
    const s1 = generateSessionSecret();
    const s2 = generateSessionSecret();
    expect(s1).not.toBe(s2);
  });
});

describe("computeProof", () => {
  const testSecret =
    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
  const testSessionId =
    "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const testTimestamp = "1706700000";

  it("produces a base64 string", async () => {
    const proof = await computeProof(testSecret, testSessionId, testTimestamp);
    expect(proof).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("produces deterministic output for same inputs", async () => {
    const proof1 = await computeProof(testSecret, testSessionId, testTimestamp);
    const proof2 = await computeProof(testSecret, testSessionId, testTimestamp);
    expect(proof1).toBe(proof2);
  });

  it("produces different output for different timestamps", async () => {
    const proof1 = await computeProof(testSecret, testSessionId, "1706700000");
    const proof2 = await computeProof(testSecret, testSessionId, "1706700001");
    expect(proof1).not.toBe(proof2);
  });

  it("produces different output for different secrets", async () => {
    const otherSecret =
      "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    const proof1 = await computeProof(testSecret, testSessionId, testTimestamp);
    const proof2 = await computeProof(
      otherSecret,
      testSessionId,
      testTimestamp,
    );
    expect(proof1).not.toBe(proof2);
  });
});

describe("verifyProof", () => {
  const testSecret =
    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
  const testSessionId =
    "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

  it("returns true for a valid proof", async () => {
    const now = Math.floor(Date.now() / 1000).toString();
    const proof = await computeProof(testSecret, testSessionId, now);
    const valid = await verifyProof(testSecret, testSessionId, now, proof);
    expect(valid).toBe(true);
  });

  it("returns false for a tampered sessionId", async () => {
    const now = Math.floor(Date.now() / 1000).toString();
    const proof = await computeProof(testSecret, testSessionId, now);
    const tampered =
      "0000000000000000000000000000000000000000000000000000000000000000";
    const valid = await verifyProof(testSecret, tampered, now, proof);
    expect(valid).toBe(false);
  });

  it("returns false for a wrong secret", async () => {
    const now = Math.floor(Date.now() / 1000).toString();
    const proof = await computeProof(testSecret, testSessionId, now);
    const wrongSecret =
      "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    const valid = await verifyProof(wrongSecret, testSessionId, now, proof);
    expect(valid).toBe(false);
  });

  it("returns false for a stale timestamp", async () => {
    // Timestamp from 2 minutes ago (>60 seconds freshness window)
    const staleTimestamp = (Math.floor(Date.now() / 1000) - 120).toString();
    const proof = await computeProof(testSecret, testSessionId, staleTimestamp);
    const valid = await verifyProof(
      testSecret,
      testSessionId,
      staleTimestamp,
      proof,
    );
    expect(valid).toBe(false);
  });

  it("returns false for non-numeric timestamp", async () => {
    const proof = await computeProof(testSecret, testSessionId, "abc");
    const valid = await verifyProof(testSecret, testSessionId, "abc", proof);
    expect(valid).toBe(false);
  });
});

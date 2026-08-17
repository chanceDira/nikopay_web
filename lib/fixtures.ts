import type { PaymentIntent, PaymentStatus, ChainId } from "./settlement/types";

const LOCAL_STORAGE_KEY = "nikopay_intents_v1";
const MOCK_WALLET = "0x742d35cc6634c0532925a3b844bc454e4438f44e";

const isClient = typeof window !== "undefined";

const SEED_INTENTS: PaymentIntent[] = [
  {
    id: "tx-7392a",
    status: "paid",
    chain: "polygon",
    walletAddress: MOCK_WALLET,
    msisdn: "+250787259588",
    usdtAmount: 50,
    rate: 1350,
    feePercent: 1.5,
    feeRwf: 1012,
    netRwf: 66488,
    treasuryAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(
      Date.now() - 24 * 60 * 60 * 1000 - 5 * 60 * 1000,
    ).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    depositTx:
      "0x25a6cf490db207ff036c84c1387d8f45a43abf9227546e3d5483a921d2345678",
    momoRef: "MPA83920192",
  },
  {
    id: "tx-1290b",
    status: "failed",
    chain: "base",
    walletAddress: MOCK_WALLET,
    msisdn: "+250781234567",
    usdtAmount: 100,
    rate: 1350,
    feePercent: 1.5,
    feeRwf: 2025,
    netRwf: 132975,
    treasuryAddress: "0x839d35Cc6634C0532925a3b844Bc454e4438f99f",
    expiresAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(
      Date.now() - 5 * 60 * 60 * 1000 - 15 * 60 * 1000,
    ).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    depositTx:
      "0xb7c8fa190db207ff036c84c1387d8f45a43abf9227546e3d5483a921d2654321",
  },
  {
    id: "tx-5534c",
    status: "expired",
    chain: "polygon",
    walletAddress: MOCK_WALLET,
    msisdn: "+250789999999",
    usdtAmount: 20,
    rate: 1350,
    feePercent: 1.5,
    feeRwf: 405,
    netRwf: 26595,
    treasuryAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    expiresAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(
      Date.now() - 10 * 60 * 60 * 1000 - 30 * 60 * 1000,
    ).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "tx-4421d",
    status: "manual_review",
    chain: "base",
    walletAddress: MOCK_WALLET,
    msisdn: "+250785555555",
    usdtAmount: 250,
    rate: 1350,
    feePercent: 1.5,
    feeRwf: 5062,
    netRwf: 332438,
    treasuryAddress: "0x839d35Cc6634C0532925a3b844Bc454e4438f99f",
    expiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(
      Date.now() - 2 * 60 * 60 * 1000 - 20 * 60 * 1000,
    ).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    depositTx:
      "0xec29df490db207ff036c84c1387d8f45a43abf9227546e3d5483a921d2987654",
  },
];

export function getMockIntents(): PaymentIntent[] {
  if (!isClient) return SEED_INTENTS;

  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_INTENTS));
    return SEED_INTENTS;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return SEED_INTENTS;
  }
}

export function getMockIntent(id: string): PaymentIntent | undefined {
  const intents = getMockIntents();
  return intents.find((intent) => intent.id === id);
}

export function saveMockIntent(intent: PaymentIntent): void {
  if (!isClient) return;

  const intents = getMockIntents();
  const index = intents.findIndex((i) => i.id === intent.id);

  if (index >= 0) {
    intents[index] = { ...intent, updatedAt: new Date().toISOString() };
  } else {
    intents.unshift(intent);
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(intents));
}

export function createMockIntent(params: {
  usdtAmount: number;
  chain: ChainId;
  msisdn: string;
  walletAddress?: string;
}): PaymentIntent {
  const id = `tx-${Math.random().toString(36).substring(2, 7)}`;
  let rate = 1350;
  let feePercent = 1.5;
  if (isClient) {
    rate = parseFloat(localStorage.getItem("nikopay_fx_rate") || "1350");
    feePercent = parseFloat(localStorage.getItem("nikopay_fx_fee") || "1.5");
  }
  const grossRwf = params.usdtAmount * rate;
  const feeRwf = Math.round(grossRwf * (feePercent / 100));
  const netRwf = grossRwf - feeRwf;

  const treasuryAddress =
    params.chain === "polygon"
      ? "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
      : "0x839d35Cc6634C0532925a3b844Bc454e4438f99f";

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 20 * 60 * 1000); // 20 minutes from now

  const intent: PaymentIntent = {
    id,
    status: "awaiting_payment",
    chain: params.chain,
    walletAddress: params.walletAddress || MOCK_WALLET,
    msisdn: params.msisdn,
    usdtAmount: params.usdtAmount,
    rate,
    feePercent,
    feeRwf,
    netRwf,
    treasuryAddress,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  saveMockIntent(intent);
  return intent;
}

// Function to update status based on elapsed time to simulate progress
export function updateActiveIntentStatuses(): boolean {
  if (!isClient) return false;

  const intents = getMockIntents();
  let updated = false;

  const newIntents = intents.map((intent) => {
    // Only transition intents that are in active progress
    if (
      intent.status !== "awaiting_payment" &&
      intent.status !== "detected" &&
      intent.status !== "credited" &&
      intent.status !== "payout_pending"
    ) {
      return intent;
    }

    const elapsedMs = Date.now() - new Date(intent.createdAt).getTime();
    let newStatus: PaymentStatus = intent.status;
    let depositTx = intent.depositTx;
    let momoRef = intent.momoRef;

    // Timeline steps:
    // 0 - 10s: awaiting_payment
    // 10s - 25s: detected
    // 25s - 40s: credited
    // 40s - 55s: payout_pending
    // >55s: paid
    if (elapsedMs >= 55000) {
      newStatus = "paid";
      if (!momoRef)
        momoRef = `REF-${Math.floor(100000000 + Math.random() * 900000000)}`;
    } else if (elapsedMs >= 40000) {
      newStatus = "payout_pending";
    } else if (elapsedMs >= 25000) {
      newStatus = "credited";
    } else if (elapsedMs >= 10000) {
      newStatus = "detected";
      if (!depositTx)
        depositTx = `0x${Math.random().toString(16).substring(2)}a6cf${Math.random().toString(16).substring(2)}`;
    }

    if (newStatus !== intent.status) {
      updated = true;
      return {
        ...intent,
        status: newStatus,
        depositTx,
        momoRef,
        updatedAt: new Date().toISOString(),
      };
    }

    return intent;
  });

  if (updated) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newIntents));
  }

  return updated;
}

export function forceTransition(
  id: string,
  targetStatus: PaymentStatus,
): PaymentIntent | undefined {
  const intent = getMockIntent(id);
  if (!intent) return undefined;

  intent.status = targetStatus;
  if (targetStatus === "detected" && !intent.depositTx) {
    intent.depositTx = `0x${Math.random().toString(16).substring(2)}a6cf${Math.random().toString(16).substring(2)}`;
  }
  if (targetStatus === "paid" && !intent.momoRef) {
    intent.momoRef = `REF-${Math.floor(100000000 + Math.random() * 900000000)}`;
  }

  saveMockIntent(intent);
  return intent;
}

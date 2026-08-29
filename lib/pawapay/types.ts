export type PawapayInitiationStatus =
  "ACCEPTED" | "REJECTED" | "DUPLICATE_IGNORED";

export type PawapayPayoutStatus =
  | "ACCEPTED"
  | "ENQUEUED"
  | "PROCESSING"
  | "IN_RECONCILIATION"
  | "COMPLETED"
  | "FAILED";

export type DomainPayoutStatus =
  "pending" | "successful" | "failed" | "enqueued";

export type PawapayMmoAccount = {
  type: "MMO";
  accountDetails: {
    phoneNumber: string;
    provider: string;
  };
};

export type InitiatePayoutRequest = {
  payoutId: string;
  amount: string;
  currency: string;
  recipient: PawapayMmoAccount;
  clientReferenceId?: string;
  customerMessage?: string;
};

export type PawapayFailureReason = {
  failureCode: string;
  failureMessage: string;
};

export type InitiatePayoutResponse = {
  payoutId: string;
  status: PawapayInitiationStatus;
  created?: string;
  failureReason?: PawapayFailureReason;
};

export type PayoutLookupData = {
  payoutId: string;
  status: PawapayPayoutStatus;
  amount?: string;
  currency?: string;
  country?: string;
  providerTransactionId?: string;
  failureReason?: PawapayFailureReason;
};

export type GetPayoutResponse =
  { status: "FOUND"; data: PayoutLookupData } | { status: "NOT_FOUND" };

export type PawapayPublicKey = {
  id: string;
  key: string;
};

export type PredictProviderResponse = {
  country: string;
  provider: string;
  phoneNumber: string;
};

export type WalletBalance = {
  country: string;
  balance: string;
  currency: string;
  provider: string;
};

export type AvailabilityOperationStatus = "OPERATIONAL" | "DELAYED" | "CLOSED";

export type AvailabilityCountry = {
  country: string;
  providers: Array<{
    provider: string;
    operationTypes: Array<{
      operationType: string;
      status: AvailabilityOperationStatus;
    }>;
  }>;
};

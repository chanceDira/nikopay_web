export type PawapayInitiationStatus =
  "ACCEPTED" | "REJECTED" | "DUPLICATE_IGNORED";

export type PawapayPayoutStatus =
  "ACCEPTED" | "SUBMITTED" | "COMPLETED" | "FAILED" | "ENQUEUED";

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

import { resolvePublicSiteUrl } from "@/lib/site-url";

type JsonSchema = Record<string, unknown>;
type OpenApiPathItem = Record<string, unknown>;

const errorEnvelope: JsonSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: { type: "string" },
  },
};

function dataEnvelope(schema: JsonSchema): JsonSchema {
  return {
    type: "object",
    required: ["data"],
    properties: {
      data: schema,
    },
  };
}

function jsonContent(schema: JsonSchema) {
  return {
    content: {
      "application/json": { schema },
    },
  };
}

function errorResponses(...statuses: number[]) {
  const out: Record<string, unknown> = {};
  for (const status of statuses) {
    out[String(status)] = {
      description: `Error ${status}`,
      ...jsonContent(errorEnvelope),
    };
  }
  return out;
}

const chainSchema: JsonSchema = {
  type: "string",
  enum: ["polygon", "base"],
};

const paymentStatusSchema: JsonSchema = {
  type: "string",
  enum: [
    "awaiting_payment",
    "detected",
    "credited",
    "payout_pending",
    "paid",
    "failed",
    "expired",
    "manual_review",
  ],
};

const intentPayoutSchema: JsonSchema = {
  type: "object",
  required: ["status", "referenceId", "updatedAt"],
  properties: {
    status: {
      type: "string",
      enum: ["pending", "enqueued", "successful", "failed", "timeout"],
    },
    referenceId: { type: "string" },
    providerRef: { type: "string" },
    providerReason: { type: "string" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const paymentIntentSchema: JsonSchema = {
  type: "object",
  required: [
    "id",
    "status",
    "chain",
    "walletAddress",
    "msisdn",
    "country",
    "currency",
    "provider",
    "usdtAmount",
    "rate",
    "feePercent",
    "feeRwf",
    "netRwf",
    "treasuryAddress",
    "expiresAt",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    status: paymentStatusSchema,
    chain: chainSchema,
    walletAddress: { type: "string" },
    msisdn: { type: "string" },
    country: { type: "string", minLength: 3, maxLength: 3 },
    currency: { type: "string", minLength: 3, maxLength: 3 },
    provider: { type: "string" },
    usdtAmount: { type: "number" },
    rate: { type: "number" },
    feePercent: { type: "number" },
    feeRwf: {
      type: "number",
      description: "Local fee amount (legacy column name)",
    },
    netRwf: {
      type: "number",
      description: "Local net amount recipient receives (legacy column name)",
    },
    treasuryAddress: { type: "string" },
    expiresAt: { type: "string", format: "date-time" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    depositTx: { type: "string" },
    payoutRef: { type: "string" },
    momoRef: {
      type: "string",
      description: "Alias of payoutRef (payment_intents.momo_ref)",
    },
    notifyEmail: { type: "string", format: "email" },
    detectedAt: { type: "string", format: "date-time" },
    creditedAt: { type: "string", format: "date-time" },
    payoutStartedAt: { type: "string", format: "date-time" },
    paidAt: { type: "string", format: "date-time" },
    payout: intentPayoutSchema,
  },
};

const quoteSchema: JsonSchema = {
  type: "object",
  required: [
    "usdtAmount",
    "rate",
    "feePercent",
    "currency",
    "feeLocal",
    "netLocal",
    "feeRwf",
    "netRwf",
    "chain",
    "expiresAt",
  ],
  properties: {
    usdtAmount: { type: "number" },
    rate: { type: "number" },
    feePercent: { type: "number" },
    currency: { type: "string" },
    feeLocal: { type: "number" },
    netLocal: { type: "number" },
    feeRwf: { type: "number" },
    netRwf: { type: "number" },
    chain: chainSchema,
    expiresAt: { type: "string", format: "date-time" },
  },
};

const adminPayoutSchema: JsonSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    intentId: { type: "string", format: "uuid" },
    referenceId: { type: "string" },
    amountRwf: { type: "number" },
    msisdn: { type: "string" },
    country: { type: "string" },
    currency: { type: "string" },
    provider: { type: "string", nullable: true },
    status: {
      type: "string",
      enum: ["pending", "enqueued", "successful", "failed"],
    },
    rail: { type: "string", enum: ["pawapay"] },
    providerRef: { type: "string", nullable: true },
    providerReason: { type: "string", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

function buildPaths(): Record<string, OpenApiPathItem> {
  return {
    "/api/waitlist": {
      post: {
        tags: ["Public"],
        summary: "Join waitlist",
        security: [],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["email"],
            properties: {
              email: { type: "string", format: "email" },
              role: {
                type: "string",
                enum: [
                  "freelancer",
                  "remote-worker",
                  "business",
                  "investor",
                  "other",
                ],
              },
            },
          }),
        },
        responses: {
          "201": {
            description: "Joined",
            ...jsonContent(
              dataEnvelope({
                type: "object",
                properties: { joined: { type: "boolean" } },
              }),
            ),
          },
          ...errorResponses(400, 429, 500),
        },
      },
    },
    "/api/quotes": {
      post: {
        tags: ["Public"],
        summary: "Create quote",
        security: [],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["usdtAmount", "chain"],
            properties: {
              usdtAmount: {
                type: "number",
                exclusiveMinimum: 0,
                maximum: 10000,
              },
              chain: chainSchema,
              currency: {
                type: "string",
                default: "RWF",
                minLength: 3,
                maxLength: 3,
              },
              country: {
                type: "string",
                minLength: 3,
                maxLength: 3,
                description:
                  "ISO-3 corridor country. When set, the quote is refused if the PawaPay wallet cannot cover the payout.",
              },
            },
          }),
        },
        responses: {
          "201": {
            description: "Quote created",
            ...jsonContent(dataEnvelope(quoteSchema)),
          },
          ...errorResponses(400, 409, 429, 503),
        },
      },
    },
    "/api/corridors": {
      get: {
        tags: ["Public"],
        summary: "List payout countries or providers",
        security: [],
        parameters: [
          {
            name: "country",
            in: "query",
            required: false,
            schema: { type: "string", minLength: 3, maxLength: 3 },
            description: "ISO-3 country. Omit to list countries.",
          },
        ],
        responses: {
          "200": {
            description: "Corridor data",
            ...jsonContent(
              dataEnvelope({ type: "object", additionalProperties: true }),
            ),
          },
          ...errorResponses(400, 404, 429, 503),
        },
      },
    },
    "/api/corridors/predict": {
      post: {
        tags: ["Public"],
        summary: "Predict provider from phone",
        security: [],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            properties: {
              phoneNumber: { type: "string" },
              msisdn: { type: "string" },
            },
          }),
        },
        responses: {
          "200": {
            description: "Predicted corridor",
            ...jsonContent(
              dataEnvelope({
                type: "object",
                properties: {
                  country: { type: "string" },
                  provider: { type: "string" },
                  currency: { type: "string" },
                  phoneNumber: { type: "string" },
                  decimalsInAmount: { type: "string" },
                  minAmount: { type: "string" },
                  maxAmount: { type: "string" },
                },
              }),
            ),
          },
          ...errorResponses(400, 409, 429, 503),
        },
      },
    },
    "/api/corridors/recipient-name": {
      post: {
        tags: ["Public"],
        summary: "Recipient name preview",
        security: [],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["msisdn", "provider"],
            properties: {
              msisdn: { type: "string" },
              provider: { type: "string" },
              country: { type: "string" },
            },
          }),
        },
        responses: {
          "200": {
            description: "Lookup result",
            ...jsonContent(
              dataEnvelope({
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["found", "not_found", "unavailable"],
                  },
                  displayName: { type: "string", nullable: true },
                  source: { type: "string" },
                },
              }),
            ),
          },
          ...errorResponses(400, 429),
        },
      },
    },
    "/api/intents": {
      get: {
        tags: ["Public"],
        summary: "List intents for a wallet",
        security: [],
        parameters: [
          {
            name: "wallet",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Intent summaries (PII stripped)",
            ...jsonContent(
              dataEnvelope({ type: "array", items: paymentIntentSchema }),
            ),
          },
          ...errorResponses(400, 503),
        },
      },
      post: {
        tags: ["Public"],
        summary: "Create payment intent",
        security: [],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: [
              "usdtAmount",
              "chain",
              "msisdn",
              "walletAddress",
              "country",
              "currency",
              "provider",
            ],
            properties: {
              usdtAmount: { type: "number" },
              chain: chainSchema,
              msisdn: { type: "string" },
              walletAddress: { type: "string" },
              country: { type: "string" },
              currency: { type: "string" },
              provider: { type: "string" },
              notifyEmail: { type: "string", format: "email" },
              checkoutToken: { type: "string" },
            },
          }),
        },
        responses: {
          "201": {
            description: "Intent created",
            ...jsonContent(dataEnvelope(paymentIntentSchema)),
          },
          ...errorResponses(400, 409, 503),
        },
      },
    },
    "/api/checkouts/{token}": {
      get: {
        tags: ["Public"],
        summary: "Load a pay link",
        security: [],
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Checkout prefill",
            ...jsonContent(
              dataEnvelope({
                type: "object",
                properties: {
                  checkout: { type: "object" },
                },
              }),
            ),
          },
          ...errorResponses(404, 410, 429, 503),
        },
      },
    },
    "/api/intents/{id}": {
      get: {
        tags: ["Public"],
        summary: "Get payment intent",
        security: [],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Intent",
            ...jsonContent(dataEnvelope(paymentIntentSchema)),
          },
          ...errorResponses(404, 503),
        },
      },
    },
    "/api/intents/{id}/sync": {
      post: {
        tags: ["Public"],
        summary: "Sync intent (deposit / payout / reconcile)",
        security: [],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Updated intent",
            ...jsonContent(dataEnvelope(paymentIntentSchema)),
          },
          ...errorResponses(404, 503),
        },
      },
    },
    "/api/intents/{id}/deposit": {
      post: {
        tags: ["Public"],
        summary: "Attach deposit tx hash",
        security: [],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["txHash"],
            properties: {
              txHash: { type: "string" },
            },
          }),
        },
        responses: {
          "200": {
            description: "Intent after deposit observe",
            ...jsonContent(dataEnvelope(paymentIntentSchema)),
          },
          ...errorResponses(400, 404, 503),
        },
      },
    },
    "/api/admin/challenge": {
      get: {
        tags: ["Admin"],
        summary: "Get admin sign-in challenge",
        security: [],
        responses: {
          "200": {
            description: "Challenge message and admin wallets",
            ...jsonContent(
              dataEnvelope({
                type: "object",
                properties: {
                  message: { type: "string" },
                  admins: { type: "array", items: { type: "string" } },
                },
              }),
            ),
          },
          ...errorResponses(503),
        },
      },
    },
    "/api/admin/session": {
      get: {
        tags: ["Admin"],
        summary: "Current admin session",
        security: [{ AdminCookie: [] }],
        responses: {
          "200": {
            description: "Session address",
            ...jsonContent(
              dataEnvelope({
                type: "object",
                properties: { address: { type: "string" } },
              }),
            ),
          },
          ...errorResponses(401, 503),
        },
      },
      post: {
        tags: ["Admin"],
        summary: "Create admin session (wallet signature)",
        security: [],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["message", "signature"],
            properties: {
              message: { type: "string" },
              signature: { type: "string" },
            },
          }),
        },
        responses: {
          "200": {
            description: "Sets nikopay_admin cookie",
            ...jsonContent(
              dataEnvelope({
                type: "object",
                properties: { address: { type: "string" } },
              }),
            ),
          },
          ...errorResponses(400, 401, 403, 503),
        },
      },
      delete: {
        tags: ["Admin"],
        summary: "Clear admin session",
        security: [],
        responses: {
          "200": {
            description: "Cookie cleared",
            ...jsonContent(
              dataEnvelope({
                type: "object",
                properties: { ok: { type: "boolean" } },
              }),
            ),
          },
        },
      },
    },
    "/api/admin/ops": {
      post: {
        tags: ["Admin"],
        summary: "Run scan or payouts",
        security: [{ AdminCookie: [] }],
        parameters: [
          {
            name: "op",
            in: "query",
            required: true,
            schema: { type: "string", enum: ["scan", "payouts"] },
          },
          {
            name: "chain",
            in: "query",
            required: false,
            schema: chainSchema,
            description: "Required when op=scan (or omit for both)",
          },
        ],
        responses: {
          "200": {
            description: "Ops result",
            ...jsonContent(
              dataEnvelope({ type: "object", additionalProperties: true }),
            ),
          },
          ...errorResponses(400, 401, 503),
        },
      },
    },
    "/api/admin/bulk": {
      get: {
        tags: ["Admin"],
        summary: "List bulk payout batches",
        security: [{ AdminCookie: [] }],
        responses: {
          "200": {
            description: "Bulk payout batches",
            ...jsonContent(
              dataEnvelope({
                type: "object",
                properties: {
                  batches: { type: "array", items: { type: "object" } },
                },
              }),
            ),
          },
          ...errorResponses(401, 503),
        },
      },
      post: {
        tags: ["Admin"],
        summary: "Submit a bulk payout (1-20 items)",
        security: [{ AdminCookie: [] }],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["country", "currency", "provider", "items"],
            properties: {
              label: { type: "string" },
              country: { type: "string" },
              currency: { type: "string" },
              provider: { type: "string" },
              items: {
                type: "array",
                maxItems: 20,
                items: {
                  type: "object",
                  required: ["msisdn", "amount"],
                  properties: {
                    msisdn: { type: "string" },
                    amount: { type: "number" },
                  },
                },
              },
            },
          }),
        },
        responses: {
          "201": {
            description: "Batch persisted and submitted",
            ...jsonContent(dataEnvelope({ type: "object" })),
          },
          ...errorResponses(400, 401, 409, 503),
        },
      },
    },
    "/api/admin/bulk/{id}/retry": {
      post: {
        tags: ["Admin"],
        summary: "Retry pending items in a bulk batch",
        security: [{ AdminCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Retry submitted",
            ...jsonContent(dataEnvelope({ type: "object" })),
          },
          ...errorResponses(401, 404, 409, 503),
        },
      },
    },
    "/api/admin/checkouts": {
      get: {
        tags: ["Admin"],
        summary: "List pay links",
        security: [{ AdminCookie: [] }],
        responses: {
          "200": {
            description: "Checkout links",
            ...jsonContent(
              dataEnvelope({
                type: "object",
                properties: {
                  checkouts: { type: "array", items: { type: "object" } },
                },
              }),
            ),
          },
          ...errorResponses(401, 503),
        },
      },
      post: {
        tags: ["Admin"],
        summary: "Create a pay link",
        security: [{ AdminCookie: [] }],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: [
              "usdtAmount",
              "country",
              "currency",
              "provider",
              "msisdn",
            ],
            properties: {
              label: { type: "string" },
              usdtAmount: { type: "number" },
              country: { type: "string" },
              currency: { type: "string" },
              provider: { type: "string" },
              msisdn: { type: "string" },
              expiresHours: { type: "integer" },
            },
          }),
        },
        responses: {
          "201": {
            description: "Checkout created",
            ...jsonContent(dataEnvelope({ type: "object" })),
          },
          ...errorResponses(400, 401, 503),
        },
      },
    },
    "/api/admin/checkouts/{id}/revoke": {
      post: {
        tags: ["Admin"],
        summary: "Revoke a pay link",
        security: [{ AdminCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Checkout revoked",
            ...jsonContent(dataEnvelope({ type: "object" })),
          },
          ...errorResponses(401, 404, 409, 503),
        },
      },
    },
    "/api/admin/fx": {
      get: {
        tags: ["Admin"],
        summary: "List FX rates and currencies",
        security: [{ AdminCookie: [] }],
        responses: {
          "200": {
            description: "Rates + currency dropdown options",
            ...jsonContent(
              dataEnvelope({
                type: "object",
                properties: {
                  rates: { type: "array", items: { type: "object" } },
                  currencies: { type: "array", items: { type: "string" } },
                },
              }),
            ),
          },
          ...errorResponses(401, 503),
        },
      },
      post: {
        tags: ["Admin"],
        summary: "Save FX rate",
        security: [{ AdminCookie: [] }],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["rate", "feePercent", "minUsdt"],
            properties: {
              currency: { type: "string", default: "RWF" },
              rate: { type: "number", exclusiveMinimum: 0 },
              feePercent: { type: "number", minimum: 0 },
              minUsdt: { type: "number", exclusiveMinimum: 0 },
            },
          }),
        },
        responses: {
          "201": {
            description: "Saved",
            ...jsonContent(
              dataEnvelope({
                type: "object",
                properties: { ok: { type: "boolean" } },
              }),
            ),
          },
          ...errorResponses(400, 401, 503),
        },
      },
    },
    "/api/admin/treasury": {
      get: {
        tags: ["Admin"],
        summary: "Treasury + PawaPay balances",
        security: [{ AdminCookie: [] }],
        responses: {
          "200": {
            description: "Snapshot",
            ...jsonContent(
              dataEnvelope({ type: "object", additionalProperties: true }),
            ),
          },
          ...errorResponses(401, 503),
        },
      },
    },
    "/api/admin/intents": {
      get: {
        tags: ["Admin"],
        summary: "List intents",
        security: [{ AdminCookie: [] }],
        responses: {
          "200": {
            description: "Up to 200 intents",
            ...jsonContent(
              dataEnvelope({ type: "array", items: paymentIntentSchema }),
            ),
          },
          ...errorResponses(401, 503),
        },
      },
    },
    "/api/admin/intents/{id}": {
      get: {
        tags: ["Admin"],
        summary: "Get intent",
        security: [{ AdminCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Intent",
            ...jsonContent(dataEnvelope(paymentIntentSchema)),
          },
          ...errorResponses(401, 404, 503),
        },
      },
      patch: {
        tags: ["Admin"],
        summary: "Patch intent status or references",
        security: [{ AdminCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            properties: {
              status: paymentStatusSchema,
              depositTx: { type: "string", nullable: true },
              payoutRef: { type: "string", nullable: true },
              momoRef: { type: "string", nullable: true },
            },
          }),
        },
        responses: {
          "200": {
            description: "Updated intent",
            ...jsonContent(dataEnvelope(paymentIntentSchema)),
          },
          ...errorResponses(400, 401, 404, 409, 503),
        },
      },
    },
    "/api/admin/intents/{id}/audit": {
      get: {
        tags: ["Admin"],
        summary: "Intent audit log",
        security: [{ AdminCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Audit entries",
            ...jsonContent(
              dataEnvelope({ type: "array", items: { type: "object" } }),
            ),
          },
          ...errorResponses(401, 404, 503),
        },
      },
    },
    "/api/admin/payouts": {
      get: {
        tags: ["Admin"],
        summary: "List payout transfers",
        security: [{ AdminCookie: [] }],
        responses: {
          "200": {
            description: "Payouts",
            ...jsonContent(
              dataEnvelope({ type: "array", items: adminPayoutSchema }),
            ),
          },
          ...errorResponses(401, 503),
        },
      },
    },
    "/api/admin/payouts/{payoutId}/fail-enqueued": {
      post: {
        tags: ["Admin"],
        summary: "Cancel enqueued PawaPay payout",
        security: [{ AdminCookie: [] }],
        parameters: [
          {
            name: "payoutId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Cancel accepted (poll/callback for terminal)",
            ...jsonContent(
              dataEnvelope({
                type: "object",
                properties: {
                  payoutId: { type: "string" },
                  status: { type: "string" },
                },
              }),
            ),
          },
          ...errorResponses(401, 404, 409, 503),
        },
      },
    },
    "/api/admin/pawapay": {
      get: {
        tags: ["Admin"],
        summary: "PawaPay ops snapshot",
        security: [{ AdminCookie: [] }],
        responses: {
          "200": {
            description: "Balances, availability, stalled payouts",
            ...jsonContent(
              dataEnvelope({ type: "object", additionalProperties: true }),
            ),
          },
          ...errorResponses(401, 503),
        },
      },
    },
    "/api/admin/pawapay/payouts/{payoutId}": {
      get: {
        tags: ["Admin"],
        summary: "Live PawaPay payout lookup",
        security: [{ AdminCookie: [] }],
        parameters: [
          {
            name: "payoutId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Lookup data or null if NOT_FOUND",
            ...jsonContent(dataEnvelope({ nullable: true, type: "object" })),
          },
          ...errorResponses(400, 401, 503),
        },
      },
    },
    "/api/deposits": {
      post: {
        tags: ["Jobs"],
        summary: "Ingest chain deposit event",
        security: [{ JobBearer: [] }],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: [
              "chain",
              "txHash",
              "logIndex",
              "fromAddress",
              "toAddress",
              "tokenAddress",
              "amount",
              "blockNumber",
            ],
            properties: {
              chain: chainSchema,
              txHash: { type: "string" },
              logIndex: { type: "integer", minimum: 0 },
              fromAddress: { type: "string" },
              toAddress: { type: "string" },
              tokenAddress: { type: "string" },
              amount: { type: "number", exclusiveMinimum: 0 },
              blockNumber: { type: "integer", minimum: 0 },
            },
          }),
        },
        responses: {
          "200": {
            description: "Replay",
            ...jsonContent(
              dataEnvelope({ type: "object", additionalProperties: true }),
            ),
          },
          "201": {
            description: "New deposit",
            ...jsonContent(
              dataEnvelope({ type: "object", additionalProperties: true }),
            ),
          },
          ...errorResponses(400, 401, 409, 503),
        },
      },
    },
    "/api/jobs/deposits/scan": {
      post: {
        tags: ["Jobs"],
        summary: "Scan chain deposits",
        security: [{ JobBearer: [] }],
        parameters: [
          {
            name: "chain",
            in: "query",
            required: false,
            schema: chainSchema,
          },
        ],
        responses: {
          "200": {
            description: "Scan results",
            ...jsonContent(
              dataEnvelope({ type: "object", additionalProperties: true }),
            ),
          },
          ...errorResponses(400, 401, 503),
        },
      },
    },
    "/api/jobs/payouts/run": {
      post: {
        tags: ["Jobs"],
        summary: "Run payouts",
        security: [{ JobBearer: [] }],
        parameters: [
          {
            name: "intent",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Payout run results",
            ...jsonContent(
              dataEnvelope({ type: "object", additionalProperties: true }),
            ),
          },
          ...errorResponses(401, 404, 503),
        },
      },
    },
    "/api/jobs/pawapay/poll": {
      post: {
        tags: ["Jobs"],
        summary: "Poll open PawaPay payouts",
        security: [{ JobBearer: [] }],
        responses: {
          "200": {
            description: "Poll results",
            ...jsonContent(
              dataEnvelope({ type: "object", additionalProperties: true }),
            ),
          },
          ...errorResponses(401, 503),
        },
      },
    },
    "/api/jobs/pawapay/spike": {
      post: {
        tags: ["Jobs"],
        summary: "Sandbox spike payout (sandbox only)",
        security: [{ JobBearer: [] }],
        parameters: [
          {
            name: "intent",
            in: "query",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "msisdn",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Spike accepted",
            ...jsonContent(
              dataEnvelope({ type: "object", additionalProperties: true }),
            ),
          },
          ...errorResponses(400, 401, 404, 409, 503),
        },
      },
    },
    "/api/pawapay/callback": {
      post: {
        tags: ["Webhooks"],
        summary: "PawaPay payout callback",
        description:
          "Signed when PAWAPAY_VERIFY_CALLBACKS=true. Prefer testing via provider dashboard, not Swagger Try it out on production.",
        security: [],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            additionalProperties: true,
            description: "Direct payout payload or { status: FOUND, data }",
          }),
        },
        responses: {
          "200": {
            description: "Applied or idempotent skip",
            ...jsonContent(
              dataEnvelope({
                type: "object",
                properties: {
                  payoutId: { type: "string" },
                  status: { type: "string" },
                  applied: { type: "boolean" },
                },
              }),
            ),
          },
          ...errorResponses(400, 401, 404, 503),
        },
      },
    },
  };
}

export function buildOpenApiDocument() {
  const site = resolvePublicSiteUrl();

  return {
    openapi: "3.0.3",
    info: {
      title: "NikoPay API",
      version: "0.1.0",
      description: [
        "USDT to local mobile money via PawaPay.",
        "",
        "Responses use `{ data }` on success and `{ error }` on failure.",
        "",
        "Auth:",
        "- Public routes: none",
        "- Admin routes: cookie `nikopay_admin` after `/admin/login`",
        "- Job routes: Bearer token (`SETTLEMENT_INGEST_SECRET`)",
      ].join("\n"),
    },
    servers: [
      { url: "/", description: "Current origin" },
      { url: site, description: "Public site" },
    ],
    tags: [
      { name: "Public", description: "Pay flow and waitlist" },
      { name: "Admin", description: "Ops console (cookie)" },
      { name: "Jobs", description: "Ingest / cron (Bearer)" },
      { name: "Webhooks", description: "Provider callbacks" },
    ],
    components: {
      securitySchemes: {
        AdminCookie: {
          type: "apiKey",
          in: "cookie",
          name: "nikopay_admin",
          description: "Set by POST /api/admin/session after wallet sign-in",
        },
        JobBearer: {
          type: "http",
          scheme: "bearer",
          description: "SETTLEMENT_INGEST_SECRET",
        },
      },
      schemas: {
        Error: errorEnvelope,
        Quote: quoteSchema,
        PaymentIntent: paymentIntentSchema,
        AdminPayout: adminPayoutSchema,
      },
    },
    paths: buildPaths(),
  };
}

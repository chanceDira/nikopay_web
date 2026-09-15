"use client";

import { CheckoutLinksManager } from "@/components/pay/checkout-links-manager";
import { PageHeader } from "@/components/shared/page-header";
import { useWalletSession } from "@/components/pay/use-wallet-session";
import Link from "next/link";

export default function PayLinksPage() {
  const { walletAddress, hydrated } = useWalletSession();

  return (
    <PageHeader
      title="Payout links"
      description="Create a one-time link someone else can open to pay USDT into mobile money for your recipient."
    >
      {!hydrated ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-niko-teal border-t-transparent" />
        </div>
      ) : !walletAddress ? (
        <div className="space-y-4 py-10 text-center">
          <p className="text-sm text-niko-muted">
            Connect a wallet to create and manage payout links.
          </p>
          <Link
            href="/auth/sign-in"
            className="inline-flex rounded-md bg-niko-teal px-4 py-2 text-xs font-semibold text-niko-on-accent hover:bg-niko-teal-bright"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <CheckoutLinksManager mode="user" walletAddress={walletAddress} />
      )}
    </PageHeader>
  );
}

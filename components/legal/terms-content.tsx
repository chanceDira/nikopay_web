import Link from "next/link";
import { CONTACT } from "@/lib/contact";

const updated = "15 September 2026";

export function TermsContent() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 pb-20 pt-4 sm:px-6">
      <header className="border-b border-niko-border pb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-niko-teal">
          Legal
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Terms of use
        </h1>
        <p className="mt-4 text-niko-muted leading-relaxed">
          Rules for using NikoPay&apos;s website, web app, and mobile app to
          send USDT and pay out local currency on mobile money.
        </p>
        <p className="mt-2 text-sm text-niko-muted">Last updated: {updated}</p>
      </header>

      <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-foreground">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Agreement</h2>
          <p className="text-niko-muted">
            By accessing or using NikoPay, you agree to these Terms of use and
            our{" "}
            <Link
              href="/privacy"
              className="text-niko-teal hover:text-niko-teal-bright"
            >
              Privacy policy
            </Link>
            . If you do not agree, do not use the service. Contact{" "}
            <a
              href={`mailto:${CONTACT.email}`}
              className="text-niko-teal hover:text-niko-teal-bright"
            >
              {CONTACT.email}
            </a>{" "}
            or {CONTACT.phoneDisplay} with questions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. The service</h2>
          <p className="text-niko-muted">
            NikoPay shows a quote (rate and fee), lets you create a payment, and
            after you send the quoted USDT from your own wallet to our treasury
            address, we arrange a mobile money payout to the recipient you
            specify in a supported country and network. We are not a bank,
            exchange, or custodial wallet. We do not hold a spendable balance
            for you between payments.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Eligibility</h2>
          <p className="text-niko-muted">
            You must be at least 18 years old and able to form a binding
            contract. You must use the service only where it is lawful. You are
            responsible for complying with local laws that apply to you and to
            the recipient.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Quotes, fees, and limits</h2>
          <ul className="list-disc space-y-2 pl-5 text-niko-muted">
            <li>
              Rates and fees shown before you confirm are calculated by our
              systems. Client-supplied prices are not used for settlement.
            </li>
            <li>
              The final rate and fee are locked when you confirm a payment,
              subject to deposit matching and rail availability.
            </li>
            <li>
              Quote and payment amounts may be capped (for example a maximum
              USDT per quote). Limits can change for risk or operational
              reasons.
            </li>
            <li>
              Corridor availability, currencies, and mobile money networks
              follow what the rail has open and may change without notice.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Your responsibilities</h2>
          <ul className="list-disc space-y-2 pl-5 text-niko-muted">
            <li>
              Send only the exact USDT amount and asset shown for that payment
              on the correct chain. Wrong amount, asset, or chain may delay or
              prevent matching.
            </li>
            <li>
              Provide an accurate recipient mobile money number, country, and
              network. You are responsible for payments sent to numbers you
              enter.
            </li>
            <li>
              Keep your wallet and devices secure. We never ask for seed phrases
              or private keys.
            </li>
            <li>
              Do not use NikoPay for illegal activity, sanctions evasion, fraud,
              or to harm others.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Settlement and status</h2>
          <p className="text-niko-muted">
            After an on-chain deposit confirms and matches a payment, we
            initiate the mobile money payout. Timing depends on the chain,
            treasury matching, and the mobile money network. Status is shown on
            the payment page. Mismatched or suspicious deposits may go to manual
            review and are not paid automatically.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Risks</h2>
          <p className="text-niko-muted">
            Crypto transfers are irreversible once confirmed on-chain. Mobile
            money rails can delay or fail. Network congestion, rail outages, or
            incorrect recipient details can affect payout. You accept these
            risks when you use the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Intellectual property</h2>
          <p className="text-niko-muted">
            NikoPay branding, site content, and software are owned by us or our
            licensors. You may not copy or reuse them except as needed to use
            the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Disclaimer</h2>
          <p className="text-niko-muted">
            The service is provided &quot;as is&quot; and &quot;as
            available.&quot; To the fullest extent permitted by law, we disclaim
            warranties of merchantability, fitness for a particular purpose, and
            non-infringement. We do not guarantee uninterrupted or error-free
            operation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Limitation of liability</h2>
          <p className="text-niko-muted">
            To the fullest extent permitted by law, NikoPay and its operators
            are not liable for indirect, incidental, special, consequential, or
            punitive damages, or for lost profits, data, or goodwill. Our total
            liability for any claim relating to a payment is limited to the fees
            we charged for that payment. Some jurisdictions do not allow certain
            limits; in those cases our liability is limited to the maximum
            extent allowed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">11. Suspension</h2>
          <p className="text-niko-muted">
            We may refuse, delay, or reverse a payment, or suspend access, where
            we reasonably believe there is fraud, legal risk, rail rejection, or
            a breach of these terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">12. Changes</h2>
          <p className="text-niko-muted">
            We may update these terms. The &quot;Last updated&quot; date will
            change when we do. Continued use after an update means you accept
            the revised terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">13. Contact</h2>
          <p className="text-niko-muted">
            Email{" "}
            <a
              href={`mailto:${CONTACT.email}`}
              className="text-niko-teal hover:text-niko-teal-bright"
            >
              {CONTACT.email}
            </a>{" "}
            or call {CONTACT.phoneDisplay}.
          </p>
        </section>
      </div>
    </article>
  );
}

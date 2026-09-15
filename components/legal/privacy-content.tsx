import Link from "next/link";
import { CONTACT } from "@/lib/contact";

const updated = "15 September 2026";

export function PrivacyContent() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 pb-20 pt-4 sm:px-6">
      <header className="border-b border-niko-border pb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-niko-teal">
          Legal
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Privacy policy
        </h1>
        <p className="mt-4 text-niko-muted leading-relaxed">
          How NikoPay collects, uses, and protects personal data when you use
          our website, web app, or mobile app.
        </p>
        <p className="mt-2 text-sm text-niko-muted">Last updated: {updated}</p>
      </header>

      <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-foreground">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Who we are</h2>
          <p className="text-niko-muted">
            NikoPay (&quot;we&quot;, &quot;us&quot;) provides a service that
            lets you send USDT from a self-custodial wallet and have local
            currency paid out to a recipient&apos;s mobile money account in
            supported African countries. For privacy questions, contact{" "}
            <a
              href={`mailto:${CONTACT.email}`}
              className="text-niko-teal hover:text-niko-teal-bright"
            >
              {CONTACT.email}
            </a>{" "}
            or {CONTACT.phoneDisplay}.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Data we collect</h2>
          <p className="text-niko-muted">
            Depending on how you use NikoPay, we may collect:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-niko-muted">
            <li>
              <span className="text-foreground">Account and contact data</span>:
              email address, and waitlist or support messages you send us.
            </li>
            <li>
              <span className="text-foreground">Payment data</span>: wallet
              address you connect, chain and asset (for example USDT on Polygon
              or Base), quoted amounts, fees, payment status, and deposit
              transaction references.
            </li>
            <li>
              <span className="text-foreground">Recipient data</span>: mobile
              money number (MSISDN), country, network or provider, and, where
              available, recipient name from the rail for confirmation.
            </li>
            <li>
              <span className="text-foreground">Technical data</span>: IP
              address, device or browser type, and basic logs needed to secure
              and operate the service.
            </li>
            <li>
              <span className="text-foreground">Admin and audit data</span>:
              actions taken in ops tools, for fraud review and settlement
              records.
            </li>
          </ul>
          <p className="text-niko-muted">
            We do not ask for seed phrases or private keys. You keep custody of
            your wallet until you confirm a send.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Why we use data</h2>
          <ul className="list-disc space-y-2 pl-5 text-niko-muted">
            <li>Provide quotes, create payment intents, and settle payouts</li>
            <li>Match on-chain deposits to payments and handle failures</li>
            <li>Comply with legal, fraud, and rail requirements</li>
            <li>
              Improve reliability, support, and product communications you opt
              into
            </li>
            <li>Secure the service and investigate abuse</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Sharing</h2>
          <p className="text-niko-muted">
            We share data only as needed to run the service:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-niko-muted">
            <li>
              Mobile money rail partners (for example PawaPay) to execute
              payouts and look up recipient details where supported
            </li>
            <li>
              Infrastructure providers (hosting, database, email) under
              contracts that limit use to our instructions
            </li>
            <li>
              Authorities when required by law, or to protect rights and safety
            </li>
          </ul>
          <p className="text-niko-muted">We do not sell personal data.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Retention</h2>
          <p className="text-niko-muted">
            We keep payment and audit records for as long as needed for
            settlement, dispute handling, accounting, and legal obligations,
            then delete or anonymize them when no longer required. Waitlist
            emails are kept until you ask to be removed or we close the list.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Security</h2>
          <p className="text-niko-muted">
            We use HTTPS, access controls on admin tools, and encryption for
            sensitive fields where stored. No method of transmission or storage
            is fully secure. Only send the exact USDT amount shown for a
            payment.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Your choices</h2>
          <p className="text-niko-muted">
            You may request access, correction, or deletion of personal data we
            hold about you, subject to legal retention needs for payment
            records. Email{" "}
            <a
              href={`mailto:${CONTACT.email}`}
              className="text-niko-teal hover:text-niko-teal-bright"
            >
              {CONTACT.email}
            </a>
            . You can disconnect your wallet at any time in your wallet app.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Children</h2>
          <p className="text-niko-muted">
            NikoPay is not directed at children under 18. We do not knowingly
            collect data from minors.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Changes</h2>
          <p className="text-niko-muted">
            We may update this policy. The &quot;Last updated&quot; date will
            change when we do. Continued use after an update means you accept
            the revised policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Related</h2>
          <p className="text-niko-muted">
            Use of NikoPay is also governed by our{" "}
            <Link
              href="/terms"
              className="text-niko-teal hover:text-niko-teal-bright"
            >
              Terms of use
            </Link>
            .
          </p>
        </section>
      </div>
    </article>
  );
}

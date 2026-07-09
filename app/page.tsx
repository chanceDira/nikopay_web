import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { TrustBar } from "@/components/landing/trust-bar";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { Personas } from "@/components/landing/personas";
import { Security } from "@/components/landing/security";
import { Faq } from "@/components/landing/faq";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { Footer } from "@/components/landing/footer";
import { CONTACT } from "@/lib/contact";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <Features />
        <Personas />
        <Security />
        <Faq />
        <section
          id="waitlist"
          className="px-4 py-20 sm:px-6 sm:py-28"
        >
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-niko-teal">
              Early Access
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Be first when we launch
            </h2>
            <p className="mt-4 text-niko-muted">
              Join the waitlist for early access to NikoPay in Rwanda. No spam,
              just a launch notification.
            </p>
            <div className="mt-8">
              <WaitlistForm />
            </div>
            <p className="mt-8 text-sm text-niko-muted">
              Questions?{" "}
              <a
                href={`mailto:${CONTACT.email}`}
                className="text-niko-teal transition-colors hover:text-niko-teal-bright"
              >
                {CONTACT.email}
              </a>{" "}
              or{" "}
              <a
                href={`tel:${CONTACT.phone}`}
                className="text-niko-teal transition-colors hover:text-niko-teal-bright"
              >
                {CONTACT.phoneDisplay}
              </a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

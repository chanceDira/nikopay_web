import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

type MarketingShellProps = {
  children: React.ReactNode;
};

/** Shared floating nav + footer for marketing and legal pages. */
export function MarketingShell({ children }: MarketingShellProps) {
  return (
    <>
      <Navbar />
      <main className="flex min-h-full flex-1 flex-col pt-28 sm:pt-32">
        {children}
      </main>
      <Footer />
    </>
  );
}

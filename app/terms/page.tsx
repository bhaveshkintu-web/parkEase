import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 container px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using ParkEase, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground">
              ParkEase provides a platform for users to find and book parking spots at various locations. We act as an intermediary between users and parking facility owners.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You must provide accurate and complete information during the booking process.</li>
              <li>You are responsible for the vehicle parked and must follow all facility-specific rules.</li>
              <li>You must arrive and depart within the scheduled times of your reservation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Payments and Fees</h2>
            <p className="text-muted-foreground">
              All payments are processed securely. Prices include base rates, applicable taxes, and a service fee. You will be charged at the time of reservation confirmation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Liability</h2>
            <p className="text-muted-foreground">
              ParkEase is not responsible for any damage to vehicles, theft, or personal injury that may occur at the parking facilities. Liability remains with the parking facility operator.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. Your continued use of the service after such changes constitutes acceptance of the new terms.
            </p>
          </section>

          <p className="text-sm text-muted-foreground pt-8 border-t border-border">
            Last Updated: January 28, 2026
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

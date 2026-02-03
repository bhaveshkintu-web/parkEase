import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function CancellationPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 container px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Cancellation Policy</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section className="bg-primary/5 p-6 rounded-xl border border-primary/10">
            <h2 className="text-2xl font-semibold mb-2 text-primary">Free Cancellation</h2>
            <p className="text-foreground font-medium">
              Most reservations can be cancelled for a full refund up to 24 hours before the scheduled check-in time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Policy Details</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2 shrink-0" />
                <div>
                  <h3 className="font-semibold">More than 24 hours notice</h3>
                  <p className="text-muted-foreground">Full refund of the total booking price, including taxes and service fees.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />
                <div>
                  <h3 className="font-semibold">Less than 24 hours notice</h3>
                  <p className="text-muted-foreground">No refund will be issued for cancellations made less than 24 hours before the start of the reservation.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-2 shrink-0" />
                <div>
                  <h3 className="font-semibold">No-shows</h3>
                  <p className="text-muted-foreground">If you do not show up for your reservation, the full amount will be charged and no refund will be provided.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">How to Cancel</h2>
            <p className="text-muted-foreground">
              You can cancel your reservation through the "My Reservations" section in your account dashboard. Simply find the upcoming booking you wish to cancel and click the "Cancel" button.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Refund Process</h2>
            <p className="text-muted-foreground">
              Once a qualifying cancellation is processed, the refund will be credited back to your original payment method. Generally, it takes 5-10 business days for the funds to appear in your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Exceptions</h2>
            <p className="text-muted-foreground">
              Some special event parking or promotional rates may be non-refundable. These exceptions will be clearly marked during the booking process.
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

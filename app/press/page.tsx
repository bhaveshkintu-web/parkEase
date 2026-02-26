import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { FileText, Download, ExternalLink } from "lucide-react";

export const metadata = {
  title: "Press | ParkZipply",
  description:
    "Latest press releases and media resources from ParkZipply.",
};

export default function PressPage() {
  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <Navbar />
      <main className="flex-1 py-12 px-4 md:py-24 bg-background">
        <div className="container max-w-5xl mx-auto">
          <div className="max-w-3xl mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Press Resources</h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to cover ParkZipply’s journey in reshaping urban parking and mobility.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 mb-20">
            <div className="md:col-span-2 space-y-12">
              <section>
                <h2 className="text-2xl font-bold mb-6">Latest Press Releases</h2>
                <div className="space-y-8">
                  <div className="group cursor-pointer">
                    <span className="text-sm text-muted-foreground">January 15, 2026</span>
                    <h3 className="text-xl font-bold mt-2 group-hover:text-primary transition-colors">ParkZipply Launches AI-Powered Demand Forecasting for Property Owners</h3>
                    <p className="text-muted-foreground mt-2">New tools allow parking lot operators to predict volume and optimize pricing in real-time.</p>
                  </div>
                  <div className="group cursor-pointer border-t border-border pt-8">
                    <span className="text-sm text-muted-foreground">November 04, 2025</span>
                    <h3 className="text-xl font-bold mt-2 group-hover:text-primary transition-colors">ParkZipply Reaches 1 Million Bookings Across North America</h3>
                    <p className="text-muted-foreground mt-2">The platform marks a major milestone as it expands into 20 new airport hubs.</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <div className="p-8 rounded-3xl bg-card border border-border">
                <h3 className="font-bold text-lg mb-4">Media Contact</h3>
                <p className="text-muted-foreground mb-4">For media inquiries or interview requests, please contact:</p>
                <a href="mailto:press@parkzipply.com" className="text-primary font-bold hover:underline">press@parkzipply.com</a>
              </div>

              <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10">
                <h3 className="font-bold text-lg mb-4">Media Kit</h3>
                <div className="space-y-4">
                  <button className="flex items-center gap-3 text-sm font-medium hover:text-primary transition-colors">
                    <Download className="h-4 w-4" />
                    Brand Guidelines (PDF)
                  </button>
                  <button className="flex items-center gap-3 text-sm font-medium hover:text-primary transition-colors">
                    <Download className="h-4 w-4" />
                    Logo Assets (PNG, SVG)
                  </button>
                  <button className="flex items-center gap-3 text-sm font-medium hover:text-primary transition-colors">
                    <Download className="h-4 w-4" />
                    Executive Bios (PDF)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
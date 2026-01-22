import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/home/hero-section";
import { BenefitsSection } from "@/components/home/benefits-section";
import { PopularAirports } from "@/components/home/popular-airports";
import { HowItWorks } from "@/components/home/how-it-works";
import { Testimonials } from "@/components/home/testimonials";
import { AppDownload } from "@/components/home/app-download";
import { BookingProvider } from "@/lib/booking-context";

export default function HomePage() {
  return (
    <BookingProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <HeroSection />
          <BenefitsSection />
          <PopularAirports />
          <HowItWorks />
          <Testimonials />
          <AppDownload />
        </main>
        <Footer />
      </div>
    </BookingProvider>
  );
}

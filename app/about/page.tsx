import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Shield, Zap, Globe, BarChart3 } from "lucide-react";

export const metadata = {
  title: "About Us | ParkZipply",
  description:
    "Discover the story behind ParkZipply and how we’re revolutionizing urban parking through mission, vision, and innovation.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12 px-4 md:py-24 bg-background">
        <div className="container max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="max-w-3xl mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-foreground">About Us</h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              ParkZipply was founded with a simple goal: make parking effortless.
              We are a smart parking technology company dedicated to making
              urban mobility seamless, efficient, and stress-free.
            </p>
          </div>

          {/* Mission & Vision Grid */}
          <div className="grid md:grid-cols-2 gap-12 mb-20">
            <div className="p-8 rounded-2xl bg-card border border-border shadow-sm">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
                <Shield className="h-6 w-6 text-primary" />
                Our Mission
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                To eliminate parking frustration by providing real-time availability,
                smart automation, and data-driven solutions for drivers, property
                owners, and cities.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-card border border-border shadow-sm">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
                <Zap className="h-6 w-6 text-primary" />
                Our Vision
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We envision cities where finding parking takes seconds—not minutes—
                reducing traffic congestion, emissions, and wasted time.
              </p>
            </div>
          </div>

          {/* What We Do Section */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold mb-12 text-center text-foreground">What We Do</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              <div className="space-y-4">
                <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg text-foreground">Discovery</h3>
                <p className="text-sm text-muted-foreground">Real-time parking discovery across major cities and airport hubs.</p>
              </div>
              <div className="space-y-4">
                <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg text-foreground">Reservations</h3>
                <p className="text-sm text-muted-foreground">Seamless digital reservations and instant secure payments.</p>
              </div>
              <div className="space-y-4">
                <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg text-foreground">Management</h3>
                <p className="text-sm text-muted-foreground">Smart parking tools for property owners to manage their inventory.</p>
              </div>
              <div className="space-y-4">
                <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg text-foreground">Analytics</h3>
                <p className="text-sm text-muted-foreground">Data-driven insights to optimize space utilization and revenue.</p>
              </div>
            </div>
          </div>

          {/* History/Story Section */}
          <div className="prose prose-slate dark:prose-invert max-w-none border-t border-border pt-20">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold mb-6 text-foreground">Our Story</h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                After experiencing firsthand the frustration of circling city blocks for available parking, our founders realized that the problem wasn't a lack of spaces, but a lack of information.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                They built ParkZipply to bridge that gap, connecting drivers with available parking spaces in real-time. Today, we empower thousands of property owners to maximize their revenue while making city life easier for millions of drivers.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Briefcase, Heart, Rocket, Users } from "lucide-react";

export const metadata = {
  title: "Careers | ParkZipply",
  description:
    "Join ParkZipply and help shape the future of smart parking technology.",
};

export default function CareersPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12 px-4 md:py-24 bg-background">
        <div className="container max-w-5xl mx-auto text-foreground">
          <div className="max-w-3xl mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Join the Team</h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              We’re building the future of urban mobility — and we’re looking for
              passionate, driven individuals to join us in reshaping how the world parques.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold mb-2">Remote-First</h3>
              <p className="text-sm text-muted-foreground">Work from anywhere in the world. We believe in results over desk time.</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold mb-2">Well-being</h3>
              <p className="text-sm text-muted-foreground">Comprehensive health coverage and mental health support for everyone.</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold mb-2">Ownership</h3>
              <p className="text-sm text-muted-foreground">Generous equity opportunities. We want you to own a piece of what you build.</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold mb-2">Growth</h3>
              <p className="text-sm text-muted-foreground">Annual learning stipend for courses, books, and conferences.</p>
            </div>
          </div>

          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold mb-8">Current Openings</h2>
            <div className="space-y-4">
              <div className="p-8 rounded-2xl border border-dashed border-border text-center">
                <p className="text-muted-foreground mb-4">No open roles at the moment, but we're always looking for talent!</p>
                <p className="font-medium">
                  Send your resume to: <a href="mailto:careers@parkzipply.com" className="text-primary hover:underline">careers@parkzipply.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

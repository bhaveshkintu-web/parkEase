import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Mail, MessageSquare, MapPin, Phone, Clock } from "lucide-react";

export const metadata = {
  title: "Contact | ParkZipply",
  description:
    "Get in touch with the ParkZipply team for support, partnerships, or inquiries.",
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12 px-4 md:py-24 bg-background text-foreground">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Get in Touch</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Have questions about our parking solutions or interested in partnering? We'd love to hear from you.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-card border border-border shadow-sm flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-bold text-xl mb-4">Email Us</h3>
              <p className="text-muted-foreground">hello@parkzipply.com</p>
              <p className="text-muted-foreground">support@parkzipply.com</p>
            </div>

            <div className="p-8 rounded-3xl bg-card border border-border shadow-sm flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Phone className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-bold text-xl mb-4">Call Us</h3>
              <p className="text-muted-foreground">Available 24/7 for urgent issues</p>
              <p className="text-primary font-bold mt-2 text-lg">+1 (800) PARKZIPPLY</p>
            </div>

            <div className="p-8 rounded-3xl bg-card border border-border shadow-sm flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Clock className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-bold text-xl mb-4">Support Hours</h3>
              <p className="text-muted-foreground">Online Support: 24/7</p>
              <p className="text-muted-foreground text-sm mt-1">HQ: Mon-Fri, 9am-6pm EST</p>
            </div>

            <div className="p-8 rounded-3xl bg-card border border-border shadow-sm flex flex-col items-center text-center lg:col-start-1 lg:col-span-1">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <MessageSquare className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-bold text-xl mb-4">Partnerships</h3>
              <p className="text-muted-foreground">partnerships@parkzipply.com</p>
            </div>

            <div className="p-8 rounded-3xl bg-card border border-border shadow-sm flex flex-col items-center text-center lg:col-span-2">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-bold text-xl mb-4">Our Office</h3>
              <p className="text-muted-foreground">Global Remote Team</p>
              <p className="text-muted-foreground">Headquarters: New York, NY</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
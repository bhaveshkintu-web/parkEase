"use client";

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import * as React from "react";
import { 
  Mail, 
  Phone, 
  MessageSquare, 
  Clock, 
  HelpCircle, 
  ChevronRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { submitSupportTicket } from "@/lib/actions/support-actions";

export default function SupportPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields before sending.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitSupportTicket(formData);
      
      if (result.success) {
        toast({
          title: "Message Sent!",
          description: "We've received your message and will get back to you shortly.",
        });
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: ""
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Failed to send",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const faqs = [
    {
      question: "How do I cancel my reservation?",
      answer: "You can cancel your reservation directly from your dashboard. Navigate to 'Reservations', select the booking you wish to cancel, and click the 'Cancel' button. Please check our cancellation policy for refund eligibility."
    },
    {
      question: "Will the shuttle wait for me?",
      answer: "Shuttles run on a regular schedule (usually every 15-30 minutes). If you've provided your flight details, the location will be aware of your arrival time. You can also call the location directly from the reservation page for an immediate update."
    },
    {
      question: "What if my flight is delayed?",
      answer: "No problem! Your reservation is guaranteed. If your return flight is delayed and you go over your booked time, you can simply pay the difference at the facility or extend your stay through the app if supported."
    },
    {
      question: "Is my vehicle safe?",
      answer: "We partner with highly-rated facilities that offer 24/7 security, surveillance cameras, and gated access. Most locations also have staff on-site around the clock."
    },
    {
      question: "How do I find the parking lot?",
      answer: "Detailed directions and an interactive map are available on your reservation confirmation page. You can also click 'Open in Maps' to get turn-by-turn navigation."
    }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-primary/5 py-12 md:py-20 border-b border-primary/10">
          <div className="container px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              How can we <span className="text-primary">help you?</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We're here 24/7 to ensure your parking experience is seamless and stress-free.
            </p>
          </div>
        </section>

        <div className="container px-4 py-12 md:py-16">
          <div className="grid gap-12 lg:grid-cols-3">
            
            {/* Contact Options */}
            <div className="lg:col-span-1 space-y-6">
              <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors">
                  <div className="bg-primary/10 p-3 rounded-lg text-primary">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Email Support</h3>
                    <p className="text-sm text-muted-foreground mb-2">Typically replies within 2 hours</p>
                    <a href="mailto:support@parkease.com" className="text-primary font-medium hover:underline">
                      support@parkease.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors">
                  <div className="bg-primary/10 p-3 rounded-lg text-primary">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Call Us</h3>
                    <p className="text-sm text-muted-foreground mb-2">Available 24/7 for urgent issues</p>
                    <a href="tel:+18007275327" className="text-primary font-medium hover:underline">
                      +1 (800) PARKEASE
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors">
                  <div className="bg-primary/10 p-3 rounded-lg text-primary">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Business Hours</h3>
                    <p className="text-sm text-muted-foreground">
                      Online Support: 24/7<br />
                      Headquarters: Mon-Fri, 9am-6pm EST
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                  <h3 className="font-bold text-lg">Safe & Secure</h3>
                </div>
                <p className="text-sm text-slate-300">
                  Your security is our priority. Every facility on our platform is hand-picked and regularly audited.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Licensed & Insured</span>
                </div>
              </div>
            </div>

            {/* Support Form & FAQs */}
            <div className="lg:col-span-2 space-y-12">
              
              {/* FAQ Section */}
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <HelpCircle className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
                </div>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`} className="border-border">
                      <AccordionTrigger className="text-left font-medium py-4">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pt-0 pb-4">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                <Button variant="link" className="mt-4 p-0 text-primary">
                  View full Help Center <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </section>

              {/* Contact Form */}
              <section className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <MessageSquare className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold">Send us a message</h2>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium">Name</label>
                      <Input 
                        id="name" 
                        placeholder="Your name" 
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">Email</label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="Your email" 
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                    <Input 
                      id="subject" 
                      placeholder="What can we help you with?" 
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium">Message</label>
                    <Textarea 
                      id="message" 
                      placeholder="Describe your issue in detail..." 
                      className="min-h-[150px]" 
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <Button 
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-4">
                    By submitting this form, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </form>
              </section>

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

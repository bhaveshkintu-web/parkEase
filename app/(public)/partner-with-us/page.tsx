"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Building2, CheckCircle2, ChevronRight, Users } from "lucide-react";

export default function PartnerWithUsPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    businessName: "",
    businessType: "",
    city: "",
    state: "",
    country: "USA",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (submitError) setSubmitError(null);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (submitError) setSubmitError(null);
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      businessName: "",
      businessType: "",
      city: "",
      state: "",
      country: "USA",
    });
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/leads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit lead");
      }

      setIsSubmitted(true);
      toast({
        title: "Success!",
        description: "Your request has been submitted successfully.",
      });
    } catch (error: any) {
      setSubmitError(error.message || "Something went wrong. Please try again later.");
      toast({
        title: "Submission Error",
        description: error.message || "Failed to submit partner inquiry.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-primary py-20 text-primary-foreground">
          <div className="container px-4">
            <div className="max-w-3xl">
              <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Partner with ParkEase and Grow Your Business
              </h1>
              <p className="mb-8 text-xl opacity-90">
                Join thousands of parking lot owners who trust ParkEase to fill their spaces and maximize their revenue.
              </p>
              {!isSubmitted && (
                <Button size="lg" variant="secondary" className="font-semibold" asChild>
                  <a href="#partner-form">Get Started Today <ChevronRight className="ml-2 h-5 w-5" /></a>
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        {!isSubmitted && (
          <section className="py-20 bg-background">
            <div className="container px-4">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why Partner with Us?</h2>
                <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg">
                  We provide the tools and exposure you need to take your parking business to the next level.
                </p>
              </div>

              <div className="grid gap-8 md:grid-cols-3">
                {[
                  {
                    title: "Increased Visibility",
                    description: "Reach millions of customers looking for parking daily through our platform and app.",
                    icon: Users,
                  },
                  {
                    title: "Optimized Revenue",
                    description: "Use our dynamic pricing tools to adjust rates based on demand and maximize your earnings.",
                    icon: Building2,
                  },
                  {
                    title: "Seamless Management",
                    description: "Track bookings, manage spots, and view analytics all in one easy-to-use dashboard.",
                    icon: CheckCircle2,
                  },
                ].map((benefit, index) => (
                  <Card key={index} className="border-none shadow-md">
                    <CardHeader>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <benefit.icon className="h-6 w-6" />
                      </div>
                      <CardTitle>{benefit.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{benefit.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Lead Form Section */}
        <section id="partner-form" className="py-20 bg-muted/50">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              {isSubmitted ? (
                <Card className="shadow-xl border-t-4 border-t-primary overflow-hidden">
                  <CardContent className="p-12 text-center">
                    <div className="mb-6 flex justify-center">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold text-foreground mb-4">Thank You for Your Interest!</h2>
                    <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                      Our partnership team has received your information. We&apos;ll review your business details and get back to you within 24-48 business hours.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 max-w-lg mx-auto">
                      <Button variant="outline" className="h-12 bg-transparent" onClick={() => {
                        resetForm();
                        setIsSubmitted(false);
                      }}>
                        Submit Another Inquiry
                      </Button>
                      <Button className="h-12" asChild>
                        <Link href="/">Return to Homepage</Link>
                      </Button>
                    </div>
                    <div className="mt-12 pt-8 border-t">
                      <p className="text-sm text-muted-foreground">
                        Need immediate assistance? Contact our support team at <span className="font-semibold text-primary">partners@parkease.com</span> or call us at <span className="font-semibold text-primary">+1 (800) PARKEASE</span>.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                  <div>
                    <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">Ready to list your space?</h2>
                    <p className="mb-8 text-lg text-muted-foreground">
                      Fill out the form and our partnership team will reach out within 24-48 hours to help you get set up.
                    </p>
                    
                    <ul className="space-y-4">
                      {[
                        "No upfront costs or listing fees",
                        "Expert support to optimize your listing",
                        "Flexible management - you control your inventory",
                        "Secure and timely payments",
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle>Partner Inquiry Form</CardTitle>
                      <CardDescription>Tell us about your business and location.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        {submitError && (
                          <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2 mb-4 font-medium">
                            {submitError}
                          </div>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                              id="fullName"
                              name="fullName"
                              placeholder="John Doe"
                              required
                              value={formData.fullName}
                              onChange={handleChange}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Work Email</Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              placeholder="john@example.com"
                              required
                              value={formData.email}
                              onChange={handleChange}
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              name="phone"
                              type="tel"
                              placeholder="(555) 000-0000"
                              required
                              value={formData.phone}
                              onChange={handleChange}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="businessType">Business Type</Label>
                            <Select onValueChange={(v) => handleSelectChange("businessType", v)} value={formData.businessType} required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="individual">Individual Owner</SelectItem>
                                <SelectItem value="company">Parking Company</SelectItem>
                                <SelectItem value="hotel">Hotel/Commercial Space</SelectItem>
                                <SelectItem value="airport">Airport Parking Provider</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="businessName">Business Name / Location Name</Label>
                          <Input
                            id="businessName"
                            name="businessName"
                            placeholder="Premium City Parking"
                            required
                            value={formData.businessName}
                            onChange={handleChange}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input
                              id="city"
                              name="city"
                              placeholder="New York"
                              required
                              value={formData.city}
                              onChange={handleChange}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="state">State/Province</Label>
                            <Input
                              id="state"
                              name="state"
                              placeholder="NY"
                              required
                              value={formData.state}
                              onChange={handleChange}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="country">Country</Label>
                            <Input
                              id="country"
                              name="country"
                              placeholder="USA"
                              required
                              value={formData.country}
                              onChange={handleChange}
                            />
                          </div>
                        </div>

                        <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isSubmitting}>
                          {isSubmitting ? "Submitting..." : "Submit Inquiry"}
                        </Button>
                        
                        <p className="text-xs text-center text-muted-foreground mt-4">
                          By submitting this form, you agree to our Terms of Service and Privacy Policy.
                        </p>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

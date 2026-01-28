// N
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check } from "lucide-react";

const businessInquirySchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().optional(),
  businessType: z.enum(["PARKING"], { required_error: "Please select a business type" }),
  message: z.string().max(500, "Message must be less than 500 characters").optional(),
});

type BusinessInquiryForm = z.infer<typeof businessInquirySchema>;

interface ContactFormProps {
  source: string; // Page URL for tracking
}

export function ContactForm({ source }: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Unified Light Theme Classes
  const containerClasses = "bg-white border border-slate-100 text-slate-900";
  const labelClasses = "text-slate-700 font-bold";
  const inputClasses = "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-teal-600/10";

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<BusinessInquiryForm>({
    resolver: zodResolver(businessInquirySchema),
  });

  const onSubmit = async (data: BusinessInquiryForm) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/business/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, source }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit inquiry");
      }

      setIsSuccess(true);
      toast.success("Thank you! We'll be in touch within 24 hours.");
      reset();
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={`${containerClasses} rounded-2xl p-10 text-center shadow-2xl animate-in fade-in zoom-in duration-300`}>
        <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-teal-600" />
        </div>
        <h3 className="text-3xl font-extrabold mb-3 text-slate-900">
          Inquiry Received!
        </h3>
        <p className="mb-8 text-slate-600 leading-relaxed">
          Thank you for reaching out. Our business team will contact you within 24 hours to discuss how we can grow together.
        </p>
        <Button
          onClick={() => setIsSuccess(false)}
          size="lg"
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-8"
        >
          Submit Another Inquiry
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`${containerClasses} rounded-2xl p-10 space-y-6 shadow-2xl transition-all duration-300`}
    >
      <div className="space-y-1">
        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tighter">
          Start your partnership
        </h3>
        <p className="text-slate-500 font-medium">
          Fill out the details below and we'll be in touch.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="fullName" className={`${labelClasses} text-xs font-bold uppercase tracking-widest`}>
            Full Name <span className="text-teal-600">*</span>
          </Label>
          <Input
            id="fullName"
            {...register("fullName")}
            placeholder="John Smith"
            className={`${inputClasses} transition-all duration-200 h-12 shadow-sm ${errors.fullName ? "border-red-500 focus:ring-red-500/10" : ""}`}
          />
          {errors.fullName && (
            <p className="text-xs text-red-500 font-semibold px-1">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyName" className={`${labelClasses} text-xs font-bold uppercase tracking-widest`}>
            Company Name <span className="text-teal-600">*</span>
          </Label>
          <Input
            id="companyName"
            {...register("companyName")}
            placeholder="ABC Parking Inc."
            className={`${inputClasses} transition-all duration-200 h-12 shadow-sm ${errors.companyName ? "border-red-500 focus:ring-red-500/10" : ""}`}
          />
          {errors.companyName && (
            <p className="text-xs text-red-500 font-semibold px-1">{errors.companyName.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="email" className={`${labelClasses} text-xs font-bold uppercase tracking-widest`}>
            Email <span className="text-teal-600">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="john@example.com"
            className={`${inputClasses} transition-all duration-200 h-12 shadow-sm ${errors.email ? "border-red-500 focus:ring-red-500/10" : ""}`}
          />
          {errors.email && (
            <p className="text-xs text-red-500 font-semibold px-1">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className={`${labelClasses} text-xs font-bold uppercase tracking-widest`}>
            Phone <span className="text-teal-600">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            {...register("phone")}
            placeholder="+1 (555) 000-0000"
            className={`${inputClasses} transition-all duration-200 h-12 shadow-sm ${errors.phone ? "border-red-400 focus:ring-red-500/10" : ""}`}
          />
          {errors.phone && (
            <p className="text-xs text-red-500 font-semibold px-1">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address" className={`${labelClasses} text-xs font-bold uppercase tracking-widest`}>
          Address
        </Label>
        <Input
          id="address"
          {...register("address")}
          placeholder="123 Main St, Boston, MA"
          className={`${inputClasses} transition-all duration-200 h-12 shadow-sm`}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessType" className={`${labelClasses} text-xs font-bold uppercase tracking-widest`}>
          Business Type <span className="text-teal-600">*</span>
        </Label>
        <Select onValueChange={(value) => setValue("businessType", value as any)}>
          <SelectTrigger className={`${inputClasses} h-12 shadow-sm ${errors.businessType ? "border-red-500" : ""}`}>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200 shadow-xl rounded-xl">
            <SelectItem value="PARKING">Parking</SelectItem>
          </SelectContent>
        </Select>
        {errors.businessType && (
          <p className="text-xs text-red-500 font-semibold px-1">{errors.businessType.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="message" className={`${labelClasses} text-xs font-bold uppercase tracking-widest`}>
          Message
        </Label>
        <Textarea
          id="message"
          {...register("message")}
          placeholder="How can we help?"
          rows={3}
          className={`${inputClasses} transition-all duration-200 min-h-[120px] resize-none shadow-sm ${errors.message ? "border-red-500 focus:ring-red-500/10" : ""}`}
        />
        {errors.message && (
          <p className="text-xs text-red-500 font-semibold px-1">{errors.message.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        size="lg"
        className="w-full h-14 text-lg font-extrabold bg-teal-600 hover:bg-teal-700 text-white shadow-xl shadow-teal-600/20 active:scale-95 transition-all"
      >
        {isSubmitting ? "Sending..." : "Send Message"}
      </Button>

      <p className="text-[11px] text-center text-slate-400 font-medium">
        By submitting, you agree to our <span className="text-slate-600 underline">Terms</span> and <span className="text-slate-600 underline">Privacy</span>.
      </p>
    </form>
  );
}

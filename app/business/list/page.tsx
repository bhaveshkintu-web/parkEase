"use client";

import { ContactForm } from "@/components/business/contact-form";
import { Building2, CheckCircle2, MapPin } from "lucide-react";

export default function ListBusinessPage() {
  return (
    <>
      {/* Header Section */}
      <section className="bg-slate-900 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-6 tracking-tight">
              List Your Parking Space on <span className="text-teal-400">ParkEase</span>
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed">
              Reach millions of drivers and start earning extra revenue by sharing your unused parking capacity.
            </p>
          </div>
        </div>
      </section>

      {/* Form and Content Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left Side: Information */}
            <div className="space-y-12">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">Why partner with us?</h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="shrink-0 w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Maximum Exposure</h3>
                      <p className="text-slate-600">Your location will be visible to thousands of travelers searching for parking every day.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="shrink-0 w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Secure Payments</h3>
                      <p className="text-slate-600">Guaranteed payments directly to your account with full transaction transparency.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="shrink-0 w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Total Control</h3>
                      <p className="text-slate-600">Manage your inventory, set your own prices, and blackout dates with ease.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Any questions?</h3>
                <p className="text-slate-600 mb-6 font-medium">
                  Our partnership team is here to help you get started and optimize your listings for maximum success.
                </p>
                <p className="text-teal-600 font-bold">business@parkease.com</p>
                <p className="text-slate-900 font-bold">+1 (408) 598-3338</p>
              </div>
            </div>

            {/* Right Side: The Form */}
            <div id="form-container">
              <ContactForm source="business-listing-page" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

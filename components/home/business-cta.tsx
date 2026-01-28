// N
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight } from "lucide-react";

export function BusinessCTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Grow Your Business with ParkEase</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join our network of partners and unlock new revenue opportunities
          </p>
        </div>

        <div className="max-w-xl mx-auto">
          {/* ParkEase for Business */}
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition group text-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-teal-500 transition mx-auto">
              <Building2 className="w-8 h-8 text-teal-600 group-hover:text-white transition" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Enterprise Parking</h3>
            <p className="text-gray-600 mb-6">
              Offer exclusive parking benefits to your customers and employees with our corporate solutions.
            </p>
            <Button asChild className="w-full bg-teal-500 hover:bg-teal-600 text-white">
              <Link href="/business/list">
                Contact Sales <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

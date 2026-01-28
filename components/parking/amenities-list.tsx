import {
  Bus,
  Shield,
  Car,
  Zap,
  Clock,
  Accessibility,
  Droplets,
  Camera,
  CreditCard,
  Phone,
} from "lucide-react";

const amenityIcons: Record<string, typeof Bus> = {
  "Free Shuttle": Bus,
  "24/7 Security": Shield,
  "Covered Parking": Car,
  "EV Charging": Zap,
  "Open 24/7": Clock,
  "Handicap Accessible": Accessibility,
  "Car Wash": Droplets,
  "Security Cameras": Camera,
  "Credit Card Accepted": CreditCard,
  "Customer Support": Phone,
  "Valet Available": Car,
  "Car Detailing": Droplets,
  "Heated Indoor Parking": Shield,
};

interface AmenitiesListProps {
  amenities: string[];
}

export function AmenitiesList({ amenities }: AmenitiesListProps) {
  if (!amenities || !Array.isArray(amenities) || amenities.length === 0) return null;
  
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold text-foreground">What this place offers</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {amenities.map((amenity) => {
          const Icon = amenityIcons[amenity] || Shield;
          return (
            <div key={amenity} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm text-foreground">{amenity}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

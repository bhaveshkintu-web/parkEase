"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDataStore } from "@/lib/data-store";
import { formatDate, formatTime } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  QrCode,
  Camera,
  CheckCircle,
  XCircle,
  Car,
  Clock,
  MapPin,
  AlertTriangle,
  Keyboard,
} from "lucide-react";
import { QRScanner } from "@/components/qr-scanner";

interface ScanResult {
  type: "check_in" | "check_out";
  booking: {
    id: string;
    confirmationCode: string;
    vehiclePlate: string;
    vehicleInfo: {
      make: string;
      model: string;
      color: string;
    };
    checkIn: Date;
    checkOut: Date;
    location: {
      name: string;
    };
    guestInfo: {
      firstName: string;
      lastName: string;
    };
  };
}

export default function WatchmanScanPage() {
  const router = useRouter();
  const { reservations, checkInVehicle, checkOutVehicle } = useDataStore();
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const processScanResult = (code: string) => {
    setError("");
    console.log("Processing code:", code);

    // Normalize code
    const normalizedCode = code.trim().toLowerCase();

    const booking = reservations.find(
      (r) =>
        r.confirmationCode.toLowerCase() === normalizedCode ||
        r.vehicleInfo.licensePlate.toLowerCase() === normalizedCode
    );

    if (!booking) {
      setError(`No booking found for code: ${code}`);
      return false;
    }

    // Determine if this is a check-in or check-out
    // If within check-in window or hasn't checked in yet
    const isCheckIn = booking.status === "pending"; // Simplified status check

    setScanResult({
      type: isCheckIn ? "check_in" : "check_out",
      booking: {
        id: booking.id,
        confirmationCode: booking.confirmationCode,
        vehiclePlate: booking.vehicleInfo.licensePlate,
        vehicleInfo: {
          make: booking.vehicleInfo.make,
          model: booking.vehicleInfo.model,
          color: booking.vehicleInfo.color,
        },
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        location: {
          name: booking.location.name,
        },
        guestInfo: {
          firstName: booking.guestInfo.firstName,
          lastName: booking.guestInfo.lastName,
        },
      },
    });

    setIsScanning(false);
    return true;
  };

  const handleManualSearch = () => {
    processScanResult(manualCode);
  };

  const handleScanSuccess = (decodedText: string) => {
    processScanResult(decodedText);
  };

  const handleStartScan = () => {
    setIsScanning(true);
    setError("");
  };

  const handleConfirmAction = () => {
    if (!scanResult) return;

    if (scanResult.type === "check_in") {
      checkInVehicle(scanResult.booking.id, notes);
    } else {
      checkOutVehicle(scanResult.booking.id, notes);
    }

    setScanResult(null);
    setNotes("");
    setManualCode("");
    router.push("/watchman/sessions");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Scan QR Code</h1>
        <p className="text-muted-foreground mt-1">
          Scan a booking QR code or enter confirmation code manually
        </p>
      </div>

      {/* Scanner Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            QR Scanner
          </CardTitle>
          <CardDescription>Point your camera at the customer&apos;s QR code</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Camera View Area */}
            <div className="relative mx-auto bg-muted rounded-lg overflow-hidden min-h-[300px] flex flex-col justify-center">
              {isScanning ? (
                <div className="w-full">
                  <QRScanner
                    onScanSuccess={handleScanSuccess}
                    onScanFailure={(err) => {
                      // Suppress common 'no qr code found' errors
                    }}
                  />
                  <div className="text-center p-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsScanning(false)}>
                      Stop Scanning
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-4 p-8 cursor-pointer hover:bg-muted/80 transition-colors h-full"
                  onClick={handleStartScan}
                >
                  <div className="absolute inset-4 border-2 border-dashed border-primary/50 rounded-lg pointer-events-none" />
                  <QrCode className="w-16 h-16 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium text-foreground">Tap to start camera</p>
                    <p className="text-sm text-muted-foreground">
                      Scan a booking QR code
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or enter manually</span>
              </div>
            </div>

            {/* Manual Entry */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Confirmation code or license plate"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                  />
                </div>
                <Button onClick={handleManualSearch} disabled={!manualCode}>
                  <Keyboard className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to use</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Ask for QR code</p>
                <p className="text-sm text-muted-foreground">
                  Request the customer to show their booking QR code
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Scan or enter code</p>
                <p className="text-sm text-muted-foreground">
                  Scan the QR code or enter confirmation code manually
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Verify details</p>
                <p className="text-sm text-muted-foreground">
                  Confirm vehicle details match the booking
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">4</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Complete action</p>
                <p className="text-sm text-muted-foreground">
                  Process the check-in or check-out
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scan Result Dialog */}
      <Dialog open={!!scanResult} onOpenChange={() => setScanResult(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {scanResult?.type === "check_in" ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Check-In
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-blue-600" />
                  Check-Out
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Verify the booking details and confirm the action
            </DialogDescription>
          </DialogHeader>

          {scanResult && (
            <div className="space-y-4 py-4">
              {/* Booking Info */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Confirmation</span>
                  <span className="font-mono font-bold text-foreground">
                    {scanResult.booking.confirmationCode}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Guest</span>
                  <span className="font-medium text-foreground">
                    {scanResult.booking.guestInfo.firstName}{" "}
                    {scanResult.booking.guestInfo.lastName}
                  </span>
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">Vehicle Details</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">License Plate</span>
                    <p className="font-bold text-foreground">{scanResult.booking.vehiclePlate}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Color</span>
                    <p className="font-medium text-foreground capitalize">
                      {scanResult.booking.vehicleInfo.color}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Make/Model</span>
                    <p className="font-medium text-foreground">
                      {scanResult.booking.vehicleInfo.make} {scanResult.booking.vehicleInfo.model}
                    </p>
                  </div>
                </div>
              </div>

              {/* Time Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-green-50">
                  <div className="flex items-center gap-1 text-green-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium">Check-in</span>
                  </div>
                  <p className="text-sm font-medium text-green-900">
                    {formatDate(scanResult.booking.checkIn)}
                  </p>
                  <p className="text-xs text-green-700">
                    {formatTime(scanResult.booking.checkIn)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50">
                  <div className="flex items-center gap-1 text-blue-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium">Check-out</span>
                  </div>
                  <p className="text-sm font-medium text-blue-900">
                    {formatDate(scanResult.booking.checkOut)}
                  </p>
                  <p className="text-xs text-blue-700">
                    {formatTime(scanResult.booking.checkOut)}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium text-foreground">
                  {scanResult.booking.location.name}
                </span>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about the vehicle condition, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setScanResult(null)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              className={`w-full sm:w-auto ${scanResult?.type === "check_in"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              {scanResult?.type === "check_in" ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Check-In
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Confirm Check-Out
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

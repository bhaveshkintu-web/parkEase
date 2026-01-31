"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QRScannerProps {
    onScanSuccess: (decodedText: string, decodedResult: any) => void;
    onScanFailure?: (error: any) => void;
    fps?: number;
    qrbox?: number;
    aspectRatio?: number;
    disableFlip?: boolean;
}

const qrcodeRegionId = "html5qr-code-full-region";

export function QRScanner({
    onScanSuccess,
    onScanFailure,
    fps = 10,
    qrbox = 250,
    aspectRatio = 1.0,
    disableFlip = false,
}: QRScannerProps) {
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Determine the device type to set the appropriate qrbox size
        // For mobile, we might want a smaller box relative to screen, simplified here
        const config = {
            fps: fps,
            qrbox: qrbox,
            aspectRatio: aspectRatio,
            disableFlip: disableFlip,
            supportedScanTypes: [0, 1], // 0: CAMERA, 1: FILE
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
        };

        // Create scanner instance
        try {
            const scanner = new Html5QrcodeScanner(qrcodeRegionId, config, false);
            scannerRef.current = scanner;

            scanner.render(onScanSuccess, (errorMessage) => {
                // html5-qrcode calls this frequently on every frame it doesn't find a code
                // so we generally don't want to log or show this unless checking for specific errors
                if (onScanFailure) onScanFailure(errorMessage);
            });
        } catch (err) {
            console.error("Error creating QR scanner:", err);
            setError("Failed to initialize camera. Please ensure you have granted camera permissions.");
        }

        // Cleanup
        return () => {
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear().catch((error) => {
                        console.error("Failed to clear html5-qrcode scanner. ", error);
                    });
                } catch (e) {
                    // Ignore clean up errors
                }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="w-full max-w-[500px] mx-auto overflow-hidden rounded-lg border bg-background">
            <style jsx global>{`
            #html5qr-code-full-region {
                width: 100%;
            }
            #html5qr-code-full-region video {
                object-fit: cover;
                border-radius: 0.5rem;
            }
            #html5qr-code-full-region__scan_region {
                background: transparent;
            }
        `}</style>
            <div id={qrcodeRegionId} />
        </div>
    );
}

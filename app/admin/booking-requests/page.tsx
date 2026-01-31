"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/admin/data-table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ArrowLeft,
    Search,
    CheckCircle,
    XCircle,
    AlertTriangle,
    FileText,
    MapPin,
    User,
    Calendar,
    Eye,
    Clock,
    Loader2,
    Phone,
    Car,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime, formatCurrency } from "@/lib/data";

interface BookingRequest {
    id: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    vehiclePlate: string;
    vehicleType: string;
    parkingName: string;
    requestType: string;
    requestedStart: string;
    requestedEnd: string;
    estimatedAmount: number;
    status: string;
    priority: string;
    notes: string;
    requestedBy: string;
    requestedByInfo: {
        firstName: string;
        lastName: string;
        email: string;
    };
    requestedAt: string;
    rejectionReason?: string;
}

export default function BookingRequestsAdminPage() {
    const { toast } = useToast();
    const [requests, setRequests] = useState<BookingRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState("pending");

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/admin/booking-requests");
            if (response.ok) {
                const data = await response.json();
                setRequests(data.requests || []);
            }
        } catch (error) {
            console.error("Failed to fetch booking requests:", error);
            toast({
                title: "Error",
                description: "Failed to load booking requests",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (action: "approve" | "reject") => {
        if (!selectedRequest) return;
        if (action === "reject" && !rejectionReason) {
            toast({
                title: "Reason Required",
                description: "Please provide a reason for rejection",
                variant: "destructive",
            });
            return;
        }

        setIsProcessing(true);
        try {
            const response = await fetch(`/api/admin/booking-requests/${selectedRequest.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, rejectionReason }),
            });

            if (response.ok) {
                toast({
                    title: `Request ${action === "approve" ? "Approved" : "Rejected"}`,
                    description: `The booking request has been ${action === "approve" ? "approved" : "rejected"} successfully.`,
                });
                setSelectedRequest(null);
                setRejectionReason("");
                fetchRequests();
            } else {
                const data = await response.json();
                throw new Error(data.error || `Failed to ${action} request`);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredRequests = requests.filter(
        (req) =>
            req.customerName.toLowerCase().includes(search.toLowerCase()) ||
            req.vehiclePlate.toLowerCase().includes(search.toLowerCase()) ||
            req.parkingName.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        const config: Record<string, { variant: "success" | "warning" | "error" | "info" | "default"; label: string }> = {
            pending: { variant: "warning", label: "Pending" },
            approved: { variant: "success", label: "Approved" },
            rejected: { variant: "error", label: "Rejected" },
            cancelled: { variant: "error", label: "Cancelled" },
        };
        const item = config[status.toLowerCase()] || { variant: "default", label: status };
        return <StatusBadge status={item.label} variant={item.variant} />;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const pendingCount = requests.filter((r) => r.status === "pending").length;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Booking Requests</h1>
                        <p className="text-muted-foreground">Manage walk-ins and modifications from watchmen</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="py-1.5">
                        <Clock className="w-3 h-3 mr-1" />
                        {pendingCount} Pending
                    </Badge>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search by customer, plate, or location..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Requests List */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList>
                    <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
                    <TabsTrigger value="all">All ({requests.length})</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    <div className="grid gap-4">
                        {filteredRequests
                            .filter((req) => activeTab === "all" || req.status === activeTab)
                            .map((request) => (
                                <Card key={request.id} className="hover:border-primary/50 transition-colors">
                                    <CardContent className="p-4 sm:p-6">
                                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-semibold text-lg text-foreground">
                                                        {request.customerName}
                                                    </h3>
                                                    <Badge variant="outline">{request.requestType}</Badge>
                                                    {getStatusBadge(request.status)}
                                                    {request.priority === "urgent" && (
                                                        <Badge variant="destructive">Urgent</Badge>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Car className="w-4 h-4" />
                                                        <span>{request.vehiclePlate} ({request.vehicleType})</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <MapPin className="w-4 h-4" />
                                                        <span>{request.parkingName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Clock className="w-4 h-4" />
                                                        <span>
                                                            {formatTime(new Date(request.requestedStart))} - {formatTime(new Date(request.requestedEnd))}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded w-fit">
                                                    <User className="w-3 h-3" />
                                                    <span>Requested by: {request.requestedByInfo.firstName} {request.requestedByInfo.lastName} ({request.requestedByInfo.email})</span>
                                                    <span className="mx-1">•</span>
                                                    <span>{formatDate(new Date(request.requestedAt))}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-row lg:flex-col gap-2 items-center lg:items-end">
                                                <div className="text-right mr-4 lg:mr-0 mb-0 lg:mb-2">
                                                    <p className="text-lg font-bold text-foreground">{formatCurrency(request.estimatedAmount)}</p>
                                                    <p className="text-xs text-muted-foreground">Est. Amount</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setSelectedRequest(request)}
                                                    >
                                                        <Eye className="w-4 h-4 lg:mr-2" />
                                                        <span className="hidden lg:inline">Review</span>
                                                    </Button>
                                                    {request.status === "pending" && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700"
                                                                onClick={() => {
                                                                    setSelectedRequest(request);
                                                                    // Directly approve if clicking button? Maybe show dialog first.
                                                                }}
                                                            >
                                                                <CheckCircle className="w-4 h-4 lg:mr-2" />
                                                                <span className="hidden lg:inline">Approve</span>
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                        {filteredRequests.filter((req) => activeTab === "all" || req.status === activeTab).length === 0 && (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium text-foreground">No requests found</h3>
                                    <p className="text-muted-foreground mt-1">
                                        {activeTab === "pending" ? "No pending requests at this time" : "No requests match your search"}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Review Dialog */}
            <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Review Booking Request</DialogTitle>
                        <DialogDescription>
                            Check details before approving or rejecting
                        </DialogDescription>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Customer</p>
                                    <p className="font-medium">{selectedRequest.customerName}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Phone className="w-3 h-3" />
                                        {selectedRequest.customerPhone}
                                    </div>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-xs text-muted-foreground uppercase">Vehicle</p>
                                    <p className="font-medium">{selectedRequest.vehiclePlate}</p>
                                    <p className="text-sm text-muted-foreground">{selectedRequest.vehicleType}</p>
                                </div>
                            </div>

                            <div className="border rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-center pb-2 border-b">
                                    <span className="text-sm font-medium">Location</span>
                                    <span className="text-sm">{selectedRequest.parkingName}</span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b">
                                    <span className="text-sm font-medium">Type</span>
                                    <Badge variant="outline">{selectedRequest.requestType}</Badge>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b">
                                    <span className="text-sm font-medium">Time</span>
                                    <span className="text-sm">
                                        {formatTime(new Date(selectedRequest.requestedStart))} - {formatTime(new Date(selectedRequest.requestedEnd))}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Estimated Amount</span>
                                    <span className="text-lg font-bold text-green-600">{formatCurrency(selectedRequest.estimatedAmount)}</span>
                                </div>
                            </div>

                            {selectedRequest.notes && (
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Watchman Notes</p>
                                    <p className="text-sm italic bg-muted p-2 rounded">&quot;{selectedRequest.notes}&quot;</p>
                                </div>
                            )}

                            {selectedRequest.status === "pending" && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Rejection Reason (if rejecting)</label>
                                    <Textarea
                                        placeholder="Provide a reason why this request is being rejected..."
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            )}

                            {selectedRequest.status === "rejected" && selectedRequest.rejectionReason && (
                                <div className="space-y-1 text-red-600">
                                    <p className="text-xs uppercase">Rejection Reason</p>
                                    <p className="text-sm font-medium">{selectedRequest.rejectionReason}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        {selectedRequest?.status === "pending" && (
                            <>
                                <Button
                                    variant="destructive"
                                    onClick={() => handleAction("reject")}
                                    disabled={isProcessing}
                                    className="w-full sm:w-auto"
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    {isProcessing ? "Processing..." : "Reject"}
                                </Button>
                                <Button
                                    onClick={() => handleAction("approve")}
                                    disabled={isProcessing}
                                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    {isProcessing ? "Processing..." : "Approve"}
                                </Button>
                            </>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => setSelectedRequest(null)}
                            className="w-full sm:w-auto"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

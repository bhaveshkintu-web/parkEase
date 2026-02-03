"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2,
  DollarSign,
  Star,
  Globe,
  FileText,
  CreditCard,
  ExternalLink,
  MoreVertical,
  Activity,
  Users,
  ShieldCheck,
  Briefcase,
  History,
  Download,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/data";

interface OwnerDetails {
  id: string;
  businessName: string;
  businessType: string;
  status: string;
  verificationStatus: string;
  taxId: string | null;
  registrationNumber: string | null;
  website: string | null;
  description: string | null;
  taxStatus: string | null;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  bankAccountName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  routingNumber: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatar: string | null;
    createdAt: string;
    status: string;
  };
  locations: Array<{
    id: string;
    name: string;
    status: string;
    pricePerDay: number;
    address: string;
    _count: {
      bookings: number;
      reviews: number;
    };
    analytics?: {
      averageRating: number;
      totalBookings: number;
    };
  }>;
  documents: Array<{
    id: string;
    type: string;
    name: string;
    url: string;
    status: string;
    uploadedAt: string;
  }>;
  wallet: {
    balance: number;
    currency: string;
    transactions: Array<{
      id: string;
      type: string;
      amount: number;
      createdAt: string;
    }>;
  } | null;
  stats: {
    totalBookings: number;
    totalReviews: number;
    avgRating: number;
    locationCount: number;
  };
}

export default function OwnerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [owner, setOwner] = useState<OwnerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setOwnerId(p.id));
  }, [params]);

  useEffect(() => {
    if (ownerId) {
      fetchOwnerDetails();
    }
  }, [ownerId]);

  const fetchOwnerDetails = async () => {
    if (!ownerId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/owners/${ownerId}`);
      if (response.ok) {
        const data = await response.json();
        setOwner(data.owner);
      } else {
        toast({
          title: "Error",
          description: "Owner not found",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to fetch owner:", error);
      toast({
        title: "Error",
        description: "Failed to load owner details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!ownerId) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/owners/${ownerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} owner`);

      toast({
        title: "Success",
        description: `Owner ${action} successfully.`,
      });

      fetchOwnerDetails();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} owner`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Owner Not Found</h2>
        <p className="text-muted-foreground mb-4">The owner profile you're looking for doesn't exist.</p>
        <Button onClick={() => router.push("/admin/owners")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Owners
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      approved: { variant: "default", label: "Approved" },
      pending: { variant: "secondary", label: "Pending" },
      suspended: { variant: "destructive", label: "Suspended" },
      rejected: { variant: "outline", label: "Rejected" },
    };
    const item = variants[status.toLowerCase()] || { variant: "outline" as const, label: status };
    return <Badge variant={item.variant}>{item.label}</Badge>;
  };

  const handleVerifyDocument = async (docId: string, status: "verified" | "rejected") => {
    try {
      const response = await fetch(`/api/admin/documents/${docId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("Failed to update document status");

      toast({
        title: "Success",
        description: `Document marked as ${status}.`,
      });
      fetchOwnerDetails();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update document status",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between bg-card p-6 rounded-xl border shadow-sm">
        <div className="flex gap-5">
          <Avatar className="h-20 w-20 border-2 border-primary/10 shadow-sm">
            <AvatarImage src={owner.user.avatar || undefined} />
            <AvatarFallback className="bg-primary/5 text-primary text-2xl font-bold">
              {owner.user.firstName[0]}{owner.user.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{owner.businessName}</h1>
              {getStatusBadge(owner.status)}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> {owner.businessType}</span>
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> ID: {owner.id.slice(-8).toUpperCase()}</span>
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Joined {new Date(owner.user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/owners")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions <MoreVertical className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Management</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {owner.status === "pending" && (
                <>
                  <DropdownMenuItem onClick={() => handleAction("approve")} className="text-emerald-600 focus:text-emerald-600">
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Approve Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction("reject")} className="text-destructive focus:text-destructive">
                    <XCircle className="h-4 w-4 mr-2" /> Reject Profile
                  </DropdownMenuItem>
                </>
              )}
              {owner.status === "approved" && (
                <DropdownMenuItem onClick={() => handleAction("suspend")} className="text-amber-600 focus:text-amber-600">
                  <Ban className="h-4 w-4 mr-2" /> Suspend Account
                </DropdownMenuItem>
              )}
              {owner.status === "suspended" && (
                <DropdownMenuItem onClick={() => handleAction("approve")} className="text-emerald-600 focus:text-emerald-600">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Reactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => window.open(`mailto:${owner.user.email}`)}>
                <Mail className="h-4 w-4 mr-2" /> Email Owner
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" asChild>
            <Link href={`/admin/owners/${owner.id}/edit`}>Edit Profile</Link>
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Bookings", value: owner.stats.totalBookings, icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active Locations", value: owner.stats.locationCount, icon: MapPin, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Avg Rating", value: owner.stats.avgRating.toFixed(1), icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Wallet Balance", value: formatCurrency(owner.wallet?.balance || 0), icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              </div>
              <div className={`${stat.bg} ${stat.color} p-2.5 rounded-lg`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 border">
          <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="locations" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Managed Locations</TabsTrigger>
          <TabsTrigger value="wallet" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Wallet & Payouts</TabsTrigger>
          {owner.documents && owner.documents.length > 0 && (
            <TabsTrigger value="documents" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Verification Details</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Business Details */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Business Profiling</CardTitle>
                  </div>
                  <CardDescription>Comprehensive details about {owner.businessName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase">Business Type</Label>
                      <p className="font-medium text-sm capitalize">{owner.businessType}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase">Tax Identification (TIN/EIN)</Label>
                      <p className="font-medium text-sm">{owner.taxId || "Not Provided"}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase">Registration Number</Label>
                      <p className="font-medium text-sm">{owner.registrationNumber || "Not Provided"}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase">Website</Label>
                      {owner.website ? (
                        <a href={owner.website} target="_blank" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                          {owner.website} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : <p className="text-sm font-medium">No website listed</p>}
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase">Business Description</Label>
                    <p className="text-sm leading-relaxed text-muted-foreground italic">
                      {owner.description || "The owner has not provided a business description yet."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Primary Contact Details</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-6 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/5 p-2 rounded-md"><Mail className="h-4 w-4 text-primary" /></div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Main Email address</p>
                      <p className="text-sm font-semibold">{owner.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/5 p-2 rounded-md"><Phone className="h-4 w-4 text-primary" /></div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Direct contact line</p>
                      <p className="text-sm font-semibold">{owner.user.phone || "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Business Address */}
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Headquarters</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="aspect-video w-full rounded-lg bg-muted flex items-center justify-center relative overflow-hidden group">
                    <img 
                      src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-p+000000(${owner.zipCode})/auto/400x200?access_token=pk.eyJ1IjoicGFya2Vhc2UiLCJhIjoiY2toYjF6ZWx4MGFwcTJzbXoyZ2ozZ2ozZCJ9.ABC`} 
                      alt="Address context"
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="shadow-lg"
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${owner.street}, ${owner.city}, ${owner.state} ${owner.zipCode}`)}`, '_blank')}
                      >
                        View on Maps
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-semibold">{owner.street}</p>
                        <p className="text-muted-foreground">
                          {owner.city}, {owner.state} {owner.zipCode}
                        </p>
                        <p className="text-muted-foreground">{owner.country}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Managed Parking Spots</CardTitle>
                <CardDescription>All locations assigned to this owner profile</CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href={`/admin/locations/new?ownerId=${owner.id}`}>
                  <Plus className="h-4 w-4 mr-2" /> Add Location
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {owner.locations.length > 0 ? owner.locations.map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex gap-4">
                      <div className="h-12 w-16 bg-muted rounded-md border flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-0.5">
                        <Link href={`/admin/locations/${loc.id}`} className="font-semibold hover:text-primary transition-colors text-base">{loc.name}</Link>
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-sm">{loc.address}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1 text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border"><Users className="h-3 w-3" /> {loc._count.bookings} Bookings</span>
                          <span className="flex items-center gap-1 text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border"><Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {loc.analytics?.averageRating || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div className="space-y-0.5 mr-4">
                        <p className="text-sm font-bold">{formatCurrency(loc.pricePerDay)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">per day base</p>
                      </div>
                      <Badge variant={loc.status === "ACTIVE" ? "default" : "secondary"} className="h-6">
                        {loc.status}
                      </Badge>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl">
                    <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-20" />
                    <p className="text-muted-foreground text-sm font-medium">No locations assigned yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-card to-emerald-50/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-lg">Payout Method & Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="bg-background/80 backdrop-blur-sm border-2 border-emerald-100 rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Building2 className="h-20 w-20" /></div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-4 block">Default Settlement Account</Label>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Bank Name</span>
                      <span className="text-sm font-bold uppercase">{owner.bankName || "Pending Integration"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Account Holder</span>
                      <span className="text-sm font-bold">{owner.bankAccountName || owner.businessName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Account Number</span>
                      <span className="text-sm font-mono font-bold tracking-widest">{owner.accountNumber ? `****${owner.accountNumber.slice(-4)}` : "XXXX - XXXX"}</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-6 bg-transparent border-emerald-200 text-emerald-700 hover:bg-emerald-50">Manage Bank Details</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Statement & Activity</CardTitle>
                  <CardDescription>Recent financial transactions</CardDescription>
                </div>
                <Button variant="ghost" size="icon"><History className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {owner.wallet?.transactions && owner.wallet.transactions.length > 0 ? (
                    owner.wallet.transactions.map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0 border-dashed">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-full ${txn.type === "CREDIT" || txn.amount > 0 ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                            {txn.type === "CREDIT" || txn.amount > 0 ? <Activity className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                          </div>
                          <div>
                            <p className="font-semibold capitalize">{txn.type.toLowerCase()}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(txn.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className={`font-bold ${txn.type === "CREDIT" || txn.amount > 0 ? "text-emerald-700" : "text-foreground"}`}>
                          {txn.type === "CREDIT" || txn.amount > 0 ? "+" : ""}{formatCurrency(txn.amount)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No recent transactions
                    </div>
                  )}
                  {owner.wallet?.transactions && owner.wallet.transactions.length > 0 && (
                    <Button variant="ghost" className="w-full text-xs text-muted-foreground">View full settlement report</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {owner.documents && owner.documents.length > 0 && (
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Compliance Documents</CardTitle>
                  <CardDescription>Verify the authenticity of this business profile</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md border text-[10px] font-bold">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" /> VETTING: {owner.verificationStatus.toUpperCase()}
                   </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {owner.documents.map((doc) => (
                    <div key={doc.id} className="p-4 rounded-xl border group hover:border-primary/50 transition-colors bg-card">
                      <div className="flex items-center justify-between mb-4">
                        <div className="bg-primary/5 p-2 rounded-lg group-hover:bg-primary/10 transition-colors">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <Badge variant={doc.status === "verified" ? "default" : doc.status === "rejected" ? "destructive" : "secondary"}>
                          {doc.status}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold line-clamp-1 mb-1">{doc.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase mb-4 tracking-wider">{doc.type.replace("_", " ")}</p>
                      <div className="flex flex-col gap-2">
                         <Button variant="secondary" size="sm" className="w-full text-xs" onClick={() => window.open(doc.url)}>View Document</Button>
                         {doc.status === "pending" && (
                           <div className="flex gap-2">
                             <Button 
                               size="sm" 
                               variant="outline" 
                               className="w-full text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                               onClick={() => handleVerifyDocument(doc.id, "verified")}
                             >
                               Approve
                             </Button>
                             <Button 
                               size="sm" 
                               variant="outline" 
                               className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                               onClick={() => handleVerifyDocument(doc.id, "rejected")}
                             >
                               Reject
                             </Button>
                           </div>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}


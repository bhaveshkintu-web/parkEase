"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Car,
  Menu,
  Droplets,
  Shield,
  Fuel,
  Zap,
  Download,
  User,
  Calendar,
  CreditCard,
  Settings,
  LogOut,
  LayoutDashboard,
  Building2,
  Users2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getUserInitials } from "@/lib/user-utils";
import { NotificationCenter } from "@/components/notification-center";

const navLinks = [
  { href: "/parking", label: "Parking", icon: Car },
  { href: "#", label: "Insurance", icon: Shield },
  { href: "#", label: "Car Wash", icon: Droplets },
  { href: "#", label: "Gas", icon: Fuel },
  { href: "#", label: "EV Chargers", icon: Zap },
  { href: "/partner-with-us", label: "Partner With Us", icon: Building2 },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Car className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">ParkEase</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="hidden gap-2 sm:flex bg-transparent"
          >
            <Download className="h-4 w-4" />
            Get App
          </Button>

          {isAuthenticated && <NotificationCenter />}

          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden gap-2 sm:flex"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {getUserInitials(user.firstName, user.lastName)}
                  </div>
                  <span className="max-w-[100px] truncate">
                    {user.firstName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-foreground">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    <User className="mr-2 h-4 w-4" />
                    My Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account/reservations">
                    <Calendar className="mr-2 h-4 w-4" />
                    Reservations
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account/vehicles">
                    <Car className="mr-2 h-4 w-4" />
                    Vehicles
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account/payments">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Payment Methods
                  </Link>
                </DropdownMenuItem>
                {(user.role.toLowerCase() === "admin" ||
                  user.role.toLowerCase() === "owner" ||
                  user.role.toLowerCase() === "watchman") && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link
                          href={
                            user.role.toLowerCase() === "admin"
                              ? "/admin"
                              : user.role.toLowerCase() === "owner"
                                ? "/owner"
                                : "/watchman"
                          }
                        >
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          {user.role.toLowerCase() === "admin"
                            ? "Admin"
                            : user.role.toLowerCase() === "owner"
                              ? "Owner"
                              : "Watchman"}{" "}
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      {user.role.toLowerCase() === "admin" && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin/approvals/owners">
                            <Users2 className="mr-2 h-4 w-4" />
                            Owner Approvals
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                asChild
                className="bg-transparent"
              >
                <Link href="/demo">Demo</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>
          )}

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 pt-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                ))}
                <div className="mt-4 flex flex-col gap-2 border-t pt-4">
                  {isAuthenticated && user ? (
                    <>
                      <div className="px-3 py-2">
                        <p className="font-medium text-foreground">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                      <Link
                        href="/account"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <User className="h-5 w-5" />
                        My Account
                      </Link>
                      <Link
                        href="/account/reservations"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Calendar className="h-5 w-5" />
                        Reservations
                      </Link>
                      {(user.role.toLowerCase() === "admin" ||
                        user.role.toLowerCase() === "owner" ||
                        user.role.toLowerCase() === "watchman") && (
                          <Link
                            href={
                              user.role.toLowerCase() === "admin"
                                ? "/admin"
                                : user.role.toLowerCase() === "owner"
                                  ? "/owner"
                                  : "/watchman"
                            }
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <LayoutDashboard className="h-5 w-5" />
                            {user.role.toLowerCase() === "admin"
                              ? "Admin"
                              : user.role.toLowerCase() === "owner"
                                ? "Owner"
                                : "Watchman"}{" "}
                            Dashboard
                          </Link>
                        )}
                      <Button
                        variant="outline"
                        className="w-full gap-2 mt-2 bg-transparent"
                        onClick={() => {
                          logout();
                          setIsOpen(false);
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="w-full gap-2 bg-transparent"
                        asChild
                      >
                        <Link href="/demo" onClick={() => setIsOpen(false)}>
                          Try Demo
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full gap-2 bg-transparent"
                      >
                        <Download className="h-4 w-4" />
                        Get App
                      </Button>
                      <Button className="w-full" asChild>
                        <Link
                          href="/auth/login"
                          onClick={() => setIsOpen(false)}
                        >
                          Sign In
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header >
  );
}

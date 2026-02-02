"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ParkingLocation, GuestInfo, VehicleInfo } from "./types";

interface BookingState {
  location: ParkingLocation | null;
  checkIn: Date;
  checkOut: Date;
  guestInfo: GuestInfo | null;
  vehicleInfo: VehicleInfo | null;
  searchQuery: string;
  parkingType: "airport" | "hourly" | "monthly";
}

interface BookingContextType extends BookingState {
  setLocation: (location: ParkingLocation | null) => void;
  setCheckIn: (date: Date) => void;
  setCheckOut: (date: Date) => void;
  setGuestInfo: (info: GuestInfo) => void;
  setVehicleInfo: (info: VehicleInfo) => void;
  setSearchQuery: (query: string) => void;
  setParkingType: (type: "airport" | "hourly" | "monthly") => void;
  clearBooking: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const getDefaultCheckIn = () => {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
};

const getDefaultCheckOut = () => {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
};

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BookingState>({
    location: null,
    checkIn: getDefaultCheckIn(),
    checkOut: getDefaultCheckOut(),
    guestInfo: null,
    vehicleInfo: null,
    searchQuery: "",
    parkingType: "airport",
  });

  const setLocation = (location: ParkingLocation | null) => {
    setState((prev) => ({ ...prev, location }));
  };

  const setCheckIn = (checkIn: Date) => {
    setState((prev) => ({ ...prev, checkIn }));
  };

  const setCheckOut = (checkOut: Date) => {
    setState((prev) => ({ ...prev, checkOut }));
  };

  const setGuestInfo = (guestInfo: GuestInfo) => {
    setState((prev) => ({ ...prev, guestInfo }));
  };

  const setVehicleInfo = (vehicleInfo: VehicleInfo) => {
    setState((prev) => ({ ...prev, vehicleInfo }));
  };

  const setSearchQuery = (searchQuery: string) => {
    setState((prev) => ({ ...prev, searchQuery }));
  };

  const setParkingType = (parkingType: "airport" | "hourly" | "monthly") => {
    setState((prev) => ({ ...prev, parkingType }));
  };

  const clearBooking = () => {
    setState({
      location: null,
      checkIn: getDefaultCheckIn(),
      checkOut: getDefaultCheckOut(),
      guestInfo: null,
      vehicleInfo: null,
      searchQuery: "",
      parkingType: "airport",
    });
  };

  return (
    <BookingContext.Provider
      value={{
        ...state,
        setLocation,
        setCheckIn,
        setCheckOut,
        setGuestInfo,
        setVehicleInfo,
        setSearchQuery,
        setParkingType,
        clearBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}

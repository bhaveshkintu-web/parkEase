"use client";

import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from "react";
import { getGeneralSettings } from "./actions/settings-actions";
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
  minBookingDuration: number;
  taxRate: number;
  serviceFee: number;
  isInitialized: boolean;
  clearBookingData: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const STORAGE_KEY = "parkease_booking_context";

const getDefaultCheckIn = () => {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
};

const getDefaultCheckOut = () => {
  const date = getDefaultCheckIn();
  date.setHours(date.getHours() + 2);
  return date;
};

// Load booking state from session storage
const loadBookingState = (): BookingState => {
  if (typeof window === "undefined") {
    return {
      location: null,
      checkIn: getDefaultCheckIn(),
      checkOut: getDefaultCheckOut(),
      guestInfo: null,
      vehicleInfo: null,
      searchQuery: "",
      parkingType: "airport",
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        checkIn: new Date(parsed.checkIn),
        checkOut: new Date(parsed.checkOut),
      };
    }
  } catch (error) {
    console.error("Failed to load booking state from local storage:", error);
  }

  return {
    location: null,
    checkIn: getDefaultCheckIn(),
    checkOut: getDefaultCheckOut(),
    guestInfo: null,
    vehicleInfo: null,
    searchQuery: "",
    parkingType: "airport",
  };
};

// Save booking state to session storage
const saveBookingState = (state: BookingState) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save booking state to local storage:", error);
  }
};

// Helper to get default state
const getInitialState = (defaultCheckIn?: Date, defaultCheckOut?: Date): BookingState => ({
  location: null,
  checkIn: defaultCheckIn || getDefaultCheckIn(),
  checkOut: defaultCheckOut || getDefaultCheckOut(),
  guestInfo: null,
  vehicleInfo: null,
  searchQuery: "",
  parkingType: "airport",
});

export function BookingProvider({
  children,
  defaultCheckIn,
  defaultCheckOut
}: {
  children: ReactNode;
  defaultCheckIn?: Date;
  defaultCheckOut?: Date;
}) {
  // Use a stable default state for SSR and initial client render
  const [state, setState] = useState<BookingState>(() => getInitialState(defaultCheckIn, defaultCheckOut));
  const [isMounted, setIsMounted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [minBookingDuration, setMinBookingDuration] = useState(120);
  const [taxRate, setTaxRate] = useState(12);
  const [serviceFee, setServiceFee] = useState(5.99);

  // Consolidated Initialization: Storage + Settings
  useEffect(() => {
    const initialize = async () => {
      setIsMounted(true);

      // 1. Load from storage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setState(prev => ({
            ...prev,
            ...parsed,
            checkIn: new Date(parsed.checkIn),
            checkOut: new Date(parsed.checkOut),
          }));
        }
      } catch (error) {
        console.error("Failed to load booking state from local storage:", error);
      }

      // 2. Load fresh settings
      try {
        const settings = await getGeneralSettings();
        if (settings.minBookingDuration) setMinBookingDuration(settings.minBookingDuration);
        if (settings.taxRate) setTaxRate(settings.taxRate);
        if (settings.serviceFee) setServiceFee(settings.serviceFee);
      } catch (error) {
        console.error("Failed to fetch settings during init:", error);
      }

      setIsInitialized(true);
    };

    initialize();
  }, []);

  useEffect(() => {
    if (isInitialized) {
      saveBookingState(state);
    }
  }, [state, isInitialized]);

  // Enforce minimum duration globally
  useEffect(() => {
    if (state.checkIn && state.checkOut) {
      const minDurationMs = minBookingDuration * 60 * 1000;
      if (state.checkOut.getTime() - state.checkIn.getTime() < minDurationMs) {
        const newCheckOut = new Date(state.checkIn.getTime() + minDurationMs);
        setState(prev => ({ ...prev, checkOut: newCheckOut }));
      }
    }
  }, [state.checkIn, minBookingDuration]);

  const setLocation = useCallback((location: ParkingLocation | null) => {
    setState((prev) => ({ ...prev, location }));
  }, []);

  const setCheckIn = useCallback((checkIn: Date) => {
    setState((prev) => ({ ...prev, checkIn }));
  }, []);

  const setCheckOut = useCallback((checkOut: Date) => {
    setState((prev) => ({ ...prev, checkOut }));
  }, []);

  const setGuestInfo = useCallback((guestInfo: GuestInfo) => {
    setState((prev) => ({ ...prev, guestInfo }));
  }, []);

  const setVehicleInfo = useCallback((vehicleInfo: VehicleInfo) => {
    setState((prev) => ({ ...prev, vehicleInfo }));
  }, []);

  const setSearchQuery = useCallback((searchQuery: string) => {
    setState((prev) => ({ ...prev, searchQuery }));
  }, []);

  const setParkingType = useCallback((parkingType: "airport" | "hourly" | "monthly") => {
    setState((prev) => ({ ...prev, parkingType }));
  }, []);

  const clearBooking = useCallback(() => {
    const newState = {
      location: null,
      checkIn: getDefaultCheckIn(),
      checkOut: getDefaultCheckOut(),
      guestInfo: null,
      vehicleInfo: null,
      searchQuery: "",
      parkingType: "airport" as const,
    };
    setState(newState);

    // Also clear from local storage
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error("Failed to clear booking state from local storage:", error);
      }
    }
  }, []);

  const clearBookingData = useCallback(() => {
    setState((prev) => ({
      ...prev,
      guestInfo: null,
      vehicleInfo: null,
    }));
    localStorage.removeItem('booking_state');
  }, []);

  const contextValue = useMemo(() => ({
    ...state,
    setLocation,
    setCheckIn,
    setCheckOut,
    setGuestInfo,
    setVehicleInfo,
    setSearchQuery,
    setParkingType,
    clearBooking,
    minBookingDuration,
    taxRate,
    serviceFee,
    isInitialized,
    clearBookingData,
  }), [state, setLocation, setCheckIn, setCheckOut, setGuestInfo, setVehicleInfo, setSearchQuery, setParkingType, clearBooking, minBookingDuration, taxRate, serviceFee, isInitialized, clearBookingData]);

  return (
    <BookingContext.Provider value={contextValue}>
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

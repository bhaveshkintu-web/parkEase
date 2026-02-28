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
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        checkIn: new Date(parsed.checkIn),
        checkOut: new Date(parsed.checkOut),
      };
    }
  } catch (error) {
    console.error("Failed to load booking state from session storage:", error);
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
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save booking state to session storage:", error);
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

  // Set isMounted on first client-side effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchDuration = async () => {
      try {
        const settings = await getGeneralSettings();
        if (settings.minBookingDuration) {
          setMinBookingDuration(settings.minBookingDuration);
        }
      } catch (error) {
        console.error("Failed to fetch min duration setting:", error);
      }
    };
    fetchDuration();
  }, []);

  // Load from session storage only on client mount
  useEffect(() => {
    if (!isMounted) return;

    const loadFromStorage = () => {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setState({
            ...parsed,
            checkIn: new Date(parsed.checkIn),
            checkOut: new Date(parsed.checkOut),
          });
        }
      } catch (error) {
        console.error("Failed to load booking state from session storage:", error);
      }
      setIsInitialized(true);
    };

    loadFromStorage();
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

    // Also clear from session storage
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error("Failed to clear booking state from session storage:", error);
      }
    }
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
  }), [state, setLocation, setCheckIn, setCheckOut, setGuestInfo, setVehicleInfo, setSearchQuery, setParkingType, clearBooking, minBookingDuration]);

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

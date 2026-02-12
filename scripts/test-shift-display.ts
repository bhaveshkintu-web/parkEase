/**
 * Test script to verify watchman shift display text mapping
 * This ensures that when a watchman clicks "Start Shift", they see the full
 * shift timing (e.g., "Evening (2 PM - 10 PM)") instead of just "evening"
 */

const getShiftDisplayText = (shiftKey: string): string => {
    const shiftMap: Record<string, string> = {
        "morning": "Morning (6 AM - 2 PM)",
        "evening": "Evening (2 PM - 10 PM)",
        "night": "Night (10 PM - 6 AM)",
        "all": "All Day"
    };
    return shiftMap[shiftKey] || shiftKey;
};

// Test cases
console.log("Testing shift display text mapping:");
console.log("----------------------------------");
console.log("morning ->", getShiftDisplayText("morning"));
console.log("evening ->", getShiftDisplayText("evening"));
console.log("night ->", getShiftDisplayText("night"));
console.log("all ->", getShiftDisplayText("all"));
console.log("unknown ->", getShiftDisplayText("unknown"));
console.log("----------------------------------");

// Expected output:
// morning -> Morning (6 AM - 2 PM)
// evening -> Evening (2 PM - 10 PM)
// night -> Night (10 PM - 6 AM)
// all -> All Day
// unknown -> unknown

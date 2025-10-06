<<<<<<< HEAD
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';

const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const WARNING_DURATION = 2 * 60 * 1000; // Show warning 2 minutes before timeout
=======
import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useSessionTimeoutSettings } from "@/hooks/useSettings";
>>>>>>> feature/settings-management

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

<<<<<<< HEAD
=======
  // Fetch session timeout settings
  const { timeoutMinutes, warningMinutes } = useSessionTimeoutSettings();
  
  // Validate and normalize timeout values
  const validTimeoutMinutes = Math.max(1, timeoutMinutes); // Ensure at least 1 minute timeout
  const validWarningMinutes = Math.min(
    Math.max(0, warningMinutes), // Warning must be non-negative
    validTimeoutMinutes - 1 // Warning must be less than timeout
  );
  
  // Convert minutes to milliseconds with validation
  const TIMEOUT_DURATION = validTimeoutMinutes * 60 * 1000;
  const WARNING_DURATION = validWarningMinutes * 60 * 1000;

>>>>>>> feature/settings-management
  const resetTimeout = useCallback(() => {
    if (!user) return;

    lastActivityRef.current = Date.now();

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }

<<<<<<< HEAD
    // Set warning timeout (13 minutes)
    warningRef.current = setTimeout(() => {
      toast({
        title: "Session Expiring Soon",
        description: "Your session will expire in 2 minutes due to inactivity. Click anywhere to continue.",
        variant: "destructive",
      });
    }, TIMEOUT_DURATION - WARNING_DURATION);

    // Set logout timeout (15 minutes)
=======
    // Set warning timeout with dynamically computed warning time
    warningRef.current = setTimeout(() => {
      const minutesText = `${validWarningMinutes} minute${validWarningMinutes === 1 ? '' : 's'}`;
      toast({
        title: "Session Expiring Soon",
        description: `Your session will expire in ${minutesText} due to inactivity. Click anywhere to continue.`,
        variant: "destructive",
      });
    }, Math.max(0, TIMEOUT_DURATION - WARNING_DURATION));

    // Set logout timeout
>>>>>>> feature/settings-management
    timeoutRef.current = setTimeout(async () => {
      toast({
        title: "Session Expired",
        description: "You have been logged out due to inactivity.",
        variant: "destructive",
      });
      await signOut();
    }, TIMEOUT_DURATION);
<<<<<<< HEAD
  }, [user, signOut, toast]);
=======
  }, [user, signOut, toast, TIMEOUT_DURATION, WARNING_DURATION, validWarningMinutes]);
>>>>>>> feature/settings-management

  const handleActivity = useCallback(() => {
    resetTimeout();
  }, [resetTimeout]);

  useEffect(() => {
    if (!user) {
      // Clear timeouts when user logs out
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
        warningRef.current = null;
      }
      return;
    }

    // Start timeout when user logs in
    resetTimeout();

    // Activity detection events
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Add event listeners for activity detection
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup function
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
    };
  }, [user, handleActivity, resetTimeout]);

  return {
    resetTimeout,
    timeRemaining: () => {
      const elapsed = Date.now() - lastActivityRef.current;
      return Math.max(0, TIMEOUT_DURATION - elapsed);
    }
  };
}
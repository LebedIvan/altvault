"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "vaulty_user_profile";

export interface NotificationSettings {
  priceAlerts:   boolean;
  weeklyReport:  boolean;
  assetUpdates:  boolean;
}

export interface UserProfile {
  name:          string;
  email:         string;
  avatarColor:   string; // tailwind bg color key for avatar
  notifications: NotificationSettings;
}

const DEFAULTS: UserProfile = {
  name:          "",
  email:         "",
  avatarColor:   "sky",
  notifications: {
    priceAlerts:  true,
    weeklyReport: false,
    assetUpdates: true,
  },
};

interface UserContextValue {
  profile:       UserProfile;
  updateProfile: (patch: Partial<UserProfile>) => void;
  updateNotifications: (patch: Partial<NotificationSettings>) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserProfile>;
        setProfile({
          ...DEFAULTS,
          ...parsed,
          notifications: { ...DEFAULTS.notifications, ...(parsed.notifications ?? {}) },
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const save = useCallback((next: UserProfile) => {
    setProfile(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const updateNotifications = useCallback((patch: Partial<NotificationSettings>) => {
    setProfile((prev) => {
      const next = { ...prev, notifications: { ...prev.notifications, ...patch } };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [save]);

  return (
    <UserContext.Provider value={{ profile, updateProfile, updateNotifications }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be inside UserProvider");
  return ctx;
}

/** Returns initials from name, or "?" if empty */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

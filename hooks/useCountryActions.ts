"use client";

import type { CountryLocation, CountryStatus } from '@/types/country';
import { getApiErrorDisplay } from '@/lib/api-error-display';

interface UseCountryActionsOptions {
  setLocations: React.Dispatch<React.SetStateAction<CountryLocation[]>>;
  refetchLocations: () => Promise<CountryLocation[]>;
  toast: { error: (msg: string) => void; success?: (msg: string) => void };
}

export function useCountryActions({
  setLocations,
  refetchLocations,
  toast,
}: UseCountryActionsOptions) {
  const deleteCountry = async (location: CountryLocation) => {
    const response = await fetch('/api/delete-country', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countryCode: location.code, countryName: location.name }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(typeof data?.error === 'string' ? data.error : `Error (${response.status})`);
    }
    await refetchLocations();
    toast.success?.('Country removed.');
  };

  const moveToStatus = async (location: CountryLocation, newStatus: string) => {
    const validStatuses = ['done', 'in review', 'pending'];
    if (!validStatuses.includes(newStatus) || location.status === newStatus) return;
    const countryId = location.id;
    const originalStatus = location.status;
    setLocations((prev) =>
      prev.map((loc) => (loc.id === countryId ? { ...loc, status: newStatus as CountryStatus } : loc))
    );
    try {
      const response = await fetch('/api/update-country', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: location.code,
          countryName: location.name,
          newStatus,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data?.error === 'string' ? data.error : `Error (${response.status})`);
      }
    } catch (error) {
      console.error('Error updating country status:', error);
      setLocations((prev) =>
        prev.map((loc) => (loc.id === countryId ? { ...loc, status: originalStatus } : loc))
      );
      toast.error(getApiErrorDisplay(error, 'Failed to update status. Please try again.'));
      throw error;
    }
  };

  const saveNotes = async (
    location: CountryLocation,
    payload: { notes?: string; visitedAt?: string; tags: string[] }
  ) => {
    const response = await fetch('/api/update-country-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        countryCode: location.code,
        countryName: location.name,
        notes: payload.notes?.trim() || undefined,
        visitedAt: payload.visitedAt?.trim() || undefined,
        tags: payload.tags,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(typeof data?.error === 'string' ? data.error : `Error (${response.status})`);
    }
    await refetchLocations();
  };

  const addCountry = async (payload: {
    name: string;
    code: string;
    latitude: number;
    longitude: number;
    flag?: string;
    photos: string[];
    status: string;
  }) => {
    const response = await fetch('/api/add-country', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(typeof data?.error === 'string' ? data.error : `Error (${response.status})`);
    }
    await refetchLocations();
  };

  return { deleteCountry, moveToStatus, saveNotes, addCountry };
}

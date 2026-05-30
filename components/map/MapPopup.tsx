"use client";

import type { CountryLocation } from '@/types/country';
import { getStatusDisplayLabel, normalizeTags } from './utils';

interface MapPopupProps {
  location: CountryLocation;
}

export default function MapPopup({ location }: MapPopupProps) {
  const tags = normalizeTags(location);
  const statusClass = location.status.replace(/\s+/g, '-');
  const badgeLabel = getStatusDisplayLabel(location.status);
  const hasDetails = !!(location.visitedAt || location.notes || tags.length > 0);

  return (
    <div className={`map-popup map-popup--${statusClass}`} role="dialog" aria-label={location.name}>
      <div className="map-popup-body">
        <span className="map-popup-badge">{badgeLabel}</span>
        <h3 className="map-popup-title">{location.name}</h3>
        {hasDetails && (
          <div className="map-popup-details">
            {location.visitedAt && (
              <p className="map-popup-visited">Visited {location.visitedAt}</p>
            )}
            {location.notes && (
              <p className="map-popup-notes">{location.notes}</p>
            )}
            {tags.length > 0 && (
              <div className="map-popup-tags">
                {tags.map((tag, i) => (
                  <span key={i} className="map-popup-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

export default function DashboardSkeleton() {
  return (
    <div className="loading-skeleton loading-skeleton--dashboard" aria-busy="true" aria-label="Loading dashboard">
      <div className="dashboard-map-panel skeleton-dashboard-panel" aria-hidden>
        <div className="skeleton-map-header">
          <div className="skeleton-map-header-row">
            <div className="skeleton-block skeleton-map-title" />
            <div className="skeleton-map-header-actions">
              <div className="skeleton-block skeleton-map-pill" />
              <div className="skeleton-block skeleton-map-pill" />
              <div className="skeleton-block skeleton-map-pill" />
              <div className="skeleton-block skeleton-map-utility" />
              <div className="skeleton-block skeleton-map-utility" />
              <div className="skeleton-block skeleton-map-add-btn" />
            </div>
          </div>
          <div className="skeleton-block skeleton-map-area" />
        </div>

        <section className="skeleton-list-section">
          <div className="skeleton-list-tabs-bar">
            <div className="skeleton-list-tabs">
              <div className="skeleton-block skeleton-list-tab" />
              <div className="skeleton-block skeleton-list-tab" />
              <div className="skeleton-block skeleton-list-tab" />
              <div className="skeleton-block skeleton-list-tab" />
            </div>
            <div className="skeleton-list-toolbar">
              <div className="skeleton-block skeleton-list-sort" />
              <div className="skeleton-block skeleton-list-search" />
            </div>
          </div>
          <div className="skeleton-list-cards">
            <div className="skeleton-block skeleton-list-card" />
            <div className="skeleton-block skeleton-list-card" />
            <div className="skeleton-block skeleton-list-card" />
            <div className="skeleton-block skeleton-list-card" />
            <div className="skeleton-block skeleton-list-card" />
            <div className="skeleton-block skeleton-list-card" />
          </div>
        </section>
      </div>
    </div>
  );
}

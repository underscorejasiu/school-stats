// Google Analytics event tracking utility

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
  }
}

/**
 * Track a custom event in Google Analytics
 */
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

/**
 * Track page views manually (useful for client-side navigation)
 */
export function trackPageView(path: string): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', {
      page_path: path,
    });
  }
}

/**
 * Track origin selection on the map
 */
export function trackOriginSelection(): void {
  trackEvent('origin_selected', 'map_interaction', 'user_selected_origin');
}

/**
 * Track isochrone generation
 */
export function trackIsochroneGeneration(transportMode: string, timeRange: number): void {
  trackEvent('isochrone_generated', 'map_interaction', transportMode, timeRange);
}

/**
 * Track school list interaction
 */
export function trackSchoolListAction(action: string, details?: string): void {
  trackEvent(action, 'school_list', details);
}

/**
 * Track filter changes
 */
export function trackFilterChange(filterType: string, value: string): void {
  trackEvent('filter_changed', 'school_list', `${filterType}:${value}`);
}

/**
 * Track sort changes
 */
export function trackSortChange(sortMetric: string): void {
  trackEvent('sort_changed', 'school_list', sortMetric);
}

/**
 * Track school focus (when user clicks target icon)
 */
export function trackSchoolFocus(schoolId: string): void {
  trackEvent('school_focused', 'school_list', schoolId);
}

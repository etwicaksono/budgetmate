'use client';

import React, { useEffect, useRef } from 'react';

/** 
 * Matches open react-bootstrap Modals and Offcanvas overlays.
 * Excludes navigation sidebars (.sidebar-offcanvas).
 */
const OVERLAY_SELECTOR = '.modal.show, .offcanvas.show';

/**
 * Makes the browser/device Back button close open react-bootstrap Modals and
 * filter Offcanvas on mobile instead of navigating away from the page.
 * 
 * Handles nested modals by deferring cleanup decisions to avoid gaps during
 * modal transitions.
 */
export const ModalBackCloseManager: React.FC = () => {
  const pushedHistoryEntryRef = useRef(false);
  const overlayClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const isMobile = () => window.matchMedia('(max-width: 991.98px)').matches;

    const getOpenOverlays = () =>
      Array.from(document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR))
        // Exclude the navigation sidebar and debt modals: debt modals are
        // managed by GlobalDebtModal's React-state layer tracking (which pushes
        // its own history entries), so handling them here too would double-push
        // entries and double-close overlays on popstate.
        .filter(
          el =>
            !el.classList.contains('sidebar-offcanvas') &&
            !el.classList.contains('debt-back-managed')
        );

    // Smart overlay count that accounts for transient gaps during modal transitions
    const getSmartOverlayCount = () => {
      const currentCount = getOpenOverlays().length;
      
      // If we were tracking overlays and currently have 0, 
      // wait a bit in case a different modal is about to appear
      if (currentCount === 0 && pushedHistoryEntryRef.current) {
        // Clear existing timeout if any
        if (overlayClearTimeoutRef.current) {
          clearTimeout(overlayClearTimeoutRef.current);
        }
        
        // Set new timeout for deferred cleanup 
        overlayClearTimeoutRef.current = setTimeout(() => {
          const finalCount = getOpenOverlays().length;
          if (finalCount === 0) {
            // Actually no overlays - safe to clean up
            pushedHistoryEntryRef.current = false;
          }
        }, 300); // 300ms grace period for modal transitions
      
        return 1; // Temporarily consider as 1 overlay to prevent navigation
      }
      
      return currentCount;
    };

    // Smart sync that accounts for modal transition gaps
    const smartSyncHistoryEntry = () => {
      // Clear any pending cleanup timeout
      if (overlayClearTimeoutRef.current) {
        clearTimeout(overlayClearTimeoutRef.current);
        overlayClearTimeoutRef.current = null;
      }

      const smartCount = getSmartOverlayCount();
      const hasOpenOverlay = smartCount > 0;

      if (hasOpenOverlay && !pushedHistoryEntryRef.current && isMobile()) {
        window.history.pushState(
          { ...window.history.state, mobileOverlayOpen: true },
          '',
          window.location.href
        );
        pushedHistoryEntryRef.current = true;
      } else if (!hasOpenOverlay && pushedHistoryEntryRef.current) {
        // All overlays confirmed closed
        pushedHistoryEntryRef.current = false;
      }
    };

    const closeTopmostOverlay = () => {
      const overlays = getOpenOverlays();
      if (overlays.length === 0) return; // No visible overlays to close

      const topmost = overlays[overlays.length - 1];
      if (!topmost) return;

      // Use DOM events that bootstrap listens to for modal/offcanvas dismissal.
      const closeButton = topmost.querySelector<HTMLElement>(
        '.modal-header .btn-close, ' +        // react-bootstrap modal
        '.offcanvas-header .btn-close, ' +    // react-bootstrap offcanvas  
        '[data-bs-dismiss], ' +               // Bootstrap 5 standard
        '[aria-label="Close"]'                // Generic close
      );
      
      if (closeButton) {
        closeButton.click();
        return;
      }

      // Fallback: try to trigger onHide if available
      const event = new Event('closeOffcanvas', { bubbles: true });
      topmost.dispatchEvent(event);
    };

    const handlePopState = () => {
      if (!pushedHistoryEntryRef.current) return;

      pushedHistoryEntryRef.current = false;
      if (overlayClearTimeoutRef.current) {
        clearTimeout(overlayClearTimeoutRef.current);
        overlayClearTimeoutRef.current = null;
      }
      
      setTimeout(() => closeTopmostOverlay(), 50);
    };

    const observer = new MutationObserver(smartSyncHistoryEntry);
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('popstate', handlePopState);

    return () => {
      observer.disconnect();
      window.removeEventListener('popstate', handlePopState);
      if (overlayClearTimeoutRef.current) {
        clearTimeout(overlayClearTimeoutRef.current);
      }
    };
  }, []);

  return null;
};


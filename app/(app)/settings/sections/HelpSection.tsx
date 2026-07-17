import React from 'react';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { APP_VERSION, BUG_EMAIL } from '@/lib/version';

export function HelpSection(): React.ReactElement {
  return (
    <div>
      <h2 className="mb-4">Help & Support</h2>
      <p className="text-muted">Get help with using the application.</p>

      <h3 className="h6 text-uppercase mb-2">API Documentation</h3>
      <p className="mb-4">
        <a href="/api-docs" target="_blank" rel="noopener noreferrer" className="d-inline-flex align-items-center gap-1">
          View the interactive OpenAPI reference
          <FaExternalLinkAlt size={11} />
        </a>
      </p>

      {BUG_EMAIL && (
        <>
          <h3 className="h6 text-uppercase mb-2">Report a bug</h3>
          <p className="mb-4">
            Send your report to <span className="user-select-all fw-semibold">{BUG_EMAIL}</span>
          </p>
        </>
      )}

      <h3 className="h6 text-uppercase mb-2">About</h3>
      <p className="text-muted mb-0">Version {APP_VERSION}</p>
    </div>
  );
}

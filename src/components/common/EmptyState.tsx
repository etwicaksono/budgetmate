/**
 * Reusable Empty State Component
 * Following DRY and SRP - single, reusable empty state component
 */

import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon = '📋',
  title,
  description,
  action
}: EmptyStateProps): React.ReactElement {
  return (
    <div className="p-12 text-center">
      <span className="text-6xl mb-4 block">{icon}</span>
      <p className="text-gray-600 mb-2 font-medium">{title}</p>
      {description && (
        <p className="text-sm text-gray-400 mt-2">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

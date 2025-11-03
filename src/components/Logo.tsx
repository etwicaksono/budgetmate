'use client';

import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export default function Logo({ size = 'medium', showText = true }: LogoProps) {
  const dimensions = {
    small: { width: 32, height: 32, fontSize: '1.25rem' },
    medium: { width: 40, height: 40, fontSize: '1.5rem' },
    large: { width: 64, height: 64, fontSize: '2rem' },
  };

  const { width, height, fontSize } = dimensions[size];

  return (
    <Link href="/" className="d-flex align-items-center text-decoration-none">
      <div className="position-relative" style={{ width, height }}>
        {/* Using a placeholder SVG as logo - replace with actual logo */}
        <svg
          width={width}
          height={height}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-primary"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="3"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M8 12h8M12 8v8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="8" cy="8" r="1" fill="currentColor" />
          <circle cx="16" cy="8" r="1" fill="currentColor" />
          <circle cx="8" cy="16" r="1" fill="currentColor" />
          <circle cx="16" cy="16" r="1" fill="currentColor" />
        </svg>
      </div>
      {showText && (
        <span 
          className="ms-2 fw-bold text-primary"
          style={{ fontSize }}
        >
          Finance
        </span>
      )}
    </Link>
  );
}

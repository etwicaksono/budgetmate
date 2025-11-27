'use client';

import React from 'react';
import { Nav } from 'react-bootstrap';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import './Sidebar.css';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Transactions', href: '/transactions', icon: '💳' },
  { name: 'Accounts', href: '/accounts', icon: '🏦' },
  { name: 'Categories', href: '/categories', icon: '📁' },
  { name: 'Transfers', href: '/transfers', icon: '🔄' },
  { name: 'Analytics', href: '/analytics', icon: '📈' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function Sidebar(): React.ReactElement {
  const pathname = usePathname();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="d-flex align-items-center justify-content-center">
          <Image
            src="/images/logo-image-only.svg"
            alt="Finance App"
            width={40}
            height={40}
            className="me-2"
          />
          <h4 className="mb-0 text-white">Finance App</h4>
        </div>
      </div>
      
      <Nav className="sidebar-nav flex-column">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Nav.Item key={item.name}>
              <Link
                href={item.href}
                className={`nav-link sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-text">{item.name}</span>
              </Link>
            </Nav.Item>
          );
        })}
      </Nav>

      <div className="sidebar-footer">
        <small>&copy; 2025 Finance App</small>
      </div>
    </div>
  );
}

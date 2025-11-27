'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Button, Container, Dropdown, Offcanvas } from 'react-bootstrap';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FaBars, FaBug, FaCog, FaPlus, FaQuestionCircle, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { useTransaction } from '@/contexts/TransactionContext';
import './Header.css';
import Image from 'next/image';

interface NavigationLink {
  to: string;
  label: string;
  exact?: boolean;
}

export default function Header(): React.ReactElement {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const { user, logout } = useAuth();
  const { openAddModal } = useTransaction();

  const handleClose = useCallback(() => {
    setShowSidebar(false);
  }, []);

  const handleShow = useCallback(() => {
    setShowSidebar(true);
  }, []);

  const navigationLinks = useMemo(
    (): NavigationLink[] => [
      { to: '/dashboard', label: 'Dashboard', exact: true },
      { to: '/accounts', label: 'Accounts' },
      { to: '/transactions', label: 'Transactions' },
      { to: '/analytics', label: 'Analytics' },
      { to: '/categories', label: 'Budgets' },
      { to: '/settings', label: 'Reports' },
    ],
    []
  );

  const displayName = user?.full_name || user?.username || 'User';
  
  const profileInitials = useMemo((): string => {
    const [first = '', second = ''] = displayName.split(' ');
    return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
  }, [displayName]);

  const isActiveLink = useCallback(
    (path: string, exact = false): boolean => {
      // Settings page should not highlight any nav link
      if (pathname === '/settings') {
        return false;
      }
      
      if (exact) {
        return pathname === path;
      }
      if (path === '/dashboard') {
        return pathname === '/dashboard';
      }
      return pathname.startsWith(path);
    },
    [pathname]
  );

  const handleRecordClick = useCallback((): void => {
    openAddModal();
    setShowSidebar(false);
  }, [openAddModal]);

  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, router]);

  return (
    <header className="app-header">
      <Container fluid className="app-header__container">
        <div className="app-header__left">
          <Link href="/dashboard" className="app-header__brand" onClick={handleClose}>
            <span className="app-header__brand-icon">
              <Image 
              src="/images/logo-image-only.svg" 
              alt="Wallet logo" 
              width={40}
              height={40}
              className="app-header__brand-logo" 
            />
            </span>
            <span className="app-header__brand-text d-none d-md-inline">Finance App</span>
          </Link>

          <nav className="app-header__nav d-none d-lg-flex">
            {navigationLinks.map(({ to, label, exact = false }) => (
              <Link
                key={to}
                href={to}
                className={`app-header__link ${
                  isActiveLink(to, exact) ? 'app-header__link--active' : ''
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="app-header__right">
          <Button
            variant="success"
            className="app-header__record-btn"
            onClick={handleRecordClick}
          >
            <FaPlus className="me-2" size={12} />
            Record
          </Button>

          <Dropdown className="d-none d-lg-flex">
            <Dropdown.Toggle as="div" className="app-header__profile" bsPrefix="app-header">
              <div className="app-header__avatar" aria-hidden="true">
                {profileInitials}
              </div>
              <div className="app-header__profile-details">
                <span className="app-header__profile-name">{displayName}</span>
                <span className="app-header__profile-status">{user?.email}</span>
              </div>
            </Dropdown.Toggle>

            <Dropdown.Menu align="end">
              <Dropdown.Item onClick={() => router.push('/settings')}>
                <span className="d-flex align-items-center">
                  <FaCog className="me-2" size={14} />
                  Settings
                </span>
              </Dropdown.Item>
              <Dropdown.Item>
                <span className="d-flex align-items-center">
                  <FaQuestionCircle className="me-2" size={14} />
                  Help
                </span>
              </Dropdown.Item>
              <Dropdown.Item>
                <span className="d-flex align-items-center">
                  <FaBug className="me-2" size={14} />
                  Report a bug
                </span>
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item className="text-danger" onClick={handleLogout}>
                <span className="d-flex align-items-center">
                  <FaSignOutAlt className="me-2" size={14} />
                  Log out
                </span>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>

          <Button
            variant="link"
            className="app-header__menu-btn d-lg-none"
            onClick={handleShow}
          >
            <FaBars size={20} />
          </Button>
        </div>
      </Container>

      <Offcanvas
        show={showSidebar}
        onHide={handleClose}
        placement="end"
        className="sidebar-offcanvas"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Finance App</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="app-header__mobile-profile">
            <div className="app-header__avatar app-header__avatar--lg" aria-hidden="true">
              {profileInitials}
            </div>
            <div className="app-header__profile-details">
              <span className="app-header__profile-name">{displayName}</span>
              <span className="app-header__profile-status">{user?.email}</span>
            </div>
          </div>

          <nav className="app-header__mobile-nav">
            {navigationLinks.map(({ to, label, exact = false }) => (
              <Button
                key={to}
                variant="link"
                className={`app-header__mobile-link ${
                  isActiveLink(to, exact) ? 'app-header__mobile-link--active' : ''
                }`}
                onClick={() => {
                  router.push(to);
                  handleClose();
                }}
              >
                {label}
              </Button>
            ))}
          </nav>

          <Button
            variant="success"
            className="app-header__mobile-record"
            onClick={handleRecordClick}
          >
            <FaPlus className="me-2" size={12} />
            Record Transaction
          </Button>
        </Offcanvas.Body>
      </Offcanvas>
    </header>
  );
}

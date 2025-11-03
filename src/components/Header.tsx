import React, { createElement, useCallback, useMemo, useState } from 'react';
import { Button, Container, Dropdown, Offcanvas } from 'react-bootstrap';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FaBars, FaBug, FaChevronDown, FaCog, FaPlus, FaQuestionCircle, FaSignOutAlt } from 'react-icons/fa';
import { useTransactionModal } from '../context/TransactionModalContext';
import { useAuth } from '../context/AuthContext';
import type { IconBaseProps, IconType } from 'react-icons';

type NavigationLink = {
  to: string;
  label: string;
  exact?: boolean;
};

type UserProfile = {
  name: string;
  status: string;
};

type TransactionModalContextValue = {
  openTransactionModal: () => void;
};

type AuthContextValue = {
  logout: () => Promise<void>;
};

type IconRenderable = IconType | React.ComponentType<IconBaseProps>;

const renderIcon = (IconComponent: IconRenderable, props: IconBaseProps = {}): React.ReactNode =>
  createElement(IconComponent as React.ComponentType<IconBaseProps>, props);

const Header: React.FC = () => {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const { openTransactionModal } = useTransactionModal() as TransactionModalContextValue;
  const { logout } = useAuth() as AuthContextValue;

  const handleClose = useCallback(() => setShowSidebar(false), []);
  const handleShow = useCallback(() => setShowSidebar(true), []);

  const navigationLinks = useMemo(
    (): NavigationLink[] => [
      { to: '/', label: 'Dashboard', exact: true },
      { to: '/accounts', label: 'Accounts' },
      { to: '/transactions', label: 'Transactions' },
      { to: '/budgets', label: 'Budgets' },
      { to: '/reports', label: 'Reports' },
    ],
    []
  );

  const userProfile = useMemo(
    (): UserProfile => ({
      name: 'Eko Teguh Wicaksono',
      status: 'Premium',
    }),
    []
  );

  const profileInitials = useMemo((): string => {
    const [first = '', second = ''] = userProfile.name.split(' ');
    return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
  }, [userProfile.name]);

  const isActiveLink = useCallback(
    (path: string, exact = false): boolean => {
      if (exact) {
        return pathname === path;
      }
      if (path === '/') {
        return pathname === '/';
      }
      return pathname.startsWith(path);
    },
    [pathname]
  );

  const handleRecordClick = useCallback((): void => {
    openTransactionModal();
    setShowSidebar(false);
  }, [openTransactionModal]);

  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Logout failed:', error);
    }
  }, [logout, router]);

  return (
    <header className="app-header">
      <Container className="app-header__container">
        <div className="app-header__left">
          <Link href="/" className="app-header__brand" onClick={handleClose}>
            <span className="app-header__brand-icon">
              <img src="/images/logo-image-only.svg" alt="Wallet logo" className="app-header__brand-logo" />
            </span>
          </Link>

          <nav className="app-header__nav d-none d-lg-flex">
            {navigationLinks.map(({ to, label, exact = false }) => (
              <Link
                key={to}
                href={to}
                className={`app-header__link ${isActiveLink(to, exact) ? 'app-header__link--active' : ''
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
            {renderIcon(FaPlus, { className: 'me-2', size: 12 })}
            Record
          </Button>

          <Dropdown className="d-none d-lg-flex">
            <Dropdown.Toggle as="div" className="app-header__profile" bsPrefix="app-header">
              <div className="app-header__avatar" aria-hidden="true">
                {profileInitials}
              </div>
              <div className="app-header__profile-details">
                <span className="app-header__profile-name">{userProfile.name}</span>
                <span className="app-header__profile-status">{userProfile.status}</span>
              </div>
              {renderIcon(FaChevronDown, { className: 'app-header__profile-caret', size: 14 })}
            </Dropdown.Toggle>

            <Dropdown.Menu align="end">
              <Dropdown.Item onClick={() => router.push('/settings')}>
                {renderIcon(FaCog, { className: 'me-2', size: 14 })}
                Settings
              </Dropdown.Item>
              <Dropdown.Item>
                {renderIcon(FaQuestionCircle, { className: 'me-2', size: 14 })}
                Help
              </Dropdown.Item>
              <Dropdown.Item>
                {renderIcon(FaBug, { className: 'me-2', size: 14 })}
                Report a bug
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item className="text-danger" onClick={handleLogout}>
                {renderIcon(FaSignOutAlt, { className: 'me-2', size: 14 })}
                Log out
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>

          <Button
            variant="link"
            className="app-header__menu-btn d-lg-none"
            onClick={handleShow}
          >
            {renderIcon(FaBars, { size: 20 })}
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
          <Offcanvas.Title>Wallet</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="app-header__mobile-profile">
            <div className="app-header__avatar app-header__avatar--lg" aria-hidden="true">
              {profileInitials}
            </div>
            <div className="app-header__profile-details">
              <span className="app-header__profile-name">{userProfile.name}</span>
              <span className="app-header__profile-status">{userProfile.status}</span>
            </div>
          </div>

          <nav className="app-header__mobile-nav">
            {navigationLinks.map(({ to, label, exact = false }) => (
              <Button
                key={to}
                variant="link"
                className={`app-header__mobile-link ${isActiveLink(to, exact) ? 'app-header__mobile-link--active' : ''
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
            {renderIcon(FaPlus, { className: 'me-2', size: 12 })}
            Record Transaction
          </Button>
        </Offcanvas.Body>
      </Offcanvas>
    </header>
  );
};

export default Header;

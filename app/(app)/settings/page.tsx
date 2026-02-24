/**
 * Settings Page - Following SOLID, DRY, and KISS principles
 */

'use client';

import React, { useState } from 'react';
import { Container, Row, Col, Nav, Card } from 'react-bootstrap';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FaCog,
  FaCreditCard,
  FaTag,
  FaList,
  FaFileAlt,
  FaRobot,
  FaQuestionCircle,
  FaShieldAlt,
  FaGoogle,
  FaDatabase,
} from 'react-icons/fa';
import type { IconType } from 'react-icons';
import {
  CategoriesSection,
  TemplatesSection,
  LabelsSection,
  AutomaticRulesSection,
  GeneralSection,
  BillingSection,
  PrivacySection,
  HelpSection,
  GoogleSheetsSection,
  BackupSection,
} from './sections';
import './Settings.css';

// Section types
type SettingsSection =
  | 'currencies'
  | 'categories'
  | 'templates'
  | 'labels'
  | 'automatic-rules'
  | 'general'
  | 'billing'
  | 'privacy'
  | 'help'
  | 'google-sheets'
  | 'backup';

interface NavigationItem {
  id: SettingsSection;
  label: string;
  icon: IconType;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

// Navigation configuration
const navigationItems: NavigationSection[] = [
  {
    title: 'WALLET',
    items: [
      { id: 'categories', label: 'Categories', icon: FaList },
      { id: 'templates', label: 'Templates', icon: FaFileAlt },
      { id: 'labels', label: 'Labels', icon: FaTag },
      { id: 'automatic-rules', label: 'Automatic Rules', icon: FaRobot },
      { id: 'google-sheets', label: 'Google Sheets Sync', icon: FaGoogle },
    ],
  },
  {
    title: 'GENERAL',
    items: [
      { id: 'general', label: 'General', icon: FaCog },
      { id: 'billing', label: 'Billing', icon: FaCreditCard },
      { id: 'privacy', label: 'Personal data & privacy', icon: FaShieldAlt },
      { id: 'help', label: 'Help', icon: FaQuestionCircle },
      { id: 'backup', label: 'Backup & Restore', icon: FaDatabase },
    ],
  },
];

// Validate section parameter
const isValidSection = (value: string | null): value is SettingsSection => {
  if (!value) return false;
  const validSections: SettingsSection[] = [
    'categories',
    'templates',
    'labels',
    'automatic-rules',
    'general',
    'billing',
    'privacy',
    'help',
    'google-sheets',
    'backup',
  ];
  return validSections.includes(value as SettingsSection);
};

export default function SettingsPage(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial section from URL or default to 'categories'
  const sectionParam = searchParams.get('section');
  const initialSection: SettingsSection = isValidSection(sectionParam) ? sectionParam : 'categories';

  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);

  const handleSectionChange = (section: SettingsSection): void => {
    setActiveSection(section);
    router.replace(`/settings?section=${section}`, { scroll: false });
  };

  return (
    <Container fluid>
      <Row className="g-3">
        {/* Sidebar */}
        <Col lg={3} className="mb-2 d-lg-block">
          <Card>
            <Card.Header>
              <h1 className="settings-title mb-0">Settings</h1>
            </Card.Header>
            <Card.Body className="p-0 pt-2">
              <Nav className="flex-column">
                {navigationItems.map((section) => (
                  <div key={section.title} className="settings-nav-section">
                    <div className="settings-nav-title">{section.title}</div>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Nav.Link
                          key={item.id}
                          className={`settings-nav-link ${activeSection === item.id ? 'active' : ''}`}
                          onClick={() => handleSectionChange(item.id)}
                        >
                          <Icon className="settings-nav-icon" />
                          {item.label}
                        </Nav.Link>
                      );
                    })}
                  </div>
                ))}
              </Nav>
            </Card.Body>
          </Card>
        </Col>

        {/* Main Content */}
        <Col lg={9}>
          <Card>
            <Card.Body className="settings-section-content">
              {activeSection === 'categories' && <CategoriesSection />}
              {activeSection === 'templates' && <TemplatesSection />}
              {activeSection === 'labels' && <LabelsSection />}
              {activeSection === 'automatic-rules' && <AutomaticRulesSection />}
              {activeSection === 'google-sheets' && <GoogleSheetsSection />}
              {activeSection === 'general' && <GeneralSection />}
              {activeSection === 'billing' && <BillingSection />}
              {activeSection === 'privacy' && <PrivacySection />}
              {activeSection === 'help' && <HelpSection />}
              {activeSection === 'backup' && <BackupSection />}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

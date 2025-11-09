import React, { useState } from 'react';
// TODO: Consolidate settings navigation once modules are modernized.
import type { ComponentType } from 'react';
import type { IconType } from 'react-icons';
import { Container, Row, Col, Nav, Card } from 'react-bootstrap';
import {
   FaCog,
   FaCreditCard,
   FaTag,
   FaList,
   FaFileAlt,
   FaRobot,
   FaQuestionCircle,
   FaShieldAlt,
   FaDollarSign,
} from 'react-icons/fa';
import Currencies from './Currencies';
import Categories from './Categories';
import Templates from './Templates';
import './Settings.css';

type SettingsSection =
   | 'currencies'
   | 'categories'
   | 'templates'
   | 'labels'
   | 'automatic-rules'
   | 'general'
   | 'billing'
   | 'privacy'
   | 'help';

type IconComponent = ComponentType<{ className?: string }>;

const toIconComponent = (icon: IconType): IconComponent =>
   icon as unknown as IconComponent;

interface NavigationItem {
   id: SettingsSection;
   label: string;
    icon: IconComponent;
}

interface NavigationSection {
   title: string;
   items: NavigationItem[];
}

const navigationItems: NavigationSection[] = [
      {
         title: 'WALLET',
         items: [
            { id: 'currencies', label: 'Currencies', icon: toIconComponent(FaDollarSign) },
            { id: 'categories', label: 'Categories', icon: toIconComponent(FaList) },
            { id: 'templates', label: 'Templates', icon: toIconComponent(FaFileAlt) },
            { id: 'labels', label: 'Labels', icon: toIconComponent(FaTag) },
            { id: 'automatic-rules', label: 'Automatic Rules', icon: toIconComponent(FaRobot) },
         ],
      },
      {
         title: 'GENERAL',
         items: [
            { id: 'general', label: 'General', icon: toIconComponent(FaCog) },
            { id: 'billing', label: 'Billing', icon: toIconComponent(FaCreditCard) },
            { id: 'privacy', label: 'Personal data & privacy', icon: toIconComponent(FaShieldAlt) },
            { id: 'help', label: 'Help', icon: toIconComponent(FaQuestionCircle) },
         ],
      },
];

const Settings: React.FC = () => {
   const [activeSection, setActiveSection] = useState<SettingsSection>('currencies');

   return (
      <Container className="transactions-page">
         <Row className="align-items-stretch">
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
                                       onClick={() => setActiveSection(item.id)}
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
            <Col lg={9}>
               <Card>
                  <Card.Body>
                     {activeSection === 'currencies' && <Currencies />}
                     {activeSection === 'categories' && <Categories />}
                     {activeSection === 'templates' && <Templates />}
                     {activeSection === 'labels' && <div>Labels content coming soon</div>}
                     {activeSection === 'automatic-rules' && <div>Automatic Rules content coming soon</div>}
                     {activeSection === 'general' && <div>General Settings content coming soon</div>}
                     {activeSection === 'billing' && <div>Billing content coming soon</div>}
                     {activeSection === 'privacy' && <div>Personal data & privacy content coming soon</div>}
                     {activeSection === 'help' && <div>Help content coming soon</div>}
                  </Card.Body>
               </Card>
            </Col>
         </Row>
      </Container>
   );
};

export default Settings;

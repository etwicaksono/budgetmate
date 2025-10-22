import React, { useState } from 'react';
import { Container, Row, Col, Nav, Card } from 'react-bootstrap';
import { FaCog, FaCreditCard, FaTag, FaList, FaFileAlt, FaRobot, FaQuestionCircle, FaShieldAlt, FaDollarSign } from 'react-icons/fa';
import Currencies from './Currencies';
import Categories from './Categories';
import Templates from './Templates';
import './Settings.css';

const Settings = () => {
   const [activeSection, setActiveSection] = useState('currencies');

   const navigationItems = [
      {
         title: 'WALLET',
         items: [
            { id: 'currencies', label: 'Currencies', icon: FaDollarSign },
            { id: 'categories', label: 'Categories', icon: FaList },
            { id: 'templates', label: 'Templates', icon: FaFileAlt },
            { id: 'labels', label: 'Labels', icon: FaTag },
            { id: 'automatic-rules', label: 'Automatic Rules', icon: FaRobot },
         ],
      },
      {
         title: 'GENERAL',
         items: [
            { id: 'general', label: 'General', icon: FaCog },
            { id: 'billing', label: 'Billing', icon: FaCreditCard },
            { id: 'privacy', label: 'Personal data & privacy', icon: FaShieldAlt },
            { id: 'help', label: 'Help', icon: FaQuestionCircle },
         ],
      },
   ];

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
                              {section.items.map((item) => (
                                 <Nav.Link
                                    key={item.id}
                                    className={`settings-nav-link ${activeSection === item.id ? 'active' : ''}`}
                                    onClick={() => setActiveSection(item.id)}
                                 >
                                    <item.icon className="settings-nav-icon" />
                                    {item.label}
                                 </Nav.Link>
                              ))}
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
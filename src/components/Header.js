import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header>
      <Navbar bg="primary" variant="dark" expand="lg" className="py-3">
        <Container>
          <Link to="/" className="navbar-brand">FinanceApp</Link>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Link to="/" className="nav-link">Dashboard</Link>
              <Link to="/transactions" className="nav-link">Transactions</Link>
              <Link to="/budgets" className="nav-link">Budgets</Link>
              <Link to="/reports" className="nav-link">Reports</Link>
            </Nav>
            <Nav>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/signup" className="nav-link">Sign Up</Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  );
};

export default Header;
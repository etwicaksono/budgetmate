import React from 'react';
import { Container } from 'react-bootstrap';
import { Routes, Route, Outlet } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Signup from './pages/Signup';
import Transactions from './pages/transactions';
import Budgets from './pages/Budgets';
import Reports from './pages/Reports';
import Accounts from './pages/Accounts';
import Settings from './pages/settings/Settings';
import PrivateRoute from './components/PrivateRoute';
import PublicRoute from './components/PublicRoute';
import { AuthProvider } from './context/AuthContext';
import './styles/App.css';
import { TransactionModalProvider } from './context/TransactionModalContext';

const MainLayout = () => (
  <TransactionModalProvider>
    <Header />
    <Container className="main-container">
      <Outlet />
    </Container>
  </TransactionModalProvider>
);

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          <Route path="/signup" element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          } />
          <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings/*" element={<Settings />} />
          </Route>
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
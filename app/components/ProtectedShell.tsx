'use client';
import React, { type ReactNode } from 'react';
import { Container } from 'react-bootstrap';
import Header from '../../src/components/Header';
import RequireAuth from '../RequireAuth';

type Props = { children: ReactNode };

export default function ProtectedShell({ children }: Props): JSX.Element {
  return (
    <RequireAuth>
      <Header />
      <Container className="main-container">
        {children}
      </Container>
    </RequireAuth>
  );
}
'use client';

import React from 'react';
import { Card } from 'react-bootstrap';

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  icon, 
  label, 
  value, 
  valueColor = '#212529' 
}) => {
  return (
    <Card className="stat-card h-100">
      <Card.Body className="d-flex align-items-center">
        <div className="stat-card__icon me-3">
          <span style={{ fontSize: '2rem' }}>{icon}</span>
        </div>
        <div className="stat-card__content flex-grow-1">
          <div className="stat-card__label">{label}</div>
          <div className="stat-card__value" style={{ color: valueColor }}>
            {value}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

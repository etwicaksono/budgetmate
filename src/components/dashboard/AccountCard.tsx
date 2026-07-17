'use client';

import React from 'react';
import { Card } from 'react-bootstrap';
import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';

interface AccountCardProps {
  name: string;
  balance: number;
  color: string;
  icon?: React.ComponentType<{ size?: number }>;
  onClick?: () => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  name,
  balance,
  color,
  onClick,
}) => {
  const { formatCurrency } = useFormattedCurrency();

  return (
    <Card
      className="h-100 account-card"
      style={{
        backgroundColor: color,
        borderColor: color,
        cursor: onClick ? 'pointer' : 'default'
      }}
      onClick={onClick}
    >
      <Card.Body className="account-card__body">
        <div className="account-card__details">
          <div className="account-card__name">{name}</div>
          <div className="account-card__balance">
            {formatCurrency(balance, {
              forceDecimals: Number.isInteger(balance) ? 0 : 2,
            })}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export const AddAccountCard: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  return (
    <Card
      className="h-100 add-account-card"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <Card.Body className="add-account-card__body">
        <span className="add-account-card__plus">+</span>
        <span className="add-account-card__text">Add Account</span>
      </Card.Body>
    </Card>
  );
};

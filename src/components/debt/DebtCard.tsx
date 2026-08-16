'use client';

import React from 'react';
import { Badge, ProgressBar, Row, Col, Dropdown } from 'react-bootstrap';
import {
  FaArrowCircleUp,
  FaArrowCircleDown,
  FaMoneyBillWave,
  FaPlusCircle,
  FaPencilAlt,
  FaTrash,
  FaWallet,
  FaEllipsisV
} from 'react-icons/fa';
import { format } from 'date-fns';
import { NumericFormat } from 'react-number-format';

import { Debt } from '@/services/debtService';
import { DebtStatus, DebtType } from '@prisma/client';
import { getIconComponent } from '@/utils/iconUtils';

interface DebtCardProps {
  debt: Debt;
  onIncreaseClick: (debt: Debt) => void;
  onRepayClick: (debt: Debt) => void;
  onDetailClick: (debt: Debt) => void;
  onEditClick: (debt: Debt) => void;
  onDeleteClick: (debt: Debt) => void;
}

export const DebtCard: React.FC<DebtCardProps> = ({
  debt,
  onIncreaseClick,
  onRepayClick,
  onDetailClick,
  onEditClick,
  onDeleteClick
}) => {
  const isLend = debt.type === DebtType.lend;
  const isActive = debt.status === DebtStatus.active;
  const isSettled = debt.status === DebtStatus.settled;

  const totalAmount = debt.amount || 0;
  const remainingAmount = debt.remaining_amount || 0;
  const repaidAmount = Math.max(0, totalAmount - remainingAmount);

  const progressPercent = totalAmount > 0
    ? Math.min(100, Math.round((repaidAmount / totalAmount) * 100))
    : 0;

  return (
    <div
      className={`debt-item ${!isActive ? 'debt-item-inactive' : ''}`}
      onClick={() => onDetailClick(debt)}
      style={{ cursor: 'pointer' }}
    >
      <Row className="align-items-center mb-2">
        <Col xs={12} md={6} className="d-flex align-items-center gap-2 mb-2 mb-md-0">
          <Badge
            bg={isLend ? 'danger' : 'success'}
            pill
            className="d-inline-flex align-items-center justify-content-center gap-1"
          >
            {isLend ? <FaArrowCircleUp size={10} /> : <FaArrowCircleDown size={10} />}
            {isLend ? 'LEND' : 'BORROW'}
          </Badge>
          <span className="fw-semibold fs-6 text-truncate">
            {debt.counterparty}
          </span>

          {/* Mobile 3-dots menu — inline at the far right of the first row */}
          <div className="debt-card-mobile-menu d-md-none" onClick={(e) => e.stopPropagation()}>
            <Dropdown align="end">
              <Dropdown.Toggle
                as="button"
                className="btn btn-link text-muted p-0 border-0 bg-transparent records-menu-toggle"
                id={`debt-menu-mobile-${debt.id}`}
                bsPrefix="records-menu"
                style={{ transform: 'rotate(90deg)' }}
              >
                <FaEllipsisV size={14} />
              </Dropdown.Toggle>
              <Dropdown.Menu style={{ zIndex: 1050 }}>
                {(isActive || isSettled) && (
                  <Dropdown.Item onClick={() => onIncreaseClick(debt)}>
                    <span className="d-flex align-items-center gap-2"><FaPlusCircle className="text-primary" size={13} />Increase</span>
                  </Dropdown.Item>
                )}
                {isActive && (
                  <Dropdown.Item onClick={() => onRepayClick(debt)}>
                    <span className="d-flex align-items-center gap-2"><FaMoneyBillWave className="text-success" size={13} />Repay</span>
                  </Dropdown.Item>
                )}

                {isActive && (
                  <Dropdown.Item onClick={() => onEditClick(debt)}>
                    <span className="d-flex align-items-center gap-2"><FaPencilAlt className="text-secondary" size={13} />Edit</span>
                  </Dropdown.Item>
                )}

                <Dropdown.Item className="text-danger" onClick={() => onDeleteClick(debt)}>
                  <span className="d-flex align-items-center gap-2"><FaTrash size={13} />Delete</span>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </Col>

        <Col xs={12} md={6} className="text-md-end text-start">
          <div className={`fw-bold ${isLend ? 'text-danger' : 'text-success'}`}>
            <NumericFormat
              value={remainingAmount}
              displayType={'text'}
              thousandSeparator={true}
              prefix="Rp "
              decimalScale={2}
            />
          </div>
          <div className="small text-muted">
            {isActive ? (
              <>
                {progressPercent}% of <NumericFormat
                  value={totalAmount}
                  displayType={'text'}
                  thousandSeparator={true}
                  prefix="Rp "
                  decimalScale={2}
                /> repaid
              </>
            ) : (
              <>
                <NumericFormat
                  value={totalAmount}
                  displayType={'text'}
                  thousandSeparator={true}
                  prefix="Rp "
                  decimalScale={2}
                /> • {isSettled ? 'Fully repaid' : 'Cancelled'}
              </>
            )}
          </div>
        </Col>
      </Row>

      <Row className="mb-2">
        <Col xs={12} md={6}>
          <div className="small text-muted d-flex align-items-center gap-1">
            {debt.account?.icon ? (
              <span>
                {(() => {
                  const IconComponent = getIconComponent(debt.account.icon);
                  return <IconComponent />;
                })()}
              </span>
            ) : (
              <FaWallet />
            )}
            <span className="text-truncate" style={{ maxWidth: '100px' }}>
              {debt.account?.name || 'Unknown Account'}
            </span>
            <span className="mx-1">•</span>
            <span>{format(new Date(debt.date), 'MMM dd, yyyy')}</span>
          </div>
          {debt.description && (
            <div className="small text-muted text-truncate mt-1" style={{ maxWidth: '300px' }}>
              {debt.description}
            </div>
          )}
          {Array.isArray(debt.labels) && debt.labels.length > 0 && (
            <div className="d-flex flex-wrap gap-1 mt-1">
              {debt.labels.map((label) => (
                <span
                  key={label.id}
                  className="badge text-uppercase text-truncate"
                  style={{
                    backgroundColor: label.color || '#6c757d',
                    color: '#fff',
                    fontSize: '0.6rem',
                    padding: '0.15rem 0.4rem',
                    fontWeight: '600',
                    maxWidth: '80px'
                  }}
                  title={label.name}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </Col>

        <Col xs={12} md={6} className="mt-2 mt-md-0 d-flex flex-column justify-content-center">
          {isActive ? (
            <ProgressBar
              variant={isLend ? "danger" : "success"}
              now={progressPercent}
              className="debt-progress w-100"
            />
          ) : (
            <div className="text-md-end">
              <Badge bg={isSettled ? "secondary" : "dark"}>
                {isSettled ? "SETTLED" : "CANCELLED"}
              </Badge>
            </div>
          )}
        </Col>
      </Row>

      {/* Desktop action buttons — vertical staggered overlay on hover */}
      <div
        className="debt-card-actions d-none d-md-flex"
        onClick={(e) => e.stopPropagation()}
      >
        {(isActive || isSettled) && (
          <button
            className="debt-action-btn text-primary"
            onClick={() => onIncreaseClick(debt)}
            title="Increase Debt"
          >
            <FaPlusCircle size={14} />
            <span>Increase</span>
          </button>
        )}
        {isActive && (
          <button
            className="debt-action-btn text-success"
            onClick={() => onRepayClick(debt)}
            title="Record Repayment"
          >
            <FaMoneyBillWave size={14} />
            <span>Repay</span>
          </button>
        )}
        {isActive && (
          <button
            className="debt-action-btn text-secondary"
            onClick={() => onEditClick(debt)}
            title="Edit Debt"
          >
            <FaPencilAlt size={14} />
            <span>Edit</span>
          </button>
        )}
        <button
          className="debt-action-btn text-danger"
          onClick={() => onDeleteClick(debt)}
          title="Delete Debt"
        >
          <FaTrash size={14} />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
};

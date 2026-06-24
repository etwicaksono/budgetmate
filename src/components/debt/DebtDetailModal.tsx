'use client';

import React from 'react';
import { Modal, Button, Badge, Row, Col, ProgressBar } from 'react-bootstrap';
import { format } from 'date-fns';
import { NumericFormat } from 'react-number-format';
import {
   FaArrowCircleUp,
   FaArrowCircleDown,
   FaMoneyBillWave,
   FaPlusCircle
} from 'react-icons/fa';

import { Debt } from '@/services/debtService';
import { DEBT_TYPES, DEBT_STATUSES } from '@/utils/constants';
import { getIconComponent } from '@/utils/iconUtils';

interface DebtDetailModalProps {
   show: boolean;
   onHide: () => void;
   debt: Debt | null;
   onIncreaseClick: (debt: Debt) => void;
   onRepayClick: (debt: Debt) => void;
   onDecreaseClick?: (debt: Debt) => void;
   onEditTransactionClick?: (debt: Debt, transaction: import('@/services/transactionService').Transaction, isIncrease: boolean) => void;
}

export const DebtDetailModal: React.FC<DebtDetailModalProps> = ({
   show,
   onHide,
   debt,
   onIncreaseClick,
   onRepayClick,
   onEditTransactionClick
}) => {
   if (!debt) return null;

   const isLend = debt.type === DEBT_TYPES.LEND;
   const isActive = debt.status === DEBT_STATUSES.ACTIVE;
   const isSettled = debt.status === DEBT_STATUSES.SETTLED;

   const decimalScale = 2;

   const totalAmount = debt.amount || 0;
   const remainingAmount = debt.remaining_amount || 0;
   const repaidAmount = Math.max(0, totalAmount - remainingAmount);

   const progressPercent = totalAmount > 0
      ? Math.min(100, Math.round((repaidAmount / totalAmount) * 100))
      : 0;

   let headerBadge = <Badge bg="success">ACTIVE</Badge>;
   if (isSettled) headerBadge = <Badge bg="secondary">SETTLED</Badge>;

   return (
      <Modal show={show} onHide={onHide} size="lg" centered scrollable>
         <Modal.Header closeButton>
            <Modal.Title className="d-flex align-items-center gap-2">
               Debt Details {headerBadge}
            </Modal.Title>
         </Modal.Header>
         <Modal.Body>
            <Row className="mb-4">
               <Col md={6}>
                  <div className="debt-detail-label">Type:</div>
                  <div className="debt-detail-value d-flex align-items-center gap-1">
                     <Badge bg={isLend ? 'danger' : 'success'} pill className="d-inline-flex align-items-center justify-content-center gap-1">
                        {isLend ? <FaArrowCircleUp size={12} /> : <FaArrowCircleDown size={12} />}
                        {isLend ? 'LEND' : 'BORROW'}
                     </Badge>
                  </div>

                  <div className="debt-detail-label mt-3">Account:</div>
                  <div className="debt-detail-value d-flex align-items-center gap-2">
                     {debt.account?.icon && (
                        <span>
                           {(() => {
                              const IconComponent = getIconComponent(debt.account.icon!);
                              return <IconComponent />;
                           })()}
                        </span>
                     )}
                     <span>{debt.account?.name || 'Unknown'}</span>
                  </div>

                  <div className="debt-detail-label mt-3">Total Amount:</div>
                  <div className={`debt-detail-value fs-5 ${isLend ? 'text-success' : 'text-danger'}`}>
                     <NumericFormat value={totalAmount} displayType="text" thousandSeparator prefix="Rp " decimalScale={decimalScale} />
                  </div>
               </Col>
               <Col md={6}>
                  <div className="debt-detail-label">Counterparty:</div>
                  <div className="debt-detail-value fs-6">{debt.counterparty}</div>

                  <div className="debt-detail-label mt-3">Date:</div>
                  <div className="debt-detail-value">{format(new Date(debt.date), 'MMM dd, yyyy HH:mm')}</div>

                  <div className="debt-detail-label mt-3">Remaining:</div>
                  <div className="debt-detail-value fs-5">
                     <NumericFormat value={remainingAmount} displayType="text" thousandSeparator prefix="Rp " decimalScale={decimalScale} />
                  </div>
               </Col>
               <Col xs={12} className="mt-2">
                  <div className="debt-detail-label">Description:</div>
                  <div className="debt-detail-value fw-normal">{debt.description || <span className="text-muted">No description provided</span>}</div>
               </Col>
            </Row>

            <div className="mb-4">
               <div className="d-flex justify-content-between small fw-semibold text-muted mb-1">
                  <span>Repaid: <NumericFormat value={repaidAmount} displayType="text" thousandSeparator prefix="Rp " decimalScale={decimalScale} /> of <NumericFormat value={totalAmount} displayType="text" thousandSeparator prefix="Rp " decimalScale={decimalScale} /> ({progressPercent}%)</span>
               </div>
               <ProgressBar
                  variant={isLend ? "success" : "danger"}
                  now={progressPercent}
                  style={{ height: '12px' }}
               />
            </div>

            <h6 className="fw-bold border-bottom pb-2 mb-3">Transaction History</h6>

            {(!debt.transactions || debt.transactions.length === 0) ? (
               <div className="text-center text-muted py-4 small">
                  No transactions recorded yet.
               </div>
            ) : (
               <div className="mt-3">
                  {[...debt.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => {
                     // Determine if this transaction is an increase or a repayment based on debt type
                     const isIncrease = (isLend && tx.type === 'debt_out') || (!isLend && tx.type === 'debt_in');
                     const txLabel = isIncrease ? 'Increase/Initial' : 'Repayment';
                     const txColorClass = isIncrease ? 'text-primary' : (!isLend ? 'text-danger' : 'text-success');
                     const displayAmountClass = isIncrease ? 'text-primary' : txColorClass;

                     return (
                        <div
                           key={tx.id}
                           className="repayment-timeline-item"
                           style={onEditTransactionClick ? { cursor: 'pointer' } : {}}
                           onClick={onEditTransactionClick ? () => onEditTransactionClick(debt, tx, isIncrease) : undefined}
                           title={onEditTransactionClick ? "Edit Transaction" : undefined}
                        >
                           <div className={`repayment-timeline-dot ${!isLend ? 'borrow' : ''}`} />
                           <Row className={onEditTransactionClick ? "hover-bg-light rounded p-1 transition-colors" : ""}>
                              <Col xs={7}>
                                 <div className="fw-semibold small">
                                    {format(new Date(tx.date), 'MMM dd, yyyy HH:mm')}
                                    <span className={`ms-2 badge bg-light ${txColorClass} border border-${isIncrease ? 'primary' : (!isLend ? 'danger' : 'success')}-subtle`}>
                                       {txLabel}
                                    </span>
                                 </div>
                                 <div className="small text-muted mt-1 d-flex align-items-center gap-1">
                                    {(() => {
                                       if (!tx.account?.icon) return null;
                                       const IconComponent = getIconComponent(tx.account.icon);
                                       return <span className="d-flex align-items-center"><IconComponent /></span>;
                                    })()} <span>{tx.account?.name}</span>
                                 </div>
                                 {tx.description && (
                                    <div className="small text-muted mt-1 fst-italic">"{tx.description}"</div>
                                 )}
                              </Col>
                              <Col xs={5} className={`text-end fw-bold align-self-center ${displayAmountClass}`}>
                                 {isIncrease ? '+' : '-'}<NumericFormat value={tx.amount} displayType="text" thousandSeparator prefix="Rp " decimalScale={decimalScale} />
                              </Col>
                           </Row>
                        </div>
                     );
                  })}
                  <div className="repayment-timeline-item border-left-0">
                     <div className="small text-muted fst-italic" style={{ marginLeft: '-16px' }}>
                        (End of history)
                     </div>
                  </div>
               </div>
            )}

         </Modal.Body>
         <Modal.Footer className="d-flex flex-column-reverse flex-md-row align-items-stretch align-items-md-center gap-2">
            <Button variant="secondary" onClick={onHide} className="me-md-auto">
               Close
            </Button>
            {(isActive || isSettled) && (
               <Button variant="outline-primary" onClick={() => onIncreaseClick(debt)} className="d-flex align-items-center justify-content-center">
                  <FaPlusCircle className="me-2" /> Increase Debt
               </Button>
            )}
            {isActive && (
               <Button variant="success" onClick={() => onRepayClick(debt)} className="d-flex align-items-center justify-content-center">
                  <FaMoneyBillWave className="me-2" /> Record Repayment
               </Button>
            )}
         </Modal.Footer>
      </Modal>
   );
};

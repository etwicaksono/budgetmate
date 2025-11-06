'use client';

import React from 'react';
import { Card, Table } from 'react-bootstrap';

const TransactionListSkeleton: React.FC = () => {
  const SkeletonRow = () => (
    <tr>
      <td>
        <div className="skeleton-text mb-1" style={{ width: '60%' }}></div>
        <div className="skeleton-text small" style={{ width: '40%' }}></div>
      </td>
      <td>
        <div className="skeleton-badge" style={{ width: '60px' }}></div>
      </td>
      <td>
        <div className="skeleton-text" style={{ width: '80%' }}></div>
      </td>
      <td>
        <div className="skeleton-text" style={{ width: '70%' }}></div>
      </td>
      <td className="text-end">
        <div className="skeleton-text ms-auto" style={{ width: '80px' }}></div>
      </td>
      <td style={{ width: '50px' }}>
        <div className="skeleton-text" style={{ width: '20px', margin: '0 auto' }}></div>
      </td>
    </tr>
  );

  return (
    <Card>
      <Card.Body className="p-0">
        <Table responsive className="mb-0">
          <thead>
            <tr>
              <th>Description</th>
              <th>Type</th>
              <th>Category</th>
              <th>Account</th>
              <th className="text-end">Amount</th>
              <th style={{ width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, index) => (
              <SkeletonRow key={index} />
            ))}
          </tbody>
        </Table>
      </Card.Body>
      <style jsx>{`
        .skeleton-text {
          background: linear-gradient(
            90deg,
            #f0f0f0 25%,
            #e0e0e0 50%,
            #f0f0f0 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          height: 14px;
          border-radius: 4px;
        }
        
        .skeleton-text.small {
          height: 12px;
        }
        
        .skeleton-badge {
          background: linear-gradient(
            90deg,
            #f0f0f0 25%,
            #e0e0e0 50%,
            #f0f0f0 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          height: 20px;
          border-radius: 10px;
        }
        
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </Card>
  );
};

export default TransactionListSkeleton;

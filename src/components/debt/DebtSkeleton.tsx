import React from 'react';
import { Row, Col } from 'react-bootstrap';

export const DebtSkeleton: React.FC = () => {
  return (
    <div className="debt-skeleton w-100">
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        .skeleton-block {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }
      `}</style>
      
      <div className="debts-list">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="debt-item bg-white">
            <Row className="align-items-center mb-2">
              <Col xs={12} md={6} className="d-flex align-items-center gap-2 mb-2 mb-md-0">
                <div className="skeleton-block" style={{ width: '80px', height: '20px', borderRadius: '50rem' }} />
                <div className="skeleton-block" style={{ width: '130px', height: '20px' }} />
              </Col>
              
              <Col xs={12} md={6} className="text-md-end text-start">
                <div className="skeleton-block ms-md-auto" style={{ width: '110px', height: '24px' }} />
                <div className="skeleton-block ms-md-auto mt-2" style={{ width: '160px', height: '14px' }} />
              </Col>
            </Row>

            <Row className="mb-2">
              <Col xs={12} md={6}>
                <div className="d-flex align-items-center gap-2">
                  <div className="skeleton-block rounded-circle" style={{ width: '16px', height: '16px' }} />
                  <div className="skeleton-block" style={{ width: '100px', height: '14px' }} />
                  <span className="text-muted mx-1 opacity-25">•</span>
                  <div className="skeleton-block" style={{ width: '90px', height: '14px' }} />
                </div>
                <div className="skeleton-block mt-2" style={{ width: '250px', height: '14px' }} />
              </Col>
              
              <Col xs={12} md={6} className="mt-3 mt-md-0 d-flex flex-column justify-content-center">
                <div className="d-flex align-items-center gap-2">
                  <div className="flex-grow-1">
                    <div className="skeleton-block" style={{ height: '16px', width: '100%' }} />
                  </div>
                  <div className="skeleton-block" style={{ width: '60px', height: '16px' }} />
                </div>
              </Col>
            </Row>
          </div>
        ))}
      </div>
    </div>
  );
};

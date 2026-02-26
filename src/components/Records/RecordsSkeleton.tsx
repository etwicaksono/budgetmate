import React from 'react';
import { Card } from 'react-bootstrap';

export const RecordsSkeleton: React.FC = () => {
  return (
    <div className="records-skeleton p-0 w-100">
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
      
      {/* Header Skeleton */}
      <div 
        className="border-bottom bg-white px-3 py-3 d-flex justify-content-between align-items-center flex-wrap gap-3"
        style={{ position: 'sticky', top: '65px', zIndex: 1020 }}
      >
        <div className="d-flex align-items-center gap-3">
          <div className="skeleton-block" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
          <div className="skeleton-block" style={{ width: '150px', height: '20px' }} />
        </div>
        <div className="skeleton-block" style={{ width: '120px', height: '24px' }} />
      </div>

      <div className="p-3">
        {/* Day 1 Skeleton */}
        <div className="mb-4">
          <div className="d-flex justify-content-between mb-2 px-2">
             <div className="skeleton-block" style={{ width: '120px', height: '20px' }} />
             <div className="skeleton-block" style={{ width: '100px', height: '20px' }} />
          </div>
          <hr className="my-2 border-secondary" style={{ opacity: 0.1 }} />
          {[1, 2, 3].map(i => (
            <Card key={i} className="mb-2 shadow-sm border-0">
              <Card.Body className="p-3 d-flex align-items-center gap-3">
                <div className="skeleton-block" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
                <div className="skeleton-block rounded-circle" style={{ width: '40px', height: '40px', flexShrink: 0 }} />
                <div className="skeleton-block d-none d-sm-block" style={{ width: '150px', height: '20px' }} />
                <div className="skeleton-block d-none d-md-block" style={{ width: '120px', height: '20px' }} />
                <div className="skeleton-block flex-grow-1" style={{ height: '20px', minWidth: '50px' }} />
                <div className="ms-auto d-flex flex-column align-items-end gap-2">
                  <div className="skeleton-block" style={{ width: '80px', height: '20px' }} />
                  <div className="skeleton-block" style={{ width: '50px', height: '14px' }} />
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
        
        {/* Day 2 Skeleton */}
        <div className="mb-4">
          <div className="d-flex justify-content-between mb-2 px-2">
             <div className="skeleton-block" style={{ width: '100px', height: '20px' }} />
             <div className="skeleton-block" style={{ width: '90px', height: '20px' }} />
          </div>
          <hr className="my-2 border-secondary" style={{ opacity: 0.1 }} />
          {[4, 5].map(i => (
            <Card key={i} className="mb-2 shadow-sm border-0">
              <Card.Body className="p-3 d-flex align-items-center gap-3">
                <div className="skeleton-block" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
                <div className="skeleton-block rounded-circle" style={{ width: '40px', height: '40px', flexShrink: 0 }} />
                <div className="skeleton-block d-none d-sm-block" style={{ width: '130px', height: '20px' }} />
                <div className="skeleton-block d-none d-md-block" style={{ width: '100px', height: '20px' }} />
                <div className="skeleton-block flex-grow-1" style={{ height: '20px', minWidth: '50px' }} />
                <div className="ms-auto d-flex flex-column align-items-end gap-2">
                  <div className="skeleton-block" style={{ width: '90px', height: '20px' }} />
                  <div className="skeleton-block" style={{ width: '60px', height: '14px' }} />
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

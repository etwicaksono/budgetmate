import React, { useState } from 'react';
// TODO: Rebuild analytics sidebar with finalized filter interactions.
import { Form, Accordion } from 'react-bootstrap';
import { FaFilter, FaSearch, FaWallet, FaTags, FaTag, FaDollarSign, FaExchangeAlt, FaCheckCircle } from 'react-icons/fa';

const AnalyticsSidebar: React.FC = () => {
  const [amountRange, setAmountRange] = useState<[number, number]>([0, 20000000]);

  return (
    <div className="analytics-sidebar">
      <div className="filter-section mb-4">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h6 className="mb-0 text-muted small">
            <FaFilter className="me-2" />
            My filter
          </h6>
          <span className="text-muted" style={{ fontSize: '12px', cursor: 'pointer' }}>ⓘ</span>
        </div>
        <div className="position-relative">
          <Form.Select size="sm" className="text-muted">
            <option>Select filter</option>
          </Form.Select>
          <span className="position-absolute end-0 top-50 translate-middle-y me-4" style={{ fontSize: '12px', cursor: 'pointer' }}>⊕</span>
        </div>
      </div>

      <div className="filter-section mb-4">
        <h6 className="mb-2 small">
          <FaSearch className="me-2" />
          Search
        </h6>
        <Form.Control size="sm" type="text" placeholder="Search" />
      </div>

      <div className="filter-section mb-4">
        <h6 className="mb-2 small">
          <FaWallet className="me-2" />
          Accounts
        </h6>
        <Form.Select size="sm">
          <option>All accounts</option>
        </Form.Select>
      </div>

      <div className="filter-section mb-4">
        <h6 className="mb-2 small">
          <FaTags className="me-2" />
          Categories
        </h6>
        <Form.Select size="sm">
          <option>All categories</option>
        </Form.Select>
      </div>

      <div className="filter-section mb-4">
        <h6 className="mb-2 small">
          <FaTag className="me-2" />
          Labels
        </h6>
        <Form.Select size="sm">
          <option>All</option>
        </Form.Select>
      </div>

      <div className="filter-section mb-4">
        <h6 className="mb-2 small">
          <FaDollarSign className="me-2" />
          Currencies
        </h6>
        <Form.Select size="sm">
          <option>All Currencies</option>
        </Form.Select>
      </div>

      <div className="filter-section mb-4">
        <h6 className="mb-2 small">
          <FaExchangeAlt className="me-2" />
          Record types
        </h6>
        <Form.Select size="sm">
          <option>All Record types</option>
        </Form.Select>
      </div>

      <div className="filter-section mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0 small">Amount range</h6>
          <span className="text-muted small">IDR</span>
        </div>
        <p className="text-muted small mb-2" style={{ fontSize: '11px' }}>Absolute amount in referential currency</p>
        <div className="mb-3">
          <Form.Range
            min={0}
            max={20000000}
            step={100000}
            value={amountRange[1]}
            onChange={(e) => setAmountRange([amountRange[0], parseInt(e.target.value)])}
          />
          <div className="d-flex justify-content-between small text-muted mt-1">
            <span>IDR 0</span>
            <span>IDR 20,000,000</span>
          </div>
        </div>
        <div className="row g-2">
          <div className="col-6">
            <Form.Control
              type="number"
              size="sm"
              value={amountRange[0]}
              onChange={(e) => setAmountRange([parseInt(e.target.value), amountRange[1]])}
              placeholder="0"
            />
          </div>
          <div className="col-6">
            <Form.Control
              type="number"
              size="sm"
              value={amountRange[1]}
              onChange={(e) => setAmountRange([amountRange[0], parseInt(e.target.value)])}
              placeholder="20,000,000"
            />
          </div>
        </div>
      </div>

      <div className="filter-section mb-4">
        <h6 className="mb-2 small">
          <FaExchangeAlt className="me-2" />
          Transfers
        </h6>
        <Form.Select size="sm">
          <option>Include transfers</option>
        </Form.Select>
      </div>

      <div className="filter-section mb-4">
        <h6 className="mb-2 small">
          <FaCheckCircle className="me-2" />
          Record States
        </h6>
      </div>
    </div>
  );
};

export default AnalyticsSidebar;

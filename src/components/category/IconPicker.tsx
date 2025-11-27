import React, { useState, useMemo } from 'react';
import { Form, InputGroup, Row, Col } from 'react-bootstrap';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { Icon } from '@/utils/iconResolver';

// Common icons for categories
const CATEGORY_ICONS = [
  // Income
  'FaDollarSign', 'FaBriefcase', 'FaCoins', 'FaChartLine', 'FaStore',
  'FaGift', 'FaUndo', 'FaTag', 'FaPercentage', 'FaChartPie',
  
  // Food & Drinks
  'FaUtensils', 'FaShoppingCart', 'FaConciergeBell', 'FaCoffee', 'FaTruck',
  'FaPizzaSlice', 'FaHamburger', 'FaAppleAlt', 'FaWineGlass', 'FaBeer',
  
  // Shopping
  'FaShoppingBag', 'FaTshirt', 'FaLaptop', 'FaHome', 'FaToiletPaper',
  'FaBaby', 'FaPaw', 'FaGift', 'FaSpa', 'FaPencilAlt',
  'FaBook', 'FaGamepad', 'FaMobileAlt', 'FaTv', 'FaHeadphones',
  
  // Housing
  'FaHome', 'FaKey', 'FaFileContract', 'FaBolt', 'FaWrench',
  'FaShieldAlt', 'FaHandshake', 'FaCouch', 'FaBed', 'FaLightbulb',
  
  // Transportation
  'FaBus', 'FaTrain', 'FaTaxi', 'FaSuitcase', 'FaPlane',
  'FaCar', 'FaGasPump', 'FaParking', 'FaOilCan', 'FaBicycle',
  'FaMotorcycle', 'FaShip', 'FaSubway', 'FaWalking',
  
  // Entertainment
  'FaFilm', 'FaTicketAlt', 'FaPalette', 'FaTv', 'FaDice',
  'FaMusic', 'FaGuitar', 'FaDrum', 'FaTheaterMasks', 'FaCamera',
  'FaFootballBall', 'FaBasketballBall', 'FaVolleyballBall',
  
  // Health & Wellness
  'FaUserMd', 'FaSpa', 'FaDumbbell', 'FaHeartbeat', 'FaPills',
  'FaStethoscope', 'FaSyringe', 'FaBandAid', 'FaHospital',
  
  // Education
  'FaGraduationCap', 'FaBook', 'FaBookReader', 'FaPencilAlt', 'FaChalkboard',
  'FaSchool', 'FaUniversity', 'FaCertificate',
  
  // Communication
  'FaPhone', 'FaMobileAlt', 'FaWifi', 'FaEnvelope', 'FaComments',
  'FaGlobe', 'FaSatellite',
  
  // Financial
  'FaChartPie', 'FaFileInvoiceDollar', 'FaHandHoldingUsd', 
  'FaMoneyCheckAlt', 'FaGavel', 'FaUserTie', 'FaCreditCard',
  'FaWallet', 'FaMoneyBill', 'FaPiggyBank', 'FaLandmark',
  
  // Investment
  'FaChartLine', 'FaChartArea', 'FaBuilding', 'FaGem',
  'FaMoneyBillWave', 'FaChartBar',
  
  // Other
  'FaEllipsisH', 'FaQuestion', 'FaExclamationTriangle', 'FaStar',
  'FaHeart', 'FaCloud', 'FaSun', 'FaMoon', 'FaBirthdayCake',
  'FaTree', 'FaLeaf', 'FaFire', 'FaSnowflake', 'FaUmbrella',
];

interface IconPickerProps {
  selectedIcon: string;
  onIconSelect: (iconName: string) => void;
  color?: string;
}

export const IconPicker: React.FC<IconPickerProps> = ({
  selectedIcon,
  onIconSelect,
  color = '#6c757d',
}) => {
  const [search, setSearch] = useState('');

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return CATEGORY_ICONS;
    
    const query = search.toLowerCase();
    return CATEGORY_ICONS.filter(icon => 
      icon.toLowerCase().includes(query)
    );
  }, [search]);

  return (
    <div>
      {/* Search */}
      <InputGroup className="mb-3">
        <InputGroup.Text>
          <FaSearch size={14} />
        </InputGroup.Text>
        <Form.Control
          type="text"
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="sm"
        />
        {search && (
          <InputGroup.Text
            onClick={() => setSearch('')}
            style={{ cursor: 'pointer' }}
          >
            <FaTimes size={14} />
          </InputGroup.Text>
        )}
      </InputGroup>

      {/* Selected Icon Preview */}
      <div className="mb-3 text-center">
        <div 
          className="d-inline-flex align-items-center justify-content-center"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '8px',
            backgroundColor: color,
            color: 'white',
          }}
        >
          <Icon name={selectedIcon} size={32} />
        </div>
        <div className="mt-2 small text-muted">{selectedIcon}</div>
      </div>

      {/* Icons Grid */}
      <div
        style={{
          maxHeight: '300px',
          overflowY: 'auto',
          border: '1px solid #dee2e6',
          borderRadius: '0.375rem',
          padding: '0.75rem',
        }}
      >
        {filteredIcons.length === 0 ? (
          <div className="text-center text-muted py-4">
            No icons found for "{search}"
          </div>
        ) : (
          <Row className="g-2">
            {filteredIcons.map((iconName) => (
              <Col key={iconName} xs={3} sm={2}>
                <div
                  onClick={() => onIconSelect(iconName)}
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    border: selectedIcon === iconName ? `2px solid ${color}` : '1px solid #dee2e6',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    backgroundColor: selectedIcon === iconName ? `${color}15` : 'transparent',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedIcon !== iconName) {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedIcon !== iconName) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  title={iconName}
                >
                  <Icon name={iconName} size={20} style={{ color }} />
                </div>
              </Col>
            ))}
          </Row>
        )}
      </div>

      <div className="mt-2 small text-muted text-center">
        {filteredIcons.length} icon{filteredIcons.length !== 1 ? 's' : ''} available
      </div>
    </div>
  );
};

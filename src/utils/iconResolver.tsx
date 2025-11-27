import React from 'react';
import * as FaIcons from 'react-icons/fa';

type IconComponent = React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>;

// Map of icon names to icon components
const iconMap: Record<string, IconComponent> = {
  // Account icons
  FaWallet: FaIcons.FaWallet,
  FaUniversity: FaIcons.FaUniversity,
  FaPiggyBank: FaIcons.FaPiggyBank,
  FaMoneyBill: FaIcons.FaMoneyBill,
  FaCreditCard: FaIcons.FaCreditCard,
  
  // Category icons - Food & Drinks
  FaUtensils: FaIcons.FaUtensils,
  FaShoppingCart: FaIcons.FaShoppingCart,
  FaConciergeBell: FaIcons.FaConciergeBell,
  FaCoffee: FaIcons.FaCoffee,
  FaTruck: FaIcons.FaTruck,
  
  // Category icons - Shopping
  FaShoppingBag: FaIcons.FaShoppingBag,
  FaTshirt: FaIcons.FaTshirt,
  FaLaptop: FaIcons.FaLaptop,
  FaHome: FaIcons.FaHome,
  FaToiletPaper: FaIcons.FaToiletPaper,
  FaBaby: FaIcons.FaBaby,
  FaPaw: FaIcons.FaPaw,
  FaGift: FaIcons.FaGift,
  FaSpa: FaIcons.FaSpa,
  FaPencilAlt: FaIcons.FaPencilAlt,
  FaBook: FaIcons.FaBook,
  FaGamepad: FaIcons.FaGamepad,
  
  // Category icons - Housing
  FaKey: FaIcons.FaKey,
  FaFileContract: FaIcons.FaFileContract,
  FaBolt: FaIcons.FaBolt,
  FaWrench: FaIcons.FaWrench,
  FaShieldAlt: FaIcons.FaShieldAlt,
  FaHandshake: FaIcons.FaHandshake,
  
  // Category icons - Transportation
  FaBus: FaIcons.FaBus,
  FaTrain: FaIcons.FaTrain,
  FaTaxi: FaIcons.FaTaxi,
  FaSuitcase: FaIcons.FaSuitcase,
  FaPlane: FaIcons.FaPlane,
  
  // Category icons - Vehicle
  FaCar: FaIcons.FaCar,
  FaGasPump: FaIcons.FaGasPump,
  FaParking: FaIcons.FaParking,
  FaOilCan: FaIcons.FaOilCan,
  
  // Category icons - Life & Entertainment
  FaFilm: FaIcons.FaFilm,
  FaUserMd: FaIcons.FaUserMd,
  FaDumbbell: FaIcons.FaDumbbell,
  FaTicketAlt: FaIcons.FaTicketAlt,
  FaGraduationCap: FaIcons.FaGraduationCap,
  FaPalette: FaIcons.FaPalette,
  FaUmbrellaBeach: FaIcons.FaUmbrellaBeach,
  FaTv: FaIcons.FaTv,
  FaHandHoldingHeart: FaIcons.FaHandHoldingHeart,
  FaDice: FaIcons.FaDice,
  FaWineGlass: FaIcons.FaWineGlass,
  FaBirthdayCake: FaIcons.FaBirthdayCake,
  
  // Category icons - Communication
  FaPhone: FaIcons.FaPhone,
  FaMobileAlt: FaIcons.FaMobileAlt,
  FaWifi: FaIcons.FaWifi,
  FaEnvelope: FaIcons.FaEnvelope,
  
  // Category icons - Financial
  FaChartPie: FaIcons.FaChartPie,
  FaFileInvoiceDollar: FaIcons.FaFileInvoiceDollar,
  FaHandHoldingUsd: FaIcons.FaHandHoldingUsd,
  FaMoneyCheckAlt: FaIcons.FaMoneyCheckAlt,
  FaGavel: FaIcons.FaGavel,
  FaUserTie: FaIcons.FaUserTie,
  
  // Category icons - Investments
  FaChartLine: FaIcons.FaChartLine,
  FaChartArea: FaIcons.FaChartArea,
  FaBuilding: FaIcons.FaBuilding,
  FaGem: FaIcons.FaGem,
  
  // Category icons - Income
  FaBriefcase: FaIcons.FaBriefcase,
  FaDollarSign: FaIcons.FaDollarSign,
  FaCoins: FaIcons.FaCoins,
  FaStore: FaIcons.FaStore,
  FaUndo: FaIcons.FaUndo,
  FaTag: FaIcons.FaTag,
  FaPercentage: FaIcons.FaPercentage,
  
  // Category icons - Others
  FaEllipsisH: FaIcons.FaEllipsisH,
  FaQuestion: FaIcons.FaQuestion,
  FaExclamationTriangle: FaIcons.FaExclamationTriangle,
};

/**
 * Resolves an icon name (string) to a React icon component
 * @param iconName - The name of the icon (e.g., "FaWallet")
 * @returns The icon component or null if not found
 */
export function resolveIcon(iconName: string | undefined): IconComponent | null {
  if (!iconName) return null;
  return iconMap[iconName] || null;
}

/**
 * Renders an icon from its name
 * @param iconName - The name of the icon
 * @param props - Props to pass to the icon component
 */
export function Icon({ 
  name, 
  size = 16, 
  className, 
  style 
}: { 
  name: string | undefined; 
  size?: number; 
  className?: string;
  style?: React.CSSProperties;
}) {
  const IconComponent = resolveIcon(name);
  
  if (!IconComponent) {
    return null;
  }
  
  const props: { size: number; className?: string; style?: React.CSSProperties } = { size };
  if (className) props.className = className;
  if (style) props.style = style;
  
  return <IconComponent {...props} />;
}

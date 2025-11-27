import * as FaIcons from 'react-icons/fa';
import type { IconType } from 'react-icons';

/**
 * Get React Icon component by name
 * Falls back to FaGift if icon not found
 */
export const getIconComponent = (iconName: string): IconType => {
  const icon = FaIcons[iconName as keyof typeof FaIcons];
  if (icon && typeof icon === 'function') {
    return icon as IconType;
  }
  return FaIcons.FaGift;
};

/**
 * Get all available Font Awesome icon names
 */
export const getAllFaIconNames = (): string[] => {
  return Object.keys(FaIcons).filter(
    key => key.startsWith('Fa') && key !== 'FaIconContext'
  );
};

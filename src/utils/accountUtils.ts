import * as FaIcons from 'react-icons/fa';
import type { IconType } from 'react-icons';
import type { ApiAccountResponse } from '../services/accountService';

export const DEFAULT_ACCOUNT_ICON_KEY = 'FaWallet';

const resolveIconComponent = (
  iconName: string | null | undefined
): React.ComponentType<{ size?: number }> | undefined => {
  if (!iconName) {return undefined;}
  const iconsLibrary = FaIcons as unknown as Record<string, IconType>;
  const IconComp = iconsLibrary[iconName];
  if (!IconComp) {return undefined;}
  return IconComp as unknown as React.ComponentType<{ size?: number }>;
};

export { resolveIconComponent };

export const resolveIconFromApiName = (
  apiIcon?: string | null
): React.ComponentType<{ size?: number }> | undefined => {
  const key = typeof apiIcon === 'string' && apiIcon ? apiIcon : DEFAULT_ACCOUNT_ICON_KEY;
  return resolveIconComponent(key);
};

export const lightenColor = (hex: string, ratio = 0.85): string => {
  if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) {
    return '#f8f9fa';
  }

  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const apply = (channel: number) => Math.round(channel + (255 - channel) * ratio);
  const toHex = (channel: number) => channel.toString(16).padStart(2, '0');

  return `#${toHex(apply(r))}${toHex(apply(g))}${toHex(apply(b))}`;
};

export interface Account {
  id: string;
  personal_id?: number;
  order: number;
  name: string;
  type: string;
  balance: number;
  icon: React.ComponentType<{ size?: number }>;
  accentColor: string;
  backgroundColor: string;
  isArchived?: boolean;
  excludeFromStatistics?: boolean;
  currency?: string;
  isActive?: boolean;
  usability?: 'USABLE' | 'PROTECTED';
  iconKey?: string; // Store the original icon key from API
}

export const mapApiAccountToAccount = (
  apiAccount: ApiAccountResponse,
  index: number
): Account => {
  if (!apiAccount.id) {
    throw new Error('Account must have an id from the API');
  }

  const IconComp =
    resolveIconFromApiName(apiAccount.icon) ??
    (FaIcons.FaWallet as React.ComponentType<{ size?: number }>);
  const color = typeof apiAccount.color === 'string' && apiAccount.color ? apiAccount.color : '#047857';
  const usabilityStr = typeof apiAccount.usability === 'string' ? apiAccount.usability.toUpperCase() : undefined;
  const usability: 'USABLE' | 'PROTECTED' = usabilityStr === 'PROTECTED' ? 'PROTECTED' : 'USABLE';
  const iconKey = typeof apiAccount.icon === 'string' && apiAccount.icon ? apiAccount.icon : DEFAULT_ACCOUNT_ICON_KEY;

  return {
    id: apiAccount.id,
    personal_id: apiAccount.personal_id,
    order: index + 1,
    name: apiAccount.name ?? 'Unnamed Account',
    type: apiAccount.account_type ?? 'General',
    balance: apiAccount.initial_amount ?? 0,
    icon: IconComp,
    accentColor: color,
    backgroundColor: lightenColor(color),
    isActive: apiAccount.active ?? true,
    isArchived: apiAccount.active === false,
    usability,
    iconKey,
  };
};

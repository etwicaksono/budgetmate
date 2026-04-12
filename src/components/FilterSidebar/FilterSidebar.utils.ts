import React, { createElement } from 'react';
import type { ComponentType } from 'react';
import type { IconBaseProps } from 'react-icons';
import type { IconRenderable } from './FilterSidebar.types';

export const renderIcon = (
  IconComponent: IconRenderable | null | undefined,
  props: IconBaseProps = {}
): React.ReactNode => {
  if (!IconComponent) {
    return null;
  }
  return createElement(IconComponent as ComponentType<IconBaseProps>, props);
};

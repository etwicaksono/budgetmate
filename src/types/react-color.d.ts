declare module 'react-color' {
  import * as React from 'react';

  export type RGBColor = { r: number; g: number; b: number; a?: number };
  export type HSLColor = { h: number; s: number; l: number; a?: number };

  export interface ColorResult {
    hex: string;
    rgb: RGBColor;
    hsl: HSLColor;
  }

  export interface ChromePickerProps {
    color?: string;
    onChange?: (color: ColorResult) => void;
    onChangeComplete?: (color: ColorResult) => void;
    disableAlpha?: boolean;
    className?: string;
    styles?: unknown;
  }

  export const ChromePicker: React.ComponentType<ChromePickerProps>;
}
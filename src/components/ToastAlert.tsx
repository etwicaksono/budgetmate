import React, {
  forwardRef,
  type ForwardedRef,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

type ToastAlertVariant = 'filled' | 'outlined' | 'standard';
type AnchorOrigin = { vertical: 'top' | 'bottom'; horizontal: 'left' | 'center' | 'right' };

export interface ToastAlertProps {
  open: boolean;
  onClose?: (event: SyntheticEvent | Event, reason?: string) => void;
  severity?: 'success' | 'info' | 'warning' | 'error';
  message: ReactNode;
  autoHideDuration?: number;
  anchorOrigin?: AnchorOrigin;
  variant?: ToastAlertVariant;
  elevation?: number;
}

const severityToBg = (severity?: 'success' | 'info' | 'warning' | 'error'): string => {
  switch (severity) {
    case 'success':
      return 'success';
    case 'info':
      return 'info';
    case 'warning':
      return 'warning';
    case 'error':
      return 'danger';
    default:
      return 'info';
  }
};

const anchorToPosition = (
  anchor?: AnchorOrigin,
): 'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end' => {
  const vertical = anchor?.vertical ?? 'top';
  const horizontal = anchor?.horizontal ?? 'right';
  const v = vertical === 'top' ? 'top' : 'bottom';
  const h = horizontal === 'left' ? 'start' : horizontal === 'center' ? 'center' : 'end';
  return `${v}-${h}` as 'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end';
};

const ToastAlert = forwardRef<HTMLDivElement, ToastAlertProps>(
  (
    {
      open,
      onClose,
      severity = 'info',
      message,
      autoHideDuration = 4000,
      anchorOrigin = { vertical: 'top', horizontal: 'right' },
    },
    ref: ForwardedRef<HTMLDivElement>,
  ) => {
    const bg = severityToBg(severity);
    const position = anchorToPosition(anchorOrigin);

    return (
      <ToastContainer position={position} className="p-3">
        <Toast
          show={open}
          autohide
          delay={autoHideDuration}
          bg={bg}
          onClose={(e) => onClose?.(e ?? new Event('close'))}
          ref={ref as unknown as React.RefObject<HTMLDivElement>}
        >
          <Toast.Body>{message}</Toast.Body>
        </Toast>
      </ToastContainer>
    );
  },
);

ToastAlert.displayName = 'ToastAlert';

export default ToastAlert;

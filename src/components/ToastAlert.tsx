import React, {
  forwardRef,
  type ForwardedRef,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import Snackbar, {
  type SnackbarCloseReason,
  type SnackbarOrigin,
  type SnackbarProps,
} from '@mui/material/Snackbar';
import MuiAlert, {
  type AlertColor,
  type AlertProps,
} from '@mui/material/Alert';

type ToastAlertVariant = AlertProps['variant'];

export interface ToastAlertProps {
  open: boolean;
  onClose?: (
    event: Event | SyntheticEvent,
    reason?: SnackbarCloseReason,
  ) => void;
  severity?: AlertColor;
  message: ReactNode;
  autoHideDuration?: number;
  anchorOrigin?: SnackbarOrigin;
  variant?: ToastAlertVariant;
  elevation?: number;
}

const ToastAlert = forwardRef<HTMLDivElement, ToastAlertProps>(
  (
    {
      open,
      onClose,
      severity = 'info',
      message,
      autoHideDuration = 4000,
      anchorOrigin = { vertical: 'top', horizontal: 'right' },
      variant = 'filled',
      elevation = 6,
    },
    ref: ForwardedRef<HTMLDivElement>,
  ) => {
    const handleSnackbarClose: NonNullable<SnackbarProps['onClose']> = (
      event,
      reason,
    ) => {
      onClose?.(event, reason);
    };

    const handleAlertClose: NonNullable<AlertProps['onClose']> = (event) => {
      onClose?.(event);
    };

    return (
      <Snackbar
        open={open}
        autoHideDuration={autoHideDuration}
        onClose={handleSnackbarClose}
        anchorOrigin={anchorOrigin}
      >
        <MuiAlert
          ref={ref}
          severity={severity}
          onClose={handleAlertClose}
          elevation={elevation}
          variant={variant}
        >
          {message}
        </MuiAlert>
      </Snackbar>
    );
  },
);

ToastAlert.displayName = 'ToastAlert';

export default ToastAlert;

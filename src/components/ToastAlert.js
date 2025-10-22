import React from 'react';
import PropTypes from 'prop-types';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

const ToastAlert = React.forwardRef(
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
    ref,
  ) => {
    return (
      <Snackbar
        open={open}
        autoHideDuration={autoHideDuration}
        onClose={onClose}
        anchorOrigin={anchorOrigin}
      >
        <MuiAlert
          ref={ref}
          severity={severity}
          onClose={onClose}
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

ToastAlert.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  severity: PropTypes.oneOf(['success', 'info', 'warning', 'error']),
  message: PropTypes.node.isRequired,
  autoHideDuration: PropTypes.number,
  anchorOrigin: PropTypes.shape({
    vertical: PropTypes.oneOf(['top', 'bottom']).isRequired,
    horizontal: PropTypes.oneOf(['left', 'center', 'right']).isRequired,
  }),
  variant: PropTypes.oneOf(['filled', 'outlined', 'standard']),
  elevation: PropTypes.number,
};

export default ToastAlert;

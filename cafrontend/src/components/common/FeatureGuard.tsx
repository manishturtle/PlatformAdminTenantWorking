import React, { useEffect, useState, ReactElement } from 'react';
import { checkFeatureAccess } from '../../my_features';
import { Snackbar } from '@mui/material';

type ChildProps = {
  onClick?: (e: React.MouseEvent) => void;
  [key: string]: any;
};

interface FeatureGuardProps {
  moduleKey: string;
  featureKey: string;
  children: ReactElement<ChildProps>;
}

const FeatureGuard: React.FC<FeatureGuardProps> = ({ moduleKey, featureKey, children }) => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const result = await checkFeatureAccess(moduleKey, featureKey);
      setHasAccess(result.hasAccess);
    };
    checkAccess();
  }, [moduleKey, featureKey]);

  const handleAction = async () => {
    const result = await checkFeatureAccess(moduleKey, featureKey);
    if (!result.hasAccess) {
      setError(result.message || "You don't have access to this feature");
      setSnackbarOpen(true);
      return false;
    }
    return true;
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Clone the child element and add the onClick handler
  const child = React.Children.only(children);
  if (!React.isValidElement<ChildProps>(child)) {
    return null;
  }

  const originalOnClick = child.props.onClick;
  const enhancedChild = React.cloneElement(child, {
    ...child.props,
    onClick: async (e: React.MouseEvent) => {
      const canProceed = await handleAction();
      if (canProceed && originalOnClick) {
        originalOnClick(e);
      }
    },
  });

  return (
    <>
      {enhancedChild}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={error}
      />
    </>
  );
};

export default FeatureGuard;

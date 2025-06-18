'use client';

import React from 'react';
import AppLayout from '../../AppLayout';
import { ThemeProvider } from '../../../theme/ThemeContext';

export default function TenantAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AppLayout>
        {children}
      </AppLayout>
    </ThemeProvider>
  );
}

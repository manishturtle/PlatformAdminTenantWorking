// 'use client';

// import React from 'react';
// import { ThemeProvider, createTheme } from '@mui/material/styles';
// import CssBaseline from '@mui/material/CssBaseline';
// import AdminLayout from '../../components/layout/AdminLayout';

// // Create a theme instance
// const theme = createTheme({
//   palette: {
//     primary: {
//       main: '#1e8e3e',
//     },
//     secondary: {
//       main: '#f50057',
//     },
//     background: {
//       default: '#f5f5f5',
//     },
//   },
//   typography: {
//     fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
//     h4: {
//       fontWeight: 600,
//     },
//   },
//   shape: {
//     borderRadius: 8,
//   },
// });

// export default function PlatformAdminLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <ThemeProvider theme={theme}>
//       <CssBaseline />
//       <AdminLayout userType="platform-admin">
//         {children}
//       </AdminLayout>
//     </ThemeProvider>
//   );
// }



'use client';

import React from 'react';
import AppLayout from '../AppLayout';
import { ThemeProvider } from '../../theme/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AppLayout userType="platform-admin">
        <ToastContainer 
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        {children}
      </AppLayout>
    </ThemeProvider>
  );
}
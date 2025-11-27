import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import { ToastProvider } from '@/context/ToastContext';
import { AuthStateProvider } from '@/context/AuthStateContext';
import { AuthProvider } from '@/context/AuthContext';
import { LocaleProvider } from '@/context/LocaleContext';
import { TransactionModalProvider } from '@/context/TransactionModalContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Finance Manager',
  description: 'Personal Finance Management Application',
  icons: {
    icon: '/images/logo-image-only.svg',
    apple: '/images/logo-image-only.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <AuthStateProvider>
            <AuthProvider>
              <LocaleProvider>
                <TransactionModalProvider>
                  {children}
                </TransactionModalProvider>
              </LocaleProvider>
            </AuthProvider>
          </AuthStateProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

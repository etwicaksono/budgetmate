import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import { ToastProvider } from '@/context/ToastContext';
import { AuthStateProvider } from '@/context/AuthStateContext';
import { AuthProvider } from '@/context/AuthContext';
import { LocaleProvider } from '@/context/LocaleContext';
import { TransactionModalProvider } from '@/context/TransactionModalContext';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Finance Manager',
  description: 'Personal Finance Management Application',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Finance Manager',
  },
  icons: {
    icon: '/images/icon-192x192.png',
    apple: '/images/apple-touch-icon.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#21CB87" />
        <meta name="application-name" content="Finance Manager" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/images/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) { console.log('[PWA] SW registered:', reg.scope); })
                    .catch(function(err) { console.warn('[PWA] SW registration failed:', err); });
                });
              }
            `,
          }}
        />
      </head>
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
        <SpeedInsights />
      </body>
    </html>
  );
}

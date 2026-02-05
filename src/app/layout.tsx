import type { Metadata, Viewport } from 'next';
import { Inter, Bebas_Neue } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
});

export const metadata: Metadata = {
  title: {
    default: 'MotoresRD - Alquiler de Motos en República Dominicana',
    template: '%s | MotoresRD',
  },
  description:
    'La plataforma líder de alquiler de motocicletas en República Dominicana. Encuentra la moto perfecta para tu próxima aventura.',
  keywords: [
    'alquiler de motos',
    'motocicletas',
    'República Dominicana',
    'rent motorcycle',
    'motos Santo Domingo',
    'adventure bikes',
  ],
  authors: [{ name: 'MotoresRD' }],
  openGraph: {
    type: 'website',
    locale: 'es_DO',
    url: 'https://motores.do',
    siteName: 'MotoresRD',
    title: 'MotoresRD - Alquiler de Motos',
    description: 'La plataforma líder de alquiler de motocicletas en República Dominicana',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MotoresRD - Alquiler de Motos',
    description: 'La plataforma líder de alquiler de motocicletas en República Dominicana',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#FF4500',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${bebasNeue.variable}`}>
      <body className="font-sans antialiased bg-gray-50 text-gray-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

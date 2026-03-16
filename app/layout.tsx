import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hana — Your Animation Helper',
  description: 'Upload animation clips and get frame-by-frame feedback on the 12 principles of animation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" className={GeistSans.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${GeistSans.className} min-h-screen bg-bg text-text`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

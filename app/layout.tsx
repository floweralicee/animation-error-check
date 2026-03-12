import type { Metadata } from 'next';
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

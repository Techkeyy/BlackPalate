import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'BlackPalate — Flynet Capability Proof & Verification',
  description: 'Verified dining behavior marketplace for culinary research',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        padding: 0,
        backgroundColor: '#121212',
        color: '#F7F5F0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {children}
      </body>
    </html>
  );
}


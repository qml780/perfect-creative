import type { Metadata } from 'next';
import Script from 'next/script';
import './site.css';
import './design.css';
import './support.css';

export const metadata: Metadata = {
  title: { default: 'Perfect Creative | Acrylic Lecterns', template: '%s | Perfect Creative' },
  description: 'Acrylic lecterns for conference, education and event spaces. Explore knock-down construction, OEM branding and wholesale enquiries.',
  robots: { index: false, follow: false }
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning>
    <head><link rel="preload" href="/fonts/InstrumentSerif-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous"/></head>
    <body>{children}<Script src="/site.js" strategy="afterInteractive"/></body>
  </html>;
}

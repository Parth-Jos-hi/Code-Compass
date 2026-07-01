import './globals.css';
import CustomCursor from '../components/CustomCursor';

export const metadata = {
  title: 'voidscout // High-End Codebase Map',
  description: 'Full-Stack Space Map and Luxury Codebase Architectural Explorer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="no-scrollbar">
      <body className="antialiased">
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}
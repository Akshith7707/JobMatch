import '@/styles/globals.css';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import Navbar from '@/components/Navbar';

const Toaster = dynamic(
  () => import('react-hot-toast').then((mod) => mod.Toaster),
  { ssr: false }
);

export default function App({ Component, pageProps }) {
  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  return (
    <>
      <Navbar />
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            '!font-body !text-brand-900 !bg-[#fffdf8] !border-2 !border-brand-300 !rounded-sm !shadow-ledger',
          style: { fontSize: '1rem' },
          success: { iconTheme: { primary: '#5c4224', secondary: '#faf6f0' } },
          error: { iconTheme: { primary: '#7f1d1d', secondary: '#faf6f0' } },
        }}
      />
    </>
  );
}

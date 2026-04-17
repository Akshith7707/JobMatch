import '@/styles/globals.css';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';
import Navbar from '@/components/Navbar';

export default function App({ Component, pageProps }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <Navbar />
      <Component {...pageProps} />
      <Toaster position="top-right" />
    </>
  );
}

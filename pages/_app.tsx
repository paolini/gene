import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import AppHeader from '../components/AppHeader';

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <AppHeader />
      <div style={{ paddingTop: 72 }}>
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  );
}

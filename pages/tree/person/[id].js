import Link from 'next/link';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import PersonTree from '../../../components/tree/PersonTree';

export default function PersonTreePage() {
  const router = useRouter();
  const { id } = router.query;
 
  return (
    <div style={{ padding: 20, fontFamily: 'Georgia, serif', background: 'linear-gradient(180deg, #efe5d5 0%, #faf6ef 100%)', minHeight: '100vh', color: '#2f2419' }}>
      <div style={{ maxWidth: 1500, margin: '0 auto' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: '#7a4b2a', textDecoration: 'none' }}>← torna alla ricerca</Link>
          <div style={{ color: '#6d5a48' }}>Espandi i genitori o i discendenti da ogni scheda della persona.</div>
        </div>
        <PersonTree personId={id} />
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: `/auth/signin?callbackUrl=${encodeURIComponent(context.resolvedUrl || '/')}`,
        permanent: false
      }
    };
  }

  if (!session.user?.role) {
    return {
      redirect: {
        destination: '/auth/pending',
        permanent: false
      }
    };
  }

  return { props: {} };
}

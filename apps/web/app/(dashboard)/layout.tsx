import { Suspense } from 'react';
import { Shell } from '@/components/shell';
import { getMetadata } from '@/lib/api';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const metadata = await getMetadata().catch(() => null);
  return <Suspense fallback={<div className="page-loading">Loading CityOps…</div>}><Shell metadata={metadata}>{children}</Shell></Suspense>;
}

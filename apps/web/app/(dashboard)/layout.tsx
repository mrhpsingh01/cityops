import { Suspense } from 'react';
import { Shell } from '@/components/shell';
import { getDataQuality, getMetadata, getModelGovernance } from '@/lib/api';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [metadata, governance, dataQuality] = await Promise.all([
    getMetadata().catch(() => null),
    getModelGovernance().catch(() => null),
    getDataQuality(),
  ]);
  return (
    <Suspense fallback={<div className="page-loading">Loading CityOps…</div>}>
      <Shell metadata={metadata} governance={governance} dataQuality={dataQuality}>
        {children}
      </Shell>
    </Suspense>
  );
}

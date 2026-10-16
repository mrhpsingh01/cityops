import { getModelGovernance } from '@/lib/api';
import { RiskShowcase } from '@/components/risk-showcase';

export default async function RiskPage() {
  const gov = await getModelGovernance();
  return <RiskShowcase governance={gov} />;
}

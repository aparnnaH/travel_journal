// Primary route entry for the AI companion page.
// The real feature logic lives in TravelCompanionPage so route files stay tiny.
import TravelCompanionPage from '@/components/ai/TravelCompanionPage';

// Renders the shared companion experience at /companion.
export default function CompanionRoutePage() {
  return <TravelCompanionPage />;
}

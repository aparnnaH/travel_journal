// Backward-compatible alias route for the AI companion experience.
// Next.js redirect() throws a route-level redirect response on the server.
import { redirect } from 'next/navigation';

// Sends legacy /ai-companion visitors to the canonical /companion route.
export default function AICompanionAliasPage() {
  redirect('/companion');
}

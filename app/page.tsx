import { redirect } from 'next/navigation';

export default function HomePage() {
  // Skip store selection, go directly to store 1 cockpit
  redirect('/stores/1/os/cockpit');
}

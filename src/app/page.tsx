import { auth } from '@clerk/nextjs/server';
import { LandingClient } from './LandingClient';

export default async function LandingPage() {
  const { userId } = await auth();
  
  return <LandingClient userId={userId} />;
}

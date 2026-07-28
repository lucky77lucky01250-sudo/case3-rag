"use client";

import AuthGate from "@/components/AuthGate";
import Chat from "@/components/Chat";

export default function Home() {
  return (
    <AuthGate>
      {({ email, signOut }) => <Chat email={email} onSignOut={signOut} />}
    </AuthGate>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      try {
        const userData = JSON.parse(user);
        const userRole = userData?.role ?? 'admin';
        // Redirect to dashboard if authenticated
        router.push(`/dashboard/${userRole}`);
      } catch {
        // If user data is corrupted, redirect to login
        router.push('/login');
      }
    } else {
      // Redirect to login if not authenticated
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900 mx-auto"></div>
        <p className="text-slate-600">Loading...</p>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CreateUserForm from '@/components/CreateUserForm';

export default function CreateUserPage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    // Check if user has permission to create users
    if (!['super_admin', 'admin', 'manager'].includes(parsedUser.role)) {
      router.push('/dashboard');
      return;
    }
    setUser(parsedUser);
  }, [router]);

  const handleUserCreated = () => {
    // Redirect to accounts page or show success message
    router.push('/accounts?created=true');
  };

  const handleCancel = () => {
    router.back();
  };

  if (!isClient || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <img src="/favicon.ico" alt="Codex College Logo" className="h-10 w-10" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create New User</h1>
                <p className="text-sm text-gray-600">Add a new user to the system with proper role and permissions</p>
              </div>
            </div>
            <button
              onClick={() => router.back()}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Back
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <CreateUserForm
            onUserCreated={handleUserCreated}
            onCancel={handleCancel}
            currentUser={user}
          />
        </div>
      </main>
    </div>
  );
}
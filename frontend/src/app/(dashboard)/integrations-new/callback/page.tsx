'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const message = searchParams.get('message');

  useEffect(() => {
    // Close the popup window after a short delay
    if (status) {
      setTimeout(() => {
        if (window.opener) {
          // If opened in popup, close it
          window.close();
        } else {
          // If opened in same window, redirect back
          window.location.href = '/integrations-new';
        }
      }, 2000);
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === 'success' ? (
          <>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Connection Successful!
            </h2>
            <p className="text-gray-600 mb-4">
              Your integration has been connected successfully.
            </p>
            <p className="text-sm text-gray-500">
              This window will close automatically...
            </p>
          </>
        ) : status === 'error' ? (
          <>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Connection Failed
            </h2>
            <p className="text-gray-600 mb-4">
              {message || 'Failed to connect the integration. Please try again.'}
            </p>
            <p className="text-sm text-gray-500">
              This window will close automatically...
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex items-center justify-center h-16 w-16 mb-4">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Processing...
            </h2>
            <p className="text-gray-600">
              Please wait while we complete the connection.
            </p>
          </>
        )}
      </div>
    </div>
  );
}


'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: string;
  requiredPermission?: string;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, permission, requiredPermission, fallback }: ProtectedRouteProps) {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const router = useRouter();
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsClient(true);

    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      // Check permission if specified
      const permToCheck = permission || requiredPermission;
      if (permToCheck) {
        const userPermissions = parsedUser.permissions || [];
        const userRole = parsedUser.role;

        // Super admin and admin have all permissions
        // Marketing users have access to integrations and landing pages (same level as admin)
        const privilegedRoles = ['super_admin', 'admin'];
        const marketingAccessRoles = ['super_admin', 'admin', 'marketing'];
        const hasRoleAccess = permToCheck === 'view_integrations' ?
          marketingAccessRoles.includes(userRole) :
          privilegedRoles.includes(userRole);

        const access = hasRoleAccess || userPermissions.includes(permToCheck);
        setHasAccess(access);

        // Handle redirect with timeout to avoid render-time navigation
        if (!access && !fallback) {
          redirectTimeoutRef.current = setTimeout(() => {
            router.push('/dashboard');
          }, 0);
        }
      } else {
        setHasAccess(true);
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }

    // Cleanup timeout on unmount
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [router, permission, requiredPermission, fallback]);

  // Don't render anything on server side
  if (!isClient) {
    return null;
  }

  // If permission is required and user doesn't have it, show fallback
  if ((permission || requiredPermission) && !hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    // Return null while redirect is happening
    return null;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
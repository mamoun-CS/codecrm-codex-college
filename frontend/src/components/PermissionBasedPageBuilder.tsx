'use client';

import React from 'react';

interface PermissionBasedPageBuilderProps {
  user: any;
  children: React.ReactNode;
}

interface PageSection {
  permission?: string;
  roles?: string[];
  component: React.ReactNode;
  fallback?: React.ReactNode;
}

// Hook for checking permissions
export const usePermissions = (user: any) => {
  const userPermissions = user?.permissions || [];
  const userRole = user?.role;

  const hasPermission = (permission: string) => {
    // Super admin and admin have all permissions
    if (userRole === 'super_admin' || userRole === 'admin') {
      return true;
    }

    // Managers and sales have add_leads permission by default
    if (permission === 'add_leads' && (userRole === 'manager' || userRole === 'sales')) {
      return true;
    }

    return userPermissions.includes(permission);
  };

  const hasRole = (roles: string[]) => {
    return roles.includes(userRole);
  };

  const hasAnyPermission = (permissions: string[]) => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]) => {
    return permissions.every(permission => hasPermission(permission));
  };

  return {
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    userPermissions,
    userRole
  };
};

// Component for conditional rendering based on permissions
export const PermissionGuard: React.FC<{
  permission?: string;
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean;
  user: any;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ permission, permissions, roles, requireAll = false, user, fallback = null, children }) => {
  const { hasPermission, hasRole, hasAnyPermission, hasAllPermissions } = usePermissions(user);

  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  } else if (roles) {
    hasAccess = hasRole(roles);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

// Main page builder component
export const PermissionBasedPageBuilder: React.FC<PermissionBasedPageBuilderProps> = ({
  user,
  children
}) => {
  return <>{children}</>;
};

// Utility component for building dashboard sections
export const DashboardSection: React.FC<{
  title: string;
  permission?: string;
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean;
  user: any;
  children: React.ReactNode;
  className?: string;
}> = ({
  title,
  permission,
  permissions,
  roles,
  requireAll = false,
  user,
  children,
  className = ""
}) => {
  return (
    <PermissionGuard
      permission={permission}
      permissions={permissions}
      roles={roles}
      requireAll={requireAll}
      user={user}
    >
      <div className={`bg-white p-4 sm:p-6 rounded-lg shadow ${className}`}>
        <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-4">{title}</h3>
        {children}
      </div>
    </PermissionGuard>
  );
};

// Component for action buttons based on permissions
export const PermissionBasedActions: React.FC<{
  user: any;
  actions: Array<{
    label: string;
    permission?: string;
    permissions?: string[];
    roles?: string[];
    requireAll?: boolean;
    onClick: () => void;
    className?: string;
    icon?: string;
  }>;
  className?: string;
}> = ({ user, actions, className = "" }) => {
  const visibleActions = actions.filter(action => {
    const { hasPermission, hasRole, hasAnyPermission, hasAllPermissions } = usePermissions(user);

    if (action.permission) {
      return hasPermission(action.permission);
    } else if (action.permissions) {
      return action.requireAll ? hasAllPermissions(action.permissions) : hasAnyPermission(action.permissions);
    } else if (action.roles) {
      return hasRole(action.roles);
    }
    return true;
  });

  if (visibleActions.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {visibleActions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${action.className || 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          {action.icon && <span className="mr-2">{action.icon}</span>}
          {action.label}
        </button>
      ))}
    </div>
  );
};

// Component for navigation menu items based on permissions
export const PermissionBasedMenu: React.FC<{
  user: any;
  items: Array<{
    label: string;
    href: string;
    permission?: string;
    permissions?: string[];
    roles?: string[];
    requireAll?: boolean;
    icon?: string;
    color?: string;
  }>;
  className?: string;
  gridClassName?: string;
}> = ({ user, items, className = "", gridClassName = "" }) => {
  const { hasPermission, hasRole, hasAnyPermission, hasAllPermissions } = usePermissions(user);

  const visibleItems = items.filter(item => {
    if (item.permission) {
      return hasPermission(item.permission);
    } else if (item.permissions) {
      return item.requireAll ? hasAllPermissions(item.permissions) : hasAnyPermission(item.permissions);
    } else if (item.roles) {
      return hasRole(item.roles);
    }
    return true;
  });

  if (visibleItems.length === 0) return null;

  return (
    <div className={className}>
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 ${gridClassName}`}>
        {visibleItems.map((item, index) => (
          <a
            key={index}
            href={item.href}
            className={`text-white px-3 py-3 sm:px-4 sm:py-4 rounded-lg transition-all duration-200 text-center font-medium hover:scale-105 hover:shadow-lg flex flex-col items-center justify-center min-h-[80px] sm:min-h-[100px] ${item.color || 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {item.icon && <span className="text-2xl mb-2">{item.icon}</span>}
            <span className="text-sm sm:text-base leading-tight">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

// Component for form fields based on permissions
export const PermissionBasedFormField: React.FC<{
  permission?: string;
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean;
  user: any;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ permission, permissions, roles, requireAll = false, user, children, fallback = null }) => {
  return (
    <PermissionGuard
      permission={permission}
      permissions={permissions}
      roles={roles}
      requireAll={requireAll}
      user={user}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
};

// Export the main component as default
export default PermissionBasedPageBuilder;
'use client';

export type RoleKey = 'admin' | 'manager' | 'sales' | 'marketing';

export const ROLE_PERMISSION_TEMPLATES: Record<RoleKey, string[]> = {
  admin: [
    'view_leads',
    'add_leads',
    'edit_leads',
    'delete_leads',
    'view_landing_pages',
    'manage_landing_pages',
    'view_integrations',
    'manage_users',
    'marketing_dashboard_access',
  ],
  manager: [
    'view_leads',
    'add_leads',
    'edit_leads',
    'view_landing_pages',
    'view_integrations',
    'marketing_dashboard_access',
  ],
  sales: ['view_leads'],
  marketing: ['view_leads', 'view_landing_pages', 'marketing_dashboard_access'],
};

export const MARKETING_ACCESS_DESCRIPTION =
  'Marketing: Campaigns/Spending/Marketing Reports, Read-Only for Leads.';

export const MARKETING_ACCESS_PERMISSIONS = ROLE_PERMISSION_TEMPLATES.marketing;

export const getRolePermissionTemplate = (role: RoleKey) => {
  return ROLE_PERMISSION_TEMPLATES[role] || [];
};

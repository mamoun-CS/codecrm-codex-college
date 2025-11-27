'use client';

import { useState, useEffect } from 'react';
import { usersAPI } from '../lib/api';
import { useLanguage } from '@/i18n/LanguageProvider';

interface CreateUserFormProps {
  currentUser: any;
  onUserCreated?: () => void;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateUserForm({ currentUser, onUserCreated, onSuccess, onCancel }: CreateUserFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    permissions: [] as string[],
  });

  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const permissionNames: Record<string, string> = {
    view_leads: 'View leads',
    add_leads: 'Add leads',
    edit_leads: 'Edit leads',
    delete_leads: 'Delete leads',
    view_landing_pages: 'View landing pages',
    manage_landing_pages: 'Manage landing pages',
    view_integrations: 'View integrations',
    manage_users: 'Manage users',
  };

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    sales: 'Sales',
  };

  // Define all possible permissions
  const allPermissions = [
    'view_leads',
    'add_leads',
    'edit_leads',
    'delete_leads',
    'view_landing_pages',
    'manage_landing_pages',
    'view_integrations',
    'manage_users'
  ];

  useEffect(() => {
    // Get available roles for current user
    const fetchAllowedRoles = async () => {
      try {
        const response = await usersAPI.getAllowedRoles();
        setAvailableRoles(response.data.roles);
      } catch (err) {
        console.error('Error fetching allowed roles:', err);
      }
    };

    fetchAllowedRoles();

    // Set available permissions based on current user's permissions
    if (currentUser?.permissions) {
      setAvailablePermissions(currentUser.permissions);
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await usersAPI.createUser(formData);
      onSuccess?.();
      onUserCreated?.();
    } catch (err: any) {
      setError(err.response?.data?.message || t('Failed to create user'));
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
  };

  return (
    <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-lg">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">{t('Create New User')}</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('Full Name')} *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              placeholder={t('Enter full name')}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('Email')} *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full rounded border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              placeholder={t('Enter email address')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('Password')} *
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full rounded border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              placeholder={t('Enter password')}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('Role')} *
            </label>
            <select
              required
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full rounded border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('Select role')}</option>
              {availableRoles.map(role => (
                <option key={role} value={role}>
                  {t(roleLabels[role] || role.replace('_', ' '))}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Permissions */}
        <div>
          <label className="mb-3 block text-sm font-medium text-gray-700">
            {t('Permissions')}
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {availablePermissions.map(permission => (
              <label key={permission} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.permissions.includes(permission)}
                  onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{t(permissionNames[permission] || permission)}</span>
              </label>
            ))}
          </div>
          {availablePermissions.length === 0 && (
            <p className="mt-2 text-sm text-gray-500">
              {t('No permissions available to assign')}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
          >
            {t('Cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading ? t('Creating...') : t('Create User')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateUserForm;

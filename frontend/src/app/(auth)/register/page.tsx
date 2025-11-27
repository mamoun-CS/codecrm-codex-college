'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usersAPI } from '@/lib/api';
import { MARKETING_ACCESS_DESCRIPTION, getRolePermissionTemplate, RoleKey } from '@/constants/rolePermissions';
import { useLanguage } from '@/i18n/LanguageProvider';

type UserRole = RoleKey;

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  manager: 2,
  sales: 1,
  marketing: 1,
};

const getAllowedRoles = (userRole: UserRole): UserRole[] => {
  const userLevel = ROLE_HIERARCHY[userRole];

  // Special case: marketing accounts can create marketing accounts
  if (userRole === 'marketing') {
    return ['marketing'];
  }

  return (Object.keys(ROLE_HIERARCHY) as UserRole[]).filter(
    role => ROLE_HIERARCHY[role] < userLevel
  );
};

// List of countries for the dropdown
const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Austria',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Poland',
  'Czech Republic',
  'Portugal',
  'Greece',
  'Ireland',
  'Israel',
  'United Arab Emirates',
  'Saudi Arabia',
  'Qatar',
  'Kuwait',
  'Bahrain',
  'Oman',
  'Jordan',
  'Lebanon',
  'Egypt',
  'Morocco',
  'Tunisia',
  'Algeria',
  'India',
  'China',
  'Japan',
  'South Korea',
  'Singapore',
  'Malaysia',
  'Thailand',
  'Indonesia',
  'Philippines',
  'Vietnam',
  'Brazil',
  'Mexico',
  'Argentina',
  'Chile',
  'Colombia',
  'Peru',
  'South Africa',
  'Nigeria',
  'Kenya',
  'Ghana',
  'Other'
].sort();

export default function RegisterPage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sales' as UserRole,
    team_id: '',
    country: '',
    permissions: getRolePermissionTemplate('sales'),
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const { t } = useLanguage();

  const applyRolePermissions = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: getRolePermissionTemplate(role),
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target.name === 'role') {
      applyRolePermissions(e.target.value as UserRole);
      return;
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const teamIdValue =
        user?.role === 'manager'
          ? user.team_id ?? undefined
          : formData.team_id
          ? parseInt(formData.team_id, 10)
          : undefined;

      const registerData = {
        ...formData,
        team_id: teamIdValue,
        country: formData.country || undefined,
      };
      await usersAPI.createUser({
        ...registerData,
        permissions: formData.permissions.length ? formData.permissions : getRolePermissionTemplate(formData.role),
      });
      setSuccess('Account created successfully!');
      setError('');
      const defaultRole = getAllowedRoles(user?.role || 'sales')[0] ?? 'sales';
      setFormData({
        name: '',
        email: '',
        password: '',
        role: defaultRole,
        team_id: user?.role === 'manager' && user?.team_id ? String(user.team_id) : '',
        country: user?.role === 'manager' ? user.country || '' : '',
        permissions: getRolePermissionTemplate(defaultRole),
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
      setSuccess('');
    }
  };

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    const managerTeamId =
      parsedUser.role === 'manager' && parsedUser.team_id ? String(parsedUser.team_id) : '';

    // Set default role to the first allowed role
    const allowedRoles = getAllowedRoles(parsedUser.role);
    if (allowedRoles.length > 0) {
      setFormData(prev => ({
        ...prev,
        role: allowedRoles[0],
        // For managers, auto-set their country and team
        country: parsedUser.role === 'manager' ? parsedUser.country || '' : prev.country,
        team_id: parsedUser.role === 'manager' ? managerTeamId : prev.team_id,
        permissions: getRolePermissionTemplate(allowedRoles[0]),
      }));
    } else if (parsedUser.role === 'manager') {
      setFormData(prev => ({
        ...prev,
        team_id: managerTeamId,
        country: parsedUser.country || '',
      }));
    }
  }, [router]);

  // Don't render anything on the server side to avoid hydration issues
  if (!isClient) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  const allowedRoles = getAllowedRoles(user.role);

  if (allowedRoles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Access Denied
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You don't have permission to create new accounts.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard"
                className="text-indigo-600 hover:text-indigo-500"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Create New Account</h1>
            <div className="flex items-center space-x-4">
              <span>Welcome, {user.name} ({user.role})</span>
              <Link
                href="/dashboard"
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.role}
                  onChange={handleChange}
                >
                  {allowedRoles.map(role => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">
                  {t('Access Summary ({role})', {
                    role: formData.role.charAt(0).toUpperCase() + formData.role.slice(1),
                  })}
                </p>
                <p className="mt-1">
                  {formData.role === 'marketing'
                    ? t(MARKETING_ACCESS_DESCRIPTION)
                    : t('Permissions are pre-populated for this role. Adjust the role to change the template.')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.permissions.map(permission => (
                    <span
                      key={permission}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow"
                    >
                      {permission}
                    </span>
                  ))}
                  {formData.permissions.length === 0 && (
                    <span className="text-xs italic text-slate-500">{t('No permissions assigned')}</span>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="team_id" className="block text-sm font-medium text-gray-700">
                  Team ID {user?.role === 'manager' ? '(Auto-assigned)' : '(Optional)'}
                </label>
                {user?.role === 'manager' ? (
                  <>
                    <input
                      id="team_id"
                      name="team_id"
                      type="number"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-600 sm:text-sm cursor-not-allowed"
                      value={formData.team_id}
                      readOnly
                      disabled
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Accounts created by managers inherit the manager&apos;s team automatically.
                    </p>
                  </>
                ) : (
                  <input
                    id="team_id"
                    name="team_id"
                    type="number"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.team_id}
                    onChange={handleChange}
                  />
                )}
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                  Country {user?.role === 'admin' ? '*' : ''}
                  {user?.role === 'manager' && (
                    <span className="text-xs text-gray-500 ml-2">
                      (Auto-assigned: {user.country || 'Not set'})
                    </span>
                  )}
                </label>
                {user?.role === 'manager' ? (
                  <input
                    id="country"
                    name="country"
                    type="text"
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-600 sm:text-sm cursor-not-allowed"
                    value={formData.country}
                  />
                ) : (
                  <select
                    id="country"
                    name="country"
                    required={user?.role === 'admin'}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.country}
                    onChange={handleChange}
                  >
                    <option value="">Select Country</option>
                    {COUNTRIES.map(country => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {error && <div className="text-red-500 text-sm">{error}</div>}
              {success && <div className="text-green-500 text-sm">{success}</div>}

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

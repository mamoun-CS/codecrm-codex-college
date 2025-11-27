'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { landingPagesAPI, campaignsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { useLanguage } from '@/i18n/LanguageProvider';

interface LandingPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  description?: string;
  active: boolean;
  template?: string;
  sections?: any[];
  settings?: Record<string, any>;
  campaign_id?: number;
  created_at: string;
  updated_at: string;
  campaign?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    name: string;
  };
}

interface Campaign {
  id: number;
  name: string;
  description?: string;
  active: boolean;
}

export default function LandingPagesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterCampaign, setFilterCampaign] = useState<number | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentPage, setCurrentPage] = useState<LandingPage | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    content: '<h1>Welcome</h1><p>Your landing page content here.</p>',
    campaign_id: undefined as number | undefined,
    active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const userObj = JSON.parse(userData);
    setUser(userObj);
    
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pagesRes, campaignsRes] = await Promise.all([
        landingPagesAPI.getAll(),
        campaignsAPI.getAll(),
      ]);

      setLandingPages(pagesRes.data || []);
      // Handle paginated response from campaigns API
      setCampaigns(campaignsRes.data?.data || campaignsRes.data || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error(error.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!formData.slug.trim()) {
      toast.error('Slug is required');
      return;
    }

    setSaving(true);
    try {
      const response = await landingPagesAPI.create(formData);
      setLandingPages(prev => [response.data, ...prev]);
      setShowCreateModal(false);
      resetForm();
      toast.success('Landing page created successfully!');
    } catch (error: any) {
      console.error('Error creating page:', error);
      toast.error(error.response?.data?.message || 'Failed to create landing page');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePage = async () => {
    if (!currentPage) return;

    setSaving(true);
    try {
      const response = await landingPagesAPI.update(currentPage.id, formData);
      setLandingPages(prev => prev.map(p => p.id === currentPage.id ? response.data : p));
      setShowEditModal(false);
      setCurrentPage(null);
      resetForm();
      toast.success('Landing page updated successfully!');
    } catch (error: any) {
      console.error('Error updating page:', error);
      toast.error(error.response?.data?.message || 'Failed to update landing page');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await landingPagesAPI.delete(id);
      setLandingPages(prev => prev.filter(p => p.id !== id));
      toast.success('Landing page deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting page:', error);
      toast.error(error.response?.data?.message || 'Failed to delete landing page');
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      await landingPagesAPI.patch(id, { active: !currentStatus });
      setLandingPages(prev => prev.map(p => p.id === id ? { ...p, active: !currentStatus } : p));
      toast.success(`Landing page ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (error: any) {
      console.error('Error toggling status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const openEditModal = (page: LandingPage) => {
    setCurrentPage(page);
    setFormData({
      title: page.title,
      slug: page.slug,
      description: page.description || '',
      content: page.content,
      campaign_id: page.campaign_id,
      active: page.active,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      description: '',
      content: '<h1>Welcome</h1><p>Your landing page content here.</p>',
      campaign_id: undefined,
      active: true,
    });
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title),
    }));
  };

  // Filter landing pages
  const filteredPages = landingPages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         page.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         page.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesActive = filterActive === 'all' ||
                         (filterActive === 'active' && page.active) ||
                         (filterActive === 'inactive' && !page.active);

    const matchesCampaign = filterCampaign === 'all' || page.campaign_id === filterCampaign;

    return matchesSearch && matchesActive && matchesCampaign;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const canManage = ['admin', 'manager', 'marketing'].includes(user.role);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Back to Dashboard Button */}
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
              title="Back to Dashboard"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
            </Link>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Landing Pages</p>
              <h1 className="mt-1 text-3xl font-semibold text-slate-900">Page Builder</h1>
              <p className="mt-1 text-sm text-slate-500">
                Create and manage landing pages for your campaigns
              </p>
            </div>
          </div>
          {canManage && (
            <Button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <span className="mr-2">+</span>
              Create Landing Page
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Search */}
          <div className="md:col-span-2">
            <Input
              type="text"
              placeholder="Search by title, slug, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as any)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-inner shadow-slate-900/5 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Campaign Filter */}
          <div>
            <select
              value={filterCampaign}
              onChange={(e) => setFilterCampaign(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-inner shadow-slate-900/5 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              <option value="all">All Campaigns</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Pages</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{landingPages.length}</p>
        </div>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-green-700">Active</p>
          <p className="mt-2 text-3xl font-bold text-green-900">
            {landingPages.filter(p => p.active).length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Inactive</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {landingPages.filter(p => !p.active).length}
          </p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-700">Filtered</p>
          <p className="mt-2 text-3xl font-bold text-blue-900">{filteredPages.length}</p>
        </div>
      </div>

      {/* Landing Pages Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Title
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Slug
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Campaign
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Created
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-4 text-6xl">📄</div>
                      <p className="text-lg font-medium text-slate-900">No landing pages found</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {searchTerm || filterActive !== 'all' || filterCampaign !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Create your first landing page to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPages.map((page) => (
                  <tr key={page.id} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{page.title}</p>
                        {page.description && (
                          <p className="mt-1 text-xs text-slate-500">{page.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        /{page.slug}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      {page.campaign ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                          {page.campaign.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">No campaign</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => canManage && handleToggleActive(page.id, page.active)}
                        disabled={!canManage}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition ${
                          page.active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        } ${!canManage ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      >
                        <span className={`mr-1.5 h-2 w-2 rounded-full ${page.active ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                        {page.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(page.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/landing/${page.slug}`}
                          target="_blank"
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                        >
                          Preview
                        </Link>
                        {canManage && (
                          <>
                            <button
                              onClick={() => openEditModal(page)}
                              className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePage(page.id, page.title)}
                              className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">Create Landing Page</h2>
              <p className="mt-1 text-sm text-slate-500">Fill in the details for your new landing page</p>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Enter page title"
                    className="w-full"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="page-url-slug"
                    className="w-full font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    URL: /landing/{formData.slug || 'your-slug'}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this landing page"
                    rows={3}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-inner shadow-slate-900/5 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                {/* Campaign */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Campaign
                  </label>
                  <select
                    value={formData.campaign_id || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      campaign_id: e.target.value ? Number(e.target.value) : undefined
                    }))}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-inner shadow-slate-900/5 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="">No campaign</option>
                    {campaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Content */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Content (HTML)
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="<h1>Welcome</h1><p>Your content here</p>"
                    rows={8}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm text-slate-900 shadow-inner shadow-slate-900/5 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="create-active"
                    checked={formData.active}
                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="create-active" className="text-sm font-medium text-slate-700">
                    Activate immediately
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <Button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                variant="outline"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePage}
                disabled={saving || !formData.title.trim() || !formData.slug.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Creating...' : 'Create Landing Page'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && currentPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">Edit Landing Page</h2>
              <p className="mt-1 text-sm text-slate-500">Update the details for "{currentPage.title}"</p>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter page title"
                    className="w-full"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="page-url-slug"
                    className="w-full font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    URL: /landing/{formData.slug || 'your-slug'}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this landing page"
                    rows={3}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-inner shadow-slate-900/5 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                {/* Campaign */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Campaign
                  </label>
                  <select
                    value={formData.campaign_id || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      campaign_id: e.target.value ? Number(e.target.value) : undefined
                    }))}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-inner shadow-slate-900/5 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="">No campaign</option>
                    {campaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Content */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Content (HTML)
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="<h1>Welcome</h1><p>Your content here</p>"
                    rows={8}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm text-slate-900 shadow-inner shadow-slate-900/5 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="edit-active"
                    checked={formData.active}
                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="edit-active" className="text-sm font-medium text-slate-700">
                    Active
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <Button
                onClick={() => {
                  setShowEditModal(false);
                  setCurrentPage(null);
                  resetForm();
                }}
                variant="outline"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePage}
                disabled={saving || !formData.title.trim() || !formData.slug.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Updating...' : 'Update Landing Page'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




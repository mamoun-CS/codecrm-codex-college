'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type UploadType = 'leads' | 'ad-spend';

export default function CSVUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<UploadType>('leads');
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError('Please select a valid CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const endpoint = uploadType === 'leads'
        ? '/api/csv-upload/leads'
        : '/api/csv-upload/spend-data';

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Upload CSV Data</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          {/* Upload Type Selection */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Upload Type</h2>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="leads"
                  checked={uploadType === 'leads'}
                  onChange={(e) => setUploadType(e.target.value as UploadType)}
                  className="mr-2"
                />
                <span className="text-gray-700 font-medium">Leads Data</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="ad-spend"
                  checked={uploadType === 'ad-spend'}
                  onChange={(e) => setUploadType(e.target.value as UploadType)}
                  className="mr-2"
                />
                <span className="text-gray-700 font-medium">Ad Spend Data</span>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">CSV File Requirements</h2>
            <p className="text-gray-600 mb-4">
              Upload a CSV file with the following columns:
            </p>

            {uploadType === 'leads' ? (
              <>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><strong>full_name</strong> - Full name of the lead (required)</li>
                  <li><strong>phone</strong> - Phone number (required if no email)</li>
                  <li><strong>email</strong> - Email address (required if no phone)</li>
                  <li><strong>country</strong> - Country (optional)</li>
                  <li><strong>city</strong> - City (optional)</li>
                  <li><strong>language</strong> - Language (optional)</li>
                  <li><strong>source</strong> - Lead source (optional)</li>
                  <li><strong>campaign_name</strong> - Campaign name (optional, must match existing campaigns)</li>
                  <li><strong>utm_source</strong> - UTM source (optional)</li>
                  <li><strong>utm_medium</strong> - UTM medium (optional)</li>
                  <li><strong>utm_campaign</strong> - UTM campaign (optional)</li>
                  <li><strong>utm_term</strong> - UTM term (optional)</li>
                  <li><strong>utm_content</strong> - UTM content (optional)</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  The system will check for existing leads by email or phone and skip duplicates. Campaign names will be matched with existing campaigns.
                </p>
              </>
            ) : (
              <>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><strong>Date</strong> - Date in YYYY-MM-DD format (required)</li>
                  <li><strong>Campaign</strong> - Campaign name (required, must match existing campaigns)</li>
                  <li><strong>Spend</strong> - Amount spent (required, numeric)</li>
                  <li><strong>Currency</strong> - Currency code (optional, defaults to USD)</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  Campaign names must exactly match existing campaigns in your CRM. The system will create ad spend entries for each row.
                </p>
              </>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload CSV'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="text-red-800">{error}</div>
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-green-800 font-semibold">Upload Successful!</h3>
              <div className="mt-2 text-green-700">
                {uploadType === 'leads' ? (
                  <>
                    <p>Processed {result.processed} rows</p>
                    <p>Imported {result.imported} leads</p>
                    {result.duplicates && result.duplicates.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Duplicate matches found (leads still imported):</p>
                        <ul className="list-disc list-inside">
                          {result.duplicates.map((duplicate: string, index: number) => (
                            <li key={index}>{duplicate}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p>Processed {result.processed || result.total} rows</p>
                    <p>Imported {result.imported || result.successful} ad spend entries</p>
                  </>
                )}
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Errors:</p>
                    <ul className="list-disc list-inside">
                      {result.errors.map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
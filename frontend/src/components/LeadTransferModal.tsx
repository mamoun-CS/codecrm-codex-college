'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { leadsAPI } from '../lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  team?: {
    id: number;
    name: string;
  };
}

interface Lead {
  id: number;
  full_name: string;
  phone?: string;
  email?: string;
}

interface LeadTransferModalProps {
  lead: Lead;
  receiver: User;
  onClose: () => void;
  onSuccess: () => void;
  onTransfer?: (lead: Lead, receiver: User, notes: string) => Promise<void>;
}

export default function LeadTransferModal({
  lead,
  receiver,
  onClose,
  onSuccess,
  onTransfer
}: LeadTransferModalProps) {
  const [notes, setNotes] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleTransfer = async () => {
    if (!notes.trim()) {
      setMessage({ type: 'error', text: 'Please add transfer notes' });
      return;
    }

    setTransferring(true);
    setMessage(null);

    try {
      // Use the provided onTransfer function if available, otherwise use the default API call
      if (onTransfer) {
        await onTransfer(lead, receiver, notes.trim());
      } else {
        await leadsAPI.transferLead(lead.id, receiver.id, notes.trim());
      }
      
      setMessage({
        type: 'success',
        text: `Lead successfully transferred to ${receiver.name}`
      });
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Transfer failed'
      });
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Transfer lead</p>
            <h2 className="text-xl font-bold text-slate-900">{lead.full_name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Lead Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <h3 className="font-semibold">{lead.full_name}</h3>
          {lead.phone && <p className="text-sm text-gray-600">Phone: {lead.phone}</p>}
          {lead.email && <p className="text-sm text-gray-600">Email: {lead.email}</p>}
        </div>

        {/* Receiver Info */}
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <p className="text-sm text-gray-600 mb-1">Transferring to:</p>
          <h3 className="font-semibold"> {receiver.name}</h3>
          <p className="text-sm text-gray-600">{receiver.email}</p>
          <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
            {receiver.role}
          </span>
          {receiver.team && (
            <p className="text-xs text-gray-500 mt-1">Team: {receiver.team.name}</p>
          )}
        </div>

        {/* Transfer Notes */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Transfer Notes *
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Explain why you're transferring this lead..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            This note will be visible in the lead's activity history
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-3 rounded mb-4 ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            disabled={transferring}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={handleTransfer}
            disabled={transferring || !notes.trim()}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
          >
            {transferring ? 'Transferring…' : 'Transfer Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

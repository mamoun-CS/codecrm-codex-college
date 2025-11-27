import { Upload, UserPlus, MessageSquare, Phone, Mail, Edit, RefreshCcw } from 'lucide-react';

const quickActions = [
  { label: 'Import Customers', icon: Upload },
  { label: 'Add Customer', icon: UserPlus },
  { label: 'Send SMS', icon: MessageSquare },
  { label: 'WA Web', icon: Phone },
  { label: 'WA API', icon: Phone },
  { label: 'Send Email', icon: Mail },
  { label: 'Edit Record', icon: Edit },
  { label: 'Refresh', icon: RefreshCcw },
];

const Toolbar = () => {
  return (
    <section className="rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-4 py-4 text-white shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-blue-100">Quick actions</p>
          <p className="text-lg font-semibold">Manage leads in a tap</p>
        </div>
      </div>
      <nav
        className="mt-4 flex w-full snap-x snap-mandatory items-center gap-3 overflow-x-auto pb-2"
        aria-label="Lead quick actions"
      >
        {quickActions.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className="snap-start rounded-2xl bg-white/90 px-4 py-3 text-sm font-semibold text-blue-600 shadow-sm transition hover:bg-white"
          >
            <span className="flex min-w-[140px] items-center gap-2">
              <Icon className="h-4 w-4" />
              {label}
            </span>
          </button>
        ))}
      </nav>
    </section>
  );
};

export default Toolbar;

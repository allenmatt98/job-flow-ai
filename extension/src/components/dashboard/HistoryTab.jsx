import React, { useState } from 'react';
import { History, Search, Plus, RefreshCw, ExternalLink, FileText, Trash2, ChevronDown, X } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

const STATUS_BADGE = {
  applied: 'info',
  interviewing: 'warning',
  offer: 'success',
  rejected: 'error',
  withdrawn: 'neutral',
};

export default function HistoryTab({
  session,
  applications,
  historyLoading,
  historySearch,
  setHistorySearch,
  historyFilter,
  setHistoryFilter,
  showAddApp,
  setShowAddApp,
  newApp,
  setNewApp,
  onAddApplication,
  onStatusChange,
  onDeleteApp,
  onViewCoverLetter,
  onLogin,
  onRefresh,
}) {
  if (!session) {
    return (
      <Card padding="lg" className="text-center max-w-3xl">
        <History className="mx-auto text-slate-600 mb-4" size={48} />
        <h3 className="text-xl text-slate-400">Application History</h3>
        <p className="text-slate-500 mt-2 mb-4">Sign in to track and sync your applications.</p>
        <Button onClick={onLogin}>Sign In with Google</Button>
      </Card>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Toolbar */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by company or role..."
            className="input-field w-full pl-9"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-44"
          value={historyFilter}
          onChange={(e) => setHistoryFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="applied">Applied</option>
          <option value="interviewing">Interviewing</option>
          <option value="offer">Offer</option>
          <option value="rejected">Rejected</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
        <Button icon={Plus} onClick={() => setShowAddApp(!showAddApp)}>Add</Button>
        <Button variant="secondary" onClick={onRefresh} className="px-3">
          <RefreshCw size={16} className={historyLoading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Add Form */}
      {showAddApp && (
        <Card padding="md" className="mb-6">
          <h4 className="font-medium mb-3">Add Application</h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input className="input-field" placeholder="Company *" value={newApp.company_name} onChange={(e) => setNewApp(p => ({ ...p, company_name: e.target.value }))} />
            <input className="input-field" placeholder="Job Title" value={newApp.job_title} onChange={(e) => setNewApp(p => ({ ...p, job_title: e.target.value }))} />
            <input className="input-field" placeholder="Job URL" value={newApp.job_url} onChange={(e) => setNewApp(p => ({ ...p, job_url: e.target.value }))} />
            <input className="input-field" placeholder="Platform (e.g. greenhouse)" value={newApp.platform} onChange={(e) => setNewApp(p => ({ ...p, platform: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setShowAddApp(false)}>Cancel</Button>
            <Button size="sm" onClick={onAddApplication} disabled={!newApp.company_name.trim()}>Save</Button>
          </div>
        </Card>
      )}

      {/* Stats Bar */}
      {applications.length > 0 && (
        <div className="flex gap-3 mb-6 text-sm flex-wrap">
          <span className="text-slate-400">{applications.length} application{applications.length !== 1 ? 's' : ''}</span>
          {['applied', 'interviewing', 'offer', 'rejected'].map(s => {
            const count = applications.filter(a => a.status === s).length;
            return count > 0 ? (
              <Badge key={s} variant={STATUS_BADGE[s]}>{count} {s}</Badge>
            ) : null;
          })}
        </div>
      )}

      {/* Table */}
      {historyLoading ? (
        <div className="text-center py-12 text-slate-500">Loading applications...</div>
      ) : applications.length === 0 ? (
        <Card padding="lg" className="text-center">
          <History className="mx-auto text-slate-600 mb-4" size={48} />
          <h3 className="text-xl text-slate-400">No Applications Yet</h3>
          <p className="text-slate-500 mt-2">Click "Add" to manually log an application, or they'll be tracked automatically.</p>
        </Card>
      ) : (
        <Card padding="sm" className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Company</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Platform</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, i) => (
                <tr key={app.id} className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${i % 2 === 1 ? 'bg-slate-800/10' : ''}`}>
                  <td className="p-3 text-slate-400 whitespace-nowrap">
                    {new Date(app.applied_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 font-medium text-white">{app.company_name}</td>
                  <td className="p-3 text-slate-300">{app.job_title || '-'}</td>
                  <td className="p-3 text-slate-400 capitalize">{app.platform || '-'}</td>
                  <td className="p-3">
                    <StatusDropdown value={app.status} onChange={(s) => onStatusChange(app.id, s)} />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2 justify-end">
                      {app.job_url && (
                        <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-blue-400" title="Open job posting">
                          <ExternalLink size={16} />
                        </a>
                      )}
                      {app.cover_letters?.length > 0 && (
                        <button onClick={() => onViewCoverLetter(app)} className="text-slate-500 hover:text-green-400" title="View cover letter">
                          <FileText size={16} />
                        </button>
                      )}
                      <button onClick={() => onDeleteApp(app.id)} className="text-slate-500 hover:text-red-400" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const statuses = ['applied', 'interviewing', 'offer', 'rejected', 'withdrawn'];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1"
      >
        <Badge variant={STATUS_BADGE[value] || 'neutral'}>
          {value} <ChevronDown size={12} />
        </Badge>
      </button>
      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10 min-w-[120px] overflow-hidden">
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs capitalize hover:bg-slate-700 transition-colors ${s === value ? 'text-blue-400' : 'text-slate-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import React from 'react';
import { LogOut, RefreshCw } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

export default function SettingsTab({ session, syncStatus, onLogin, onLogout, onSyncAnswers }) {
  return (
    <div className="max-w-3xl space-y-6">
      <Card padding="lg">
        <h3 className="text-lg font-medium mb-4">Account</h3>
        {session ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Signed in as <span className="text-white">{session.user.email}</span></p>
            <p className="text-xs text-slate-500">Your data syncs across devices when signed in.</p>
            <Button variant="danger" size="sm" icon={LogOut} onClick={onLogout}>Sign Out</Button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-400 mb-3">Sign in to sync your data across devices.</p>
            <Button size="sm" onClick={onLogin}>Sign In with Google</Button>
          </div>
        )}
      </Card>

      <Card padding="lg">
        <h3 className="text-lg font-medium mb-4">Data</h3>
        <p className="text-sm text-slate-400 mb-3">
          Profile, experience, education, and resume are stored locally in your browser.
          Application history and saved answers sync to the cloud when signed in.
        </p>
        {session && (
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            loading={syncStatus === 'syncing'}
            onClick={onSyncAnswers}
          >
            Force Sync Answers
          </Button>
        )}
      </Card>

      <Card padding="lg">
        <h3 className="text-lg font-medium mb-2">About</h3>
        <p className="text-sm text-slate-400">Job Flow AI v1.2.0</p>
        <p className="text-xs text-slate-500 mt-1">AI-powered job application assistant. We never sell your data.</p>
      </Card>
    </div>
  );
}

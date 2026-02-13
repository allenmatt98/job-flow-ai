import React, { useState, useEffect } from 'react';
import { Briefcase, Clock, MessageSquare, TrendingUp } from 'lucide-react';
import Card from '../ui/Card';
import { getTimeSaved, getAnswerMemory } from '../../utils/storage';

export default function OverviewTab({ session, applications, onNavigate }) {
  const [stats, setStats] = useState({ timeSaved: 0, appCount: 0, answerCount: 0 });

  useEffect(() => {
    const loadStats = async () => {
      const { timeSavedMinutes, applicationCount } = await getTimeSaved();
      const answers = await getAnswerMemory();
      setStats({
        timeSaved: timeSavedMinutes,
        appCount: applicationCount,
        answerCount: Object.keys(answers).length,
      });
    };
    loadStats();
  }, []);

  const statCards = [
    { label: 'Applications', value: applications.length || stats.appCount, icon: Briefcase, color: 'text-blue-400' },
    { label: 'Interviews', value: applications.filter(a => a.status === 'interviewing').length, icon: TrendingUp, color: 'text-yellow-400' },
    { label: 'Time Saved', value: `${stats.timeSaved}m`, icon: Clock, color: 'text-green-400' },
    { label: 'Saved Answers', value: stats.answerCount, icon: MessageSquare, color: 'text-purple-400' },
  ];

  const recentApps = applications.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} padding="md">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-slate-800 ${color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card padding="lg">
        <h3 className="text-lg font-medium text-white mb-4">Recent Applications</h3>
        {recentApps.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No applications yet. Start applying to see your history here.</p>
        ) : (
          <div className="space-y-3">
            {recentApps.map(app => (
              <div key={app.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{app.company_name}</p>
                  <p className="text-xs text-slate-400">{app.job_title || 'No title'}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                  app.status === 'applied' ? 'bg-blue-500/20 text-blue-400' :
                  app.status === 'interviewing' ? 'bg-yellow-500/20 text-yellow-400' :
                  app.status === 'offer' ? 'bg-green-500/20 text-green-400' :
                  app.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>{app.status}</span>
              </div>
            ))}
          </div>
        )}
        {applications.length > 5 && (
          <button onClick={() => onNavigate('history')} className="text-sm text-blue-400 hover:text-blue-300 mt-3">
            View all {applications.length} applications
          </button>
        )}
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Edit Profile', tab: 'profile' },
          { label: 'Upload Resume', tab: 'resume' },
          { label: 'Saved Answers', tab: 'answers' },
        ].map(({ label, tab }) => (
          <Card key={tab} variant="interactive" padding="md" onClick={() => onNavigate(tab)}>
            <p className="text-sm text-center text-slate-300">{label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

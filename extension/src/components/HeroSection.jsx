import React from 'react';
import { Zap, Clock } from 'lucide-react';

export default function HeroSection({ isJobPage, timeSaved, applicationCount }) {
  return (
    <div className="hero-gradient">
      <div className="relative z-10">
        {isJobPage ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} className="text-blue-400" />
              <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">Job Detected</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Ready to Apply?</h2>
            <p className="text-sm text-slate-400">We found form fields on this page. Let AI fill them in for you.</p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-blue-400" />
              <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">Your Progress</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              {timeSaved > 0 ? `You've saved ~${timeSaved} min` : 'Welcome Back'}
            </h2>
            <p className="text-sm text-slate-400">
              {applicationCount > 0
                ? `${applicationCount} application${applicationCount !== 1 ? 's' : ''} assisted so far`
                : 'Navigate to a job posting to get started'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

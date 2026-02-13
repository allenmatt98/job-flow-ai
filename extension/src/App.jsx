import React, { useState, useEffect } from 'react';
import { getProfile, getTimeSaved, incrementTimeSaved } from './utils/storage';
import { generateResponse } from './utils/api';
import { getSession, saveCoverLetter } from './utils/supabase';
import { Settings, Loader, Check, FileText, Wand2, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import HeroSection from './components/HeroSection';
import ActionBoard from './components/ActionBoard';
import './index.css';

function App() {
  const [isJobPage, setIsJobPage] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [filling, setFilling] = useState(false);
  const [autofillDone, setAutofillDone] = useState(false);
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [coverLetterSaved, setCoverLetterSaved] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [timeSaved, setTimeSaved] = useState(0);
  const [applicationCount, setApplicationCount] = useState(0);

  useEffect(() => {
    // Load stats
    getTimeSaved().then(({ timeSavedMinutes, applicationCount: count }) => {
      setTimeSaved(timeSavedMinutes);
      setApplicationCount(count);
    });

    // Auto-scan on mount to detect job page
    autoScan();
  }, []);

  const autoScan = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'SCAN_PAGE' });
      if (response && response.count > 0) {
        setIsJobPage(true);
        setScanResult(response);
      }
    } catch {
      // Not on a scannable page
    }
  };

  const handleScan = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'SCAN_PAGE' });
      if (response) {
        setScanResult(response);
        setIsJobPage(response.count > 0);
      }
    } catch (err) {
      console.error('Scan failed:', err);
      setScanResult({ count: 0, fields: [] });
    }
  };

  const handleAutofill = async () => {
    setFilling(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const profile = await getProfile();
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'AUTOFILL', profile });
      if (response?.success) {
        setAutofillDone(true);
        setSaveResult(null);
        const stats = await incrementTimeSaved(5);
        setTimeSaved(stats.timeSavedMinutes);
        setApplicationCount(stats.applicationCount);
      }
    } catch (err) {
      console.error('Autofill failed:', err);
    }
    setFilling(false);
  };

  const handleSaveAnswers = async () => {
    setSavingAnswers(true);
    setSaveResult(null);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'SAVE_ANSWERS' });
      if (response?.error) {
        setSaveResult({ error: response.error });
      } else {
        setSaveResult({ saved: response.saved, total: response.totalStored });
      }
    } catch (err) {
      console.error('Save answers failed:', err);
      setSaveResult({ error: err.message });
    }
    setSavingAnswers(false);
  };

  const handleGenerateCoverLetter = async () => {
    setGenerating(true);
    setGeneratedContent('');
    setCoverLetterSaved(false);

    try {
      // UX Fix: Check session first
      const session = await getSession();
      if (!session) {
        alert('Please log in via Settings to use the AI features.');
        setGenerating(false);
        return;
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const profile = await getProfile();
      const pageTextResponse = await chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_TEXT' });
      const jobDescription = pageTextResponse?.text || '';

      if (!jobDescription) {
        alert('Could not read page content. Please try again on a job post page.');
        setGenerating(false);
        return;
      }

      const result = await generateResponse({ jobDescription, userProfile: profile, type: 'coverLetter' });
      if (result.response) {
        setGeneratedContent(result.response);
        setShowCoverLetter(true);

        // Auto-save to cloud since we have a session
        const pageTitle = tab.title || '';
        saveCoverLetter({
          content: result.response,
          jobTitle: pageTitle,
          companyName: extractCompany(tab.url),
        }).catch(() => { });
        setCoverLetterSaved(true);
      } else {
        alert('Generation failed. Ensure the Backend is running.');
      }
    } catch (err) {
      console.error('Generation Error:', err);
      // Handle the 401 specifically if it comes through
      if (err.message && err.message.toLowerCase().includes('unauthorized')) {
        alert('Session expired. Please log in again via Settings.');
      } else {
        alert(`Error: ${err.message || 'Error connecting to backend services.'}`);
      }
    }
    setGenerating(false);
  };

  const extractCompany = (url) => {
    try {
      const hostname = new URL(url).hostname;
      const parts = hostname.replace('www.', '').split('.');
      return parts.length > 2 ? parts[parts.length - 3] : parts[0];
    } catch { return ''; }
  };

  const handleAction = (action) => {
    switch (action) {
      case 'coverLetter':
        handleGenerateCoverLetter();
        break;
      case 'resume':
      case 'profile':
        chrome.runtime.openOptionsPage?.() || window.open(chrome.runtime.getURL('src/options/index.html'));
        break;
      case 'saveAnswers':
        handleSaveAnswers();
        break;
    }
  };

  return (
    <div className="side-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Wand2 size={20} className="text-blue-400" />
          <h1 className="text-base font-bold text-white">Job Flow AI</h1>
        </div>
        <button
          onClick={() => chrome.runtime.openOptionsPage?.() || window.open(chrome.runtime.getURL('src/options/index.html'))}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Open Dashboard"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ animation: 'slideUp 0.3s ease' }}>
        {/* Hero */}
        <HeroSection isJobPage={isJobPage} timeSaved={timeSaved} applicationCount={applicationCount} />

        {/* Smart Button */}
        <button
          onClick={isJobPage ? handleAutofill : handleScan}
          disabled={filling}
          className="btn-hero"
        >
          {filling ? (
            <><Loader size={18} className="animate-spin" /> Filling Fields...</>
          ) : isJobPage ? (
            <><Wand2 size={18} /> Autofill Application</>
          ) : (
            <><Wand2 size={18} /> Scan for Job Details</>
          )}
        </button>

        {/* Scan result info */}
        {scanResult && (
          <div className="text-center text-xs text-slate-500">
            {scanResult.count > 0
              ? `${scanResult.count} field${scanResult.count !== 1 ? 's' : ''} detected`
              : 'No form fields found on this page'}
          </div>
        )}

        {/* Post-autofill actions */}
        {autofillDone && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center" style={{ animation: 'slideUp 0.2s ease' }}>
            <p className="text-sm text-green-400 flex items-center justify-center gap-1.5">
              <Check size={16} /> Fields filled successfully
            </p>
            {saveResult && !saveResult.error && (
              <p className="text-xs text-green-400/70 mt-1">
                Saved {saveResult.saved} answer{saveResult.saved !== 1 ? 's' : ''}
              </p>
            )}
            {saveResult?.error && (
              <p className="text-xs text-red-400 mt-1">Error: {saveResult.error}</p>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <ActionBoard onAction={handleAction} />

        {/* Cover Letter Result */}
        {generatedContent && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden" style={{ animation: 'slideUp 0.2s ease' }}>
            <button
              onClick={() => setShowCoverLetter(!showCoverLetter)}
              className="w-full flex items-center justify-between p-3 text-sm font-medium text-white hover:bg-slate-800/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText size={16} className="text-blue-400" /> Cover Letter
                {coverLetterSaved && <span className="text-xs text-green-400">(Saved)</span>}
              </span>
              {showCoverLetter ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showCoverLetter && (
              <div className="p-3 border-t border-slate-800">
                <pre className="whitespace-pre-wrap text-xs text-slate-300 font-sans leading-relaxed max-h-60 overflow-y-auto mb-3">
                  {generatedContent}
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(generatedContent)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg py-2 text-xs transition-colors"
                >
                  <Copy size={14} /> Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <span>v1.2.0</span>
        {scanResult && <span>{scanResult.count} fields</span>}
      </div>
    </div>
  );
}

export default App;

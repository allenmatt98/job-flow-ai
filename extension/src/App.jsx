import React, { useState } from 'react';
import ProfileForm from './components/ProfileForm';
import { getProfile } from './utils/storage';
import { generateResponse } from './utils/api';
import { User, Briefcase, Settings, FileText, Loader } from 'lucide-react';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('profile');
  const [scanResult, setScanResult] = useState(null);
  const [filling, setFilling] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');

  const handleScan = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'SCAN_PAGE' });
      if (response) {
        setScanResult(response);
      }
    } catch (err) {
      console.error('Scan failed:', err);
      // Fallback for dev/error
      setScanResult({ count: 0, fields: [] });
    }
  };

  const handleAutofill = async () => {
    setFilling(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const profile = await getProfile();

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'AUTOFILL',
        profile
      });

      if (response && response.success) {
        console.log('Filled', response.count);
      }
    } catch (err) {
      console.error('Autofill failed:', err);
    }
    setFilling(false);
  };

  const handleGenerateCoverLetter = async () => {
    setGenerating(true);
    setGeneratedContent('');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const profile = await getProfile();

      // Get page text
      const pageTextResponse = await chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_TEXT' });
      const jobDescription = pageTextResponse?.text || '';

      if (!jobDescription) {
        alert('Could not read page content. Please try again on a job post page.');
        setGenerating(false);
        return;
      }

      const result = await generateResponse({
        jobDescription,
        userProfile: profile,
        type: 'coverLetter'
      });

      if (result.response) {
        setGeneratedContent(result.response);
      } else {
        alert('Generation failed. Ensure the Backend is running and API Key is set in backend/.env');
      }

    } catch (err) {
      console.error('Generation Error:', err);
      alert('Error connecting to backend services.');
    }
    setGenerating(false);
  };

  return (
    <div className="container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <header className="flex items-center justify-between mb-2">
        <h2>Job Flow AI</h2>
        <div className="badge">v1.1.2</div>
      </header>

      <div className="tabs">
        <button
          className={`tab flex items-center gap-2 ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={16} /> Profile
        </button>
        <button
          className={`tab flex items-center gap-2 ${activeTab === 'job' ? 'active' : ''}`}
          onClick={() => setActiveTab('job')}
        >
          <Briefcase size={16} /> Job Context
        </button>
      </div>

      <main>
        {activeTab === 'profile' && <ProfileForm />}
        {activeTab === 'job' && (
          <div className="card">
            <h3>Job Context</h3>
            <p className="label">Scan the current page to extract job details.</p>

            <button onClick={handleScan} className="btn-primary mt-4 w-full flex justify-center gap-2">
              Scan Current Page
            </button>

            {scanResult && (
              <div className="mt-4 p-4 border rounded bg-slate-800">
                <p className="mb-2">Found <strong>{scanResult.count}</strong> fields.</p>
                <ul className="text-xs text-slate-400 mb-4 list-disc pl-4">
                  {scanResult.fields.map((f, i) => (
                    <li key={i}>{f.type} ({f.tagName})</li>
                  ))}
                </ul>

                <button
                  onClick={handleAutofill}
                  disabled={filling || scanResult.count === 0}
                  className="btn-primary w-full"
                >
                  {filling ? 'Filling...' : 'Autofill Fields'}
                </button>
              </div>
            )}

            <div className="card mt-4">
              <h3 className="flex items-center gap-2 mb-2"><FileText size={18} /> AI Assistant</h3>
              <p className="label">Generate tailored content based on this page.</p>
              <button
                onClick={handleGenerateCoverLetter}
                disabled={generating}
                className="btn-secondary w-full mt-2 flex justify-center gap-2"
              >
                {generating ? <Loader className="animate-spin" size={16} /> : <FileText size={16} />}
                Generate Cover Letter
              </button>

              {generatedContent && (
                <div className="mt-4">
                  <label className="label">Result:</label>
                  <textarea
                    className="w-full text-sm font-mono bg-slate-900 border-slate-700"
                    rows={8}
                    readOnly
                    value={generatedContent}
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedContent)}
                    className="btn-secondary w-full mt-2 text-xs"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

import React, { useState, useEffect, useCallback } from 'react';
import { getProfile, saveProfile, getAnswerMemory, saveAnswerMemory } from '../utils/storage';
import { signInWithGoogle, signOut, getSession, getApplications, logApplication, updateApplicationStatus, deleteApplication, saveCoverLetter, deleteCoverLetter } from '../utils/supabase';
import { deleteAnswerEverywhere, fullSync } from '../utils/AnswerMemory';
import { parseResume } from '../utils/api';
import { dataURLtoBlob } from '../content/utils/FileUploader';
import { User, Briefcase, GraduationCap, FileText, History, Settings, LogOut, Plus, Trash2, Save, HelpCircle, Wand2, Search, X, ExternalLink, ChevronDown, RefreshCw, CloudOff, Cloud } from 'lucide-react';

const STATUS_COLORS = {
    applied: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    interviewing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    offer: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    withdrawn: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export default function OptionsApp() {
    const [activeTab, setActiveTab] = useState('profile');
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        userProfile: {},
        education: [],
        experience: [],
        resume: null
    });
    const [answers, setAnswers] = useState({});
    const [editingKey, setEditingKey] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [saveStatus, setSaveStatus] = useState('');
    const [parseStatus, setParseStatus] = useState('');

    // History state
    const [applications, setApplications] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
    const [historyFilter, setHistoryFilter] = useState('');
    const [showAddApp, setShowAddApp] = useState(false);
    const [newApp, setNewApp] = useState({ company_name: '', job_title: '', job_url: '', platform: '' });

    // Cover letter modal
    const [coverLetterModal, setCoverLetterModal] = useState(null);

    // Sync state
    const [syncStatus, setSyncStatus] = useState('');

    useEffect(() => {
        checkSession();
        loadData();
    }, []);

    const checkSession = async () => {
        const sess = await getSession();
        setSession(sess);
        if (sess) {
            // Trigger background sync of answers on login
            setSyncStatus('syncing');
            fullSync().then(() => {
                getAnswerMemory().then(setAnswers);
                setSyncStatus('synced');
                setTimeout(() => setSyncStatus(''), 3000);
            }).catch(() => setSyncStatus(''));
        }
    };

    const loadData = async () => {
        const stored = await getProfile();
        setData(stored);
        const mem = await getAnswerMemory();
        setAnswers(mem);
        setLoading(false);
    };

    const loadApplications = useCallback(async () => {
        setHistoryLoading(true);
        const { data: apps, error } = await getApplications({
            search: historySearch || undefined,
            status: historyFilter || undefined,
        });
        if (!error && apps) {
            setApplications(apps);
        }
        setHistoryLoading(false);
    }, [historySearch, historyFilter]);

    useEffect(() => {
        if (session && activeTab === 'history') {
            loadApplications();
        }
    }, [session, activeTab, loadApplications]);

    useEffect(() => {
        if (session && activeTab === 'history') {
            const debounce = setTimeout(loadApplications, 300);
            return () => clearTimeout(debounce);
        }
    }, [historySearch, historyFilter, loadApplications, session, activeTab]);

    const handleLogin = async () => {
        const { data: authData, error } = await signInWithGoogle();
        if (error) {
            alert(error.message);
        } else if (authData?.session) {
            setSession(authData.session);
            // Sync answers after login
            setSyncStatus('syncing');
            fullSync().then(() => {
                getAnswerMemory().then(setAnswers);
                setSyncStatus('synced');
                setTimeout(() => setSyncStatus(''), 3000);
            }).catch(() => setSyncStatus(''));
        }
    };

    const handleLogout = async () => {
        await signOut();
        setSession(null);
        setApplications([]);
    };

    const handleSave = async () => {
        setSaveStatus('Saving...');
        await saveProfile(data);
        setSaveStatus('Saved!');
        setTimeout(() => setSaveStatus(''), 2000);
    };

    const updateProfile = (field, value) => {
        setData(prev => ({
            ...prev,
            userProfile: { ...prev.userProfile, [field]: value }
        }));
    };

    const addItem = (section, template) => {
        setData(prev => ({
            ...prev,
            [section]: [...prev[section], template]
        }));
    };

    const updateItem = (section, index, field, value) => {
        const newList = [...data[section]];
        newList[index] = { ...newList[index], [field]: value };
        setData(prev => ({ ...prev, [section]: newList }));
    };

    const removeItem = (section, index) => {
        const newList = [...data[section]];
        newList.splice(index, 1);
        setData(prev => ({ ...prev, [section]: newList }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 4 * 1024 * 1024) {
            alert("File is too large (Max 4MB for local storage)");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setData(prev => ({
                ...prev,
                resume: { name: file.name, type: file.type, data: reader.result }
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleParseResume = async () => {
        if (!data.resume?.data) {
            setParseStatus('No resume uploaded yet.');
            return;
        }
        setParseStatus('Parsing resume with AI...');
        try {
            const blob = dataURLtoBlob(data.resume.data);
            const file = new File([blob], data.resume.name, { type: data.resume.type });
            const result = await parseResume(file, { extractStructured: true });

            if (result.structured) {
                const s = result.structured;
                setData(prev => {
                    const merged = { ...prev };
                    if (s.userProfile) {
                        const up = { ...prev.userProfile };
                        for (const [key, val] of Object.entries(s.userProfile)) {
                            if (val && !up[key]) up[key] = val;
                        }
                        merged.userProfile = up;
                    }
                    if (s.education?.length > 0 && (!prev.education || prev.education.length === 0)) {
                        merged.education = s.education;
                    }
                    if (s.experience?.length > 0 && (!prev.experience || prev.experience.length === 0)) {
                        merged.experience = s.experience;
                    }
                    return merged;
                });
                setParseStatus('Parsed! Review and save.');
            } else {
                setParseStatus('Could not extract structured data. Is the backend running?');
            }
        } catch (err) {
            console.error('Resume parse failed:', err);
            setParseStatus(`Error: ${err.message}`);
        }
        setTimeout(() => setParseStatus(''), 5000);
    };

    // ─── Answer Handlers ────────────────────────────────────────────────────

    const handleDeleteAnswer = async (key) => {
        const updated = { ...answers };
        delete updated[key];
        setAnswers(updated);
        await deleteAnswerEverywhere(key);
    };

    const handleStartEdit = (key, currentAnswer) => {
        setEditingKey(key);
        setEditValue(currentAnswer);
    };

    const handleSaveEdit = async (key) => {
        if (!editValue.trim()) return;
        const now = Date.now();
        const updated = { ...answers };
        updated[key] = { ...updated[key], answer: editValue.trim(), lastUsed: now };
        setAnswers(updated);
        setEditingKey(null);
        await saveAnswerMemory(updated);
    };

    const handleCancelEdit = () => {
        setEditingKey(null);
        setEditValue('');
    };

    const handleSyncAnswers = async () => {
        setSyncStatus('syncing');
        const result = await fullSync();
        if (result.merged) {
            const mem = await getAnswerMemory();
            setAnswers(mem);
            setSyncStatus('synced');
        } else {
            setSyncStatus('error');
        }
        setTimeout(() => setSyncStatus(''), 3000);
    };

    // ─── Application Handlers ───────────────────────────────────────────────

    const handleAddApplication = async () => {
        if (!newApp.company_name.trim()) return;
        const { error } = await logApplication({
            company_name: newApp.company_name.trim(),
            job_title: newApp.job_title.trim() || null,
            job_url: newApp.job_url.trim() || null,
            platform: newApp.platform.trim() || null,
        });
        if (!error) {
            setNewApp({ company_name: '', job_title: '', job_url: '', platform: '' });
            setShowAddApp(false);
            loadApplications();
        }
    };

    const handleStatusChange = async (appId, newStatus) => {
        await updateApplicationStatus(appId, newStatus);
        setApplications(prev => prev.map(app =>
            app.id === appId ? { ...app, status: newStatus } : app
        ));
    };

    const handleDeleteApp = async (appId) => {
        if (!confirm('Delete this application record?')) return;
        await deleteApplication(appId);
        setApplications(prev => prev.filter(app => app.id !== appId));
    };

    // ─── Cover Letter Handlers ──────────────────────────────────────────────

    const handleViewCoverLetter = (app) => {
        const letter = app.cover_letters?.[0];
        if (letter) {
            setCoverLetterModal({
                content: letter.content,
                company: app.company_name,
                role: app.job_title,
                date: letter.created_at,
                id: letter.id,
            });
        }
    };

    const handleDeleteCoverLetter = async (id) => {
        await deleteCoverLetter(id);
        setCoverLetterModal(null);
        loadApplications();
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading Dashboard...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col fixed h-full">
                <h1 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                    <Briefcase className="text-blue-500" /> Job Flow AI
                </h1>

                <nav className="flex-1 space-y-2">
                    <NavBtn label="Personal Info" icon={<User size={18} />} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
                    <NavBtn label="Experience" icon={<Briefcase size={18} />} active={activeTab === 'experience'} onClick={() => setActiveTab('experience')} />
                    <NavBtn label="Education" icon={<GraduationCap size={18} />} active={activeTab === 'education'} onClick={() => setActiveTab('education')} />
                    <NavBtn label="Resume" icon={<FileText size={18} />} active={activeTab === 'resume'} onClick={() => setActiveTab('resume')} />
                    <NavBtn label="Saved Answers" icon={<HelpCircle size={18} />} active={activeTab === 'answers'} onClick={() => setActiveTab('answers')} />
                    <div className="pt-4 border-t border-slate-800 mt-4">
                        <NavBtn label="History" icon={<History size={18} />} active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
                        <NavBtn label="Settings" icon={<Settings size={18} />} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
                    </div>
                </nav>

                <div className="pt-6 border-t border-slate-800">
                    {session ? (
                        <div className="text-sm">
                            <p className="text-slate-400 mb-2 truncate">{session.user.email}</p>
                            <div className="flex items-center gap-2">
                                {syncStatus === 'syncing' && <RefreshCw size={14} className="animate-spin text-blue-400" />}
                                {syncStatus === 'synced' && <Cloud size={14} className="text-green-400" />}
                                {syncStatus === 'error' && <CloudOff size={14} className="text-red-400" />}
                                {syncStatus && <span className="text-xs text-slate-500 capitalize">{syncStatus}</span>}
                            </div>
                            <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 mt-2">
                                <LogOut size={16} /> Sign Out
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleLogin} className="w-full btn-primary text-sm py-2">
                            Sign In / Sync
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto ml-64">
                <header className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-semibold text-white capitalize">
                        {activeTab === 'answers' ? 'Saved Answers' : activeTab === 'history' ? 'Application History' : `${activeTab} Management`}
                    </h2>
                    {activeTab !== 'history' && activeTab !== 'settings' && (
                        <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                            <Save size={18} /> {saveStatus || 'Save Changes'}
                        </button>
                    )}
                </header>

                <div className={activeTab === 'history' ? 'max-w-5xl' : 'max-w-3xl'}>
                    {/* ─── Profile Tab ─────────────────────────────────────────── */}
                    {activeTab === 'profile' && (
                        <div className="space-y-4">
                            <InputGroup label="First Name" val={data.userProfile.firstName} onChange={(v) => updateProfile('firstName', v)} />
                            <InputGroup label="Last Name" val={data.userProfile.lastName} onChange={(v) => updateProfile('lastName', v)} />
                            <InputGroup label="Email" val={data.userProfile.email} onChange={(v) => updateProfile('email', v)} />
                            <InputGroup label="Phone" val={data.userProfile.phone} onChange={(v) => updateProfile('phone', v)} />
                            <InputGroup label="LinkedIn" val={data.userProfile.linkedin} onChange={(v) => updateProfile('linkedin', v)} />
                            <InputGroup label="Portfolio" val={data.userProfile.portfolio} onChange={(v) => updateProfile('portfolio', v)} />
                            <div className="space-y-1">
                                <label className="label">About / Summary</label>
                                <textarea
                                    className="input-field w-full h-32"
                                    value={data.userProfile.about || ''}
                                    onChange={(e) => updateProfile('about', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* ─── Experience Tab ──────────────────────────────────────── */}
                    {activeTab === 'experience' && (
                        <div>
                            {data.experience.map((exp, i) => (
                                <div key={i} className="bg-slate-900 p-4 rounded mb-4 border border-slate-800 relative group">
                                    <button onClick={() => removeItem('experience', i)} className="absolute top-4 right-4 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={18} />
                                    </button>
                                    <div className="grid grid-cols-2 gap-4 mb-2">
                                        <InputGroup label="Company" val={exp.company} onChange={(v) => updateItem('experience', i, 'company', v)} />
                                        <InputGroup label="Title" val={exp.title} onChange={(v) => updateItem('experience', i, 'title', v)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-2">
                                        <InputGroup label="Start Date" type="month" val={exp.start} onChange={(v) => updateItem('experience', i, 'start', v)} />
                                        <InputGroup label="End Date" type="month" val={exp.end} onChange={(v) => updateItem('experience', i, 'end', v)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="label text-xs">Description</label>
                                        <textarea
                                            className="input-field w-full h-20 text-sm"
                                            value={exp.description || ''}
                                            onChange={(e) => updateItem('experience', i, 'description', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => addItem('experience', { company: '', title: '', start: '', end: '', description: '' })} className="btn-secondary w-full py-2 flex justify-center gap-2">
                                <Plus size={18} /> Add Experience
                            </button>
                        </div>
                    )}

                    {/* ─── Education Tab ───────────────────────────────────────── */}
                    {activeTab === 'education' && (
                        <div>
                            {data.education.map((edu, i) => (
                                <div key={i} className="bg-slate-900 p-4 rounded mb-4 border border-slate-800 relative group">
                                    <button onClick={() => removeItem('education', i)} className="absolute top-4 right-4 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={18} />
                                    </button>
                                    <div className="grid grid-cols-2 gap-4 mb-2">
                                        <InputGroup label="School" val={edu.school} onChange={(v) => updateItem('education', i, 'school', v)} />
                                        <InputGroup label="Degree" val={edu.degree} onChange={(v) => updateItem('education', i, 'degree', v)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputGroup label="Start Year" val={edu.start} onChange={(v) => updateItem('education', i, 'start', v)} />
                                        <InputGroup label="End Year" val={edu.end} onChange={(v) => updateItem('education', i, 'end', v)} />
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => addItem('education', { school: '', degree: '', start: '', end: '' })} className="btn-secondary w-full py-2 flex justify-center gap-2">
                                <Plus size={18} /> Add Education
                            </button>
                        </div>
                    )}

                    {/* ─── Resume Tab ──────────────────────────────────────────── */}
                    {activeTab === 'resume' && (
                        <div className="bg-slate-900 p-6 rounded border border-slate-800">
                            <h3 className="text-lg font-medium mb-4">Resume File</h3>
                            <p className="text-sm text-slate-400 mb-6">
                                Upload your PDF resume here. It will be stored locally in your browser (max 4MB).
                                We will automatically upload this file when you apply to jobs.
                            </p>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-slate-400
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-600 file:text-white
                                hover:file:bg-blue-700"
                            />
                            {data.resume && (
                                <div className="mt-6 p-4 bg-slate-950 rounded flex items-center gap-3 border border-slate-800">
                                    <FileText className="text-green-500" />
                                    <div className="flex-1">
                                        <p className="font-medium">{data.resume.name}</p>
                                        <p className="text-xs text-slate-500">Stored Locally • {Math.round((data.resume.data?.length || 0) * 0.75 / 1024)} KB</p>
                                    </div>
                                </div>
                            )}
                            {data.resume && (
                                <div className="mt-4">
                                    <button
                                        onClick={handleParseResume}
                                        className="btn-primary flex items-center gap-2"
                                        disabled={parseStatus === 'Parsing resume with AI...'}
                                    >
                                        <Wand2 size={18} />
                                        {parseStatus === 'Parsing resume with AI...' ? 'Parsing...' : 'Parse Resume & Auto-Fill Profile'}
                                    </button>
                                    {parseStatus && (
                                        <p className={`text-sm mt-2 ${parseStatus.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                                            {parseStatus}
                                        </p>
                                    )}
                                    <p className="text-xs text-slate-500 mt-1">
                                        Uses AI to extract profile data from your resume. Only fills empty fields — never overwrites your data.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── Saved Answers Tab ───────────────────────────────────── */}
                    {activeTab === 'answers' && (
                        <div>
                            {session && (
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={handleSyncAnswers}
                                        disabled={syncStatus === 'syncing'}
                                        className="btn-secondary text-sm flex items-center gap-2"
                                    >
                                        <RefreshCw size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                                        {syncStatus === 'syncing' ? 'Syncing...' : 'Sync to Cloud'}
                                    </button>
                                </div>
                            )}
                            {Object.keys(answers).length === 0 ? (
                                <div className="text-center py-20 bg-slate-900 rounded border border-slate-800">
                                    <HelpCircle className="mx-auto text-slate-600 mb-4" size={48} />
                                    <h3 className="text-xl text-slate-400">Saved Answers</h3>
                                    <p className="text-slate-500 mt-2">
                                        No saved answers yet. When you fill in questions on job applications and click
                                        "Save Answers to Memory", they'll appear here for reuse across applications.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {Object.entries(answers)
                                        .sort(([, a], [, b]) => (b.useCount || 0) - (a.useCount || 0))
                                        .map(([key, entry]) => (
                                            <div key={key} className="bg-slate-900 p-4 rounded border border-slate-800 relative group">
                                                <button
                                                    onClick={() => handleDeleteAnswer(key)}
                                                    className="absolute top-4 right-4 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <p className="font-medium text-white mb-1">{entry.question}</p>
                                                {editingKey === key ? (
                                                    <div className="flex gap-2 mt-1">
                                                        <input
                                                            type="text"
                                                            className="input-field flex-1 text-sm"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSaveEdit(key);
                                                                if (e.key === 'Escape') handleCancelEdit();
                                                            }}
                                                            autoFocus
                                                        />
                                                        <button onClick={() => handleSaveEdit(key)} className="btn-primary text-xs px-3 py-1">
                                                            Save
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <p
                                                        className="text-blue-400 cursor-pointer hover:text-blue-300 text-sm"
                                                        onClick={() => handleStartEdit(key, entry.answer)}
                                                    >
                                                        {entry.answer}
                                                    </p>
                                                )}
                                                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                                                    <span>Used {entry.useCount || 0} time{(entry.useCount || 0) !== 1 ? 's' : ''}</span>
                                                    <span>Field: {entry.fieldTag || 'input'}</span>
                                                    {entry.lastUsed && (
                                                        <span>Last used: {new Date(entry.lastUsed).toLocaleDateString()}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── History Tab ─────────────────────────────────────────── */}
                    {activeTab === 'history' && (
                        <div>
                            {!session ? (
                                <div className="text-center py-20 bg-slate-900 rounded border border-slate-800">
                                    <History className="mx-auto text-slate-600 mb-4" size={48} />
                                    <h3 className="text-xl text-slate-400">Application History</h3>
                                    <p className="text-slate-500 mt-2">Sign in to track and sync your applications.</p>
                                    <button onClick={handleLogin} className="btn-primary mt-4">Sign In with Google</button>
                                </div>
                            ) : (
                                <>
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
                                        <button onClick={() => setShowAddApp(!showAddApp)} className="btn-primary flex items-center gap-2">
                                            <Plus size={16} /> Add
                                        </button>
                                        <button onClick={loadApplications} className="btn-secondary p-2" title="Refresh">
                                            <RefreshCw size={16} className={historyLoading ? 'animate-spin' : ''} />
                                        </button>
                                    </div>

                                    {/* Add Application Form */}
                                    {showAddApp && (
                                        <div className="bg-slate-900 p-4 rounded border border-slate-800 mb-6">
                                            <h4 className="font-medium mb-3">Add Application</h4>
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <input className="input-field" placeholder="Company *" value={newApp.company_name} onChange={(e) => setNewApp(p => ({ ...p, company_name: e.target.value }))} />
                                                <input className="input-field" placeholder="Job Title" value={newApp.job_title} onChange={(e) => setNewApp(p => ({ ...p, job_title: e.target.value }))} />
                                                <input className="input-field" placeholder="Job URL" value={newApp.job_url} onChange={(e) => setNewApp(p => ({ ...p, job_url: e.target.value }))} />
                                                <input className="input-field" placeholder="Platform (e.g. greenhouse)" value={newApp.platform} onChange={(e) => setNewApp(p => ({ ...p, platform: e.target.value }))} />
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => setShowAddApp(false)} className="btn-secondary text-sm">Cancel</button>
                                                <button onClick={handleAddApplication} disabled={!newApp.company_name.trim()} className="btn-primary text-sm">Save</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Stats Bar */}
                                    {applications.length > 0 && (
                                        <div className="flex gap-4 mb-6 text-sm">
                                            <span className="text-slate-400">{applications.length} application{applications.length !== 1 ? 's' : ''}</span>
                                            {['applied', 'interviewing', 'offer', 'rejected'].map(s => {
                                                const count = applications.filter(a => a.status === s).length;
                                                return count > 0 ? (
                                                    <span key={s} className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[s]}`}>
                                                        {count} {s}
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    )}

                                    {/* Table */}
                                    {historyLoading ? (
                                        <div className="text-center py-12 text-slate-500">Loading applications...</div>
                                    ) : applications.length === 0 ? (
                                        <div className="text-center py-20 bg-slate-900 rounded border border-slate-800">
                                            <History className="mx-auto text-slate-600 mb-4" size={48} />
                                            <h3 className="text-xl text-slate-400">No Applications Yet</h3>
                                            <p className="text-slate-500 mt-2">Click "Add" to manually log an application, or they'll be tracked automatically when you use autofill.</p>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-900 rounded border border-slate-800 overflow-hidden">
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
                                                    {applications.map(app => (
                                                        <tr key={app.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                                            <td className="p-3 text-slate-400 whitespace-nowrap">
                                                                {new Date(app.applied_at).toLocaleDateString()}
                                                            </td>
                                                            <td className="p-3 font-medium text-white">{app.company_name}</td>
                                                            <td className="p-3 text-slate-300">{app.job_title || '-'}</td>
                                                            <td className="p-3 text-slate-400 capitalize">{app.platform || '-'}</td>
                                                            <td className="p-3">
                                                                <StatusDropdown
                                                                    value={app.status}
                                                                    onChange={(s) => handleStatusChange(app.id, s)}
                                                                />
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="flex gap-2 justify-end">
                                                                    {app.job_url && (
                                                                        <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-blue-400" title="Open job posting">
                                                                            <ExternalLink size={16} />
                                                                        </a>
                                                                    )}
                                                                    {app.cover_letters?.length > 0 && (
                                                                        <button onClick={() => handleViewCoverLetter(app)} className="text-slate-500 hover:text-green-400" title="View cover letter">
                                                                            <FileText size={16} />
                                                                        </button>
                                                                    )}
                                                                    <button onClick={() => handleDeleteApp(app.id)} className="text-slate-500 hover:text-red-400" title="Delete">
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ─── Settings Tab ────────────────────────────────────────── */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            <div className="bg-slate-900 p-6 rounded border border-slate-800">
                                <h3 className="text-lg font-medium mb-4">Account</h3>
                                {session ? (
                                    <div className="space-y-3">
                                        <p className="text-sm text-slate-400">Signed in as <span className="text-white">{session.user.email}</span></p>
                                        <p className="text-xs text-slate-500">Your data syncs across devices when signed in.</p>
                                        <button onClick={handleLogout} className="btn-secondary text-sm flex items-center gap-2 text-red-400">
                                            <LogOut size={16} /> Sign Out
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm text-slate-400 mb-3">Sign in to sync your data across devices.</p>
                                        <button onClick={handleLogin} className="btn-primary text-sm">Sign In with Google</button>
                                    </div>
                                )}
                            </div>
                            <div className="bg-slate-900 p-6 rounded border border-slate-800">
                                <h3 className="text-lg font-medium mb-4">Data</h3>
                                <p className="text-sm text-slate-400 mb-3">
                                    Profile, experience, education, and resume are stored locally in your browser.
                                    Application history and saved answers sync to the cloud when signed in.
                                </p>
                                {session && (
                                    <button onClick={handleSyncAnswers} disabled={syncStatus === 'syncing'} className="btn-secondary text-sm flex items-center gap-2">
                                        <RefreshCw size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                                        Force Sync Answers
                                    </button>
                                )}
                            </div>
                            <div className="bg-slate-900 p-6 rounded border border-slate-800">
                                <h3 className="text-lg font-medium mb-2">About</h3>
                                <p className="text-sm text-slate-400">Job Flow AI v1.2.0</p>
                                <p className="text-xs text-slate-500 mt-1">AI-powered job application assistant. We never sell your data.</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* ─── Cover Letter Modal ─────────────────────────────────────── */}
            {coverLetterModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-8" onClick={() => setCoverLetterModal(null)}>
                    <div className="bg-slate-900 rounded-lg border border-slate-700 max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b border-slate-800">
                            <div>
                                <h3 className="font-semibold text-white">Cover Letter</h3>
                                <p className="text-xs text-slate-400">
                                    {coverLetterModal.company}{coverLetterModal.role ? ` — ${coverLetterModal.role}` : ''}
                                    {coverLetterModal.date && ` • ${new Date(coverLetterModal.date).toLocaleDateString()}`}
                                </p>
                            </div>
                            <button onClick={() => setCoverLetterModal(null)} className="text-slate-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">{coverLetterModal.content}</pre>
                        </div>
                        <div className="p-4 border-t border-slate-800 flex gap-2 justify-end">
                            <button
                                onClick={() => navigator.clipboard.writeText(coverLetterModal.content)}
                                className="btn-secondary text-sm"
                            >
                                Copy to Clipboard
                            </button>
                            <button
                                onClick={() => handleDeleteCoverLetter(coverLetterModal.id)}
                                className="btn-secondary text-sm text-red-400 hover:text-red-300"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Components ─────────────────────────────────────────────────────────────

const NavBtn = ({ label, icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
    >
        {icon}
        <span className="font-medium">{label}</span>
    </button>
);

const InputGroup = ({ label, val, onChange, type = "text" }) => (
    <div className="space-y-1">
        <label className="label">{label}</label>
        <input
            type={type}
            className="input-field w-full"
            value={val || ''}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

const StatusDropdown = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    const statuses = ['applied', 'interviewing', 'offer', 'rejected', 'withdrawn'];

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className={`px-2 py-1 rounded text-xs border capitalize flex items-center gap-1 ${STATUS_COLORS[value] || STATUS_COLORS.applied}`}
            >
                {value} <ChevronDown size={12} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0" onClick={() => setOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg z-10 min-w-[120px]">
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
};

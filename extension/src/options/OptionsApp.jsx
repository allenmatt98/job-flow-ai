import React, { useState, useEffect, useCallback } from 'react';
import { getProfile, saveProfile, getAnswerMemory, saveAnswerMemory } from '../utils/storage';
import { signInWithGoogle, signOut, getSession, getApplications, logApplication, updateApplicationStatus, deleteApplication, saveCoverLetter, deleteCoverLetter } from '../utils/supabase';
import { deleteAnswerEverywhere, fullSync } from '../utils/AnswerMemory';
import { parseResume } from '../utils/api';
import { dataURLtoBlob } from '../content/utils/FileUploader';
import { User, Briefcase, GraduationCap, FileText, History, Settings, LogOut, HelpCircle, Home, RefreshCw, Cloud, CloudOff, X } from 'lucide-react';
import { Save } from 'lucide-react';

import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import OverviewTab from '../components/dashboard/OverviewTab';
import ProfileTab from '../components/dashboard/ProfileTab';
import ExperienceTab from '../components/dashboard/ExperienceTab';
import EducationTab from '../components/dashboard/EducationTab';
import ResumeTab from '../components/dashboard/ResumeTab';
import AnswersTab from '../components/dashboard/AnswersTab';
import HistoryTab from '../components/dashboard/HistoryTab';
import SettingsTab from '../components/dashboard/SettingsTab';

export default function OptionsApp() {
    const [activeTab, setActiveTab] = useState('home');
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        userProfile: {},
        education: [],
        experience: [],
        resume: null
    });
    const [answers, setAnswers] = useState({});
    const [saveStatus, setSaveStatus] = useState('');
    const [parseStatus, setParseStatus] = useState('');
    const [syncStatus, setSyncStatus] = useState('');

    // History state
    const [applications, setApplications] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
    const [historyFilter, setHistoryFilter] = useState('');
    const [showAddApp, setShowAddApp] = useState(false);
    const [newApp, setNewApp] = useState({ company_name: '', job_title: '', job_url: '', platform: '' });

    // Cover letter modal
    const [coverLetterModal, setCoverLetterModal] = useState(null);

    useEffect(() => {
        checkSession();
        loadData();
    }, []);

    const checkSession = async () => {
        const sess = await getSession();
        setSession(sess);
        if (sess) {
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
        if (!error && apps) setApplications(apps);
        setHistoryLoading(false);
    }, [historySearch, historyFilter]);

    useEffect(() => {
        if (session && (activeTab === 'history' || activeTab === 'home')) loadApplications();
    }, [session, activeTab, loadApplications]);

    useEffect(() => {
        if (session && activeTab === 'history') {
            const debounce = setTimeout(loadApplications, 300);
            return () => clearTimeout(debounce);
        }
    }, [historySearch, historyFilter, loadApplications, session, activeTab]);

    // ─── Handlers ────────────────────────────────────────────────────────────

    const handleLogin = async () => {
        const { data: authData, error } = await signInWithGoogle();
        if (error) {
            alert(error.message);
        } else if (authData?.session) {
            setSession(authData.session);
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

    const handleDeleteAnswer = async (key) => {
        const updated = { ...answers };
        delete updated[key];
        setAnswers(updated);
        await deleteAnswerEverywhere(key);
    };

    const handleSaveEdit = async (key, newValue) => {
        const now = Date.now();
        const updated = { ...answers };
        updated[key] = { ...updated[key], answer: newValue, lastUsed: now };
        setAnswers(updated);
        await saveAnswerMemory(updated);
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

    // ─── Nav config ──────────────────────────────────────────────────────────

    const navItems = [
        { key: 'home', label: 'Home', icon: <Home size={18} /> },
        { key: 'profile', label: 'Personal Info', icon: <User size={18} /> },
        { key: 'experience', label: 'Experience', icon: <Briefcase size={18} /> },
        { key: 'education', label: 'Education', icon: <GraduationCap size={18} /> },
        { key: 'resume', label: 'Resume', icon: <FileText size={18} /> },
        { key: 'answers', label: 'Saved Answers', icon: <HelpCircle size={18} /> },
    ];

    const navSecondary = [
        { key: 'history', label: 'History', icon: <History size={18} /> },
        { key: 'settings', label: 'Settings', icon: <Settings size={18} /> },
    ];

    const tabTitles = {
        home: 'Dashboard',
        profile: 'Personal Info',
        experience: 'Experience',
        education: 'Education',
        resume: 'Resume',
        answers: 'Saved Answers',
        history: 'Application History',
        settings: 'Settings',
    };

    const showSaveButton = !['home', 'history', 'settings', 'answers'].includes(activeTab);

    if (loading) return <div className="p-8 text-center text-slate-400">Loading Dashboard...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col fixed h-full">
                <h1 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                    <Briefcase className="text-blue-500" /> Job Flow AI
                </h1>

                <nav className="flex-1 space-y-1">
                    {navItems.map(item => (
                        <NavBtn key={item.key} label={item.label} icon={item.icon} active={activeTab === item.key} onClick={() => setActiveTab(item.key)} />
                    ))}
                    <div className="pt-4 border-t border-slate-800 mt-4 space-y-1">
                        {navSecondary.map(item => (
                            <NavBtn key={item.key} label={item.label} icon={item.icon} active={activeTab === item.key} onClick={() => setActiveTab(item.key)} />
                        ))}
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
                        <Button fullWidth size="sm" onClick={handleLogin}>Sign In / Sync</Button>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto ml-64">
                <header className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-semibold text-white">{tabTitles[activeTab]}</h2>
                    {showSaveButton && (
                        <Button icon={Save} onClick={handleSave}>
                            {saveStatus || 'Save Changes'}
                        </Button>
                    )}
                </header>

                {activeTab === 'home' && (
                    <OverviewTab session={session} applications={applications} onNavigate={setActiveTab} />
                )}

                {activeTab === 'profile' && (
                    <ProfileTab data={data} updateProfile={updateProfile} />
                )}

                {activeTab === 'experience' && (
                    <ExperienceTab data={data} addItem={addItem} updateItem={updateItem} removeItem={removeItem} />
                )}

                {activeTab === 'education' && (
                    <EducationTab data={data} addItem={addItem} updateItem={updateItem} removeItem={removeItem} />
                )}

                {activeTab === 'resume' && (
                    <ResumeTab data={data} setData={setData} parseStatus={parseStatus} onParseResume={handleParseResume} />
                )}

                {activeTab === 'answers' && (
                    <AnswersTab
                        answers={answers}
                        session={session}
                        syncStatus={syncStatus}
                        onDeleteAnswer={handleDeleteAnswer}
                        onSaveEdit={handleSaveEdit}
                        onSyncAnswers={handleSyncAnswers}
                    />
                )}

                {activeTab === 'history' && (
                    <HistoryTab
                        session={session}
                        applications={applications}
                        historyLoading={historyLoading}
                        historySearch={historySearch}
                        setHistorySearch={setHistorySearch}
                        historyFilter={historyFilter}
                        setHistoryFilter={setHistoryFilter}
                        showAddApp={showAddApp}
                        setShowAddApp={setShowAddApp}
                        newApp={newApp}
                        setNewApp={setNewApp}
                        onAddApplication={handleAddApplication}
                        onStatusChange={handleStatusChange}
                        onDeleteApp={handleDeleteApp}
                        onViewCoverLetter={handleViewCoverLetter}
                        onLogin={handleLogin}
                        onRefresh={loadApplications}
                    />
                )}

                {activeTab === 'settings' && (
                    <SettingsTab
                        session={session}
                        syncStatus={syncStatus}
                        onLogin={handleLogin}
                        onLogout={handleLogout}
                        onSyncAnswers={handleSyncAnswers}
                    />
                )}
            </main>

            {/* Cover Letter Modal */}
            <Modal
                open={!!coverLetterModal}
                onClose={() => setCoverLetterModal(null)}
                title="Cover Letter"
                subtitle={coverLetterModal ? `${coverLetterModal.company}${coverLetterModal.role ? ` — ${coverLetterModal.role}` : ''}${coverLetterModal.date ? ` · ${new Date(coverLetterModal.date).toLocaleDateString()}` : ''}` : ''}
                actions={coverLetterModal && (
                    <>
                        <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(coverLetterModal.content)}>
                            Copy to Clipboard
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDeleteCoverLetter(coverLetterModal.id)}>
                            Delete
                        </Button>
                    </>
                )}
            >
                {coverLetterModal && (
                    <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">{coverLetterModal.content}</pre>
                )}
            </Modal>
        </div>
    );
}

// ─── Sidebar Nav Button ──────────────────────────────────────────────────────

function NavBtn({ label, icon, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${
                active
                    ? 'bg-blue-600/15 text-blue-400 border-l-2 border-blue-500'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'
            }`}
        >
            {icon}
            <span className="font-medium">{label}</span>
        </button>
    );
}

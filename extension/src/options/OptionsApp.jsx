import React, { useState, useEffect } from 'react';
import { getProfile, saveProfile } from '../utils/storage';
import { supabase, signInWithGoogle, signOut, getSession } from '../utils/supabase';
import { User, Briefcase, GraduationCap, FileText, History, Settings, LogOut, Plus, Trash2, Save } from 'lucide-react';

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
    const [saveStatus, setSaveStatus] = useState('');

    useEffect(() => {
        checkSession();
        loadData();
    }, []);

    const checkSession = async () => {
        const sess = await getSession();
        setSession(sess);
    };

    const loadData = async () => {
        const stored = await getProfile();
        setData(stored);
        setLoading(false);
    };

    const handleLogin = async () => {
        const { error } = await signInWithGoogle();
        if (error) alert(error.message);
    };

    const handleLogout = async () => {
        await signOut();
        setSession(null);
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

    // Arrays Helper
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

    // File Upload (Resume)
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 4 * 1024 * 1024) { // 4MB limit for chrome.storage safety
            alert("File is too large (Max 4MB for local storage)");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setData(prev => ({
                ...prev,
                resume: {
                    name: file.name,
                    type: file.type,
                    data: reader.result // Base64
                }
            }));
        };
        reader.readAsDataURL(file);
    };

    if (loading) return <div className="p-8 text-center">Loading Dashboard...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col">
                <h1 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                    <Briefcase className="text-blue-500" /> Job Flow AI
                </h1>

                <nav className="flex-1 space-y-2">
                    <NavBtn label="Personal Info" icon={<User size={18} />} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
                    <NavBtn label="Experience" icon={<Briefcase size={18} />} active={activeTab === 'experience'} onClick={() => setActiveTab('experience')} />
                    <NavBtn label="Education" icon={<GraduationCap size={18} />} active={activeTab === 'education'} onClick={() => setActiveTab('education')} />
                    <NavBtn label="Resume" icon={<FileText size={18} />} active={activeTab === 'resume'} onClick={() => setActiveTab('resume')} />
                    <div className="pt-4 border-t border-slate-800 mt-4">
                        <NavBtn label="History" icon={<History size={18} />} active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
                        <NavBtn label="Settings" icon={<Settings size={18} />} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
                    </div>
                </nav>

                <div className="pt-6 border-t border-slate-800">
                    {session ? (
                        <div className="text-sm">
                            <p className="text-slate-400 mb-2">Logged in as {session.user.email}</p>
                            <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300">
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
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-semibold text-white capitalize">{activeTab} Management</h2>
                    <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                        <Save size={18} /> {saveStatus || 'Save Changes'}
                    </button>
                </header>

                <div className="max-w-3xl">
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
                                hover:file:bg-blue-700
                                "
                            />

                            {data.resume && (
                                <div className="mt-6 p-4 bg-slate-950 rounded flex items-center gap-3 border border-slate-800">
                                    <FileText className="text-green-500" />
                                    <div>
                                        <p className="font-medium">{data.resume.name}</p>
                                        <p className="text-xs text-slate-500">Stored Locally • {Math.round((data.resume.data?.length || 0) * 0.75 / 1024)} KB</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="text-center py-20 bg-slate-900 rounded border border-slate-800">
                            <History className="mx-auto text-slate-600 mb-4" size={48} />
                            <h3 className="text-xl text-slate-400">Application History</h3>
                            <p className="text-slate-500 mt-2">Sign in to sync your application tracking here.</p>
                            {/* TODO: Connect to Supabase 'applications' table */}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

// Components
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

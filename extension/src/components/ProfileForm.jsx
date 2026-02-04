import React, { useEffect, useState } from 'react';
import { getProfile, saveProfile } from '../utils/storage';
import { Save, User, FileText, Link as LinkIcon, Briefcase } from 'lucide-react';

const ProfileForm = () => {
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        linkedin: '',
        portfolio: '',
        resumeText: '',
        about: ''
    });
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const load = async () => {
            const data = await getProfile();
            setProfile(prev => ({ ...prev, ...data }));
            setLoading(false);
        };
        load();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
        setSaved(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await saveProfile(profile);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="card">
                <h3 className="flex items-center gap-2 mb-2"><User size={18} /> Personal Info</h3>
                <div className="flex gap-2">
                    <div className="w-full">
                        <label className="label">First Name</label>
                        <input name="firstName" value={profile.firstName} onChange={handleChange} placeholder="John" />
                    </div>
                    <div className="w-full">
                        <label className="label">Last Name</label>
                        <input name="lastName" value={profile.lastName} onChange={handleChange} placeholder="Doe" />
                    </div>
                </div>
                <div className="mt-4">
                    <label className="label">Email</label>
                    <input name="email" value={profile.email} onChange={handleChange} placeholder="john@example.com" />
                </div>
                <div className="mt-4">
                    <label className="label">Phone</label>
                    <input name="phone" value={profile.phone} onChange={handleChange} placeholder="+1 234 567 890" />
                </div>
            </div>

            <div className="card">
                <h3 className="flex items-center gap-2 mb-2"><LinkIcon size={18} /> Links</h3>
                <div>
                    <label className="label">LinkedIn URL</label>
                    <input name="linkedin" value={profile.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="mt-4">
                    <label className="label">Portfolio URL</label>
                    <input name="portfolio" value={profile.portfolio} onChange={handleChange} placeholder="https://johndoe.com" />
                </div>
            </div>

            <div className="card">
                <h3 className="flex items-center gap-2 mb-2"><FileText size={18} /> Resume Content</h3>
                <label className="label">Paste your resume text here (for AI context)</label>
                <textarea
                    name="resumeText"
                    value={profile.resumeText}
                    onChange={handleChange}
                    rows={10}
                    placeholder="Paste plain text of your resume..."
                />
            </div>

            <div className="card">
                <h3 className="flex items-center gap-2 mb-2"><Briefcase size={18} /> About / Bio</h3>
                <textarea
                    name="about"
                    value={profile.about}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Short bio or summary..."
                />
            </div>

            <button type="submit" className="btn-primary flex items-center justify-center gap-2">
                <Save size={18} /> {saved ? 'Saved!' : 'Save Profile'}
            </button>
        </form>
    );
};

export default ProfileForm;

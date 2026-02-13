import React from 'react';
import InputGroup from '../ui/InputGroup';

export default function ProfileTab({ data, updateProfile }) {
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="grid grid-cols-2 gap-4">
        <InputGroup label="First Name" val={data.userProfile.firstName} onChange={(v) => updateProfile('firstName', v)} placeholder="John" />
        <InputGroup label="Last Name" val={data.userProfile.lastName} onChange={(v) => updateProfile('lastName', v)} placeholder="Doe" />
      </div>
      <InputGroup label="Email" val={data.userProfile.email} onChange={(v) => updateProfile('email', v)} placeholder="john@example.com" />
      <InputGroup label="Phone" val={data.userProfile.phone} onChange={(v) => updateProfile('phone', v)} placeholder="+1 234 567 890" />
      <InputGroup label="LinkedIn" val={data.userProfile.linkedin} onChange={(v) => updateProfile('linkedin', v)} placeholder="https://linkedin.com/in/..." />
      <InputGroup label="Portfolio" val={data.userProfile.portfolio} onChange={(v) => updateProfile('portfolio', v)} placeholder="https://yoursite.com" />
      <div className="space-y-1">
        <label className="block text-sm text-slate-400">About / Summary</label>
        <textarea
          className="input-field w-full h-32"
          value={data.userProfile.about || ''}
          onChange={(e) => updateProfile('about', e.target.value)}
          placeholder="Brief professional summary..."
        />
      </div>
    </div>
  );
}

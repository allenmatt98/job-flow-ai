import React from 'react';

export default function InputGroup({ label, val, onChange, type = 'text', placeholder, helpText, className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-sm text-slate-400">{label}</label>}
      <input
        type={type}
        className="input-field w-full"
        value={val || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {helpText && <p className="text-xs text-slate-500">{helpText}</p>}
    </div>
  );
}

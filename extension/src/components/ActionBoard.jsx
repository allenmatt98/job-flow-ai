import React from 'react';
import { FileText, User, BookOpen, Save } from 'lucide-react';

const actions = [
  { icon: FileText, label: 'Cover Letter', action: 'coverLetter' },
  { icon: BookOpen, label: 'View Resume', action: 'resume' },
  { icon: User, label: 'Edit Profile', action: 'profile' },
  { icon: Save, label: 'Save Answers', action: 'saveAnswers' },
];

export default function ActionBoard({ onAction }) {
  return (
    <div className="action-grid">
      {actions.map(({ icon: Icon, label, action }) => (
        <button key={action} className="action-card" onClick={() => onAction(action)}>
          <Icon size={20} className="icon" />
          <span className="label">{label}</span>
        </button>
      ))}
    </div>
  );
}

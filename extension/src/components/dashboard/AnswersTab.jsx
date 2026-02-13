import React, { useState } from 'react';
import { HelpCircle, Trash2, RefreshCw, Copy } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

export default function AnswersTab({ answers, session, syncStatus, onDeleteAnswer, onSaveEdit, onSyncAnswers }) {
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  const handleStartEdit = (key, currentAnswer) => {
    setEditingKey(key);
    setEditValue(currentAnswer);
  };

  const handleSaveEdit = (key) => {
    if (!editValue.trim()) return;
    onSaveEdit(key, editValue.trim());
    setEditingKey(null);
    setEditValue('');
  };

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sortedEntries = Object.entries(answers).sort(([, a], [, b]) => (b.useCount || 0) - (a.useCount || 0));

  return (
    <div className="max-w-4xl">
      {session && (
        <div className="flex justify-end mb-4">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            loading={syncStatus === 'syncing'}
            onClick={onSyncAnswers}
          >
            {syncStatus === 'syncing' ? 'Syncing...' : 'Sync to Cloud'}
          </Button>
        </div>
      )}

      {sortedEntries.length === 0 ? (
        <Card padding="lg" className="text-center">
          <HelpCircle className="mx-auto text-slate-600 mb-4" size={48} />
          <h3 className="text-xl text-slate-400">No Saved Answers</h3>
          <p className="text-slate-500 mt-2">
            When you fill in questions on job applications and click "Save Answers to Memory", they'll appear here for reuse.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {sortedEntries.map(([key, entry]) => (
            <Card key={key} padding="md" className="group relative">
              {/* Hover actions */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleCopy(key, entry.answer)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-slate-800"
                  title="Copy answer"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => onDeleteAnswer(key)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <p className="font-medium text-white text-sm mb-2 pr-16">{entry.question}</p>

              {editingKey === key ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field flex-1 text-sm"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(key);
                      if (e.key === 'Escape') setEditingKey(null);
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={() => handleSaveEdit(key)}>Save</Button>
                </div>
              ) : (
                <p
                  className="text-blue-400 cursor-pointer hover:text-blue-300 text-sm truncate"
                  onClick={() => handleStartEdit(key, entry.answer)}
                  title="Click to edit"
                >
                  {copiedKey === key ? 'Copied!' : entry.answer}
                </p>
              )}

              <div className="flex gap-4 mt-2 text-xs text-slate-500">
                <span>Used {entry.useCount || 0}x</span>
                {entry.lastUsed && (
                  <span>{new Date(entry.lastUsed).toLocaleDateString()}</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

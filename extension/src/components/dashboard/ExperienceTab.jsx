import React, { useState } from 'react';
import { Plus, Trash2, Pencil, Briefcase } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import InputGroup from '../ui/InputGroup';

export default function ExperienceTab({ data, addItem, updateItem, removeItem }) {
  const [editingIndex, setEditingIndex] = useState(null);

  const handleAdd = () => {
    addItem('experience', { company: '', title: '', start: '', end: '', description: '' });
    setEditingIndex(data.experience.length);
  };

  const editingExp = editingIndex !== null ? data.experience[editingIndex] : null;

  return (
    <div className="max-w-3xl">
      {data.experience.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Briefcase className="mx-auto text-slate-600 mb-4" size={48} />
          <h3 className="text-xl text-slate-400">No Experience Added</h3>
          <p className="text-slate-500 mt-2 mb-4">Add your work experience to autofill job applications.</p>
          <Button icon={Plus} onClick={handleAdd}>Add Experience</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.experience.map((exp, i) => (
            <Card key={i} padding="md" className="group">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-white">{exp.title || 'Untitled Role'}</h4>
                  <p className="text-sm text-slate-400">{exp.company || 'Company'}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {exp.start || '?'} - {exp.end || 'Present'}
                  </p>
                  {exp.description && (
                    <p className="text-sm text-slate-400 mt-2 line-clamp-2">{exp.description}</p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingIndex(i)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-slate-800">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => removeItem('experience', i)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
          <Button variant="secondary" icon={Plus} fullWidth onClick={handleAdd}>Add Experience</Button>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        open={editingIndex !== null}
        onClose={() => setEditingIndex(null)}
        title={editingExp?.company ? `Edit - ${editingExp.company}` : 'Add Experience'}
        actions={<Button onClick={() => setEditingIndex(null)}>Done</Button>}
      >
        {editingExp && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputGroup label="Company" val={editingExp.company} onChange={(v) => updateItem('experience', editingIndex, 'company', v)} placeholder="Company name" />
              <InputGroup label="Title" val={editingExp.title} onChange={(v) => updateItem('experience', editingIndex, 'title', v)} placeholder="Job title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputGroup label="Start Date" type="month" val={editingExp.start} onChange={(v) => updateItem('experience', editingIndex, 'start', v)} />
              <InputGroup label="End Date" type="month" val={editingExp.end} onChange={(v) => updateItem('experience', editingIndex, 'end', v)} />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-slate-400">Description</label>
              <textarea
                className="input-field w-full h-24 text-sm"
                value={editingExp.description || ''}
                onChange={(e) => updateItem('experience', editingIndex, 'description', e.target.value)}
                placeholder="Describe your responsibilities and achievements..."
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

import React, { useState } from 'react';
import { Plus, Trash2, Pencil, GraduationCap } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import InputGroup from '../ui/InputGroup';

export default function EducationTab({ data, addItem, updateItem, removeItem }) {
  const [editingIndex, setEditingIndex] = useState(null);

  const handleAdd = () => {
    addItem('education', { school: '', degree: '', start: '', end: '' });
    setEditingIndex(data.education.length);
  };

  const editingEdu = editingIndex !== null ? data.education[editingIndex] : null;

  return (
    <div className="max-w-3xl">
      {data.education.length === 0 ? (
        <Card padding="lg" className="text-center">
          <GraduationCap className="mx-auto text-slate-600 mb-4" size={48} />
          <h3 className="text-xl text-slate-400">No Education Added</h3>
          <p className="text-slate-500 mt-2 mb-4">Add your education to autofill job applications.</p>
          <Button icon={Plus} onClick={handleAdd}>Add Education</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.education.map((edu, i) => (
            <Card key={i} padding="md" className="group">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-white">{edu.degree || 'Degree'}</h4>
                  <p className="text-sm text-slate-400">{edu.school || 'School'}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {edu.start || '?'} - {edu.end || 'Present'}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingIndex(i)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-slate-800">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => removeItem('education', i)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
          <Button variant="secondary" icon={Plus} fullWidth onClick={handleAdd}>Add Education</Button>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        open={editingIndex !== null}
        onClose={() => setEditingIndex(null)}
        title={editingEdu?.school ? `Edit - ${editingEdu.school}` : 'Add Education'}
        actions={<Button onClick={() => setEditingIndex(null)}>Done</Button>}
      >
        {editingEdu && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputGroup label="School" val={editingEdu.school} onChange={(v) => updateItem('education', editingIndex, 'school', v)} placeholder="School name" />
              <InputGroup label="Degree" val={editingEdu.degree} onChange={(v) => updateItem('education', editingIndex, 'degree', v)} placeholder="e.g. B.S. Computer Science" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputGroup label="Start Year" val={editingEdu.start} onChange={(v) => updateItem('education', editingIndex, 'start', v)} placeholder="2020" />
              <InputGroup label="End Year" val={editingEdu.end} onChange={(v) => updateItem('education', editingIndex, 'end', v)} placeholder="2024" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

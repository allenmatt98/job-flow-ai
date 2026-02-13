import React from 'react';
import { FileText, Wand2 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

export default function ResumeTab({ data, setData, parseStatus, onParseResume }) {
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

  return (
    <div className="max-w-3xl">
      <Card padding="lg">
        <h3 className="text-lg font-medium mb-2">Resume File</h3>
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
          <div className="mt-6 p-4 bg-slate-950 rounded-lg flex items-center gap-3 border border-slate-800">
            <FileText className="text-green-500" />
            <div className="flex-1">
              <p className="font-medium">{data.resume.name}</p>
              <p className="text-xs text-slate-500">Stored Locally - {Math.round((data.resume.data?.length || 0) * 0.75 / 1024)} KB</p>
            </div>
          </div>
        )}
        {data.resume && (
          <div className="mt-4">
            <Button
              icon={Wand2}
              onClick={onParseResume}
              loading={parseStatus === 'Parsing resume with AI...'}
            >
              {parseStatus === 'Parsing resume with AI...' ? 'Parsing...' : 'Parse Resume & Auto-Fill Profile'}
            </Button>
            {parseStatus && (
              <p className={`text-sm mt-2 ${parseStatus.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                {parseStatus}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Uses AI to extract profile data from your resume. Only fills empty fields.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

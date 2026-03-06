import React, { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';

const SettingsEditor = ({ projectId, settings, onSave, loading }) => {
  const [content, setContent] = useState(settings || '');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await onSave(projectId, content);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Settings Configuration</h3>
      
      {/* Alert */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded flex items-start gap-2">
        <AlertCircle size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800">Edit the settings YAML file below</p>
      </div>

      {/* Editor */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 p-4 font-mono text-sm border border-gray-300 rounded bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="settings.yaml"
      />

      {/* Save Button */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={18} />
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span className="text-green-600 text-sm font-semibold">✓ Saved</span>}
      </div>
    </div>
  );
};

export default SettingsEditor;

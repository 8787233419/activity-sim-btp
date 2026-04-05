import { useState, useEffect } from 'react';
import './TextEditorDialog.css';

function TextEditorDialog({ file, onClose, onSave }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (file) {
      setLoading(true);
      setErrorMsg('');

      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          setContent(e.target.result);
          setLoading(false);
        };
        reader.onerror = () => {
          setErrorMsg("Failed to read the file.");
          setLoading(false);
        };
        reader.readAsText(file);
      } catch (err) {
        setErrorMsg("Error reading file: " + err.message);
        setLoading(false);
      }
    }
  }, [file]);

  const handleSave = () => {
    try {
      const newFile = new File([content], file.name, { type: file.type || 'text/plain' });
      onSave(newFile);
    } catch (err) {
      setErrorMsg("Failed to create new file: " + err.message);
    }
  };

  return (
    <div className="text-editor-overlay" onClick={onClose}>
      <div className="text-editor-content" onClick={e => e.stopPropagation()}>
        <div className="text-editor-header">
          <div>
            <h2>Edit {file?.name || "Unknown File"}</h2>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {file?.size ? (file.size / 1024).toFixed(1) + ' KB' : 'Unknown size'}
            </span>
          </div>
          <button type="button" className="text-editor-close" onClick={onClose}>&times;</button>
        </div>

        <div className="text-editor-body">
          {errorMsg ? (
            <div className="text-editor-loading" style={{ color: '#ef4444' }}>{errorMsg}</div>
          ) : loading ? (
            <div className="text-editor-loading">Loading file data...</div>
          ) : (
            <textarea
              className="text-editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck="false"
            />
          )}
        </div>

        <div className="text-editor-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={loading}>Save & Close</button>
        </div>
      </div>
    </div>
  );
}

export default TextEditorDialog;

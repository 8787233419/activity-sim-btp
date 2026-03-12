import React, { useState, useRef } from 'react';
import { UploadCloud, FolderCog, CheckCircle, AlertTriangle, FileCode, FileText, X } from 'lucide-react';
import { configsAPI } from '../services/api';

/**
 * ConfigUploader — lets the user upload their own validation config files.
 *
 * Accepted files:
 *   .yaml / .yml  →  configs/
 *   .py           →  data_model/
 *
 * Props:
 *   projectId     — current project ID
 *   files         — current file listing from the list_files endpoint
 *   onUploadDone  — callback invoked after a successful upload so the parent
 *                   can refresh the file list
 */
const ConfigUploader = ({ projectId, files, onUploadDone }) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null); // { success, message }
  const inputRef = useRef(null);

  // --- Config health check ---
  const hasInputChecker = files?.configs?.includes('input_checker.yaml');
  const hasInputChecks = files?.data_model?.some((f) => f.endsWith('.py'));

  const isReady = hasInputChecker && hasInputChecks;
  const statusLabel = isReady
    ? 'Custom configs active ✓'
    : !hasInputChecker && !hasInputChecks
    ? 'No custom configs uploaded yet'
    : !hasInputChecker
    ? 'Missing input_checker.yaml'
    : 'Missing input_checks.py';

  // --- File helpers ---
  const getFileIcon = (name) => {
    if (name.endswith?.('.py') || name.endsWith('.py'))
      return <FileCode size={14} className="text-yellow-500 flex-shrink-0" />;
    return <FileText size={14} className="text-blue-500 flex-shrink-0" />;
  };

  const addFiles = (incoming) => {
    const allowed = Array.from(incoming).filter((f) =>
      ['.yaml', '.yml', '.py'].some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    setSelectedFiles((prev) => {
      const existing = new Map(prev.map((f) => [f.name, f]));
      allowed.forEach((f) => existing.set(f.name, f));
      return Array.from(existing.values());
    });
    setResult(null);
  };

  const removeFile = (name) =>
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name));

  // --- Upload ---
  const handleUpload = async () => {
    if (!selectedFiles.length || !projectId) return;
    setUploading(true);
    setResult(null);
    try {
      const resp = await configsAPI.upload(projectId, selectedFiles);
      setResult({ success: true, message: resp.data.message });
      setSelectedFiles([]);
      onUploadDone?.();
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message;
      setResult({ success: false, message: detail });
    } finally {
      setUploading(false);
    }
  };

  // --- Drag & drop ---
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className="bg-white rounded-lg shadow p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FolderCog size={20} className="text-indigo-600" />
        <h3 className="text-base font-semibold text-gray-800">Config Files</h3>
        <span
          className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
            isReady
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Current files */}
      {(files?.configs?.length > 0 || files?.data_model?.length > 0) && (
        <div className="text-xs space-y-1">
          {[...(files?.configs ?? []).map((f) => ({ f, folder: 'configs' })),
            ...(files?.data_model ?? []).map((f) => ({ f, folder: 'data_model' }))].map(
            ({ f, folder }) => (
              <div key={folder + f} className="flex items-center gap-1.5 text-gray-600">
                {getFileIcon(f)}
                <span className="font-mono">{f}</span>
                <span className="text-gray-400 ml-1">({folder}/)</span>
              </div>
            )
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
        }`}
      >
        <UploadCloud size={28} className="mx-auto mb-2 text-indigo-400" />
        <p className="text-sm text-gray-600">
          Drag & drop <span className="font-semibold">.yaml</span> or{' '}
          <span className="font-semibold">.py</span> files here
        </p>
        <p className="text-xs text-gray-400 mt-1">or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".yaml,.yml,.py"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* Staged files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Ready to upload
          </p>
          {selectedFiles.map((f) => (
            <div key={f.name} className="flex items-center gap-2 text-sm">
              {getFileIcon(f.name)}
              <span className="font-mono text-gray-700 flex-1 truncate">{f.name}</span>
              <span className="text-gray-400 text-xs">
                {f.name.toLowerCase().endsWith('.py') ? 'data_model/' : 'configs/'}
              </span>
              <button
                onClick={() => removeFile(f.name)}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Result banner */}
      {result && (
        <div
          className={`flex items-start gap-2 text-sm p-3 rounded-lg ${
            result.success
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {result.success ? (
            <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          )}
          <span>{result.message}</span>
        </div>
      )}

      {/* Upload button */}
      {selectedFiles.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold
                     hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading…' : `Upload ${selectedFiles.length} file(s)`}
        </button>
      )}
    </div>
  );
};

export default ConfigUploader;

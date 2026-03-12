import { useState, useRef } from 'react'
import './ConfigUploadStep.css'

/**
 * ConfigUploadStep — lets the user upload their entire config folder
 * before uploading CSV data files.
 *
 * Routing (done by the backend):
 *   .py files    → project/data_model/
 *   everything else (yaml, csv, …) → project/configs/
 *
 * Props:
 *   profileId      : string   – the project/profile id
 *   onUploadDone   : ()=>void – called after a successful upload
 *   onSkip         : ()=>void – called when user wants to continue without uploading
 */
function ConfigUploadStep({ profileId, onUploadDone, onSkip }) {
  const [dragOver, setDragOver] = useState(false)
  const [stagedFiles, setStagedFiles] = useState([]) // File[]
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null) // { success, message }
  const inputRef = useRef(null)

  /* ── stage files ── */
  const stageFiles = (incoming) => {
    const list = Array.from(incoming)
    setStagedFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name, f]))
      list.forEach((f) => map.set(f.name, f))
      return Array.from(map.values())
    })
    setResult(null)
  }

  const removeFile = (name) =>
    setStagedFiles((prev) => prev.filter((f) => f.name !== name))

  /* ── upload ── */
  const handleUpload = async () => {
    if (!stagedFiles.length) return
    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      stagedFiles.forEach((f) => formData.append('files', f))

      const res = await fetch(`/api/projects/${profileId}/upload-configs`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Upload failed')
      }

      const data = await res.json()
      setResult({ success: true, message: data.message })
      setStagedFiles([])
      onUploadDone?.()
    } catch (err) {
      setResult({ success: false, message: err.message })
    } finally {
      setUploading(false)
    }
  }

  /* ── helpers ── */
  const destLabel = (filename) =>
    filename.toLowerCase().endsWith('.py') ? 'data_model/' : 'configs/'

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    stageFiles(e.dataTransfer.files)
  }

  return (
    <div className="config-upload-step">
      <h3>Upload Config Folder</h3>
      <p className="step-description">
        Upload your project's config files (<code>input_checker.yaml</code>,{' '}
        <code>input_checks.py</code>, and any other supporting files).
        <br />
        <span className="step-hint">
          <strong>.py</strong> files are saved to <code>data_model/</code>;
          everything else is saved to <code>configs/</code>.
        </span>
      </p>

      {/* Drop zone */}
      <div
        className={`config-dropzone${dragOver ? ' dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <span className="config-dropzone-icon">📂</span>
        <p>Drag &amp; drop config files here, or click to browse</p>
        <p className="config-dropzone-hint">
          Accepts .yaml, .yml, .py, .csv and more
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="config-hidden-input"
          onChange={(e) => stageFiles(e.target.files)}
        />
      </div>

      {/* Staged files list */}
      {stagedFiles.length > 0 && (
        <div className="config-staged-list">
          <p className="config-staged-title">Staged for upload:</p>
          {stagedFiles.map((f) => (
            <div key={f.name} className="config-staged-item">
              <span className="config-staged-dest">{destLabel(f.name)}</span>
              <span className="config-staged-name">{f.name}</span>
              <button
                type="button"
                className="config-staged-remove"
                onClick={() => removeFile(f.name)}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Result banner */}
      {result && (
        <div className={`config-result ${result.success ? 'success' : 'error'}`}>
          {result.success ? '✓' : '✗'} {result.message}
        </div>
      )}

      {/* Footer buttons */}
      <div className="config-upload-footer">
        <button type="button" className="upload-btn-secondary" onClick={onSkip}>
          Skip (use defaults)
        </button>
        <button
          type="button"
          className="upload-btn-primary"
          onClick={handleUpload}
          disabled={uploading || stagedFiles.length === 0}
        >
          {uploading ? 'Uploading…' : `Upload ${stagedFiles.length || ''} file(s)`}
        </button>
      </div>
    </div>
  )
}

export default ConfigUploadStep

import { useState, useEffect } from 'react'
import './ProjectFilesDialog.css'
import CsvEditorDialog from './CsvEditorDialog'
import TextEditorDialog from './TextEditorDialog'

function ProjectFilesDialog({ projectId, projectName, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('input')
  const [editingFile, setEditingFile] = useState(null)
  const [editingType, setEditingType] = useState('csv')
  const [isDownloadingForEdit, setIsDownloadingForEdit] = useState(false)
  const [inputFilesChanged, setInputFilesChanged] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null)

  useEffect(() => {
    fetchFiles()
  }, [projectId])

  const fetchFiles = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/all-files`)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const handleDownload = (downloadUrl, filename) => {
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleEdit = async (downloadUrl, filename, type = 'csv') => {
    setIsDownloadingForEdit(true)
    try {
      const res = await fetch(downloadUrl)
      if (!res.ok) throw new Error("Failed to fetch file for editing")
      const blob = await res.blob()
      const mime = type === 'csv' ? 'text/csv' : 'text/plain'
      const file = new File([blob], filename, { type: mime })
      setEditingType(type)
      setEditingFile(file)
    } catch (e) {
      alert("Error loading file: " + e.message)
    } finally {
      setIsDownloadingForEdit(false)
    }
  }

  const handleSaveEditedFile = async (newFile) => {
    try {
      const formData = new FormData()
      formData.append('files', newFile, newFile.name)

      const endpoint = activeTab === 'config'
        ? `/api/projects/${projectId}/upload-configs`
        : `/api/projects/${projectId}/upload-csv`;

      // Upload the changes
      const uploadResponse = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })
      if (!uploadResponse.ok) {
        throw new Error('Failed to save changes')
      }
      setEditingFile(null)
      setInputFilesChanged(true)
      setValidationResult({ status: 'success', message: 'File saved. Please validate changes.' })
      fetchFiles()
    } catch (e) {
      alert(e.message)
    }
  }

  const handleValidate = async () => {
    setIsValidating(true)
    setValidationResult(null)
    try {
      const validateResponse = await fetch(`/api/projects/${projectId}/validate`, {
        method: 'POST',
      })
      if (!validateResponse.ok) {
        throw new Error('Validation failed')
      }
      const result = await validateResponse.json()
      if (result.overall_status === 'passed' || result.ready_for_simulation) {
        setValidationResult({ status: 'success', message: '✓ Files validated successfully!' })
        setInputFilesChanged(false)
      } else {
        setValidationResult({ status: 'error', message: '⚠️ Validation failed or has warnings. Please check the files.' })
      }
    } catch (e) {
      setValidationResult({ status: 'error', message: '⚠️ Validation error: ' + e.message })
    } finally {
      setIsValidating(false)
    }
  }

  const tabs = [
    { key: 'input', label: 'Input Data', icon: '📥', files: data?.input_files || [] },
    { key: 'output', label: 'Output Files', icon: '📤', files: data?.output_files || [] },
    { key: 'config', label: 'Config Files', icon: '⚙️', files: data?.config_files || [] },
  ]

  const activeFiles = tabs.find(t => t.key === activeTab)?.files || []

  return (
    <div className="pfd-overlay">
      <div className="pfd-dialog" onClick={e => e.stopPropagation()}>
        <div className="pfd-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <button className="pfd-back-btn" onClick={onClose}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              Back to Projects
            </button>
            <h2 className="pfd-title">{projectName || projectId}</h2>
            <p className="pfd-subtitle">{projectId}</p>
          </div>
          <div style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {validationResult && (
              <span style={{
                color: validationResult.status === 'success' ? '#10b981' : '#ef4444',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}>
                {validationResult.message}
              </span>
            )}
            <button
              onClick={handleValidate}
              disabled={!inputFilesChanged || isValidating}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                background: (!inputFilesChanged || isValidating) ? '#334155' : '#2563eb',
                color: (!inputFilesChanged || isValidating) ? '#94a3b8' : 'white',
                border: 'none',
                cursor: (!inputFilesChanged || isValidating) ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              {isValidating ? 'Validating...' : '✓ Validate Changes'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="pfd-loading">
            <div className="pfd-spinner"></div>
            <p>Loading files…</p>
          </div>
        )}

        {error && (
          <div className="pfd-error">
            <p>⚠️ {error}</p>
            <button onClick={fetchFiles}>Retry</button>
          </div>
        )}

        {data && !loading && (
          <>
            <div className="pfd-stats">
              {tabs.map(t => (
                <div key={t.key} className={`pfd-stat ${t.key}`}>
                  <span className="pfd-stat-label">{t.label}</span>
                  <span className="pfd-stat-value">{t.files.length}</span>
                </div>
              ))}
            </div>

            <div className="pfd-tabs">
              {tabs.map(t => (
                <button
                  key={t.key}
                  className={`pfd-tab ${activeTab === t.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.icon} {t.label}
                  <span className="pfd-tab-count">{t.files.length}</span>
                </button>
              ))}
            </div>

            <div className="pfd-file-list">
              {activeFiles.length === 0 ? (
                <div className="pfd-empty">
                  <p>No {tabs.find(t => t.key === activeTab)?.label.toLowerCase()} found.</p>
                </div>
              ) : (
                <table className="pfd-table">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Size</th>
                      <th>Modified</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeFiles.map((file, idx) => (
                      <tr key={idx}>
                        <td className="pfd-filename">
                          <span className="pfd-file-icon">📄</span>
                          {file.filename}
                        </td>
                        <td className="pfd-file-size">{formatBytes(file.size)}</td>
                        <td className="pfd-file-date">{formatDate(file.modified_at)}</td>
                        <td style={{ display: 'flex', gap: '0.5rem' }}>
                          {activeTab !== 'output' && file.filename.toLowerCase().endsWith('.csv') && (
                            <button
                              className="pfd-download-btn"
                              onClick={() => handleEdit(file.download_url, file.filename, 'csv')}
                              disabled={isDownloadingForEdit}
                            >
                              Edit CSV
                            </button>
                          )}
                          {activeTab !== 'output' && !file.filename.toLowerCase().endsWith('.csv') && !file.filename.toLowerCase().endsWith('.h5') && !file.filename.toLowerCase().endsWith('.zip') && (
                            <button
                              className="pfd-download-btn"
                              onClick={() => handleEdit(file.download_url, file.filename, 'text')}
                              disabled={isDownloadingForEdit}
                            >
                              Edit Text
                            </button>
                          )}
                          <button
                            className="pfd-download-btn"
                            onClick={() => handleDownload(file.download_url, file.filename)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {editingFile && editingType === 'csv' && (
        <CsvEditorDialog
          file={editingFile}
          onClose={() => setEditingFile(null)}
          onSave={handleSaveEditedFile}
        />
      )}
      {editingFile && editingType === 'text' && (
        <TextEditorDialog
          file={editingFile}
          onClose={() => setEditingFile(null)}
          onSave={handleSaveEditedFile}
        />
      )}
    </div>
  )
}

export default ProjectFilesDialog

import { useState, useEffect } from 'react'
import './ProjectFilesDialog.css'

function ProjectFilesDialog({ projectId, projectName, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('input')

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

  const tabs = [
    { key: 'input', label: 'Input Data', icon: '📥', files: data?.input_files || [] },
    { key: 'output', label: 'Output Files', icon: '📤', files: data?.output_files || [] },
    { key: 'config', label: 'Config Files', icon: '⚙️', files: data?.config_files || [] },
  ]

  const activeFiles = tabs.find(t => t.key === activeTab)?.files || []

  return (
    <div className="pfd-overlay" onClick={onClose}>
      <div className="pfd-dialog" onClick={e => e.stopPropagation()}>
        <div className="pfd-header">
          <div>
            <h2 className="pfd-title">{projectName || projectId}</h2>
            <p className="pfd-subtitle">Browse and download project files</p>
          </div>
          <button className="pfd-close-btn" onClick={onClose}>✕</button>
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
                  <span className="pfd-stat-icon">{t.icon}</span>
                  <span className="pfd-stat-value">{t.files.length}</span>
                  <span className="pfd-stat-label">{t.label}</span>
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
                        <td>
                          <button
                            className="pfd-download-btn"
                            onClick={() => handleDownload(file.download_url, file.filename)}
                          >
                            ⬇ Download
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
    </div>
  )
}

export default ProjectFilesDialog

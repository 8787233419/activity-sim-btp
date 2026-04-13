import { useState } from 'react'
import './ProfileCard.css'
function ProfileCard({ profile, onUpdate, onUpload, onShowFiles }) {
  const [files, setFiles] = useState([])
  const [showDetails, setShowDetails] = useState(false)

  const loadFiles = async () => {
    try {
      const response = await fetch(`/api/projects/${profile.id}/files`)
      if (response.ok) {
        const data = await response.json()
        const allFiles = [...(data.configs || []), ...(data.data || []), ...(data.output || []), ...(data.data_model || [])]
        setFiles(allFiles)
      }
    } catch (e) {
      console.error('Error loading files:', e)
    }
  }

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${profile.name}"?`)) {
      try {
        const response = await fetch(`/api/projects/${profile.id}`, { method: 'DELETE' })
        if (response.ok) {
          onUpdate()
        } else {
          const err = await response.json()
          alert(err.detail || 'Failed to delete project')
        }
      } catch (e) {
        console.error('Error deleting project:', e)
        alert('Error deleting project')
      }
    }
  }

  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <h3>{profile.name}</h3>
      </div>

      <div className="profile-actions">
        <button
          type="button"
          className="upload-btn"
          onClick={onUpload}
        >
          Upload and Validate
        </button>
        <button type="button" className="delete-btn" onClick={handleDelete}>
          Delete
        </button>
      </div>

      <div className="profile-card-body">
        <p className="profile-date">
          Created: {new Date(profile.createdAt).toLocaleDateString()}
        </p>

        <div className="profile-btn-row">
          <button
            type="button"
            className="show-project-files-btn"
            onClick={() => onShowFiles && onShowFiles(profile)}
          >
            Manage Project
          </button>
        </div>

        {showDetails && (
          <div className="profile-files">
            {files.length === 0 ? (
              <p className="no-files">No files yet</p>
            ) : (
              <ul className="files-list">
                {files.map((file, index) => (
                  <li key={index}>{file}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfileCard

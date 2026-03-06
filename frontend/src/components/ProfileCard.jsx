import { useState } from 'react'
import { getProfileFiles, deleteProfile } from '../utils/fileStorage'
import './ProfileCard.css'
function ProfileCard({ profile, onUpdate, onUpload }) {
  const [files, setFiles] = useState([])
  const [showDetails, setShowDetails] = useState(false)

  const loadFiles = () => {
    const profileFiles = getProfileFiles(profile.id)
    setFiles(profileFiles)
  }

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${profile.name}"?`)) {
      deleteProfile(profile.id)
      onUpdate()
    }
  }

  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <h3>{profile.name}</h3>
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
      </div>

      <div className="profile-card-body">
        <p className="profile-date">
          Created: {new Date(profile.createdAt).toLocaleDateString()}
        </p>

        <button
          type="button"
          className="toggle-details-btn"
          onClick={() => {
            const nextShowDetails = !showDetails
            setShowDetails(nextShowDetails)
            if (nextShowDetails) {
              loadFiles()
            }
          }}
        >
          {showDetails ? 'Hide' : 'Show'} Files
        </button>

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

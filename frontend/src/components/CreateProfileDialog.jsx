import { useState } from 'react'
import './CreateProfileDialog.css'

function CreateProfileDialog({ onClose, onSuccess }) {
  const [profileName, setProfileName] = useState('')

  const handleCreate = async () => {
    if (!profileName.trim()) {
      alert('Please enter a profile name')
      return
    }

    try {
      const response = await fetch('/api/projects_add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileName,
          description: ""
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create project')
      }

      const data = await response.json()
      console.log('Project created:', data)

      onSuccess()
    } catch (error) {
      console.error('Error creating project:', error)
      alert(`Error: ${error.message}`)
    }
  }

  return (
    <div className="create-dialog-overlay" onClick={onClose}>
      <div className="create-dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="create-dialog-header">
          <h2>Create New Profile</h2>
          <button type="button" className="create-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="create-dialog-body">
          <div className="create-input-group">
            <label htmlFor="profileName">Profile Name:</label>
            <input
              id="profileName"
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Enter profile name"
              className="create-profile-name-input"
            />
          </div>

          <div className="create-dialog-footer">
            <button type="button" className="create-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="create-btn-primary"
              onClick={handleCreate}
              disabled={!profileName.trim()}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateProfileDialog

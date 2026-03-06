import { useState, useEffect } from 'react'
import CreateProfileDialog from './components/CreateProfileDialog'
import ProfileCard from './components/ProfileCard'
import UploadValidationDialog from './components/UploadValidationDialog'
import { getProfiles } from './utils/fileStorage'
import './App.css'

function App() {
  const [profiles, setProfiles] = useState([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [uploadingProfile, setUploadingProfile] = useState(null)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = () => {
    const profileList = getProfiles()
    setProfiles(profileList)
  }

  const handleCreateProfile = () => {
    setShowCreateDialog(true)
  }

  const handleProfileCreated = () => {
    setShowCreateDialog(false)
    loadProfiles()
  }

  const handleUploadStart = (profile) => {
    setUploadingProfile(profile)
  }

  const handleUploadSuccess = () => {
    setUploadingProfile(null)
    loadProfiles()
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1>Profile Manager</h1>
        <button className="create-btn" onClick={handleCreateProfile}>
          + Create Profile
        </button>
      </div>

      <div className="profiles-grid">
        {profiles.length === 0 ? (
          <div className="empty-state">
            <p>No profiles yet. Create your first profile to get started!</p>
          </div>
        ) : (
          profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onUpdate={loadProfiles}
              onUpload={() => handleUploadStart(profile)}
            />
          ))
        )}
      </div>

      {showCreateDialog && (
        <CreateProfileDialog
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleProfileCreated}
        />
      )}

      {uploadingProfile && (
        <UploadValidationDialog
          profileId={uploadingProfile.id}
          profileName={uploadingProfile.name}
          onClose={() => setUploadingProfile(null)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  )
}

export default App

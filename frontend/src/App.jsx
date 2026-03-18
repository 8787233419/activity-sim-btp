import { useState, useEffect } from 'react'
import CreateProfileDialog from './components/CreateProfileDialog'
import ProfileCard from './components/ProfileCard'
import UploadValidationDialog from './components/UploadValidationDialog'
import ProjectFilesDialog from './components/ProjectFilesDialog'
import { getProfiles } from './utils/fileStorage'
import companyLogo from '../logo4.jpg'
import './App.css'

function App() {
  const [profiles, setProfiles] = useState([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [uploadingProfile, setUploadingProfile] = useState(null)
  const [browsingProfile, setBrowsingProfile] = useState(null)

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

  const handleShowFiles = (profile) => {
    setBrowsingProfile(profile)
  }

  return (
    <div className="app">
      <div className="company-header">
        <div className="company-logo-placeholder">
          <img src={companyLogo} alt="ActivitySim Logo" className="company-logo-img" />
        </div>
        <h2 className="company-name">ActivitySim</h2>
      </div>

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
              onShowFiles={handleShowFiles}
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

      {browsingProfile && (
        <ProjectFilesDialog
          projectId={browsingProfile.id}
          projectName={browsingProfile.name}
          onClose={() => setBrowsingProfile(null)}
        />
      )}
    </div>
  )
}

export default App


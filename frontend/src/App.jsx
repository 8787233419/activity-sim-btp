import { useState, useEffect } from 'react'
import CreateProfileDialog from './components/CreateProfileDialog'
import ProfileCard from './components/ProfileCard'
import UploadValidationDialog from './components/UploadValidationDialog'
import ProjectFilesDialog from './components/ProjectFilesDialog'
import SimulationProgressDialog from './components/SimulationProgressDialog'
import companyLogo from '../logo.png'
import './App.css'

function App() {
  const [profiles, setProfiles] = useState([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [uploadingProfile, setUploadingProfile] = useState(null)
  const [browsingProfile, setBrowsingProfile] = useState(null)
  const [activeSimulation, setActiveSimulation] = useState(null)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        const apiProfiles = data.projects.map(p => ({
          id: p.id,
          name: p.name,
          createdAt: p.created_at
        }));
        setProfiles(apiProfiles);
      }
    } catch (err) {
      console.error('Error loading profiles:', err);
    }
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

  const handleUploadSuccess = (executionId) => {
    const prof = uploadingProfile
    setUploadingProfile(null)
    loadProfiles()
    if (executionId && prof) {
      setActiveSimulation({ projectId: prof.id, projectName: prof.name, executionId })
    }
  }

  const handleRunModel = (executionId) => {
    const prof = browsingProfile
    setBrowsingProfile(null)
    if (executionId && prof) {
      setActiveSimulation({ projectId: prof.id, projectName: prof.name, executionId })
    }
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
        <h2 className="company-name">Mobility Activity Engine</h2>
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
          onRunModel={handleRunModel}
        />
      )}

      {activeSimulation && (
        <SimulationProgressDialog
          projectId={activeSimulation.projectId}
          projectName={activeSimulation.projectName}
          executionId={activeSimulation.executionId}
          onClose={() => setActiveSimulation(null)}
          onShowFiles={() => {
            const tempProfile = { id: activeSimulation.projectId, name: activeSimulation.projectName }
            setActiveSimulation(null)
            setBrowsingProfile(tempProfile)
          }}
        />
      )}
    </div>
  )
}

export default App


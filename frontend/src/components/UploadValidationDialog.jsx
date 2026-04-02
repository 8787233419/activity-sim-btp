import { useState, useEffect } from 'react'
import ConfigUploadStep from './ConfigUploadStep'
import FileUploadStep from './FileUploadStep'
import ValidationStep from './ValidationStep'
import { saveFilesToProfile } from '../utils/fileStorage'
import './UploadValidationDialog.css'

function UploadValidationDialog({ profileId, profileName, onClose, onSuccess }) {
  const [step, setStep] = useState(0)   // 0 = config upload, 1 = CSV upload, 2 = validate
  const [files, setFiles] = useState({})      // { [key]: File }
  const [slots, setSlots] = useState([])      // ordered array of active key strings
  const [validationResults, setValidationResults] = useState({})
  const [isValidating, setIsValidating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [allValid, setAllValid] = useState(false)
  const [error, setError] = useState(null)
  const [existingFiles, setExistingFiles] = useState({ configs: [], data: [], data_model: [] })

  const fetchExistingFiles = async () => {
    try {
      const res = await fetch(`/api/projects/${profileId}/files`)
      if (res.ok) {
        const data = await res.json()
        setExistingFiles(data)
      }
    } catch (err) {
      console.error('Failed to fetch existing files:', err)
    }
  }

  useEffect(() => {
    fetchExistingFiles()
  }, [profileId])

  // Derive the file list for ValidationStep by combining existing and new files
  const fileList = []
  if (existingFiles.data) {
    existingFiles.data.forEach((name) => {
      // If none of our incoming slots matches this filename, we keep it
      // A simple heuristic is checking if it starts with the slot key, or if it matches exactly
      const isOverridden = slots.some(k => name.toLowerCase().includes(k.toLowerCase()))
      if (!isOverridden) {
        fileList.push({ key: name, label: name, existing: true })
      }
    })
  }

  slots.forEach((key) => {
    fileList.push({ key, label: files[key] ? files[key].name : key, existing: false })
  })

  // Called by FileUploadStep whenever files OR slots change
  const handleFilesSelected = (newFiles, newSlots) => {
    setFiles(newFiles)
    setSlots(newSlots)
    setValidationResults({})
    setAllValid(false)
  }

  const handleNext = () => {
    if (step === 1) {
      const hasExistingData = existingFiles.data && existingFiles.data.length > 0
      if (slots.length === 0 && !hasExistingData) {
        alert('Please add at least one file slot and upload a file before proceeding.')
        return
      }
      const missingUploads = slots.filter((k) => !files[k])
      if (missingUploads.length > 0 && !hasExistingData) {
        alert(`Please upload a file for: ${missingUploads.join(', ')}`)
        return
      }
      setStep(2)
      setError(null)
    }
  }

  const handleValidate = async () => {
    setIsValidating(true)
    setIsUploading(true)
    setValidationResults({})
    setError(null)

    try {
      // 1. Upload files to backend (ONLY IF there are new files)
      if (Object.keys(files).length > 0) {
        setIsUploading(true)
        const formData = new FormData()
        Object.entries(files).forEach(([key, file]) => {
          // Use the original filename to preserve .zip or other extensions
          formData.append('files', file, file.name)
        })

        const uploadResponse = await fetch(`/api/projects/${profileId}/upload-csv`, {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          throw new Error(errorData.detail || 'Failed to upload files')
        }
        setIsUploading(false)
      }

      // 2. Trigger validation
      const validateResponse = await fetch(`/api/projects/${profileId}/validate`, {
        method: 'POST',
      })

      if (!validateResponse.ok) {
        const errorData = await validateResponse.json()
        throw new Error(errorData.detail || 'Validation failed')
      }

      const result = await validateResponse.json()

      // 3. Build initial results — mark all uploaded files as valid by default
      const results = {}
      fileList.forEach((f) => {
        results[f.key] = { isValid: true, message: 'File is valid' }
      })

      // 4. Override with actual backend results
      if (result.tables) {
        result.tables.forEach((table) => {
          const match = fileList.find(
            (rf) =>
              rf.key.toLowerCase() === table.table_name.toLowerCase() ||
              table.table_name.toLowerCase().includes(rf.key.toLowerCase()) ||
              rf.key.toLowerCase().includes(table.table_name.toLowerCase())
          )
          if (match) {
            const hasErrors = table.status === 'failed' || table.error_count > 0
            results[match.key] = {
              isValid: !hasErrors,
              message: hasErrors
                ? `${table.error_count} error(s) found. ${table.errors[0]?.message || ''}`
                : table.warning_count > 0
                  ? `Valid with ${table.warning_count} warning(s).`
                  : 'File is valid',
            }
          }
        })
      }

      setValidationResults(results)
      setAllValid(result.overall_status === 'passed' || result.ready_for_simulation)

    } catch (err) {
      console.error('Validation process error:', err)
      setError(err.message)
      alert(`Error: ${err.message}`)
    } finally {
      setIsValidating(false)
      setIsUploading(false)
    }
  }

  const handleReupload = (fileKey) => {
    const newFiles = { ...files }
    delete newFiles[fileKey]
    setFiles(newFiles)
    const newResults = { ...validationResults }
    delete newResults[fileKey]
    setValidationResults(newResults)
    setAllValid(false)
    setStep(1) // Go back to data upload step to allow replacement
  }

  const handleSaveAndClose = async () => {
    try {
      const response = await fetch(`/api/projects/${profileId}/execute`, { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to start model execution');
      }
      const data = await response.json();
      await saveFilesToProfile(profileId, files);
      alert('Model simulation started successfully!');
      onSuccess(data.execution_id);
    } catch (err) {
      console.error(err);
      alert('Error starting model: ' + err.message);
    }
  }

  return (
    <div className="upload-dialog-overlay" onClick={onClose}>
      <div className="upload-dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="upload-dialog-header">
          <div>
            <h2>Upload &amp; Validate: {profileName}</h2>
            <div className="upload-step-indicator">
              <span className={step >= 0 ? 'step-dot active' : 'step-dot'}>1. Config</span>
              <span className="step-sep">›</span>
              <span className={step >= 1 ? 'step-dot active' : 'step-dot'}>2. Data</span>
              <span className="step-sep">›</span>
              <span className={step >= 2 ? 'step-dot active' : 'step-dot'}>3. Validate</span>
            </div>
          </div>
          <button type="button" className="upload-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="upload-dialog-body" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* Sidebar: Show existing files globally */}
          <div className="existing-files-sidebar" style={{ width: '240px', background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: '#e2e8f0', fontWeight: '600' }}>Existing Files</h4>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: '1.4' }}>
              Files currently saved for this profile.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Configs</h5>
              {(!existingFiles.configs || existingFiles.configs.length === 0) && <span style={{ fontSize: '0.85rem', color: '#64748b' }}>None</span>}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                {existingFiles.configs?.map(name => <li key={name} style={{ marginBottom: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>📄 {name}</li>)}
              </ul>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data Model</h5>
              {(!existingFiles.data_model || existingFiles.data_model.length === 0) && <span style={{ fontSize: '0.85rem', color: '#64748b' }}>None</span>}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                {existingFiles.data_model?.map(name => <li key={name} style={{ marginBottom: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>📄 {name}</li>)}
              </ul>
            </div>

            <div>
              <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data</h5>
              {(!existingFiles.data || existingFiles.data.length === 0) && <span style={{ fontSize: '0.85rem', color: '#64748b' }}>None</span>}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                {existingFiles.data?.map(name => <li key={name} style={{ marginBottom: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>📊 {name}</li>)}
              </ul>
            </div>
          </div>

          <div className="upload-steps-container" style={{ flex: 1, minWidth: 0 }}>
            {/* ── Step 0: Config upload ── */}
            {step === 0 && (
              <ConfigUploadStep
                profileId={profileId}
                existingFiles={existingFiles.configs}
                existingDataModels={existingFiles.data_model}
                onUploadDone={() => {
                  fetchExistingFiles()
                  setStep(1)
                }}
                onSkip={() => setStep(1)}
              />
            )}

            {step === 1 && (
              <>
                <FileUploadStep
                  files={files}
                  slots={slots}
                  existingFiles={existingFiles.data}
                  onFilesSelected={handleFilesSelected}
                />

                <div className="upload-dialog-footer">
                  <button type="button" className="upload-btn-secondary" onClick={() => setStep(0)}>
                    ← Back
                  </button>
                  <div style={{ flex: 1 }} />

                  {existingFiles.data && existingFiles.data.length > 0 && slots.length > 0 && (
                    <button
                      type="button"
                      className="upload-btn-secondary"
                      onClick={() => {
                        handleFilesSelected({}, [])
                        setStep(2)
                      }}
                      style={{ marginRight: '1rem' }}
                    >
                      Continue with existing data only
                    </button>
                  )}

                  <button
                    type="button"
                    className="upload-btn-primary"
                    onClick={handleNext}
                    disabled={slots.length === 0 && (!existingFiles.data || existingFiles.data.length === 0)}
                  >
                    {(existingFiles.data && existingFiles.data.length > 0 && Object.keys(files).length === 0)
                      ? 'Continue with existing data only'
                      : 'Next'}
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <ValidationStep
                requiredFiles={fileList}
                files={files}
                validationResults={validationResults}
                isValidating={isValidating || isUploading}
                allValid={allValid}
                onValidate={handleValidate}
                onReupload={handleReupload}
                onStartModel={handleSaveAndClose}
                onBack={() => setStep(1)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadValidationDialog

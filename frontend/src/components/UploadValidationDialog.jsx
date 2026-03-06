import { useState } from 'react'
import FileUploadStep from './FileUploadStep'
import ValidationStep from './ValidationStep'
import { saveFilesToProfile } from '../utils/fileStorage'
import './UploadValidationDialog.css'

function UploadValidationDialog({ profileId, profileName, onClose, onSuccess }) {
  const [step, setStep] = useState(1)
  const [files, setFiles] = useState({})      // { [key]: File }
  const [slots, setSlots] = useState([])      // ordered array of active key strings
  const [validationResults, setValidationResults] = useState({})
  const [isValidating, setIsValidating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [allValid, setAllValid] = useState(false)
  const [error, setError] = useState(null)

  // Derive the file list for ValidationStep from current slots
  const fileList = slots.map((key) => ({
    key,
    label: `${key}.csv`,
  }))

  // Called by FileUploadStep whenever files OR slots change
  const handleFilesSelected = (newFiles, newSlots) => {
    setFiles(newFiles)
    setSlots(newSlots)
    setValidationResults({})
    setAllValid(false)
  }

  const handleNext = () => {
    if (step === 1) {
      if (slots.length === 0) {
        alert('Please add at least one file slot and upload a file before proceeding.')
        return
      }
      const missingUploads = slots.filter((k) => !files[k])
      if (missingUploads.length > 0) {
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
      // 1. Upload files to backend
      const formData = new FormData()
      Object.entries(files).forEach(([key, file]) => {
        formData.append('files', file, `${key}.csv`)
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
  }

  const handleSaveAndClose = async () => {
    await saveFilesToProfile(profileId, files)
    onSuccess()
  }

  return (
    <div className="upload-dialog-overlay" onClick={onClose}>
      <div className="upload-dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="upload-dialog-header">
          <h2>Upload &amp; Validate: {profileName}</h2>
          <button type="button" className="upload-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="upload-dialog-body">
          {step === 1 && (
            <>
              <FileUploadStep
                files={files}
                slots={slots}
                onFilesSelected={handleFilesSelected}
              />

              <div className="upload-dialog-footer">
                <button type="button" className="upload-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="upload-btn-primary"
                  onClick={handleNext}
                  disabled={slots.length === 0}
                >
                  Next
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
  )
}

export default UploadValidationDialog

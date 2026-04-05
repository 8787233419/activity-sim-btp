import { useState, useRef } from 'react'
import './FileUploadStep.css'
import CsvEditorDialog from './CsvEditorDialog'
import TextEditorDialog from './TextEditorDialog'

// All recognised file-type options the user can choose from
const KNOWN_FILE_TYPES = [
  { key: 'households', label: 'households.csv' },
  { key: 'persons', label: 'persons.csv' },
  { key: 'land_use', label: 'land_use.csv' },
  { key: 'example_hwy_data', label: 'example_hwy_data.csv' },
  { key: 'override_hh_ids', label: 'override_hh_ids.csv' },
]

/**
 * FileUploadStep — card-per-slot upload panel.
 *
 * Props:
 *   files           : { [key]: File }   current file map
 *   slots           : string[]          ordered list of active slot keys
 *   onFilesSelected : (files, slots) => void
 */
function FileUploadStep({ files, slots, existingFiles = [], onFilesSelected }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [editingFileKey, setEditingFileKey] = useState(null)
  const [editingType, setEditingType] = useState('csv')
  const fileInputRefs = useRef({})

  // Options not yet added
  const available = KNOWN_FILE_TYPES.filter((t) => !slots.includes(t.key))

  const handleAddSlot = (key) => {
    const newSlots = [...slots, key]
    onFilesSelected({ ...files }, newSlots)
    setDropdownOpen(false)
  }

  const handleRemoveSlot = (key) => {
    const newSlots = slots.filter((s) => s !== key)
    const newFiles = { ...files }
    delete newFiles[key]
    onFilesSelected(newFiles, newSlots)
  }

  const handleFileChange = (key, event) => {
    const file = event.target.files[0]
    if (file) {
      onFilesSelected({ ...files, [key]: file }, slots)
    }
    event.target.value = ''
  }

  // Handle folder or multiple file uploads
  const handleBulkUpload = (event) => {
    const uploadedFiles = Array.from(event.target.files)

    if (uploadedFiles.length === 0) return

    // For ZIP files, just add it under a special 'zip_archive' key
    if (uploadedFiles.length === 1 && uploadedFiles[0].name.toLowerCase().endsWith('.zip')) {
      const newSlots = [...slots]
      if (!newSlots.includes('zip_archive')) newSlots.push('zip_archive')
      onFilesSelected({ ...files, zip_archive: uploadedFiles[0] }, newSlots)
      event.target.value = ''
      return
    }

    // For folder uploads (webkitdirectory), match files to known slots by name
    const newFiles = { ...files }
    const newSlots = [...slots]
    let filesAdded = 0

    uploadedFiles.forEach(file => {
      // Find a matching KNOWN_FILE_TYPE by filename
      const match = KNOWN_FILE_TYPES.find(t => t.label.toLowerCase() === file.name.toLowerCase())

      if (match) {
        newFiles[match.key] = file
        if (!newSlots.includes(match.key)) newSlots.push(match.key)
        filesAdded++
      } else {
        // Fallback for unknown files: use the exact filename as key (without extension)
        const customKey = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
        newFiles[customKey] = file
        if (!newSlots.includes(customKey)) newSlots.push(customKey)
        filesAdded++
      }
    })

    if (filesAdded > 0) {
      onFilesSelected(newFiles, newSlots)
    } else {
      alert('No valid files found in the selected folder.')
    }

    event.target.value = ''
  }

  return (
    <div className="file-upload-step">
      <h3>Upload Data Files</h3>
      <p className="step-description">
        Add the data files your project needs and upload each one.
      </p>

      <div className="bulk-upload-actions" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <div className="file-input-wrapper">
          <input
            type="file"
            webkitdirectory="true"
            directory="true"
            multiple
            id="folder-upload"
            className="file-input"
            onChange={handleBulkUpload}
          />
          <label htmlFor="folder-upload" className="file-input-label" style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'inline-block' }}>
            Upload Folder
          </label>
        </div>

        <div className="file-input-wrapper">
          <input
            type="file"
            accept=".zip"
            id="zip-upload"
            className="file-input"
            onChange={handleBulkUpload}
          />
          <label htmlFor="zip-upload" className="file-input-label" style={{ backgroundColor: '#4f46e5', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'inline-block' }}>
            Upload ZIP
          </label>
        </div>
      </div>



      {/* File slot cards */}
      <div className="file-upload-list">
        {slots.length === 0 && (
          <div className="empty-slots-hint">
            Upload a <strong>Folder</strong>, a <strong>ZIP</strong>, or click <strong>+ Add File</strong> below to add individual file slots.
          </div>
        )}

        {slots.map((key) => {
          const typeInfo = KNOWN_FILE_TYPES.find((t) => t.key === key)
          const file = files[key]

          return (
            <div key={key} className="file-upload-item">
              <div className="file-info">
                <div className="file-label-row">
                  <label className="file-label">{typeInfo?.label ?? key}</label>
                  <button
                    type="button"
                    className="slot-remove-btn"
                    onClick={() => handleRemoveSlot(key)}
                    title="Remove this file slot"
                  >
                    ✕
                  </button>
                </div>

                {file ? (
                  <div className="file-selected" style={{ gap: '1rem' }}>
                    <span className="file-name">✓ {file.name}</span>
                    {file.name.toLowerCase().endsWith('.csv') ? (
                      <button
                        type="button"
                        className="btn-secondary edit-csv-btn"
                        style={{ marginLeft: '1rem', padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => { setEditingFileKey(key); setEditingType('csv'); }}
                      >
                        Edit
                      </button>
                    ) : (!file.name.toLowerCase().endsWith('.h5') && !file.name.toLowerCase().endsWith('.zip') && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ marginLeft: '1rem', padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => { setEditingFileKey(key); setEditingType('text'); }}
                      >
                        Edit
                      </button>
                    ))}
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => handleRemoveSlot(key)}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="file-input-wrapper">
                    <input
                      ref={(el) => { fileInputRefs.current[key] = el }}
                      type="file"
                      className="file-input"
                      id={`file-${key}`}
                      onChange={(e) => handleFileChange(key, e)}
                    />
                    <label htmlFor={`file-${key}`} className="file-input-label">
                      Choose File
                    </label>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add File button + dropdown */}
      {available.length > 0 && (
        <div className="add-file-container">
          <button
            type="button"
            className="add-file-btn"
            onClick={() => setDropdownOpen((o) => !o)}
          >
            + Add File
          </button>

          {dropdownOpen && (
            <div className="add-file-dropdown">
              {available.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className="add-file-option"
                  onClick={() => handleAddSlot(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {available.length === 0 && slots.length > 0 && (
        <p className="all-added-note">All available file types have been added.</p>
      )}

      {editingFileKey && files[editingFileKey] && editingType === 'csv' && (
        <CsvEditorDialog
          file={files[editingFileKey]}
          onClose={() => setEditingFileKey(null)}
          onSave={(newFile) => {
            onFilesSelected({ ...files, [editingFileKey]: newFile }, slots)
            setEditingFileKey(null)
          }}
        />
      )}
      {editingFileKey && files[editingFileKey] && editingType === 'text' && (
        <TextEditorDialog
          file={files[editingFileKey]}
          onClose={() => setEditingFileKey(null)}
          onSave={(newFile) => {
            onFilesSelected({ ...files, [editingFileKey]: newFile }, slots)
            setEditingFileKey(null)
          }}
        />
      )}
    </div>
  )
}

export default FileUploadStep

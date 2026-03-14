import { useState, useRef } from 'react'
import './FileUploadStep.css'

// All recognised file-type options the user can choose from
const KNOWN_FILE_TYPES = [
  { key: 'households',      label: 'households.csv' },
  { key: 'persons',         label: 'persons.csv' },
  { key: 'land_use',        label: 'land_use.csv' },
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
function FileUploadStep({ files, slots, onFilesSelected }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
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

  return (
    <div className="file-upload-step">
      <h3>Upload CSV Files</h3>
      <p className="step-description">
        Add the CSV files your project needs and upload each one.
      </p>

      {/* File slot cards */}
      <div className="file-upload-list">
        {slots.length === 0 && (
          <div className="empty-slots-hint">
            Click <strong>+ Add File</strong> below to add a file slot.
          </div>
        )}

        {slots.map((key) => {
          const typeInfo = KNOWN_FILE_TYPES.find((t) => t.key === key)
          const file = files[key]

          return (
            <div key={key} className="file-upload-item">
              <div className="file-info">
                <div className="file-label-row">
                  <label className="file-label">{typeInfo?.label ?? `${key}.csv`}</label>
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
                  <div className="file-selected">
                    <span className="file-name">✓ {file.name}</span>
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
                      accept=".csv"
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
    </div>
  )
}

export default FileUploadStep

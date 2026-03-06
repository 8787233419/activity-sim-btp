import './ValidationStep.css'

function ValidationStep({
  requiredFiles,
  files,
  validationResults,
  isValidating,
  allValid,
  onValidate,
  onReupload,
  onStartModel,
  onBack,
}) {
  return (
    <div className="validation-step">
      <h3>File Validation</h3>
      <p className="step-description">
        Review and validate your uploaded files before running the simulation.
        {requiredFiles.length > 0 && (
          <> &nbsp;<span className="file-count-badge">{requiredFiles.length} file{requiredFiles.length !== 1 ? 's' : ''} queued</span></>
        )}
      </p>

      <div className="validation-list">
        {requiredFiles.length === 0 && (
          <p className="no-files-note">No files added. Go back and upload at least one CSV file.</p>
        )}

        {requiredFiles.map((fileInfo) => {
          const file = files[fileInfo.key]
          const result = validationResults[fileInfo.key]

          return (
            <div key={fileInfo.key} className="validation-item">
              <div className="validation-header">
                <div className="validation-file-meta">
                  <span className="file-name-label">📄 {fileInfo.label}</span>
                  {file && (
                    <span className="file-size-inline">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
                <div className="validation-header-right">
                  {result && (
                    <span
                      className={`validation-status ${result.isValid ? 'valid' : 'invalid'}`}
                    >
                      {result.isValid ? '✓ Valid' : '✗ Invalid'}
                    </span>
                  )}
                  {result && !result.isValid && (
                    <button
                      type="button"
                      className="reupload-btn"
                      onClick={() => onReupload(fileInfo.key)}
                    >
                      Replace
                    </button>
                  )}
                </div>
              </div>

              {result && (
                <div
                  className={`validation-message ${result.isValid ? 'success' : 'error'}`}
                >
                  {result.message}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="validation-footer">
        <button type="button" className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
        {!allValid && requiredFiles.length > 0 && (
          <button
            type="button"
            className="btn-primary validate-btn"
            onClick={onValidate}
            disabled={isValidating}
          >
            {isValidating ? (
              <span className="validating-label">
                <span className="spinner" /> Validating…
              </span>
            ) : (
              'Validate Files'
            )}
          </button>
        )}
        {allValid && (
          <button
            type="button"
            className="btn-success"
            onClick={onStartModel}
          >
            ✓ Start Model
          </button>
        )}
      </div>
    </div>
  )
}

export default ValidationStep

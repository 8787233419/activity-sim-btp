import { useState, useEffect, useRef } from 'react'
import './SimulationProgressDialog.css'

function SimulationProgressDialog({ projectId, projectName, executionId, onClose, onShowFiles }) {
  const [status, setStatus] = useState('connecting')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('Connecting to server...')
  const [logs, setLogs] = useState([])
  const wsRef = useRef(null)
  const logsEndRef = useRef(null)

  useEffect(() => {
    // Scroll to bottom of logs when they change
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  useEffect(() => {
    let intervalId = null
    let isActive = true

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/execution-status/${executionId}`)
        if (!response.ok) return

        const data = await response.json()
        if (!isActive) return

        if (data.status) setStatus(data.status)
        if (data.progress !== undefined) setProgress(data.progress)
        if (data.current_step) setCurrentStep(data.current_step)
        if (data.logs) setLogs(data.logs)

        // Stop polling if the simulation is finished
        if (data.status === 'completed' || data.status === 'error' || data.status === 'stopped') {
          if (intervalId) clearInterval(intervalId)
        }
      } catch (err) {
        console.error('Error polling status:', err)
      }
    }

    // Call immediately then set interval
    pollStatus()
    intervalId = setInterval(pollStatus, 1000)

    return () => {
      isActive = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [projectId, executionId])

  const isFinished = status === 'completed' || status === 'error' || status === 'stopped'

  return (
    <div className="sim-prog-overlay">
      <div className="sim-prog-dialog">
        <div className="sim-prog-header">
          <div>
            <h2>{projectName} - Execution</h2>
            <span className={`sim-status-badge ${status}`}>{status.toUpperCase()}</span>
          </div>
          {isFinished && <button className="sim-close-btn" onClick={onClose}>✕</button>}
        </div>

        <div className="sim-prog-body">
          <div className="sim-step-text">{currentStep}</div>
          <div className="sim-prog-bar-container">
            <div className="sim-prog-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="sim-prog-percent">{progress}%</div>

          <div className="sim-logs-container">
            {logs.length === 0 ? (
              <div className="sim-log-empty">Waiting for logs...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`sim-log-line ${log.level ? log.level.toLowerCase() : ''}`}>
                  <span className="sim-log-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className="sim-log-msg">{log.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        <div className="sim-prog-footer">
          {status === 'completed' ? (
            <button className="sim-btn-primary" onClick={onShowFiles}>
              Browse Output Files
            </button>
          ) : (
            <button className="sim-btn-secondary" onClick={onClose}>
              {isFinished ? 'Close' : 'Run in Background'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SimulationProgressDialog

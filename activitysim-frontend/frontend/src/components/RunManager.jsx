import React, { useState } from 'react';
import { Play, Square, Pause, RefreshCw } from 'lucide-react';

const RunManager = ({ projectId, onRun, onStop, runStatus }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!runStatus) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Run Simulation</h3>
        <button
          onClick={() => onRun(projectId)}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 transition font-semibold"
        >
          <Play size={20} />
          Start Run
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Run Status</h3>
      
      {/* Status Badge */}
      <div className="mb-4">
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          runStatus.status === 'running' ? 'bg-blue-100 text-blue-800' :
          runStatus.status === 'completed' ? 'bg-green-100 text-green-800' :
          runStatus.status === 'error' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {runStatus.status.toUpperCase()}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm font-bold">{runStatus.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
            style={{ width: `${runStatus.progress}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <p className="text-sm text-gray-600">Current Step</p>
        <p className="text-base font-semibold text-gray-800">{runStatus.current_step}</p>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-4">
        {runStatus.status === 'running' && (
          <>
            <button
              onClick={() => onStop(projectId, runStatus.run_id)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              <Square size={18} />
              Stop
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition">
              <Pause size={18} />
              Pause
            </button>
          </>
        )}
        {(runStatus.status === 'completed' || runStatus.status === 'error') && (
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            <RefreshCw size={18} />
            New Run
          </button>
        )}
      </div>

      {/* Details Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-blue-600 text-sm font-semibold hover:underline"
      >
        {showDetails ? 'Hide' : 'Show'} Details
      </button>

      {/* Details */}
      {showDetails && (
        <div className="mt-4 p-3 bg-gray-50 rounded text-sm space-y-2 max-h-40 overflow-y-auto">
          {runStatus.logs?.slice(-10).map((log, idx) => (
            <div key={idx} className="text-gray-700 font-mono text-xs">
              <span className={log.level === 'ERROR' ? 'text-red-600 font-bold' : 'text-gray-600'}>
                [{log.level}]
              </span>
              {' '}{log.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RunManager;

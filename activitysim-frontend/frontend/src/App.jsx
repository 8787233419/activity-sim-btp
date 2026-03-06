import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ProjectsView from './components/ProjectsView';
import SettingsEditor from './components/SettingsEditor';
import RunManager from './components/RunManager';
import ResultsPanel from './components/ResultsPanel';
import FileExplorer from './components/FileExplorer';
import { projectsAPI, settingsAPI, filesAPI, runsAPI, resultsAPI } from './services/api';

function App() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState('');
  const [files, setFiles] = useState({});
  const [results, setResults] = useState(null);
  const [runStatus, setRunStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({ name: '', description: '' });

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load project data when project changes
  useEffect(() => {
    if (currentProject) {
      loadProjectData();
    }
  }, [currentProject]);

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.list();
      setProjects(response.data.projects);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadProjectData = async () => {
    if (!currentProject) return;
    
    try {
      setLoading(true);
      
      // Load settings
      const settingsResponse = await settingsAPI.get(currentProject);
      setSettings(settingsResponse.data.settings);

      // Load files
      const filesResponse = await filesAPI.list(currentProject);
      setFiles(filesResponse.data);

      // Load results
      const resultsResponse = await resultsAPI.get(currentProject);
      setResults(resultsResponse.data);

      setLoading(false);
    } catch (error) {
      console.error('Error loading project data:', error);
      setLoading(false);
    }
  };

  const handleNewProject = async () => {
    if (!newProjectForm.name.trim()) return;

    try {
      const response = await projectsAPI.create(newProjectForm.name, newProjectForm.description);
      setProjects([...projects, response.data.project]);
      setNewProjectForm({ name: '', description: '' });
      setShowNewProjectModal(false);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleSaveSettings = async (projectId, newSettings) => {
    try {
      await settingsAPI.update(projectId, newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleStartRun = async (projectId) => {
    try {
      const response = await runsAPI.start(projectId);
      setRunStatus({
        run_id: response.data.run_id,
        status: 'running',
        progress: 0,
        current_step: 'Initializing...',
        logs: [],
        ...response.data
      });

      // WebSocket connection for real-time updates
      const ws = new WebSocket(`ws://localhost:8000/ws/run/${response.data.run_id}`);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setRunStatus(data);
      };
      ws.onerror = (error) => console.error('WebSocket error:', error);

    } catch (error) {
      console.error('Error starting run:', error);
    }
  };

  const handleStopRun = async (projectId, runId) => {
    try {
      await runsAPI.stop(projectId, runId);
      setRunStatus((prev) => ({ ...prev, status: 'stopped' }));
    } catch (error) {
      console.error('Error stopping run:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar
        projects={projects}
        currentProject={currentProject}
        onProjectSelect={setCurrentProject}
        onNewProject={() => setShowNewProjectModal(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {!currentProject ? (
          // Projects View
          <ProjectsView
            projects={projects}
            onNewProject={() => setShowNewProjectModal(true)}
            onSelectProject={setCurrentProject}
            onDeleteProject={(id) => setProjects(projects.filter(p => p.id !== id))}
          />
        ) : (
          // Project View
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">{currentProject?.name || 'Project'}</h2>
              <p className="text-sm text-gray-600">Project ID: {currentProject}</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-6">
              {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                  <div className="lg:col-span-2">
                    <RunManager
                      projectId={currentProject}
                      onRun={handleStartRun}
                      onStop={handleStopRun}
                      runStatus={runStatus}
                    />
                  </div>
                  <div className="overflow-y-auto">
                    <FileExplorer files={files} />
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="h-full">
                  <SettingsEditor
                    projectId={currentProject}
                    settings={settings}
                    onSave={handleSaveSettings}
                    loading={loading}
                  />
                </div>
              )}

              {activeTab === 'results' && (
                <div className="h-full">
                  <ResultsPanel projectId={currentProject} results={results} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Create New Project</h3>
            
            <input
              type="text"
              placeholder="Project Name"
              value={newProjectForm.name}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <textarea
              placeholder="Description (optional)"
              value={newProjectForm.description}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleNewProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

import React from 'react';
import {
  Menu,
  Settings,
  Play,
  Square,
  BarChart3,
  Plus,
  FileText,
  Folder,
  Home
} from 'lucide-react';

const Sidebar = ({ projects, currentProject, onProjectSelect, onNewProject, activeTab, onTabChange }) => {
  return (
    <div className="w-64 bg-gray-900 text-white h-screen overflow-y-auto border-r border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <BarChart3 size={24} />
          <h1 className="text-lg font-bold">ActivitySim</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded transition ${
            activeTab === 'dashboard' ? 'bg-blue-600' : 'hover:bg-gray-800'
          }`}
        >
          <Home size={18} />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => onTabChange('settings')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded transition ${
            activeTab === 'settings' ? 'bg-blue-600' : 'hover:bg-gray-800'
          }`}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <button
          onClick={() => onTabChange('results')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded transition ${
            activeTab === 'results' ? 'bg-blue-600' : 'hover:bg-gray-800'
          }`}
        >
          <BarChart3 size={18} />
          <span>Results</span>
        </button>
      </nav>

      {/* Projects */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Folder size={18} />
            Projects
          </h2>
          <button
            onClick={onNewProject}
            className="p-1 hover:bg-gray-800 rounded transition"
            title="New Project"
          >
            <Plus size={16} />
          </button>
        </div>
        
        <div className="space-y-1">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onProjectSelect(project.id)}
              className={`w-full text-left px-3 py-2 rounded transition text-sm truncate ${
                currentProject?.id === project.id
                  ? 'bg-blue-600 font-semibold'
                  : 'hover:bg-gray-800'
              }`}
              title={project.name}
            >
              {project.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

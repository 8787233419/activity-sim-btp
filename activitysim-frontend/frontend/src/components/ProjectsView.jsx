import React from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';

const ProjectsView = ({ projects, onNewProject, onSelectProject, onDeleteProject }) => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
        <button
          onClick={onNewProject}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          <Plus size={20} />
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            className="p-4 border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-400 transition cursor-pointer bg-white"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.name}</h3>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description || 'No description'}</p>
            
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
              <Calendar size={14} />
              {new Date(project.created_at).toLocaleDateString()}
            </div>

            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectProject(project.id);
                }}
                className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded text-sm font-semibold hover:bg-blue-100 transition"
              >
                Open
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteProject(project.id);
                }}
                className="px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No projects yet</p>
          <button
            onClick={onNewProject}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            Create Your First Project
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectsView;

import React from 'react';
import { Folder, File, FileJson, FileText } from 'lucide-react';

const FileExplorer = ({ files }) => {
  const getFileIcon = (filename) => {
    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) return <FileText size={16} className="text-blue-600" />;
    if (filename.endsWith('.json')) return <FileJson size={16} className="text-yellow-600" />;
    if (filename.endsWith('.csv')) return <File size={16} className="text-green-600" />;
    return <File size={16} className="text-gray-600" />;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 h-full overflow-y-auto">
      <h3 className="font-semibold mb-3">Files</h3>
      
      <div className="space-y-3">
        {/* Configs */}
        <div>
          <div className="flex items-center gap-2 font-semibold text-sm mb-2 text-gray-700">
            <Folder size={16} className="text-blue-500" />
            Configs
          </div>
          <div className="ml-4 space-y-1">
            {files?.configs?.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 cursor-pointer">
                {getFileIcon(file)}
                <span className="truncate">{file}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data */}
        <div>
          <div className="flex items-center gap-2 font-semibold text-sm mb-2 text-gray-700">
            <Folder size={16} className="text-green-500" />
            Data
          </div>
          <div className="ml-4 space-y-1">
            {files?.data?.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 cursor-pointer">
                {getFileIcon(file)}
                <span className="truncate">{file}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Output */}
        <div>
          <div className="flex items-center gap-2 font-semibold text-sm mb-2 text-gray-700">
            <Folder size={16} className="text-purple-500" />
            Output
          </div>
          <div className="ml-4 space-y-1">
            {files?.output?.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 cursor-pointer">
                {getFileIcon(file)}
                <span className="truncate">{file}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileExplorer;

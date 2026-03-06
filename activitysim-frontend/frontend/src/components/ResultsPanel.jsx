import React from 'react';
import { BarChart3, FileText, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ResultsPanel = ({ projectId, results }) => {
  // Mock data for demonstration
  const mockChartData = [
    { name: 'Households', value: 5000 },
    { name: 'Persons', value: 12500 },
    { name: 'Vehicles', value: 8200 },
    { name: 'Tours', value: 45000 },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6 h-full overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4">Results & Analytics</h3>

      {/* Chart */}
      {results?.summary && (
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Output Files */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <FileText size={18} />
          Output Files
        </h4>
        <div className="space-y-2">
          {results?.files?.length > 0 ? (
            results.files.slice(0, 10).map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition">
                <span className="text-sm truncate">{file}</span>
                <button className="p-1 hover:bg-gray-300 rounded transition" title="Download">
                  <Download size={16} className="text-blue-600" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-600">No output files yet</p>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {results?.summary && (
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <p className="text-sm text-gray-600">Total Files: <span className="font-bold text-gray-800">{results.summary.total_files}</span></p>
          <p className="text-sm text-gray-600 mt-1">Last Updated: <span className="font-bold text-gray-800">{new Date(results.summary.last_updated).toLocaleString()}</span></p>
        </div>
      )}
    </div>
  );
};

export default ResultsPanel;

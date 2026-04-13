import { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import './CsvEditorDialog.css';

// Register AG Grid Modules (Required for AG Grid v32+)
ModuleRegistry.registerModules([AllCommunityModule]);

function CsvEditorDialog({ file, onClose, onSave }) {
  const [rowData, setRowData] = useState([]);
  const [colDefs, setColDefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const gridRef = useRef();

  useEffect(() => {
    if (file) {
      setLoading(true);
      setErrorMsg('');

      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target.result;
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              console.log("Parsed CSV:", { fields: results.meta.fields, rowCount: results.data?.length });
              if (results.meta.fields) {
                const cols = results.meta.fields.map(field => ({
                  field: field,
                  editable: true,
                  resizable: true,
                  sortable: true,
                  filter: true,
                  flex: 1,
                  minWidth: 100,
                }));
                setColDefs(cols);
              } else {
                setErrorMsg("No columns detected in the CSV file.");
              }
              console.log("Parsed CSV Data:", results);
              setRowData(results.data);
              setLoading(false);
            },
            error: (error) => {
              console.error("Error parsing CSV:", error);
              setErrorMsg("PapaParse error: " + error.message);
              setLoading(false);
            }
          });
        };
        reader.onerror = () => {
          console.error("Error file reading:", reader.error);
          setErrorMsg("Failed to read the file.");
          setLoading(false);
        }
        reader.readAsText(file);
      } catch (err) {
        console.error("Sync error reading file:", err);
        setErrorMsg("File is invalid or not accessible: " + err.message);
        setLoading(false);
      }
    }
  }, [file]);

  const handleSave = () => {
    if (!gridRef.current) return;

    // Get all rows from the grid
    const editedData = [];
    gridRef.current.api.forEachNode(node => editedData.push(node.data));

    // Convert back to CSV
    const csv = Papa.unparse(editedData);

    // Create new File object
    const newFile = new File([csv], file.name, { type: file.type || 'text/csv' });
    onSave(newFile);
  };

  const handleAddRow = () => {
    if (!gridRef.current) return;
    gridRef.current.api.applyTransaction({ add: [{}] });
  };

  return (
    <div className="csv-editor-overlay" onClick={onClose}>
      <div className="csv-editor-content" onClick={e => e.stopPropagation()}>
        <div className="csv-editor-header">
          <div>
            <h2>Edit {file?.name || "Unknown File"}</h2>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {file?.size ? (file.size / 1024).toFixed(1) + ' KB' : 'Unknown size'}
              {rowData?.length > 0 && ` • ${rowData.length} rows`}
            </span>
          </div>
          <button type="button" className="csv-editor-close" onClick={onClose}>&times;</button>
        </div>

        <div className="csv-editor-body">
          <div className="csv-editor-toolbar">
            {onSave && <button type="button" className="btn-secondary" onClick={handleAddRow}>+ Add Row</button>}
            <span className="csv-editor-hint">{onSave ? 'Double click any cell to edit' : 'Read-only view'}</span>
          </div>
          {errorMsg ? (
            <div className="csv-editor-loading" style={{ color: '#ef4444' }}>{errorMsg}</div>
          ) : loading ? (
            <div className="csv-editor-loading">Loading CSV data...</div>
          ) : (
            <div className="ag-theme-quartz" style={{ height: '400px', flexShrink: 0, width: '100%', marginTop: '1rem' }}>
              <AgGridReact
                ref={gridRef}
                rowData={rowData}
                columnDefs={colDefs}
                stopEditingWhenCellsLoseFocus={true}
                defaultColDef={{
                  editable: !!onSave,
                  sortable: true,
                  filter: true,
                  resizable: true,
                  flex: 1,
                  minWidth: 100
                }}
              />
            </div>
          )}
        </div>

        <div className="csv-editor-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>{onSave ? 'Cancel' : 'Close Viewer'}</button>
          {onSave && <button type="button" className="btn-primary" onClick={handleSave} disabled={loading}>Save & Close</button>}
        </div>
      </div>
    </div>
  );
}

export default CsvEditorDialog;

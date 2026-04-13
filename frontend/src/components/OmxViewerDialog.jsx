import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import './OmxViewerDialog.css';

// Register AG Grid Modules (Required for AG Grid v32+)
ModuleRegistry.registerModules([AllCommunityModule]);

function OmxViewerDialog({ file, projectId, onClose }) {
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [matrixInfo, setMatrixInfo] = useState(null);
  const [selectedMatrix, setSelectedMatrix] = useState('');

  const [rowData, setRowData] = useState([]);
  const [colDefs, setColDefs] = useState([]);
  const gridRef = useRef(null);

  // Fetch metadata on launch
  useEffect(() => {
    if (!file) return;
    if (!projectId) {
      setErrorMsg("OMX preview is only available after files are fully uploaded to the server.");
      setLoadingMetadata(false);
      return;
    }

    setLoadingMetadata(true);
    setErrorMsg('');

    // We send filename as query param to backend
    fetch(`/api/projects/${projectId}/omx-info?filename=${encodeURIComponent(file.name || file.filename)}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch OMX metadata");
        return res.json();
      })
      .then(data => {
        setMatrixInfo(data);
        if (data.matrices && data.matrices.length > 0) {
          setSelectedMatrix(data.matrices[0].name);
        }
        setLoadingMetadata(false);
      })
      .catch(err => {
        setErrorMsg("Error loading OMX info: " + err.message);
        setLoadingMetadata(false);
      });
  }, [file, projectId]);

  // Fetch slice data when selectedMatrix changes
  useEffect(() => {
    if (!selectedMatrix || !projectId || !file) return;

    setLoadingData(true);
    setErrorMsg('');

    fetch(`/api/projects/${projectId}/omx-data?filename=${encodeURIComponent(file.name || file.filename)}&matrix=${encodeURIComponent(selectedMatrix)}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load matrix data slice");
        return res.json();
      })
      .then(info => {
        // Build AG Grid data structure
        const numRows = info.slice_returned[0];
        const numCols = info.slice_returned[1];

        // Col Defs
        const defs = [{ headerName: "Row/Col", field: "row_idx", pinned: "left", flex: 0, width: 100, cellStyle: { fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.05)' } }];
        for (let i = 0; i < numCols; i++) {
          defs.push({ headerName: `Col ${i}`, field: `col_${i}`, flex: 1, minWidth: 100 });
        }
        setColDefs(defs);

        // Row Data
        const rows = [];
        for (let r = 0; r < numRows; r++) {
          const rowObj = { row_idx: `Row ${r}` };
          for (let c = 0; c < numCols; c++) {
            rowObj[`col_${c}`] = info.data[r] ? info.data[r][c] : null;
          }
          rows.push(rowObj);
        }
        setRowData(rows);
        setLoadingData(false);
      })
      .catch(err => {
        setErrorMsg("Error fetching matrix grid: " + err.message);
        setLoadingData(false);
      });
  }, [selectedMatrix, file, projectId]);

  return (
    <div className="omx-editor-overlay" onClick={onClose}>
      <div className="omx-editor-content" onClick={e => e.stopPropagation()}>
        <div className="omx-editor-header">
          <div>
            <h2>Viewing {file?.name || file?.filename || "Matrix File"}</h2>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Read-Only OMX Data Viewer
            </span>
          </div>
          <button type="button" className="omx-editor-close" onClick={onClose}>&times;</button>
        </div>

        <div className="omx-editor-body">
          {errorMsg && <div className="omx-editor-error">{errorMsg}</div>}

          {loadingMetadata ? (
            <div className="omx-editor-loading">Loading OMX structure...</div>
          ) : matrixInfo ? (
            <>
              <div className="omx-tools">
                <label>Matrix Layer: </label>
                <select
                  className="omx-matrix-select"
                  value={selectedMatrix}
                  onChange={(e) => setSelectedMatrix(e.target.value)}
                >
                  {matrixInfo.matrices.map(m => (
                    <option key={m.name} value={m.name}>
                      {m.name} (Shape: {m.shape.join(' × ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="ag-grid-wrapper" style={{ flex: 1, width: '100%', marginTop: '1rem', height: '400px' }}>
                {loadingData ? (
                  <div className="omx-editor-loading">Loading Matrix values...</div>
                ) : (
                  <AgGridReact
                    theme={themeQuartz}
                    ref={gridRef}
                    rowData={rowData}
                    columnDefs={colDefs}
                    defaultColDef={{
                      sortable: true,
                      filter: true,
                      resizable: true,
                    }}
                    pagination={true}
                    paginationPageSize={20}
                    paginationPageSizeSelector={[20, 50, 100]}
                  />
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className="omx-editor-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Close Viewer</button>
        </div>
      </div>
    </div>
  );
}

export default OmxViewerDialog;

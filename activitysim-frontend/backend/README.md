# ActivitySim Backend API

Backend API for ActivitySim CSV validation and simulation workflow.

## Features

- **CSV File Upload**: Upload input CSV files (households, persons, land_use, etc.)
- **Validation**: Pandera-based validation with detailed error/warning reporting
- **Simulation Execution**: Run ActivitySim simulations with real-time progress tracking
- **Results Management**: Download and manage simulation output files

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Ensure ActivitySim is installed:
```bash
pip install activitysim
```

## Running the Server

```bash
python main.py
```

The server will start on `http://localhost:8000`.

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Project Management

- `GET /api/projects` - List all projects
- `POST /api/projects_add` - Create a new project
- `GET /api/projects/{project_id}` - Get project details
- `GET /api/projects/{project_id}/files` - List project files

### File Upload

- `POST /api/projects/{project_id}/upload-csv` - Upload CSV files
  - Accepts multiple CSV files
  - Files are stored in `projects/{project_id}/data/`

### Validation

- `POST /api/projects/{project_id}/validate` - Run validation checks
  - Validates all CSV files using Pandera schemas
  - Returns detailed errors and warnings
  
- `GET /api/projects/{project_id}/validation-results` - Get validation results
  - Returns cached validation results

### Simulation Execution

- `POST /api/projects/{project_id}/execute` - Start simulation
  - Requires successful validation
  - Returns execution ID for tracking
  
- `GET /api/projects/{project_id}/execution-status/{execution_id}` - Get execution status
  - Returns real-time progress and logs
  
- `POST /api/projects/{project_id}/execution-stop/{execution_id}` - Stop simulation

### Output Files

- `GET /api/projects/{project_id}/outputs` - List output files
  - Returns list of generated output files
  
- `GET /api/projects/{project_id}/outputs/{filename}` - Download output file

## Example Workflow

### 1. Create a Project

```bash
curl -X POST "http://localhost:8000/api/projects_add?name=MyProject&description=Test+Project"
```

Response:
```json
{
  "project": {
    "id": "project_1707686400",
    "name": "MyProject",
    "description": "Test Project",
    "created_at": "2024-02-11T22:00:00",
    "validation_status": "not_started"
  }
}
```

### 2. Upload CSV Files

```bash
curl -X POST "http://localhost:8000/api/projects/project_1707686400/upload-csv" \
  -F "files=@households.csv" \
  -F "files=@persons.csv" \
  -F "files=@land_use.csv"
```

### 3. Run Validation

```bash
curl -X POST "http://localhost:8000/api/projects/project_1707686400/validate"
```

Response:
```json
{
  "project_id": "project_1707686400",
  "overall_status": "passed",
  "total_errors": 0,
  "total_warnings": 2,
  "tables": [
    {
      "table_name": "households",
      "status": "warning",
      "error_count": 0,
      "warning_count": 1,
      "errors": [],
      "warnings": [...]
    }
  ]
}
```

### 4. Execute Simulation

```bash
curl -X POST "http://localhost:8000/api/projects/project_1707686400/execute"
```

Response:
```json
{
  "execution_id": "exec_1707686500",
  "project_id": "project_1707686400",
  "status": "running",
  "progress": 0,
  "current_step": "Starting simulation..."
}
```

### 5. Check Execution Status

```bash
curl "http://localhost:8000/api/projects/project_1707686400/execution-status/exec_1707686500"
```

### 6. Download Output Files

```bash
curl "http://localhost:8000/api/projects/project_1707686400/outputs/final_households.csv" -o output.csv
```

## Project Structure

```
projects/
└── project_{id}/
    ├── metadata.json              # Project metadata
    ├── configs/
    │   ├── settings.yaml          # ActivitySim settings
    │   └── input_checker.yaml     # Validation configuration
    ├── data/
    │   ├── households.csv         # Input CSV files
    │   ├── persons.csv
    │   └── land_use.csv
    ├── data_model/
    │   ├── input_checks.py        # Pandera validation schemas
    │   └── enums.py               # Enumerated types
    ├── output/
    │   ├── final_households.csv   # Simulation outputs
    │   ├── final_persons.csv
    │   └── final_trips.csv
    ├── logs/
    │   ├── activitysim.log        # Simulation logs
    │   └── input_checker.log      # Validation logs
    └── validation_results.json    # Cached validation results
```

## Validation Schemas

The validation schemas are based on Pandera DataFrameModel classes. They define:

- **Field Types**: Data types for each column
- **Constraints**: Value ranges, uniqueness, nullability
- **Cross-Table Checks**: Relationships between tables (e.g., household IDs exist in persons table)
- **Custom Validators**: Complex business logic validation

Example validation rules:
- Household IDs must be unique and > 0
- Person ages must be between 0 and 100
- All persons must belong to a valid household
- Household sizes must match person counts

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200 OK` - Success
- `400 Bad Request` - Invalid input or validation failed
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses include detailed messages:
```json
{
  "detail": "Error message describing what went wrong"
}
```

## Logging

Logs are written to:
- Console: INFO level and above
- `projects/{project_id}/logs/activitysim.log` - Simulation logs
- `projects/{project_id}/logs/input_checker.log` - Detailed validation logs

## Development

### Adding Custom Validation Rules

1. Edit `data_model/input_checks.py` in your project
2. Add new Pandera validators or modify existing ones
3. Run validation to test your changes

### Customizing ActivitySim Settings

1. Edit `configs/settings.yaml` in your project
2. Modify model sequence, sample size, or other parameters
3. Run simulation with updated settings

## Troubleshooting

### Validation Fails to Load Schemas

- Ensure `data_model/input_checks.py` and `enums.py` exist in the project
- Check that `configs/input_checker.yaml` is properly configured

### Simulation Fails to Start

- Verify ActivitySim is installed: `pip show activitysim`
- Check that validation passed before running simulation
- Review logs in `projects/{project_id}/logs/activitysim.log`

### File Upload Errors

- Ensure files are valid CSV format
- Check file size limits (default: 50MB per file)
- Verify project exists before uploading

## License

This backend API is part of the ActivitySim project.

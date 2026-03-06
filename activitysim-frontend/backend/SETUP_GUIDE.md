# Setting Up ActivitySim Project with Your Data

## Overview

The backend API is now running and ready to work with **your actual ActivitySim installation**. Here's how to set up a project to run the complete workflow you described.

## Step-by-Step Setup

### 1. Create a New Project via API

Open your browser and go to: **http://localhost:8000/docs**

Or use curl:
```bash
curl -X POST "http://localhost:8000/api/projects_add?name=MyActivitySimProject&description=Full+workflow+test"
```

This will return a `project_id` like `project_1739294400`.

### 2. Prepare Your Input Data

Copy your CSV files from your ActivitySim data directory to the project:

**Your data location**: `C:\Users\ayush\btp\activitysim\activitysim\examples\{your_example}\data\`

**Files needed**:
- `households.csv`
- `persons.csv`
- `land_use.csv`
- Any network/skim files

**Copy to**: `C:\Users\ayush\btp\activitysim-frontend\backend\projects\{project_id}\data\`

Or upload via API:
```bash
curl -X POST "http://localhost:8000/api/projects/{project_id}/upload-csv" \
  -F "files=@C:\Users\ayush\btp\activitysim\activitysim\examples\prototype_mtc_extended\data\households.csv" \
  -F "files=@C:\Users\ayush\btp\activitysim\activitysim\examples\prototype_mtc_extended\data\persons.csv" \
  -F "files=@C:\Users\ayush\btp\activitysim\activitysim\examples\prototype_mtc_extended\data\land_use.csv"
```

### 3. Configure Validation (Input Checker)

The project already has `input_checker.yaml` and `input_checks.py` copied from the examples.

**To use your own validation**:

1. Copy your validation files:
```bash
# From your ActivitySim installation
copy "C:\Users\ayush\btp\activitysim\activitysim\examples\{your_example}\configs\input_checker.yaml" ^
     "C:\Users\ayush\btp\activitysim-frontend\backend\projects\{project_id}\configs\input_checker.yaml"

copy "C:\Users\ayush\btp\activitysim\activitysim\examples\{your_example}\data_model\input_checks.py" ^
     "C:\Users\ayush\btp\activitysim-frontend\backend\projects\{project_id}\data_model\input_checks.py"

copy "C:\Users\ayush\btp\activitysim\activitysim\examples\{your_example}\data_model\enums.py" ^
     "C:\Users\ayush\btp\activitysim-frontend\backend\projects\{project_id}\data_model\enums.py"
```

2. Or modify the existing files in the project's `data_model/` directory

### 4. Configure ActivitySim Settings

Copy your `settings.yaml`:

```bash
copy "C:\Users\ayush\btp\activitysim\activitysim\examples\{your_example}\configs\settings.yaml" ^
     "C:\Users\ayush\btp\activitysim-frontend\backend\projects\{project_id}\configs\settings.yaml"
```

**Important settings to verify**:
- `input_table_list`: Matches your CSV files
- `models`: List of models to run (including `input_checker` first)
- `output_tables`: What outputs you want
- `households_sample_size`: Number of households to simulate

### 5. Copy All Required Config Files

ActivitySim needs many config files. Copy all from your example:

```bash
xcopy "C:\Users\ayush\btp\activitysim\activitysim\examples\{your_example}\configs\*" ^
      "C:\Users\ayush\btp\activitysim-frontend\backend\projects\{project_id}\configs\" /E /Y
```

This includes:
- `settings.yaml`
- `input_checker.yaml`
- `network_los.yaml`
- All model-specific YAML files
- CSV specification files

### 6. Run the Complete Workflow via API

Now you can run the complete workflow:

#### Step 1: Validate Input Data
```bash
curl -X POST "http://localhost:8000/api/projects/{project_id}/validate"
```

This runs the `input_checker` step using Pandera validation.

**Check results**:
```bash
curl "http://localhost:8000/api/projects/{project_id}/validation-results"
```

#### Step 2: Execute Simulation
```bash
curl -X POST "http://localhost:8000/api/projects/{project_id}/execute"
```

This will:
1. Run `activitysim run` with your configs
2. Execute all models in sequence (from `settings.yaml`)
3. Generate outputs in the `output/` directory

**Monitor progress**:
```bash
curl "http://localhost:8000/api/projects/{project_id}/execution-status/{execution_id}"
```

#### Step 3: Download Outputs
```bash
# List all output files
curl "http://localhost:8000/api/projects/{project_id}/outputs"

# Download specific file
curl "http://localhost:8000/api/projects/{project_id}/outputs/final_households.csv" -o final_households.csv
```

## Complete Workflow Diagram

```
1. Upload CSV Files
   ↓
2. Run Validation (input_checker)
   ↓
3. Check Validation Results
   ↓
4. Execute Simulation (all models)
   ↓
5. Monitor Progress
   ↓
6. Download Outputs
```

## API Endpoints for Each Step

| Step | Endpoint | Method |
|------|----------|--------|
| Upload CSVs | `/api/projects/{id}/upload-csv` | POST |
| Validate | `/api/projects/{id}/validate` | POST |
| Get Validation Results | `/api/projects/{id}/validation-results` | GET |
| Execute Simulation | `/api/projects/{id}/execute` | POST |
| Check Status | `/api/projects/{id}/execution-status/{exec_id}` | GET |
| List Outputs | `/api/projects/{id}/outputs` | GET |
| Download Output | `/api/projects/{id}/outputs/{filename}` | GET |

## Testing with Swagger UI

1. Go to: **http://localhost:8000/docs**
2. Try each endpoint interactively
3. See request/response examples
4. Test the complete workflow

## Example: Using prototype_mtc_extended

If you want to test with the `prototype_mtc_extended` example:

```bash
# Set variables
set PROJECT_ID=project_1739294400
set EXAMPLE_DIR=C:\Users\ayush\btp\activitysim\activitysim\examples\prototype_mtc_extended

# Copy all configs
xcopy "%EXAMPLE_DIR%\configs\*" "C:\Users\ayush\btp\activitysim-frontend\backend\projects\%PROJECT_ID%\configs\" /E /Y

# Copy all data
xcopy "%EXAMPLE_DIR%\data\*" "C:\Users\ayush\btp\activitysim-frontend\backend\projects\%PROJECT_ID%\data\" /E /Y

# Copy data model
xcopy "%EXAMPLE_DIR%\data_model\*" "C:\Users\ayush\btp\activitysim-frontend\backend\projects\%PROJECT_ID%\data_model\" /E /Y
```

Then use the API to validate and run!

## Troubleshooting

**Validation fails?**
- Check `projects/{project_id}/logs/input_checker.log` for detailed errors
- Verify your `input_checks.py` matches your data structure

**Simulation fails?**
- Check `projects/{project_id}/logs/activitysim_{exec_id}.log`
- Verify all required config files are present
- Ensure ActivitySim is installed: `pip show activitysim`

**Missing config files?**
- ActivitySim needs many YAML files for each model
- Copy the entire `configs/` directory from your working example

## Next Steps

1. Create a project via API
2. Copy your actual ActivitySim configs and data
3. Test validation
4. Run simulation
5. Download outputs

The API is ready to work with your complete ActivitySim workflow!

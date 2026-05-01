"""
Validation Service for ActivitySim CSV Input Files

This module provides validation functionality using Pandera schemas
to check CSV input files before running ActivitySim simulations.
"""

import logging
import os
import sys
import warnings
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
from datetime import datetime
from collections import defaultdict

# Add ActivitySim source to path if not installed
ACTIVITYSIM_SRCDIR = str(Path(__file__).parent.parent.parent / "activitysim")
if ACTIVITYSIM_SRCDIR not in sys.path:
    sys.path.append(ACTIVITYSIM_SRCDIR)

import pandas as pd
import pandera as pa
import yaml

from models import (
    ValidationResult,
    TableValidationResult,
    ValidationError,
    ValidationWarning,
    ValidationStatus
)

logger = logging.getLogger(__name__)


class MockState:
    """Mock state object to provide filesystem methods used in input_checks.py"""
    def __init__(self, project_dir):
        self.project_dir = Path(project_dir)
        class Filesystem:
            def __init__(self, pd):
                self.project_dir = pd
            def read_settings_file(self, name):
                path = self.project_dir / "configs" / name
                if not path.exists() and name == "settings.yaml":
                    # Fallback to template if actual settings don't exist yet
                    path = self.project_dir / "configs" / "settings_template.yaml"
                
                if not path.exists():
                    return {}
                with open(path, 'r') as f:
                    return yaml.safe_load(f)
            def expand_input_file_list(self, pattern):
                # Simple implementation: just return the pattern if it's a list or file
                if isinstance(pattern, list):
                    return [str(self.project_dir / "data" / p) for p in pattern]
                return [str(self.project_dir / "data" / pattern)]
            def get_config_file_path(self, name):
                return str(self.project_dir / "configs" / name)
            def read_model_settings(self, name, mandatory=True):
                return self.read_settings_file(name)
        self.filesystem = Filesystem(self.project_dir)
    
    def get_injectable(self, name):
        if name == "data_model_dir":
            return [str(self.project_dir / "data_model")]
        return []

    def get_log_file_path(self, name):
        return str(self.project_dir / "logs" / name)

    @property
    def settings(self):
        class Settings:
            def __init__(self, fs):
                settings_data = fs.read_settings_file("settings.yaml")
                self.models = settings_data.get("models", [])
                self.input_table_list = settings_data.get("input_table_list", [])
        return Settings(self.filesystem)

def mock_log_info(text: str):
    """Mock log_info function for ActivitySim integration"""
    logger.info(f"Input Check Info: {text}")

class ValidationService:
    """Service for validating ActivitySim input CSV files"""
    
    def __init__(self, project_dir: Path):
        """
        Initialize validation service
        
        Args:
            project_dir: Path to project directory
        """
        self.project_dir = Path(project_dir)
        self.data_dir = self.project_dir / "data"
        self.config_dir = self.project_dir / "configs"
        self.data_model_dir = self.project_dir / "data_model"
        self.logs_dir = self.project_dir / "logs"
        self.logs_dir.mkdir(exist_ok=True)
        
        # Global table store for cross-table validation
        self.table_store: Dict[str, pd.DataFrame] = {}
        self.log_infos: Dict[str, List[str]] = defaultdict(list)
        self.current_table: str = ""
        
    def validate_project(self) -> ValidationResult:
        """
        Validate all CSV files in the project
        
        Returns:
            ValidationResult with detailed validation information
        """
        logger.info(f"Starting validation for project: {self.project_dir}")
        
        try:
            # Load input checker configuration
            input_checker_config = self._load_input_checker_config()
            
            # Load validation schemas
            input_checker_module = self._load_validation_module(input_checker_config)
            
            # Create table store (passing module to handle missing table schemas)
            self._create_table_store(input_checker_config, input_checker_module)

            # Run cross-file pre-checks (e.g. zone system compatibility) before Pandera
            pre_check_warnings = self._check_zone_system_compatibility()
            
            # Run validation on each table
            validation_results = self._validate_all_tables(
                input_checker_config,
                input_checker_module,
                pre_check_warnings=pre_check_warnings
            )
            
            # Generate validation result
            result = self._generate_validation_result(validation_results)
            
            # Write detailed log file
            self._write_log_file(validation_results)
            
            return result
            
        except Exception as e:
            logger.error(f"Validation failed with error: {e}", exc_info=True)
            raise
        finally:
            # Clean up table store
            self.table_store.clear()
    
    def _load_input_checker_config(self) -> Dict[str, Any]:
        """Load input_checker.yaml configuration"""
        config_file = self.config_dir / "input_checker.yaml"
        
        if not config_file.exists():
            raise FileNotFoundError(
                f"input_checker.yaml not found at {config_file}. "
                "Please ensure the project is properly configured."
            )
        
        with open(config_file, 'r') as f:
            config = yaml.safe_load(f)
        
        logger.info(f"Loaded input checker config: {config_file}")
        return config

    def _load_validation_module(self, config: Dict[str, Any]):
        """Load the validation module (input_checks.py)"""
        input_checker_file = config.get("input_checker_code", "input_checks.py")
        input_checker_path = self.data_model_dir / input_checker_file
        
        # Always try to integrate with ActivitySim's input_checker global state if available
        try:
            from activitysim.abm.models import input_checker as asim_checker
            logger.info("Integrating with ActivitySim's internal TABLE_STORE")
            
            # Link our local storage to ActivitySim's internal globals
            asim_checker.TABLE_STORE = self.table_store
            # Add mock state for complex checks
            self.table_store["state"] = MockState(self.project_dir)
            
            asim_checker._log_infos = self.log_infos
            # Provide log_info function
            asim_checker.log_info = mock_log_info
            
        except ImportError:
            logger.warning("ActivitySim package not found. Internal TABLE_STORE integration skipped.")
        
        # Use local validation module
        if not input_checker_path.exists():
            raise FileNotFoundError(
                f"Validation module {input_checker_file} not found at {input_checker_path}. "
                "Please make sure you have copied your validation scripts to the project's data_model directory."
            )
        
        # Add data_model directory to Python path
        sys.path.insert(0, str(self.data_model_dir))
        
        try:
            # Import the validation module
            module_name = input_checker_path.stem
            # Clear from sys.modules to force reload if needed
            if module_name in sys.modules:
                del sys.modules[module_name]
            input_checker = __import__(module_name)
            logger.info(f"Loaded validation module: {module_name}")
            return input_checker
        finally:
            # Remove from path
            sys.path.pop(0)
    
    def _create_table_store(self, config: Dict[str, Any], input_checker_module=None):
        """Load all tables into the table store"""
        self.missing_tables = set()
        self.empty_tables = set()
        for table_settings in config["table_list"]:
            table_name = table_settings["name"]
            logger.info(f"Loading table: {table_name}")
            
            try:
                # Load table based on configuration
                if table_settings.get("is_activitysim_input", False):
                    table = self._load_activitysim_table(table_name, table_settings)
                else:
                    table = self._load_csv_table(table_name, table_settings)
                
                if len(table) == 0:
                    logger.warning(f"Table {table_name} is empty (0 rows)")
                    self.empty_tables.add(table_name)
                
                self.table_store[table_name] = table
            except FileNotFoundError as e:
                logger.warning(f"Table {table_name} not found: {e}")
                self.missing_tables.add(table_name)
                self.table_store[table_name] = self._empty_df_from_schema(
                    table_name, table_settings, input_checker_module
                )
            except pd.errors.EmptyDataError as e:
                logger.warning(f"Table {table_name} is empty: {e}")
                self.empty_tables.add(table_name)
                self.table_store[table_name] = self._empty_df_from_schema(
                    table_name, table_settings, input_checker_module
                )

            except Exception as e:
                # Any unexpected error during load/transform (e.g. KeyError from
                # a bad column rename) — treat as a load error so validation
                # continues and reports it cleanly instead of returning HTTP 500.
                logger.error(
                    f"Unexpected error loading table {table_name}: {e}",
                    exc_info=True
                )
                self.missing_tables.add(table_name)
                self.table_store[table_name] = self._empty_df_from_schema(
                    table_name, table_settings, input_checker_module
                )

            self.log_infos[table_name] = []

    
    def _empty_df_from_schema(
        self,
        table_name: str,
        table_settings: Dict[str, Any],
        input_checker_module
    ) -> pd.DataFrame:
        """
        Return an empty DataFrame wide enough for cross-table checks to run
        without AttributeError.

        Column union:
          1. Pandera schema fields        (required by the schema class)
          2. keep_columns from settings   (extra cols loaded from CSV normally)
          3. Per-table supplement         (columns accessed by cross-table checks
                                           that are NOT declared in the schema)
        """
        # 1. Pandera schema fields
        columns: List[str] = []
        validation_settings = table_settings.get("validation", {})
        class_name = validation_settings.get("class")
        if class_name and input_checker_module:
            validator_class = getattr(input_checker_module, class_name, None)
            if validator_class:
                try:
                    schema = validator_class.to_schema()
                    columns = list(schema.columns.keys())
                except Exception as e:
                    logger.warning(
                        f"Could not extract columns for '{table_name}' from schema: {e}"
                    )

        # 2. keep_columns from the project's settings (if available via MockState)
        as_keep_cols: List[str] = []
        if "state" in self.table_store:
            try:
                mock_settings = self.table_store["state"].settings
                for t_cfg in mock_settings.input_table_list:
                    if t_cfg.get("tablename") == table_name:
                        as_keep_cols = t_cfg.get("keep_columns", []) or []
                        break
            except Exception:
                pass

        # 3. Hard-coded supplement of columns commonly used in cross-table
        #    dataframe checks but not declared as Pandera schema fields.
        EXTRA_COLS_BY_TABLE: Dict[str, List[str]] = {
            "persons": [
                "pemploy", "pstudent", "PNUM", "num_workers",
                "person_id", "household_id",
            ],
            "households": [
                "home_zone_id", "num_workers", "household_id", "hhsize",
            ],
            "land_use": [
                "zone_id", "TOTPOP", "TOTHH",
            ],
        }

        all_columns = list(
            dict.fromkeys(  # preserves order, deduplicates
                columns
                + as_keep_cols
                + EXTRA_COLS_BY_TABLE.get(table_name, [])
            )
        )

        logger.info(
            f"Initialized empty '{table_name}' placeholder with "
            f"{len(all_columns)} columns: {all_columns}"
        )
        return pd.DataFrame(columns=all_columns)

    def _find_data_file(self, table_name: str) -> Optional[Path]:
        """Find data file with supported extensions: .csv, .csv.gz, .parquet"""
        for ext in ['.csv', '.csv.gz', '.parquet']:
            path = self.data_dir / f"{table_name}{ext}"
            if path.exists():
                return path
        return None

    def _load_activitysim_table(
        self,
        table_name: str,
        table_settings: Dict[str, Any]
    ) -> pd.DataFrame:
        """
        Load table with ActivitySim transformations
        """
        file_path = self._find_data_file(table_name)
        
        if not file_path:
            raise FileNotFoundError(f"Data file for {table_name} not found in {self.data_dir}")
        
        # Load based on extension
        if file_path.suffix == '.parquet':
            df = pd.read_parquet(file_path)
        else:
            df = pd.read_csv(file_path)
        
        # Merge with configuration from settings.yaml/settings_template.yaml
        as_settings = {}
        if "state" in self.table_store:
            mock_settings = self.table_store["state"].settings
            for t_cfg in mock_settings.input_table_list:
                if t_cfg.get("tablename") == table_name:
                    as_settings = t_cfg
                    break
        
        # Apply column renaming if specified in input_checker.yaml OR settings.yaml
        rename_columns = table_settings.get("rename_columns", {})
        if not rename_columns:
            rename_columns = as_settings.get("rename_columns", {})
            
        if rename_columns:
            df = df.rename(columns=rename_columns)

        # ── Per-table supplemental alias map ──────────────────────────────
        # Catches alternative column names used by different regional models
        # (e.g. SANDAG TAZ vs MTC MAZ for the same zone concept).
        # Keys = canonical name required by schema; values = ordered list of
        # alternative raw-CSV names to look for when the canonical is absent.
        TABLE_COLUMN_ALIASES = {
            "households": {
                "home_zone_id":   ["MAZ", "TAZ", "maz", "taz"],
                "household_id":   ["HHID", "hh_id"],
                "hhsize":         ["PERSONS", "persons", "num_persons"],
                "num_workers":    ["workers", "WORKERS"],
                "auto_ownership": ["VEHICL", "VEH", "vehicles"],
            },
            "land_use": {
                "zone_id": ["MAZ", "TAZ", "maz", "taz", "ZONE", "zone"],
            },
            "persons": {
                "person_id":  ["PERID", "per_id"],
                "household_id": ["HHID", "hh_id"],
            },
        }
        for canonical, aliases in TABLE_COLUMN_ALIASES.get(table_name, {}).items():
            if canonical not in df.columns:   # only act if still missing
                for alias in aliases:
                    if alias in df.columns:
                        df = df.rename(columns={alias: canonical})
                        logger.info(
                            f"[alias] Renamed '{alias}' -> '{canonical}' in {table_name}"
                        )
                        break
        # ───────────────────────────────────────────────────────────────

        # Set index if specified
        index_col = table_settings.get("index_col")
        if not index_col:
            index_col = as_settings.get("index_col")
            
        if index_col and index_col in df.columns:
            df = df.set_index(index_col).reset_index()
        
        # Keep only specified columns if configured
        keep_columns = table_settings.get("keep_columns")
        if not keep_columns:
            keep_columns = as_settings.get("keep_columns")
            
        if keep_columns:
            # Only keep columns that exist in the dataframe
            keep_columns = [col for col in keep_columns if col in df.columns]
            # Only prepend index_col if it actually exists in the dataframe
            if index_col and index_col in df.columns and index_col not in keep_columns:
                keep_columns.insert(0, index_col)
            df = df[keep_columns]
        
        logger.info(f"Loaded {table_name}: {len(df)} rows, {len(df.columns)} columns")
        return df
    
    def _load_csv_table(
        self,
        table_name: str,
        table_settings: Dict[str, Any]
    ) -> pd.DataFrame:
        """Load a simple CSV table without ActivitySim transformations"""
        file_path = self._find_data_file(table_name)
        
        if not file_path:
            raise FileNotFoundError(f"Data file for {table_name} not found in {self.data_dir}")
        
        if file_path.suffix == '.parquet':
            df = pd.read_parquet(file_path)
        else:
            df = pd.read_csv(file_path)
        logger.info(f"Loaded {table_name}: {len(df)} rows, {len(df.columns)} columns")
        return df
    
    def _check_zone_system_compatibility(self) -> Dict[str, List]:
        """
        Pre-check: compare households home_zone_id range vs landuse zone_id range.
        Detects MAZ-vs-TAZ mismatches before Pandera runs, so users get a clean
        diagnostic instead of a flood of element-wise failure rows.

        Returns:
            Dict mapping table_name -> list of warning strings to prepend.
        """
        warnings_out: Dict[str, List] = {}

        hh = self.table_store.get("households")
        lu = self.table_store.get("land_use")

        if hh is None or lu is None:
            return warnings_out
        if "home_zone_id" not in hh.columns or "zone_id" not in lu.columns:
            return warnings_out
        if hh.empty or lu.empty:
            return warnings_out

        # Drop nulls for range calculation
        hh_zones = hh["home_zone_id"].dropna()
        lu_zones = lu["zone_id"].dropna()

        if hh_zones.empty or lu_zones.empty:
            return warnings_out

        hh_min, hh_max = int(hh_zones.min()), int(hh_zones.max())
        lu_min, lu_max = int(lu_zones.min()), int(lu_zones.max())

        # Check overlap: do ANY household zone IDs exist in landuse?
        overlap = hh_zones.isin(lu_zones).sum()
        total_hh = len(hh_zones)
        missing_count = total_hh - overlap
        pct_missing = (missing_count / total_hh * 100) if total_hh > 0 else 0

        if pct_missing > 0:
            # Determine likely zone system based on ID magnitude
            hh_system = "MAZ" if hh_max < 5000 else "TAZ"
            lu_system = "MAZ" if lu_max < 5000 else "TAZ"

            if hh_system != lu_system:
                msg = (
                    f"Zone system mismatch detected: households appear to use {hh_system} IDs "
                    f"(range {hh_min}\u2013{hh_max}) while landuse uses {lu_system} IDs "
                    f"(range {lu_min}\u2013{lu_max}). "
                    f"{missing_count:,} of {total_hh:,} household rows ({pct_missing:.1f}%) "
                    f"reference zone IDs not found in landuse. "
                    f"Action: ensure both households.csv and land_use.csv use the same zone system "
                    f"(either {hh_system} or {lu_system}, consistently)."
                )
            else:
                msg = (
                    f"{missing_count:,} of {total_hh:,} households ({pct_missing:.1f}%) have "
                    f"home_zone_ids not found in the landuse file. "
                    f"Households zone range: {hh_min}\u2013{hh_max}, "
                    f"landuse zone range: {lu_min}\u2013{lu_max}. "
                    f"Check for data entry errors or mismatched dataset versions."
                )

            logger.warning(f"Zone pre-check: {msg}")
            # Store as an info message on the households table so it surfaces in the UI
            self.log_infos.setdefault("households", []).append(f"[WARNING] {msg}")
            warnings_out["households"] = [msg]

        else:
            logger.info(
                f"Zone pre-check passed: all {total_hh:,} household zone IDs found in landuse "
                f"(hh range {hh_min}\u2013{hh_max}, lu range {lu_min}\u2013{lu_max})."
            )

        return warnings_out

    def _validate_all_tables(
        self,
        config: Dict[str, Any],
        input_checker_module,
        pre_check_warnings: Optional[Dict[str, List]] = None
    ) -> Dict[str, Tuple[List, List]]:
        """
        Validate all tables using Pandera schemas
        
        Returns:
            Dictionary mapping table names to (errors, warnings) tuples
        """
        validation_results = {}
        
        for table_settings in config["table_list"]:
            table_name = table_settings["name"]
            validation_settings = table_settings.get("validation", {})
            
            if validation_settings.get("method") != "pandera":
                logger.warning(
                    f"Skipping {table_name}: only Pandera validation is supported"
                )
                continue
            
            self.current_table = table_name
            logger.info(f"Validating table: {table_name}")
            
            errors, warnings = self._validate_with_pandera(
                table_name,
                validation_settings,
                input_checker_module
            )
            
            validation_results[table_name] = (errors, warnings)
        
        return validation_results
    
    def _validate_with_pandera(
        self,
        table_name: str,
        validation_settings: Dict[str, Any],
        input_checker_module
    ) -> Tuple[List, List]:
        """
        Validate a table using Pandera schema
        
        Returns:
            Tuple of (errors, warnings)
        """
        errors = []
        warnings_list = []
        
        # Check if table was found during loading
        if table_name in self.missing_tables:
            return ["FILE_MISSING"], []
        
        if table_name in self.empty_tables:
            return ["FILE_EMPTY"], []
        
        # Get the validator class
        validator_class_name = validation_settings.get("class")
        if not validator_class_name:
            logger.error(f"No validator class specified for {table_name}")
            return errors, warnings_list
        
        validator_class = getattr(input_checker_module, validator_class_name, None)
        if not validator_class:
            logger.error(
                f"Validator class {validator_class_name} not found in validation module"
            )
            return errors, warnings_list
        
        # Run validation with warning capture
        with warnings.catch_warnings(record=True) as caught_warnings:
            warnings.simplefilter("always")
            
            try:
                # Validate the table using the schema with coercion enabled
                schema = validator_class.to_schema()
                schema.coerce = True
                schema.validate(self.table_store[table_name], lazy=True)
                logger.info(f"✓ {table_name} passed validation")
                
            except pa.errors.SchemaErrors as e:
                errors.append(e)
                logger.error(f"✗ {table_name} failed validation with {len(e.schema_errors)} errors")
            
            # Capture warnings
            for warning in caught_warnings:
                warnings_list.append(warning)
        
        return errors, warnings_list
    
    def _generate_validation_result(
        self,
        validation_results: Dict[str, Tuple[List, List]]
    ) -> ValidationResult:
        """Generate structured validation result"""
        table_results = []
        total_errors = 0
        total_warnings = 0
        overall_status = ValidationStatus.PASSED
        
        for table_name, (errors, warnings_list) in validation_results.items():
            # Parse errors
            parsed_errors = self._parse_pandera_errors(errors)
            
            # Special case: move file missing/empty/data missing from errors to warnings
            warning_types = ["file_missing", "file_empty", "data_missing"]
            file_missing_errors = [e for e in parsed_errors if e.error_type in warning_types]
            parsed_errors = [e for e in parsed_errors if e.error_type not in warning_types]
            
            error_count = sum(err.count for err in parsed_errors)
            
            # Parse warnings
            parsed_warnings = self._parse_pandera_warnings(warnings_list)
            
            # Add file missing/empty warnings
            for err in file_missing_errors:
                parsed_warnings.append(ValidationWarning(
                    check_name=err.check_name,
                    message=err.message,
                    count=err.count
                ))
                
            warning_count = len(parsed_warnings)
            
            # Determine table status
            if error_count > 0:
                status = ValidationStatus.FAILED
                overall_status = ValidationStatus.FAILED
            elif warning_count > 0:
                status = ValidationStatus.WARNING
                if overall_status != ValidationStatus.FAILED:
                    overall_status = ValidationStatus.WARNING
            else:
                status = ValidationStatus.PASSED
            
            table_result = TableValidationResult(
                table_name=table_name,
                status=status,
                error_count=error_count,
                warning_count=warning_count,
                errors=parsed_errors,
                warnings=parsed_warnings,
                info_messages=self.log_infos.get(table_name, [])
            )
            
            table_results.append(table_result)
            total_errors += error_count
            total_warnings += warning_count
        
        return ValidationResult(
            project_id=self.project_dir.name,
            timestamp=datetime.now(),
            overall_status=overall_status,
            ready_for_simulation=(overall_status != ValidationStatus.FAILED),
            tables=table_results,
            total_errors=total_errors,
            total_warnings=total_warnings,
            log_file=str(self.logs_dir / "input_checker.log")
        )
    
    def _parse_pandera_errors(self, errors: List) -> List[ValidationError]:
        """Parse Pandera schema errors into structured format"""
        parsed_errors = []
        
        for error_group in errors:
            if error_group == "FILE_MISSING":
                parsed_errors.append(ValidationError(
                    check_name="File Existence",
                    error_type="file_missing",
                    message="The required data file was not found in the project's data directory.",
                    count=1
                ))
                continue
            
            if error_group == "FILE_EMPTY":
                parsed_errors.append(ValidationError(
                    check_name="File Content",
                    error_type="file_empty",
                    message="The data file exists but is empty.",
                    count=1
                ))
                continue
                
            if not hasattr(error_group, 'schema_errors'):
                continue
            
            for error in error_group.schema_errors:
                error_str = str(error)
                
                # Detect runtime errors like KeyError (often from cross-table checks)
                if "KeyError" in error_str or "RuntimeError" in error_str or "Exception" in error_str:
                    check_name = "Runtime Validation Error"
                    error_type = "data_missing"
                    message = f"Validation failed due to a runtime error (likely missing dependency): {error_str.splitlines()[0]}"
                # Extract check name from pandera's error format: "<Check check_name>"
                elif "<Check " in error_str:
                    import re as _re
                    m = _re.search(r'<Check ([^>]+)>', error_str)
                    check_name = m.group(1) if m else "Dataframe check"
                    error_type = "dataframe_validator"
                    # Special, user-friendly message for zone-id mismatch
                    if "home_zone_id" in check_name.lower() or "home_zone" in check_name.lower():
                        message = (
                            f"Some households' home_zone_ids were not found in the landuse file. "
                            f"This typically means your households.csv uses MAZ zone IDs while the "
                            f"landuse file uses TAZ zone IDs (or vice versa). "
                            f"Both files must use the same zone system. "
                            f"Check the info messages below for the exact zone ID ranges."
                        )
                    else:
                        message = error_str[:500]
                elif "dataframe validator" in error_str.lower():
                    check_name = error_str.split("\n")[-1] if "\n" in error_str else "Dataframe validator"
                    error_type = "dataframe_validator"
                    message = error_str[:500]
                elif "element-wise validator" in error_str.lower():
                    check_name = "Element-wise validator"
                    error_type = "element_wise_validator"
                    message = error_str[:500]
                else:
                    check_name = "Schema validation"
                    error_type = "schema"
                    message = error_str[:500]
                
                # Try to extract failure case count + values from pandera error string
                import re as _re2
                raw_values: list = []
                fc_match = _re2.search(r'failure cases:\s*([\d,\s]+)', error_str, _re2.IGNORECASE)
                if fc_match:
                    raw = fc_match.group(1).strip().rstrip(',')
                    try:
                        raw_values = [int(x.strip()) for x in raw.split(',') if x.strip().isdigit()]
                    except Exception:
                        raw_values = []

                # True count of failures (may be >> what we display)
                count = len(raw_values) if raw_values else 1

                # failure_cases must be List[Dict] per the model; cap at 50 to avoid
                # serialising tens-of-thousands of entries that would crash Pydantic.
                MAX_CASES = 50
                failure_cases: Optional[List[Dict[str, Any]]] = None
                if raw_values:
                    shown = raw_values[:MAX_CASES]
                    failure_cases = [{"value": v} for v in shown]
                    if count > MAX_CASES:
                        # Append a sentinel so the UI can show "… and N more"
                        failure_cases.append({"value": f"… and {count - MAX_CASES:,} more"})

                parsed_error = ValidationError(
                    check_name=check_name,
                    error_type=error_type,
                    message=message,
                    failure_cases=failure_cases,
                    count=count
                )
                parsed_errors.append(parsed_error)
        
        return parsed_errors
    
    def _parse_pandera_warnings(self, warnings_list: List) -> List[ValidationWarning]:
        """Parse Pandera warnings into structured format"""
        parsed_warnings = []
        
        for warning in warnings_list:
            warning_str = str(warning.message)
            
            # Extract check name
            if "dataframe validator" in warning_str.lower():
                check_name = warning_str.split("\n")[-1] if "\n" in warning_str else "Dataframe validator"
            else:
                check_name = "Validation warning"
            
            parsed_warning = ValidationWarning(
                check_name=check_name,
                message=warning_str[:500],  # Limit message length
                failure_cases=None,
                count=1
            )
            parsed_warnings.append(parsed_warning)
        
        return parsed_warnings
    
    def _write_log_file(self, validation_results: Dict[str, Tuple[List, List]]):
        """Write detailed validation log file"""
        log_file = self.logs_dir / "input_checker.log"
        
        with open(log_file, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("ActivitySim Input Validation Report\n")
            f.write(f"Generated: {datetime.now().isoformat()}\n")
            f.write(f"Project: {self.project_dir.name}\n")
            f.write("=" * 80 + "\n\n")
            
            for table_name, (errors, warnings_list) in validation_results.items():
                error_count = sum(len(e.schema_errors) for e in errors if hasattr(e, 'schema_errors'))
                warning_count = len(warnings_list)
                
                f.write(f"\n{'#' * 60}\n")
                f.write(f"Table: {table_name}\n")
                f.write(f"{'#' * 60}\n")
                f.write(f"Errors: {error_count}, Warnings: {warning_count}\n\n")
                
                # Write errors
                if errors:
                    f.write("ERRORS:\n")
                    f.write("-" * 60 + "\n")
                    for error_group in errors:
                        if hasattr(error_group, 'schema_errors'):
                            for error in error_group.schema_errors:
                                f.write(f"{error}\n\n")
                
                # Write warnings
                if warnings_list:
                    f.write("WARNINGS:\n")
                    f.write("-" * 60 + "\n")
                    for warning in warnings_list:
                        f.write(f"{warning.message}\n\n")
                
                # Write info messages
                if table_name in self.log_infos and self.log_infos[table_name]:
                    f.write("INFO:\n")
                    f.write("-" * 60 + "\n")
                    for info in self.log_infos[table_name]:
                        f.write(f"{info}\n")
                    f.write("\n")
        
        logger.info(f"Detailed validation log written to: {log_file}")


def log_info(text: str):
    """
    Helper function for validation modules to log info messages
    This is called from within the validation schemas
    """
    # This would need to be connected to the ValidationService instance
    # For now, just log it
    logger.info(text)

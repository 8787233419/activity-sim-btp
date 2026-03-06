"""
Pydantic models for ActivitySim Backend API
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class ValidationStatus(str, Enum):
    """Validation status enumeration"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"


class SimulationStatus(str, Enum):
    """Simulation execution status"""
    NOT_STARTED = "not_started"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"


class ValidationError(BaseModel):
    """Individual validation error"""
    check_name: str = Field(..., description="Name of the validation check that failed")
    error_type: str = Field(..., description="Type of error (e.g., 'schema', 'element-wise')")
    message: str = Field(..., description="Error message")
    failure_cases: Optional[List[Dict[str, Any]]] = Field(None, description="Specific rows/values that failed")
    count: int = Field(..., description="Number of failures")


class ValidationWarning(BaseModel):
    """Individual validation warning"""
    check_name: str = Field(..., description="Name of the validation check")
    message: str = Field(..., description="Warning message")
    failure_cases: Optional[List[Dict[str, Any]]] = Field(None, description="Specific rows/values that triggered warning")
    count: int = Field(..., description="Number of warnings")


class TableValidationResult(BaseModel):
    """Validation result for a single table"""
    table_name: str = Field(..., description="Name of the table (e.g., 'households', 'persons')")
    status: ValidationStatus = Field(..., description="Overall validation status for this table")
    error_count: int = Field(0, description="Total number of errors")
    warning_count: int = Field(0, description="Total number of warnings")
    errors: List[ValidationError] = Field(default_factory=list, description="List of validation errors")
    warnings: List[ValidationWarning] = Field(default_factory=list, description="List of validation warnings")
    info_messages: List[str] = Field(default_factory=list, description="Additional informational messages")


class ValidationResult(BaseModel):
    """Complete validation result for all tables"""
    project_id: str = Field(..., description="Project identifier")
    timestamp: datetime = Field(default_factory=datetime.now, description="When validation was performed")
    overall_status: ValidationStatus = Field(..., description="Overall validation status")
    ready_for_simulation: bool = Field(..., description="True if files are ready for simulation (passed or warning only)")
    tables: List[TableValidationResult] = Field(..., description="Validation results per table")
    total_errors: int = Field(0, description="Total errors across all tables")
    total_warnings: int = Field(0, description="Total warnings across all tables")
    log_file: Optional[str] = Field(None, description="Path to detailed log file")


class UploadFileResponse(BaseModel):
    """Response for file upload"""
    filename: str = Field(..., description="Name of uploaded file")
    size: int = Field(..., description="File size in bytes")
    path: str = Field(..., description="Relative path where file is stored")
    uploaded_at: datetime = Field(default_factory=datetime.now, description="Upload timestamp")


class UploadResponse(BaseModel):
    """Response for multiple file uploads"""
    project_id: str = Field(..., description="Project identifier")
    files: List[UploadFileResponse] = Field(..., description="List of uploaded files")
    message: str = Field(..., description="Success message")


class SimulationLogEntry(BaseModel):
    """Individual log entry from simulation"""
    timestamp: datetime = Field(..., description="Log entry timestamp")
    level: str = Field(..., description="Log level (INFO, WARNING, ERROR)")
    message: str = Field(..., description="Log message")


class SimulationExecutionStatus(BaseModel):
    """Status of simulation execution"""
    execution_id: str = Field(..., description="Unique execution identifier")
    project_id: str = Field(..., description="Project identifier")
    status: SimulationStatus = Field(..., description="Current simulation status")
    progress: int = Field(0, ge=0, le=100, description="Progress percentage (0-100)")
    current_step: str = Field("", description="Current simulation step")
    start_time: Optional[datetime] = Field(None, description="Simulation start time")
    end_time: Optional[datetime] = Field(None, description="Simulation end time")
    logs: List[SimulationLogEntry] = Field(default_factory=list, description="Recent log entries")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class OutputFileInfo(BaseModel):
    """Information about an output file"""
    filename: str = Field(..., description="Output file name")
    size: int = Field(..., description="File size in bytes")
    modified_at: datetime = Field(..., description="Last modification time")
    download_url: str = Field(..., description="URL to download the file")


class OutputFilesResponse(BaseModel):
    """Response listing output files"""
    project_id: str = Field(..., description="Project identifier")
    files: List[OutputFileInfo] = Field(..., description="List of output files")
    total_count: int = Field(..., description="Total number of output files")


class ProjectCreate(BaseModel):
    """Model for project creation request"""
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field("", description="Project description")


class ProjectConfig(BaseModel):
    """Project configuration"""
    project_id: str = Field(..., description="Project identifier")
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field("", description="Project description")
    created_at: datetime = Field(..., description="Creation timestamp")
    last_validation: Optional[datetime] = Field(None, description="Last validation timestamp")
    last_simulation: Optional[datetime] = Field(None, description="Last simulation timestamp")
    validation_status: ValidationStatus = Field(ValidationStatus.NOT_STARTED, description="Latest validation status")


class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.now, description="Error timestamp")

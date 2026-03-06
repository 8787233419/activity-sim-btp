"""
Simulation Service for ActivitySim Execution

This module handles running ActivitySim simulations in the background
and monitoring their progress.
"""

import logging
import subprocess
import asyncio
import os
import re
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime

from models import (
    SimulationExecutionStatus,
    SimulationStatus,
    SimulationLogEntry
)

logger = logging.getLogger(__name__)


class SimulationService:
    """Service for executing ActivitySim simulations"""
    
    def __init__(self, project_dir: Path):
        """
        Initialize simulation service
        
        Args:
            project_dir: Path to project directory
        """
        self.project_dir = Path(project_dir)
        self.config_dir = self.project_dir / "configs"
        self.data_dir = self.project_dir / "data"
        self.output_dir = self.project_dir / "output"
        self.logs_dir = self.project_dir / "logs"
        
        # Ensure directories exist
        self.output_dir.mkdir(exist_ok=True)
        self.logs_dir.mkdir(exist_ok=True)
        
        # Active simulation process
        self.process: Optional[subprocess.Popen] = None
        self.execution_id: Optional[str] = None
        
    async def run_simulation(
        self,
        execution_id: str,
        status_callback=None
    ) -> SimulationExecutionStatus:
        """
        Run ActivitySim simulation asynchronously
        
        Args:
            execution_id: Unique identifier for this execution
            status_callback: Optional callback function to update status
            
        Returns:
            Final simulation execution status
        """
        self.execution_id = execution_id
        
        status = SimulationExecutionStatus(
            execution_id=execution_id,
            project_id=self.project_dir.name,
            status=SimulationStatus.RUNNING,
            progress=0,
            current_step="Initializing simulation...",
            start_time=datetime.now(),
            logs=[]
        )
        
        if status_callback:
            await status_callback(status)
        
        try:
            # Build ActivitySim command
            cmd = self._build_activitysim_command()
            logger.info(f"Running command: {' '.join(cmd)}")
            
            # Start the simulation process
            log_file = self.logs_dir / f"activitysim_{execution_id}.log"
            
            with open(log_file, 'w') as log_f:
                self.process = subprocess.Popen(
                    cmd,
                    stdout=log_f,
                    stderr=subprocess.STDOUT,
                    cwd=str(self.project_dir),
                    text=True
                )
            
            # Monitor the simulation
            status = await self._monitor_simulation(
                status,
                log_file,
                status_callback
            )
            
            return status
            
        except Exception as e:
            logger.error(f"Simulation failed: {e}", exc_info=True)
            status.status = SimulationStatus.FAILED
            status.error_message = str(e)
            status.end_time = datetime.now()
            
            if status_callback:
                await status_callback(status)
            
            return status
    
    def _build_activitysim_command(self) -> list:
        """Build the ActivitySim command line"""
        # Use activitysim CLI
        cmd = [
            "activitysim",
            "run",
            "-c", str(self.config_dir),
            "-d", str(self.data_dir),
            "-o", str(self.output_dir)
        ]
        
        return cmd
    
    async def _monitor_simulation(
        self,
        status: SimulationExecutionStatus,
        log_file: Path,
        status_callback=None
    ) -> SimulationExecutionStatus:
        """
        Monitor simulation progress by reading log file
        
        Args:
            status: Current status object
            log_file: Path to log file
            status_callback: Optional callback for status updates
            
        Returns:
            Updated status
        """
        last_position = 0
        steps_completed = 0
        total_steps = 30  # Approximate number of ActivitySim steps
        
        while self.process and self.process.poll() is None:
            # Read new log entries
            if log_file.exists():
                with open(log_file, 'r') as f:
                    f.seek(last_position)
                    new_lines = f.readlines()
                    last_position = f.tell()
                
                # Parse log lines
                for line in new_lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Extract log level and message
                    log_entry = self._parse_log_line(line)
                    if log_entry:
                        status.logs.append(log_entry)
                        
                        # Keep only last 50 log entries
                        if len(status.logs) > 50:
                            status.logs = status.logs[-50:]
                    
                    # Detect step completion
                    if self._is_step_completion(line):
                        steps_completed += 1
                        progress = min(int((steps_completed / total_steps) * 100), 99)
                        status.progress = progress
                        status.current_step = self._extract_step_name(line)
                        
                        if status_callback:
                            await status_callback(status)
            
            # Wait before next check
            await asyncio.sleep(1)
        
        # Process completed
        return_code = self.process.returncode if self.process else -1
        
        if return_code == 0:
            status.status = SimulationStatus.COMPLETED
            status.progress = 100
            status.current_step = "Simulation completed successfully"
            logger.info("Simulation completed successfully")
        else:
            status.status = SimulationStatus.FAILED
            status.error_message = f"Simulation failed with return code {return_code}"
            logger.error(f"Simulation failed with return code {return_code}")
        
        status.end_time = datetime.now()
        
        if status_callback:
            await status_callback(status)
        
        return status
    
    def _parse_log_line(self, line: str) -> Optional[SimulationLogEntry]:
        """Parse a log line into a SimulationLogEntry"""
        # ActivitySim log format: TIMESTAMP - LEVEL - MESSAGE
        # Example: 2024-01-01 12:00:00,123 - INFO - activitysim.core.pipeline - Running model: initialize_landuse
        
        # Try to extract log level
        level = "INFO"
        if " - ERROR - " in line:
            level = "ERROR"
        elif " - WARNING - " in line:
            level = "WARNING"
        elif " - DEBUG - " in line:
            level = "DEBUG"
        
        # Extract message (everything after the last " - ")
        parts = line.split(" - ")
        if len(parts) >= 3:
            message = " - ".join(parts[2:])
        else:
            message = line
        
        return SimulationLogEntry(
            timestamp=datetime.now(),
            level=level,
            message=message[:200]  # Limit message length
        )
    
    def _is_step_completion(self, line: str) -> bool:
        """Check if log line indicates step completion"""
        step_indicators = [
            "Running model:",
            "Completed model:",
            "Writing table:",
            "Loaded table:"
        ]
        return any(indicator in line for indicator in step_indicators)
    
    def _extract_step_name(self, line: str) -> str:
        """Extract step name from log line"""
        # Try to extract model name
        if "Running model:" in line:
            match = re.search(r"Running model:\s+(\w+)", line)
            if match:
                return f"Running {match.group(1)}"
        
        if "Completed model:" in line:
            match = re.search(r"Completed model:\s+(\w+)", line)
            if match:
                return f"Completed {match.group(1)}"
        
        if "Writing table:" in line:
            match = re.search(r"Writing table:\s+(\w+)", line)
            if match:
                return f"Writing {match.group(1)}"
        
        return "Processing..."
    
    def stop_simulation(self):
        """Stop the running simulation"""
        if self.process and self.process.poll() is None:
            logger.info(f"Stopping simulation {self.execution_id}")
            self.process.terminate()
            try:
                self.process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                logger.warning("Process did not terminate gracefully, killing...")
                self.process.kill()

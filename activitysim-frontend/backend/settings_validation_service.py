"""
Settings Validation Service for ActivitySim Configuration Files

This module integrates with ActivitySim's settings_checker to validate
YAML configuration files against their expected schemas.
"""

import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add ActivitySim source to path if not installed
ACTIVITYSIM_SRCDIR = r"c:\Users\ayush\btp\activitysim"
if ACTIVITYSIM_SRCDIR not in sys.path:
    sys.path.append(ACTIVITYSIM_SRCDIR)

try:
    from activitysim.abm.models import settings_checker
    from activitysim.core.exceptions import ModelConfigurationError
    HAS_SETTINGS_CHECKER = True
except ImportError:
    HAS_SETTINGS_CHECKER = False

from validation_service import MockState

logger = logging.getLogger(__name__)

class SettingsValidationService:
    """Service for validating ActivitySim YAML settings files"""
    
    def __init__(self, project_dir: Path):
        self.project_dir = Path(project_dir)
        self.config_dir = self.project_dir / "configs"
        self.logs_dir = self.project_dir / "logs"
        self.state = MockState(self.project_dir)
        
    def validate_settings(self) -> Dict[str, Any]:
        """
        Validate all settings files in the project's config directory
        
        Returns:
            Dictionary with results, errors, and warnings
        """
        if not HAS_SETTINGS_CHECKER:
            return {
                "status": "error",
                "message": "ActivitySim settings_checker not found. Please ensure ActivitySim path is correct.",
                "errors": ["ActivitySim import failed"]
            }
            
        logger.info(f"Starting settings validation for {self.project_dir}")
        
        errors = []
        try:
            # ActivitySim's check_model_settings raises ModelConfigurationError if checks fail
            # We catch it to return a structured response
            settings_checker.check_model_settings(
                state=self.state,
                log_file="settings_checker_api.log"
            )
            return {
                "status": "passed",
                "message": "All settings files passed validation",
                "errors": []
            }
        except Exception as e:
            error_msg = str(e)
            logger.warning(f"Settings validation failed: {error_msg}")
            
            # The error message from settings_checker contains all failing models
            return {
                "status": "failed",
                "message": "Settings validation failed",
                "errors": [error_msg]
            }

    def validate_single_setting(self, model_name: str) -> Dict[str, Any]:
        """Validate settings for a specific model component"""
        if not HAS_SETTINGS_CHECKER:
            return {"status": "error", "message": "Settings checker unavailable"}
            
        if model_name not in settings_checker.CHECKER_SETTINGS:
            return {
                "status": "error",
                "message": f"No checker defined for model: {model_name}"
            }
            
        config_info = settings_checker.CHECKER_SETTINGS[model_name]
        model_cls = config_info["settings_cls"]
        model_file = config_info["settings_file"]
        
        try:
            settings, error = settings_checker.try_load_model_settings(
                model_name=model_name,
                model_settings_class=model_cls,
                model_settings_file=model_file,
                state=self.state
            )
            
            if error:
                return {
                    "status": "failed",
                    "model": model_name,
                    "file": model_file,
                    "error": str(error)
                }
                
            return {
                "status": "passed",
                "model": model_name,
                "file": model_file
            }
        except Exception as e:
            return {
                "status": "error",
                "model": model_name,
                "error": str(e)
            }

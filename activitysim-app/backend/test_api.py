"""
Test script for ActivitySim Backend API

This script tests the basic workflow:
1. Create a project
2. Upload CSV files
3. Run validation
4. Check validation results
"""

import requests
import time
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

# Test data directory (using ActivitySim example data)
TEST_DATA_DIR = Path(r"c:\Users\ayush\btp\activitysim\activitysim\examples\prototype_mtc_extended\data")


def test_create_project():
    """Test project creation"""
    print("\n=== Testing Project Creation ===")
    
    response = requests.post(
        f"{API_BASE}/projects_add",
        params={
            "name": "Test Project",
            "description": "Automated test project"
        }
    )
    
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {data}")
    
    assert response.status_code == 200
    assert "project" in data
    
    project_id = data["project"]["id"]
    print(f"✓ Created project: {project_id}")
    
    return project_id


def test_upload_files(project_id):
    """Test CSV file upload"""
    print("\n=== Testing File Upload ===")
    
    # Prepare files to upload
    files_to_upload = ["households.csv", "persons.csv", "land_use.csv"]
    files = []
    
    for filename in files_to_upload:
        file_path = TEST_DATA_DIR / filename
        if file_path.exists():
            files.append(("files", (filename, open(file_path, "rb"), "text/csv")))
        else:
            print(f"Warning: {filename} not found at {file_path}")
    
    if not files:
        print("No test files found. Skipping upload test.")
        return False
    
    response = requests.post(
        f"{API_BASE}/projects/{project_id}/upload-csv",
        files=files
    )
    
    # Close file handles
    for _, (_, f, _) in files:
        f.close()
    
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Uploaded {len(data['files'])} files")
    
    for file_info in data["files"]:
        print(f"  - {file_info['filename']} ({file_info['size']} bytes)")
    
    assert response.status_code == 200
    print("✓ Files uploaded successfully")
    
    return True


def test_validation(project_id):
    """Test validation"""
    print("\n=== Testing Validation ===")
    
    response = requests.post(f"{API_BASE}/projects/{project_id}/validate")
    
    print(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"Error: {response.text}")
        return False
    
    data = response.json()
    print(f"Overall Status: {data['overall_status']}")
    print(f"Total Errors: {data['total_errors']}")
    print(f"Total Warnings: {data['total_warnings']}")
    
    print("\nTable Results:")
    for table in data["tables"]:
        print(f"  {table['table_name']}: {table['status']} "
              f"({table['error_count']} errors, {table['warning_count']} warnings)")
    
    if data['total_errors'] > 0:
        print("\nErrors found:")
        for table in data["tables"]:
            if table["errors"]:
                print(f"\n  {table['table_name']}:")
                for error in table["errors"][:3]:  # Show first 3 errors
                    print(f"    - {error['check_name']}: {error['message'][:100]}")
    
    print("✓ Validation completed")
    return True


def test_get_validation_results(project_id):
    """Test retrieving validation results"""
    print("\n=== Testing Get Validation Results ===")
    
    response = requests.get(f"{API_BASE}/projects/{project_id}/validation-results")
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Cached results: {data['overall_status']}")
        print("✓ Retrieved validation results")
        return True
    else:
        print(f"Error: {response.text}")
        return False


def test_list_files(project_id):
    """Test listing project files"""
    print("\n=== Testing List Files ===")
    
    response = requests.get(f"{API_BASE}/projects/{project_id}/files")
    
    print(f"Status: {response.status_code}")
    data = response.json()
    
    print("Files by directory:")
    for directory, files in data.items():
        print(f"  {directory}: {len(files)} files")
        for file in files[:5]:  # Show first 5 files
            print(f"    - {file}")
    
    print("✓ Listed files")
    return True


def test_health_check():
    """Test health check endpoint"""
    print("\n=== Testing Health Check ===")
    
    response = requests.get(f"{BASE_URL}/health")
    
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {data}")
    
    assert response.status_code == 200
    assert data["status"] == "healthy"
    
    print("✓ Health check passed")
    return True


def main():
    """Run all tests"""
    print("=" * 60)
    print("ActivitySim Backend API Test Suite")
    print("=" * 60)
    
    try:
        # Test health check first
        test_health_check()
        
        # Create a project
        project_id = test_create_project()
        
        # Upload files
        if TEST_DATA_DIR.exists():
            uploaded = test_upload_files(project_id)
            
            if uploaded:
                # Run validation
                test_validation(project_id)
                
                # Get validation results
                test_get_validation_results(project_id)
                
                # List files
                test_list_files(project_id)
        else:
            print(f"\nWarning: Test data directory not found: {TEST_DATA_DIR}")
            print("Skipping file upload and validation tests.")
        
        print("\n" + "=" * 60)
        print("✓ All tests completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("\nMake sure the backend server is running on http://localhost:8000")
    print("Start it with: python main.py\n")
    
    input("Press Enter to start tests...")
    main()

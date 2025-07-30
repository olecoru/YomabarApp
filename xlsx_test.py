#!/usr/bin/env python3
"""
XLSX Menu Import and Availability Toggle Testing
Tests the new XLSX import and menu item availability toggle functionality
"""

import requests
import json
import pandas as pd
import io
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "http://localhost:8001/api"

class XLSXMenuTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.tokens = {}
        self.categories = []
        self.test_item_id = None
        
    def log_test(self, test_name, success, message):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
        
    def authenticate(self):
        """Authenticate as admin and waitress"""
        print("=== AUTHENTICATION ===")
        
        # Admin login
        try:
            login_data = {"username": "admin1", "password": "password123"}
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                token_data = response.json()
                self.tokens["admin"] = token_data["access_token"]
                self.log_test("Admin Login", True, "Successfully logged in as admin")
            else:
                self.log_test("Admin Login", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Admin Login", False, f"Request failed: {str(e)}")
            return False
            
        # Waitress login
        try:
            login_data = {"username": "waitress1", "password": "password123"}
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                token_data = response.json()
                self.tokens["waitress"] = token_data["access_token"]
                self.log_test("Waitress Login", True, "Successfully logged in as waitress")
            else:
                self.log_test("Waitress Login", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Waitress Login", False, f"Request failed: {str(e)}")
            
        return True
        
    def set_auth_header(self, role):
        """Set authorization header for requests"""
        if role in self.tokens:
            self.session.headers.update({"Authorization": f"Bearer {self.tokens[role]}"})
        else:
            self.session.headers.pop("Authorization", None)
            
    def get_categories(self):
        """Get categories for testing"""
        print("\n=== GETTING CATEGORIES ===")
        
        try:
            self.set_auth_header("admin")
            response = self.session.get(f"{BACKEND_URL}/categories")
            
            if response.status_code == 200:
                self.categories = response.json()
                self.log_test("GET Categories", True, f"Retrieved {len(self.categories)} categories")
                return True
            else:
                self.log_test("GET Categories", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("GET Categories", False, f"Request failed: {str(e)}")
            return False
            
    def test_menu_stats(self):
        """Test GET /api/menu/stats"""
        print("\n=== TESTING MENU STATS ===")
        
        try:
            self.set_auth_header("admin")
            response = self.session.get(f"{BACKEND_URL}/menu/stats")
            
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["total_items", "available_items", "hidden_items", "by_category"]
                if all(field in stats for field in required_fields):
                    self.log_test("GET /api/menu/stats", True, 
                                f"Retrieved menu stats: {stats['total_items']} total, {stats['available_items']} available, {stats['hidden_items']} hidden")
                else:
                    self.log_test("GET /api/menu/stats", False, f"Missing required fields in stats response")
            else:
                self.log_test("GET /api/menu/stats", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/menu/stats", False, f"Request failed: {str(e)}")
            
    def test_xlsx_import(self):
        """Test POST /api/menu/import with XLSX file"""
        print("\n=== TESTING XLSX IMPORT ===")
        
        if not self.categories:
            self.log_test("XLSX Import", False, "No categories available for testing")
            return
            
        try:
            # Create test data for XLSX import
            test_menu_data = [
                {
                    "name": "Test Imported Burger",
                    "description": "Delicious imported burger from XLSX",
                    "price": 19.99,
                    "category_id": self.categories[0]["id"],
                    "item_type": "food"
                },
                {
                    "name": "Test Imported Cocktail", 
                    "description": "Refreshing imported cocktail from XLSX",
                    "price": 12.50,
                    "category_id": self.categories[-1]["id"],
                    "item_type": "drink"
                }
            ]
            
            # Create DataFrame and convert to XLSX bytes
            df = pd.DataFrame(test_menu_data)
            xlsx_buffer = io.BytesIO()
            df.to_excel(xlsx_buffer, index=False, engine='openpyxl')
            xlsx_buffer.seek(0)
            
            self.log_test("XLSX File Creation", True, f"Created test XLSX with {len(test_menu_data)} menu items")
            
            # Upload XLSX file
            self.set_auth_header("admin")
            files = {'file': ('test_menu.xlsx', xlsx_buffer.getvalue(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            
            response = self.session.post(f"{BACKEND_URL}/menu/import", files=files)
            
            if response.status_code == 200:
                import_result = response.json()
                required_fields = ["success", "total_items", "created_items", "updated_items", "errors"]
                if all(field in import_result for field in required_fields):
                    if import_result["success"] and import_result["created_items"] > 0:
                        self.log_test("POST /api/menu/import", True, 
                                    f"Successfully imported {import_result['created_items']} items, {import_result['updated_items']} updated")
                    else:
                        self.log_test("POST /api/menu/import", False, 
                                    f"Import failed or no items created. Errors: {import_result.get('errors', [])}")
                else:
                    self.log_test("POST /api/menu/import", False, "Missing required fields in import response")
            else:
                self.log_test("POST /api/menu/import", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("POST /api/menu/import", False, f"Request failed: {str(e)}")
            
    def test_menu_display_all_items(self):
        """Test GET /api/menu shows all items including unavailable ones"""
        print("\n=== TESTING MENU DISPLAY ALL ITEMS ===")
        
        try:
            self.set_auth_header("waitress")
            response = self.session.get(f"{BACKEND_URL}/menu")
            
            if response.status_code == 200:
                menu_items = response.json()
                
                # Check if response includes availability status
                items_with_availability = [item for item in menu_items if "available" in item]
                available_items = [item for item in menu_items if item.get("available", True)]
                unavailable_items = [item for item in menu_items if not item.get("available", True)]
                
                if len(items_with_availability) == len(menu_items):
                    self.log_test("GET /api/menu (shows all items)", True, 
                                f"Menu shows {len(available_items)} available and {len(unavailable_items)} unavailable items")
                    
                    # Store first item for availability testing
                    if menu_items:
                        self.test_item_id = menu_items[0]["id"]
                else:
                    self.log_test("GET /api/menu (shows all items)", False, 
                                "Some menu items missing availability field")
            else:
                self.log_test("GET /api/menu (shows all items)", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/menu (shows all items)", False, f"Request failed: {str(e)}")
            
    def test_availability_toggle(self):
        """Test PATCH /api/menu/{item_id}/availability"""
        print("\n=== TESTING AVAILABILITY TOGGLE ===")
        
        if not self.test_item_id:
            self.log_test("Availability Toggle", False, "No test item ID available")
            return
            
        try:
            self.set_auth_header("admin")
            
            # First, make item unavailable
            availability_data = {"item_id": self.test_item_id, "available": False}
            response = self.session.patch(f"{BACKEND_URL}/menu/{self.test_item_id}/availability", json=availability_data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success") and "availability updated to False" in result.get("message", ""):
                    self.log_test("PATCH /api/menu/{item_id}/availability (make unavailable)", True, 
                                "Successfully made menu item unavailable")
                else:
                    self.log_test("PATCH /api/menu/{item_id}/availability (make unavailable)", False, 
                                f"Unexpected response: {result}")
            else:
                self.log_test("PATCH /api/menu/{item_id}/availability (make unavailable)", False, 
                            f"HTTP {response.status_code}: {response.text}")
            
            # Then, make item available again
            availability_data = {"item_id": self.test_item_id, "available": True}
            response = self.session.patch(f"{BACKEND_URL}/menu/{self.test_item_id}/availability", json=availability_data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success") and "availability updated to True" in result.get("message", ""):
                    self.log_test("PATCH /api/menu/{item_id}/availability (make available)", True, 
                                "Successfully made menu item available")
                else:
                    self.log_test("PATCH /api/menu/{item_id}/availability (make available)", False, 
                                f"Unexpected response: {result}")
            else:
                self.log_test("PATCH /api/menu/{item_id}/availability (make available)", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("PATCH /api/menu/{item_id}/availability", False, f"Request failed: {str(e)}")
            
    def test_access_control(self):
        """Test role-based access control"""
        print("\n=== TESTING ACCESS CONTROL ===")
        
        # Test waitress cannot import
        try:
            self.set_auth_header("waitress")
            
            # Create dummy XLSX
            dummy_data = [{"name": "test", "description": "test", "price": 10, "category_id": "test", "item_type": "food"}]
            df = pd.DataFrame(dummy_data)
            xlsx_buffer = io.BytesIO()
            df.to_excel(xlsx_buffer, index=False, engine='openpyxl')
            xlsx_buffer.seek(0)
            
            files = {'file': ('test.xlsx', xlsx_buffer.getvalue(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            response = self.session.post(f"{BACKEND_URL}/menu/import", files=files)
            
            if response.status_code == 403:
                self.log_test("Import Access Control (waitress denied)", True, 
                            "Correctly denied import access for non-admin user")
            else:
                self.log_test("Import Access Control (waitress denied)", False, 
                            f"Expected 403, got HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Import Access Control (waitress denied)", False, f"Request failed: {str(e)}")
            
        # Test waitress cannot toggle availability
        if self.test_item_id:
            try:
                self.set_auth_header("waitress")
                
                availability_data = {"item_id": self.test_item_id, "available": False}
                response = self.session.patch(f"{BACKEND_URL}/menu/{self.test_item_id}/availability", json=availability_data)
                
                if response.status_code == 403:
                    self.log_test("Availability Toggle Access Control (waitress denied)", True, 
                                "Correctly denied availability toggle for non-admin user")
                else:
                    self.log_test("Availability Toggle Access Control (waitress denied)", False, 
                                f"Expected 403, got HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_test("Availability Toggle Access Control (waitress denied)", False, f"Request failed: {str(e)}")
                
    def run_all_tests(self):
        """Run all XLSX import and availability toggle tests"""
        print("🚀 Starting XLSX Menu Import and Availability Toggle Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test started at: {datetime.now().isoformat()}")
        
        if not self.authenticate():
            print("❌ Authentication failed, cannot continue tests")
            return
            
        if not self.get_categories():
            print("❌ Could not get categories, cannot continue tests")
            return
            
        # Run all tests
        self.test_menu_stats()
        self.test_xlsx_import()
        self.test_menu_display_all_items()
        self.test_availability_toggle()
        self.test_access_control()
        
        # Final stats check
        self.test_menu_stats()
        
        # Print summary
        print("\n" + "="*80)
        print("XLSX MENU IMPORT AND AVAILABILITY TOGGLE TEST SUMMARY")
        print("="*80)
        
        passed_tests = [test for test in self.test_results if test['success']]
        failed_tests = [test for test in self.test_results if not test['success']]
        
        print(f"✅ PASSED: {len(passed_tests)}")
        print(f"❌ FAILED: {len(failed_tests)}")
        print(f"📊 TOTAL: {len(self.test_results)}")
        
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['message']}")
        
        print(f"\n🎯 SUCCESS RATE: {len(passed_tests)}/{len(self.test_results)} ({len(passed_tests)/len(self.test_results)*100:.1f}%)")

if __name__ == "__main__":
    tester = XLSXMenuTester()
    tester.run_all_tests()
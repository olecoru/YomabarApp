#!/usr/bin/env python3
"""
Quick Verification Test for XLSX Menu Import and Availability Toggle System
Tests the 3 priority endpoints as requested in the review
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://7ac04967-575d-4814-81b1-48f03205e31d.preview.emergentagent.com/api"

class QuickVerificationTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.admin_token = None
        self.menu_items = []
        
    def log_test(self, test_name, success, message, response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        })
        
    def authenticate_admin(self):
        """Authenticate as admin user"""
        print("\n=== AUTHENTICATING AS ADMIN ===")
        try:
            login_data = {"username": "admin1", "password": "password123"}
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                token_data = response.json()
                self.admin_token = token_data["access_token"]
                self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
                self.log_test("Admin Authentication", True, f"Successfully logged in as admin: {token_data['full_name']}")
                return True
            else:
                self.log_test("Admin Authentication", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Admin Authentication", False, f"Request failed: {str(e)}")
            return False
    
    def test_menu_stats_endpoint(self):
        """Test GET /api/menu/stats - Priority Test 1"""
        print("\n=== TESTING GET /api/menu/stats ===")
        try:
            response = self.session.get(f"{BACKEND_URL}/menu/stats")
            
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["total_items", "available_items", "hidden_items", "by_category"]
                
                if all(field in stats for field in required_fields):
                    self.log_test("GET /api/menu/stats", True, 
                                f"Menu statistics working: {stats['total_items']} total, {stats['available_items']} available, {stats['hidden_items']} hidden items")
                    return True
                else:
                    missing_fields = [field for field in required_fields if field not in stats]
                    self.log_test("GET /api/menu/stats", False, f"Missing required fields: {missing_fields}")
                    return False
            else:
                self.log_test("GET /api/menu/stats", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("GET /api/menu/stats", False, f"Request failed: {str(e)}")
            return False
    
    def test_menu_endpoint_with_availability(self):
        """Test GET /api/menu - Priority Test 2"""
        print("\n=== TESTING GET /api/menu (with availability status) ===")
        try:
            response = self.session.get(f"{BACKEND_URL}/menu")
            
            if response.status_code == 200:
                menu_items = response.json()
                self.menu_items = menu_items
                
                if not menu_items:
                    self.log_test("GET /api/menu", False, "No menu items found")
                    return False
                
                # Check if all items have availability field
                items_with_availability = [item for item in menu_items if "available" in item]
                available_items = [item for item in menu_items if item.get("available", True)]
                unavailable_items = [item for item in menu_items if not item.get("available", True)]
                
                if len(items_with_availability) == len(menu_items):
                    self.log_test("GET /api/menu", True, 
                                f"Menu endpoint working: {len(menu_items)} total items, {len(available_items)} available, {len(unavailable_items)} unavailable")
                    return True
                else:
                    self.log_test("GET /api/menu", False, 
                                f"Some items missing availability field: {len(items_with_availability)}/{len(menu_items)} have availability")
                    return False
            else:
                self.log_test("GET /api/menu", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("GET /api/menu", False, f"Request failed: {str(e)}")
            return False
    
    def test_availability_toggle_endpoint(self):
        """Test PATCH /api/menu/{item_id}/availability - Priority Test 3"""
        print("\n=== TESTING PATCH /api/menu/{item_id}/availability ===")
        
        if not self.menu_items:
            self.log_test("PATCH /api/menu/{item_id}/availability", False, "No menu items available for testing")
            return False
        
        # Use the first menu item for testing
        test_item = self.menu_items[0]
        item_id = test_item["id"]
        original_availability = test_item.get("available", True)
        
        try:
            # Toggle availability to opposite of current state
            new_availability = not original_availability
            availability_data = {"item_id": item_id, "available": new_availability}
            
            response = self.session.patch(f"{BACKEND_URL}/menu/{item_id}/availability", json=availability_data)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("success") and f"availability updated to {new_availability}" in result.get("message", ""):
                    self.log_test("PATCH /api/menu/{item_id}/availability", True, 
                                f"Successfully toggled availability from {original_availability} to {new_availability}")
                    
                    # Restore original availability
                    restore_data = {"item_id": item_id, "available": original_availability}
                    restore_response = self.session.patch(f"{BACKEND_URL}/menu/{item_id}/availability", json=restore_data)
                    
                    if restore_response.status_code == 200:
                        self.log_test("Availability Toggle Cleanup", True, f"Restored original availability: {original_availability}")
                    else:
                        self.log_test("Availability Toggle Cleanup", False, f"Failed to restore original availability")
                    
                    return True
                else:
                    self.log_test("PATCH /api/menu/{item_id}/availability", False, 
                                f"Unexpected response format: {result}")
                    return False
            else:
                self.log_test("PATCH /api/menu/{item_id}/availability", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("PATCH /api/menu/{item_id}/availability", False, f"Request failed: {str(e)}")
            return False
    
    def run_quick_verification(self):
        """Run the quick verification tests"""
        print("🚀 STARTING QUICK VERIFICATION TEST FOR XLSX MENU IMPORT AND AVAILABILITY TOGGLE SYSTEM")
        print("=" * 80)
        
        # Step 1: Authenticate as admin
        if not self.authenticate_admin():
            print("\n❌ CRITICAL: Admin authentication failed. Cannot proceed with tests.")
            return False
        
        # Step 2: Test the 3 priority endpoints
        test_results = []
        
        # Priority Test 1: GET /api/menu/stats
        test_results.append(self.test_menu_stats_endpoint())
        
        # Priority Test 2: GET /api/menu (with availability status)
        test_results.append(self.test_menu_endpoint_with_availability())
        
        # Priority Test 3: PATCH /api/menu/{item_id}/availability
        test_results.append(self.test_availability_toggle_endpoint())
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 QUICK VERIFICATION TEST SUMMARY")
        print("=" * 80)
        
        passed_tests = sum(test_results)
        total_tests = len(test_results)
        
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        print(f"\n🎯 OVERALL RESULT: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 SUCCESS: All priority endpoints are working correctly!")
            return True
        else:
            print("⚠️  WARNING: Some endpoints have issues that need attention.")
            return False

def main():
    """Main function to run quick verification"""
    tester = QuickVerificationTester()
    success = tester.run_quick_verification()
    
    if success:
        print("\n✅ QUICK VERIFICATION COMPLETED SUCCESSFULLY")
        sys.exit(0)
    else:
        print("\n❌ QUICK VERIFICATION FOUND ISSUES")
        sys.exit(1)

if __name__ == "__main__":
    main()
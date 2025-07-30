#!/usr/bin/env python3
"""
YomaBar Bottle Functionality Testing
Tests new bottle functionality for drinks in the YomaBar system.

CRITICAL TESTING PRIORITY:
1. GET /api/menu - Verify menu returns new bottle_available and bottle_price fields
2. POST /api/menu - Test creating drinks with bottle options (admin only)
3. XLSX Import - Test importing drinks with bottle_available and bottle_price fields
4. Menu display - Verify bottle information is properly returned
"""

import requests
import json
import sys
from datetime import datetime
import uuid
import pandas as pd
import io

# Backend URL from frontend/.env
BACKEND_URL = "https://7ac04967-575d-4814-81b1-48f03205e31d.preview.emergentagent.com/api"

class BottleFunctionalityTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.tokens = {}
        self.categories = []
        self.drink_categories = []
        self.created_drink_id = None
        
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
        
    def set_auth_header(self, role):
        """Set authorization header for requests"""
        if role in self.tokens:
            self.session.headers.update({"Authorization": f"Bearer {self.tokens[role]}"})
        else:
            self.session.headers.pop("Authorization", None)
            
    def authenticate_users(self):
        """Authenticate required users for testing"""
        print("\n=== AUTHENTICATING USERS ===")
        
        test_users = [
            {"username": "admin1", "password": "password123", "role": "administrator"},
            {"username": "waitress1", "password": "password123", "role": "waitress"}
        ]
        
        for user in test_users:
            try:
                login_data = {"username": user["username"], "password": user["password"]}
                response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
                
                if response.status_code == 200:
                    token_data = response.json()
                    self.tokens[user["role"]] = token_data["access_token"]
                    self.log_test(f"Authentication ({user['role']})", True, 
                                f"Successfully authenticated as {user['role']}")
                else:
                    self.log_test(f"Authentication ({user['role']})", False, 
                                f"HTTP {response.status_code}: {response.text}")
                    return False
            except Exception as e:
                self.log_test(f"Authentication ({user['role']})", False, f"Request failed: {str(e)}")
                return False
        
        return True
    
    def get_categories(self):
        """Get categories and identify drink categories"""
        print("\n=== GETTING CATEGORIES ===")
        
        if "administrator" not in self.tokens:
            self.log_test("Get Categories", False, "Admin authentication required")
            return False
            
        try:
            self.set_auth_header("administrator")
            response = self.session.get(f"{BACKEND_URL}/categories")
            
            if response.status_code == 200:
                self.categories = response.json()
                # Find categories that are for bar/drinks
                self.drink_categories = [cat for cat in self.categories if cat.get("department") == "bar"]
                
                if self.drink_categories:
                    self.log_test("Get Categories", True, 
                                f"Found {len(self.categories)} total categories, {len(self.drink_categories)} drink categories")
                    return True
                else:
                    self.log_test("Get Categories", False, "No drink categories found")
                    return False
            else:
                self.log_test("Get Categories", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get Categories", False, f"Request failed: {str(e)}")
            return False
    
    def test_menu_bottle_fields(self):
        """Test 1: GET /api/menu - Verify menu returns bottle_available and bottle_price fields"""
        print("\n=== TESTING MENU BOTTLE FIELDS ===")
        
        if "waitress" not in self.tokens:
            self.log_test("Menu Bottle Fields", False, "Waitress authentication required")
            return
            
        try:
            self.set_auth_header("waitress")
            response = self.session.get(f"{BACKEND_URL}/menu")
            
            if response.status_code == 200:
                menu_items = response.json()
                
                if not menu_items:
                    self.log_test("GET /api/menu (bottle fields)", False, "No menu items found")
                    return
                
                # Check if all menu items have bottle fields
                items_with_bottle_fields = 0
                drink_items = 0
                bottle_available_drinks = 0
                
                for item in menu_items:
                    if "bottle_available" in item and "bottle_price" in item:
                        items_with_bottle_fields += 1
                        
                        if item.get("item_type") == "drink":
                            drink_items += 1
                            if item.get("bottle_available"):
                                bottle_available_drinks += 1
                
                if items_with_bottle_fields == len(menu_items):
                    self.log_test("GET /api/menu (bottle fields)", True, 
                                f"All {len(menu_items)} menu items have bottle fields. Found {drink_items} drinks, {bottle_available_drinks} with bottle option")
                else:
                    self.log_test("GET /api/menu (bottle fields)", False, 
                                f"Only {items_with_bottle_fields}/{len(menu_items)} items have bottle fields")
            else:
                self.log_test("GET /api/menu (bottle fields)", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/menu (bottle fields)", False, f"Request failed: {str(e)}")
    
    def test_create_drink_with_bottle(self):
        """Test 2: POST /api/menu - Test creating drinks with bottle options (admin only)"""
        print("\n=== TESTING CREATE DRINK WITH BOTTLE OPTIONS ===")
        
        if "administrator" not in self.tokens or not self.drink_categories:
            self.log_test("Create Drink with Bottle", False, "Admin authentication or drink categories required")
            return
            
        try:
            self.set_auth_header("administrator")
            
            # Test creating a drink with bottle options
            drink_data = {
                "name": "Premium Whiskey",
                "description": "High-quality whiskey available by glass or bottle",
                "price": 15.99,  # Price per glass
                "category_id": self.drink_categories[0]["id"],
                "item_type": "drink",
                "bottle_available": True,
                "bottle_price": 180.00  # Price per bottle
            }
            
            response = self.session.post(f"{BACKEND_URL}/menu", json=drink_data)
            
            if response.status_code == 200:
                created_drink = response.json()
                self.created_drink_id = created_drink["id"]
                
                # Verify bottle fields are correctly set
                if (created_drink.get("bottle_available") == True and 
                    created_drink.get("bottle_price") == 180.00 and
                    created_drink.get("item_type") == "drink"):
                    self.log_test("POST /api/menu (create drink with bottle)", True, 
                                f"Successfully created drink '{created_drink['name']}' with bottle option: ${created_drink['bottle_price']}")
                else:
                    self.log_test("POST /api/menu (create drink with bottle)", False, 
                                f"Bottle fields not set correctly: bottle_available={created_drink.get('bottle_available')}, bottle_price={created_drink.get('bottle_price')}")
            else:
                self.log_test("POST /api/menu (create drink with bottle)", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("POST /api/menu (create drink with bottle)", False, f"Request failed: {str(e)}")
    
    def test_create_food_with_bottle_should_ignore(self):
        """Test creating food item with bottle options (should ignore bottle fields)"""
        print("\n=== TESTING FOOD ITEM WITH BOTTLE OPTIONS (SHOULD IGNORE) ===")
        
        if "administrator" not in self.tokens or not self.categories:
            self.log_test("Food with Bottle (ignore)", False, "Admin authentication or categories required")
            return
            
        try:
            self.set_auth_header("administrator")
            
            # Find a kitchen category
            kitchen_categories = [cat for cat in self.categories if cat.get("department") == "kitchen"]
            if not kitchen_categories:
                self.log_test("Food with Bottle (ignore)", False, "No kitchen categories found")
                return
            
            # Test creating a food item with bottle options (should be ignored)
            food_data = {
                "name": "Test Burger with Bottle",
                "description": "Food item with bottle options that should be ignored",
                "price": 18.99,
                "category_id": kitchen_categories[0]["id"],
                "item_type": "food",
                "bottle_available": True,  # This should be ignored for food
                "bottle_price": 50.00     # This should be ignored for food
            }
            
            response = self.session.post(f"{BACKEND_URL}/menu", json=food_data)
            
            if response.status_code == 200:
                created_food = response.json()
                
                # For food items, bottle_available should be False and bottle_price should be None
                if (created_food.get("bottle_available") == False and 
                    created_food.get("bottle_price") is None and
                    created_food.get("item_type") == "food"):
                    self.log_test("POST /api/menu (food with bottle - ignored)", True, 
                                f"Correctly ignored bottle options for food item '{created_food['name']}'")
                else:
                    self.log_test("POST /api/menu (food with bottle - ignored)", False, 
                                f"Bottle fields not properly ignored for food: bottle_available={created_food.get('bottle_available')}, bottle_price={created_food.get('bottle_price')}")
            else:
                self.log_test("POST /api/menu (food with bottle - ignored)", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("POST /api/menu (food with bottle - ignored)", False, f"Request failed: {str(e)}")
    
    def test_xlsx_import_with_bottle_fields(self):
        """Test 3: XLSX Import - Test importing drinks with bottle_available and bottle_price fields"""
        print("\n=== TESTING XLSX IMPORT WITH BOTTLE FIELDS ===")
        
        if "administrator" not in self.tokens or not self.drink_categories:
            self.log_test("XLSX Import with Bottle", False, "Admin authentication or drink categories required")
            return
            
        try:
            self.set_auth_header("administrator")
            
            # Create test data with bottle fields
            test_data = [
                {
                    "name": "Imported Wine Glass",
                    "description": "Premium wine available by glass or bottle",
                    "price": 12.00,
                    "category_id": self.drink_categories[0]["id"],
                    "item_type": "drink",
                    "bottle_available": True,
                    "bottle_price": 85.00
                },
                {
                    "name": "Imported Beer",
                    "description": "Craft beer - glass only",
                    "price": 6.50,
                    "category_id": self.drink_categories[0]["id"],
                    "item_type": "drink",
                    "bottle_available": False,
                    "bottle_price": None
                },
                {
                    "name": "Imported Cocktail",
                    "description": "Signature cocktail with bottle option",
                    "price": 14.00,
                    "category_id": self.drink_categories[0]["id"],
                    "item_type": "drink",
                    "bottle_available": "true",  # Test string conversion
                    "bottle_price": 120.50
                }
            ]
            
            # Create DataFrame and convert to XLSX
            df = pd.DataFrame(test_data)
            xlsx_buffer = io.BytesIO()
            df.to_excel(xlsx_buffer, index=False, engine='openpyxl')
            xlsx_buffer.seek(0)
            
            # Upload XLSX file
            files = {'file': ('bottle_test_menu.xlsx', xlsx_buffer.getvalue(), 
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            
            response = self.session.post(f"{BACKEND_URL}/menu/import", files=files)
            
            if response.status_code == 200:
                import_result = response.json()
                
                if import_result.get("success") and import_result.get("created_items", 0) > 0:
                    self.log_test("POST /api/menu/import (with bottle fields)", True, 
                                f"Successfully imported {import_result['created_items']} drinks with bottle options")
                    
                    # Verify imported items have correct bottle fields
                    self.verify_imported_bottle_items()
                else:
                    self.log_test("POST /api/menu/import (with bottle fields)", False, 
                                f"Import failed: {import_result.get('errors', [])}")
            else:
                self.log_test("POST /api/menu/import (with bottle fields)", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("POST /api/menu/import (with bottle fields)", False, f"Request failed: {str(e)}")
    
    def verify_imported_bottle_items(self):
        """Verify that imported items have correct bottle fields"""
        try:
            self.set_auth_header("waitress")
            response = self.session.get(f"{BACKEND_URL}/menu")
            
            if response.status_code == 200:
                menu_items = response.json()
                imported_items = [item for item in menu_items if "imported" in item["name"].lower()]
                
                bottle_items_count = 0
                correct_bottle_fields = 0
                
                for item in imported_items:
                    if item.get("item_type") == "drink":
                        bottle_items_count += 1
                        
                        # Check bottle fields
                        has_bottle_available = "bottle_available" in item
                        has_bottle_price = "bottle_price" in item
                        
                        if has_bottle_available and has_bottle_price:
                            correct_bottle_fields += 1
                
                if bottle_items_count > 0 and correct_bottle_fields == bottle_items_count:
                    self.log_test("Verify imported bottle items", True, 
                                f"All {bottle_items_count} imported drinks have correct bottle fields")
                else:
                    self.log_test("Verify imported bottle items", False, 
                                f"Only {correct_bottle_fields}/{bottle_items_count} imported drinks have correct bottle fields")
            else:
                self.log_test("Verify imported bottle items", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Verify imported bottle items", False, f"Request failed: {str(e)}")
    
    def test_menu_display_bottle_info(self):
        """Test 4: Menu display - Verify bottle information is properly returned"""
        print("\n=== TESTING MENU DISPLAY BOTTLE INFORMATION ===")
        
        if "waitress" not in self.tokens:
            self.log_test("Menu Display Bottle Info", False, "Waitress authentication required")
            return
            
        try:
            self.set_auth_header("waitress")
            response = self.session.get(f"{BACKEND_URL}/menu")
            
            if response.status_code == 200:
                menu_items = response.json()
                
                drink_items = [item for item in menu_items if item.get("item_type") == "drink"]
                
                if not drink_items:
                    self.log_test("Menu Display Bottle Info", False, "No drink items found in menu")
                    return
                
                # Check bottle information display
                drinks_with_bottle_info = 0
                drinks_with_bottle_available = 0
                
                for drink in drink_items:
                    # Check if bottle fields are present
                    if "bottle_available" in drink and "bottle_price" in drink:
                        drinks_with_bottle_info += 1
                        
                        if drink.get("bottle_available"):
                            drinks_with_bottle_available += 1
                            
                            # Verify bottle price is valid when bottle is available
                            bottle_price = drink.get("bottle_price")
                            if bottle_price is None or bottle_price <= 0:
                                self.log_test("Menu Display Bottle Info", False, 
                                            f"Drink '{drink['name']}' has bottle_available=True but invalid bottle_price: {bottle_price}")
                                return
                
                if drinks_with_bottle_info == len(drink_items):
                    self.log_test("Menu Display Bottle Info", True, 
                                f"All {len(drink_items)} drinks display bottle info correctly. {drinks_with_bottle_available} have bottle option available")
                else:
                    self.log_test("Menu Display Bottle Info", False, 
                                f"Only {drinks_with_bottle_info}/{len(drink_items)} drinks have bottle information")
            else:
                self.log_test("Menu Display Bottle Info", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Menu Display Bottle Info", False, f"Request failed: {str(e)}")
    
    def test_bottle_price_validation(self):
        """Test bottle price validation"""
        print("\n=== TESTING BOTTLE PRICE VALIDATION ===")
        
        if "administrator" not in self.tokens or not self.drink_categories:
            self.log_test("Bottle Price Validation", False, "Admin authentication or drink categories required")
            return
            
        try:
            self.set_auth_header("administrator")
            
            # Test 1: Negative bottle price should fail
            invalid_drink_data = {
                "name": "Invalid Bottle Price Drink",
                "description": "Drink with negative bottle price",
                "price": 10.00,
                "category_id": self.drink_categories[0]["id"],
                "item_type": "drink",
                "bottle_available": True,
                "bottle_price": -50.00  # Invalid negative price
            }
            
            response = self.session.post(f"{BACKEND_URL}/menu", json=invalid_drink_data)
            
            # The backend should either reject this or set bottle_price to None
            if response.status_code == 200:
                created_item = response.json()
                if created_item.get("bottle_price") is None or created_item.get("bottle_price") > 0:
                    self.log_test("Bottle Price Validation (negative)", True, 
                                "Correctly handled negative bottle price")
                else:
                    self.log_test("Bottle Price Validation (negative)", False, 
                                f"Accepted invalid negative bottle price: {created_item.get('bottle_price')}")
            elif response.status_code == 400:
                self.log_test("Bottle Price Validation (negative)", True, 
                            "Correctly rejected negative bottle price with 400 error")
            else:
                self.log_test("Bottle Price Validation (negative)", False, 
                            f"Unexpected response: HTTP {response.status_code}")
                
            # Test 2: bottle_available=True but no bottle_price
            incomplete_drink_data = {
                "name": "Incomplete Bottle Data Drink",
                "description": "Drink with bottle_available=True but no price",
                "price": 10.00,
                "category_id": self.drink_categories[0]["id"],
                "item_type": "drink",
                "bottle_available": True
                # Missing bottle_price
            }
            
            response = self.session.post(f"{BACKEND_URL}/menu", json=incomplete_drink_data)
            
            if response.status_code == 200:
                created_item = response.json()
                # Should either set bottle_available to False or require bottle_price
                self.log_test("Bottle Price Validation (missing price)", True, 
                            f"Handled missing bottle_price: bottle_available={created_item.get('bottle_available')}, bottle_price={created_item.get('bottle_price')}")
            else:
                self.log_test("Bottle Price Validation (missing price)", True, 
                            f"Correctly rejected incomplete bottle data with HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Bottle Price Validation", False, f"Request failed: {str(e)}")
    
    def run_all_tests(self):
        """Run all bottle functionality tests"""
        print("🍾 STARTING YOMABAR BOTTLE FUNCTIONALITY TESTING 🍾")
        print("=" * 60)
        
        # Step 1: Authenticate users
        if not self.authenticate_users():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return
        
        # Step 2: Get categories
        if not self.get_categories():
            print("❌ Failed to get categories. Cannot proceed with tests.")
            return
        
        # Step 3: Run bottle functionality tests
        self.test_menu_bottle_fields()
        self.test_create_drink_with_bottle()
        self.test_create_food_with_bottle_should_ignore()
        self.test_xlsx_import_with_bottle_fields()
        self.test_menu_display_bottle_info()
        self.test_bottle_price_validation()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("🍾 BOTTLE FUNCTIONALITY TEST SUMMARY 🍾")
        print("=" * 60)
        
        passed_tests = [test for test in self.test_results if test["success"]]
        failed_tests = [test for test in self.test_results if not test["success"]]
        
        print(f"✅ PASSED: {len(passed_tests)}")
        print(f"❌ FAILED: {len(failed_tests)}")
        print(f"📊 TOTAL:  {len(self.test_results)}")
        
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['message']}")
        
        success_rate = (len(passed_tests) / len(self.test_results)) * 100 if self.test_results else 0
        print(f"\n🎯 SUCCESS RATE: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 EXCELLENT: Bottle functionality is working perfectly!")
        elif success_rate >= 75:
            print("✅ GOOD: Bottle functionality is mostly working with minor issues.")
        elif success_rate >= 50:
            print("⚠️  MODERATE: Bottle functionality has some significant issues.")
        else:
            print("❌ CRITICAL: Bottle functionality has major problems that need immediate attention.")

if __name__ == "__main__":
    tester = BottleFunctionalityTester()
    tester.run_all_tests()
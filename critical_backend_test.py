#!/usr/bin/env python3
"""
Critical Backend Testing for Order System
Focus on the 5 critical priorities from the review request
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://7ac04967-575d-4814-81b1-48f03205e31d.preview.emergentagent.com/api"

class CriticalOrderSystemTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.tokens = {}
        self.menu_items = []
        self.created_order_id = None
        
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
        
    def set_auth_header(self, role):
        """Set authorization header for requests"""
        if role in self.tokens:
            self.session.headers.update({"Authorization": f"Bearer {self.tokens[role]}"})
        else:
            self.session.headers.pop("Authorization", None)
            
    def test_critical_authentication(self):
        """CRITICAL PRIORITY 1: Authentication Testing"""
        print("\n=== CRITICAL PRIORITY 1: AUTHENTICATION TESTING ===")
        
        test_users = [
            {"username": "admin1", "password": "password123", "role": "administrator"},
            {"username": "waitress1", "password": "password123", "role": "waitress"},
            {"username": "kitchen1", "password": "password123", "role": "kitchen"},
            {"username": "bartender1", "password": "password123", "role": "bartender"}
        ]
        
        for user in test_users:
            try:
                login_data = {"username": user["username"], "password": user["password"]}
                response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
                
                if response.status_code == 200:
                    token_data = response.json()
                    self.tokens[user["role"]] = token_data["access_token"]
                    self.log_test(f"Login {user['username']}", True, 
                                f"Successfully authenticated as {user['role']}: {token_data['full_name']}")
                else:
                    self.log_test(f"Login {user['username']}", False, 
                                f"Authentication failed: HTTP {response.status_code}")
            except Exception as e:
                self.log_test(f"Login {user['username']}", False, f"Request failed: {str(e)}")
                
    def test_critical_menu_system(self):
        """CRITICAL PRIORITY 5: Menu System"""
        print("\n=== CRITICAL PRIORITY 5: MENU SYSTEM ===")
        
        # Test GET /api/menu
        if "waitress" in self.tokens:
            try:
                self.set_auth_header("waitress")
                response = self.session.get(f"{BACKEND_URL}/menu")
                
                if response.status_code == 200:
                    menu_items = response.json()
                    self.menu_items = menu_items
                    food_items = [item for item in menu_items if item["item_type"] == "food"]
                    drink_items = [item for item in menu_items if item["item_type"] == "drink"]
                    self.log_test("GET /api/menu", True, 
                                f"Retrieved {len(menu_items)} menu items ({len(food_items)} food, {len(drink_items)} drinks)")
                else:
                    self.log_test("GET /api/menu", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/menu", False, f"Request failed: {str(e)}")
        
        # Test GET /api/categories
        if "waitress" in self.tokens:
            try:
                self.set_auth_header("waitress")
                response = self.session.get(f"{BACKEND_URL}/categories")
                
                if response.status_code == 200:
                    categories = response.json()
                    kitchen_cats = [cat for cat in categories if cat.get("department") == "kitchen"]
                    bar_cats = [cat for cat in categories if cat.get("department") == "bar"]
                    self.log_test("GET /api/categories", True, 
                                f"Retrieved {len(categories)} categories ({len(kitchen_cats)} kitchen, {len(bar_cats)} bar)")
                else:
                    self.log_test("GET /api/categories", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/categories", False, f"Request failed: {str(e)}")
                
    def test_critical_order_creation(self):
        """CRITICAL PRIORITY 2: Order Creation with SimpleOrderCreate format"""
        print("\n=== CRITICAL PRIORITY 2: ORDER CREATION ===")
        
        if not self.menu_items:
            self.log_test("Order Creation Setup", False, "No menu items available for testing")
            return
            
        if "waitress" in self.tokens:
            try:
                self.set_auth_header("waitress")
                
                # Get food and drink items for testing
                food_items = [item for item in self.menu_items if item["item_type"] == "food"][:2]
                drink_items = [item for item in self.menu_items if item["item_type"] == "drink"][:2]
                
                if food_items and drink_items:
                    # Create order using SimpleOrderCreate format (the actual backend format)
                    order_items = [
                        {
                            "menu_item_id": food_items[0]["id"],
                            "quantity": 1,
                            "price": food_items[0]["price"]
                        },
                        {
                            "menu_item_id": drink_items[0]["id"],
                            "quantity": 2,
                            "price": drink_items[0]["price"]
                        }
                    ]
                    
                    total_amount = food_items[0]["price"] + (drink_items[0]["price"] * 2)
                    
                    # Use the correct SimpleOrderCreate format
                    order_data = {
                        "customer_name": "Client 1",  # This is what frontend should send
                        "table_number": 12,
                        "items": order_items,
                        "total": total_amount,
                        "status": "pending",
                        "notes": "Test order for critical testing"
                    }
                    
                    response = self.session.post(f"{BACKEND_URL}/orders", json=order_data)
                    
                    if response.status_code == 200:
                        created_order = response.json()
                        self.created_order_id = created_order.get("order_id")
                        self.log_test("POST /api/orders (SimpleOrderCreate)", True, 
                                    f"Successfully created order with total ${total_amount:.2f}")
                    else:
                        self.log_test("POST /api/orders (SimpleOrderCreate)", False, 
                                    f"HTTP {response.status_code}: {response.text}")
                else:
                    self.log_test("POST /api/orders (SimpleOrderCreate)", False, 
                                "Insufficient menu items for order creation test")
            except Exception as e:
                self.log_test("POST /api/orders (SimpleOrderCreate)", False, f"Request failed: {str(e)}")
                
    def test_critical_order_retrieval(self):
        """CRITICAL PRIORITY 3: Order Retrieval - Test GET /api/orders for all roles"""
        print("\n=== CRITICAL PRIORITY 3: ORDER RETRIEVAL ===")
        
        for role in ["administrator", "waitress", "kitchen", "bartender"]:
            if role in self.tokens:
                try:
                    self.set_auth_header(role)
                    response = self.session.get(f"{BACKEND_URL}/orders")
                    
                    if response.status_code == 200:
                        orders = response.json()
                        self.log_test(f"GET /api/orders ({role})", True, 
                                    f"Successfully retrieved {len(orders)} orders without 500 errors")
                    else:
                        self.log_test(f"GET /api/orders ({role})", False, 
                                    f"HTTP {response.status_code}: {response.text}")
                except Exception as e:
                    self.log_test(f"GET /api/orders ({role})", False, f"Request failed: {str(e)}")
                    
    def test_critical_department_filtering(self):
        """CRITICAL PRIORITY 4: Department Filtering"""
        print("\n=== CRITICAL PRIORITY 4: DEPARTMENT FILTERING ===")
        
        # Test GET /api/orders/kitchen
        if "kitchen" in self.tokens:
            try:
                self.set_auth_header("kitchen")
                response = self.session.get(f"{BACKEND_URL}/orders/kitchen")
                
                if response.status_code == 200:
                    kitchen_orders = response.json()
                    # Verify all items are food items
                    all_food_items = True
                    total_items = 0
                    for order in kitchen_orders:
                        for item in order.get("items", []):
                            total_items += 1
                            if item.get("item_type") != "food":
                                all_food_items = False
                                break
                    
                    if all_food_items:
                        self.log_test("GET /api/orders/kitchen", True, 
                                    f"Kitchen orders working correctly: {len(kitchen_orders)} orders with {total_items} food items")
                    else:
                        self.log_test("GET /api/orders/kitchen", False, "Kitchen orders contain non-food items")
                else:
                    self.log_test("GET /api/orders/kitchen", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/orders/kitchen", False, f"Request failed: {str(e)}")
        
        # Test GET /api/orders/bar
        if "bartender" in self.tokens:
            try:
                self.set_auth_header("bartender")
                response = self.session.get(f"{BACKEND_URL}/orders/bar")
                
                if response.status_code == 200:
                    bar_orders = response.json()
                    # Verify all items are drink items
                    all_drink_items = True
                    total_items = 0
                    for order in bar_orders:
                        for item in order.get("items", []):
                            total_items += 1
                            if item.get("item_type") != "drink":
                                all_drink_items = False
                                break
                    
                    if all_drink_items:
                        self.log_test("GET /api/orders/bar", True, 
                                    f"Bar orders working correctly: {len(bar_orders)} orders with {total_items} drink items")
                    else:
                        self.log_test("GET /api/orders/bar", False, "Bar orders contain non-drink items")
                else:
                    self.log_test("GET /api/orders/bar", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/orders/bar", False, f"Request failed: {str(e)}")
                
    def run_critical_tests(self):
        """Run all critical tests in priority order"""
        print("🎯 CRITICAL BACKEND TESTING FOR ORDER SYSTEM")
        print("=" * 60)
        print("Testing the 5 critical priorities from review request:")
        print("1. Authentication Testing")
        print("2. Order Creation") 
        print("3. Order Retrieval")
        print("4. Department Filtering")
        print("5. Menu System")
        print("=" * 60)
        
        self.test_critical_authentication()
        self.test_critical_menu_system()
        self.test_critical_order_creation()
        self.test_critical_order_retrieval()
        self.test_critical_department_filtering()
        
        # Summary
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print("\n" + "=" * 60)
        print("🎯 CRITICAL TESTING SUMMARY")
        print("=" * 60)
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📊 TOTAL: {len(self.test_results)}")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        return failed == 0

if __name__ == "__main__":
    tester = CriticalOrderSystemTester()
    success = tester.run_critical_tests()
    sys.exit(0 if success else 1)
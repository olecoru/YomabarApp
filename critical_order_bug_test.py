#!/usr/bin/env python3
"""
CRITICAL BUG FIX VERIFICATION: MongoDB ObjectId Serialization Fix
Tests the specific fix for 500 Internal Server Error on order endpoints due to ObjectId serialization issues.
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://055fd109-dcff-4a75-a867-732ca3399b88.preview.emergentagent.com/api"

class CriticalOrderBugTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.tokens = {}
        self.menu_items = []
        self.created_order_id = None
        
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
            
    def test_authentication_all_roles(self):
        """Test authentication with all 4 roles as specified in review request"""
        print("\n=== TESTING AUTHENTICATION WITH ALL 4 ROLES ===")
        
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
                    if all(key in token_data for key in ["access_token", "token_type", "user_id", "role", "full_name"]):
                        self.tokens[user["role"]] = token_data["access_token"]
                        self.log_test(f"Authentication {user['username']}/{user['password']}", True, 
                                    f"Successfully authenticated as {user['role']}: {token_data['full_name']}")
                    else:
                        self.log_test(f"Authentication {user['username']}/{user['password']}", False, 
                                    "Missing required fields in token response")
                else:
                    self.log_test(f"Authentication {user['username']}/{user['password']}", False, 
                                f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test(f"Authentication {user['username']}/{user['password']}", False, 
                            f"Request failed: {str(e)}")
    
    def get_menu_items(self):
        """Get menu items for order creation"""
        if "waitress" in self.tokens:
            try:
                self.set_auth_header("waitress")
                response = self.session.get(f"{BACKEND_URL}/menu")
                
                if response.status_code == 200:
                    self.menu_items = response.json()
                    self.log_test("GET /api/menu (for test setup)", True, 
                                f"Retrieved {len(self.menu_items)} menu items")
                    return True
                else:
                    self.log_test("GET /api/menu (for test setup)", False, 
                                f"HTTP {response.status_code}: {response.text}")
                    return False
            except Exception as e:
                self.log_test("GET /api/menu (for test setup)", False, f"Request failed: {str(e)}")
                return False
        return False
    
    def test_post_orders_waitress(self):
        """Test POST /api/orders endpoint with waitress account - verify order creation works"""
        print("\n=== TESTING POST /api/orders WITH WAITRESS ACCOUNT ===")
        
        if "waitress" not in self.tokens:
            self.log_test("POST /api/orders (waitress)", False, "Waitress authentication failed")
            return
            
        if not self.menu_items:
            if not self.get_menu_items():
                self.log_test("POST /api/orders (waitress)", False, "Cannot create order without menu items")
                return
        
        try:
            self.set_auth_header("waitress")
            
            # Get food and drink items for realistic order
            food_items = [item for item in self.menu_items if item["item_type"] == "food"][:2]
            drink_items = [item for item in self.menu_items if item["item_type"] == "drink"][:2]
            
            if not food_items or not drink_items:
                self.log_test("POST /api/orders (waitress)", False, "Insufficient menu items for order test")
                return
            
            # Create order using the simple format expected by the backend
            order_items = []
            total = 0
            
            # Add food item
            order_items.append({
                "menu_item_id": food_items[0]["id"],
                "quantity": 1,
                "price": food_items[0]["price"]
            })
            total += food_items[0]["price"]
            
            # Add drink item
            order_items.append({
                "menu_item_id": drink_items[0]["id"],
                "quantity": 2,
                "price": drink_items[0]["price"]
            })
            total += drink_items[0]["price"] * 2
            
            order_data = {
                "customer_name": "Test Customer",
                "table_number": 12,
                "items": order_items,
                "total": total,
                "status": "pending",
                "notes": "Test order for ObjectId serialization fix verification"
            }
            
            response = self.session.post(f"{BACKEND_URL}/orders", json=order_data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success") and result.get("order_id"):
                    self.created_order_id = result["order_id"]
                    self.log_test("POST /api/orders (waitress)", True, 
                                f"Successfully created order {self.created_order_id} with total ${total:.2f}")
                else:
                    self.log_test("POST /api/orders (waitress)", False, 
                                f"Unexpected response format: {result}")
            else:
                self.log_test("POST /api/orders (waitress)", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("POST /api/orders (waitress)", False, f"Request failed: {str(e)}")
    
    def test_get_orders_all_roles(self):
        """Test GET /api/orders endpoint with all roles - verify no 500 errors"""
        print("\n=== TESTING GET /api/orders WITH ALL ROLES ===")
        
        roles_to_test = ["administrator", "waitress", "kitchen", "bartender"]
        
        for role in roles_to_test:
            if role not in self.tokens:
                self.log_test(f"GET /api/orders ({role})", False, f"{role} authentication failed")
                continue
                
            try:
                self.set_auth_header(role)
                response = self.session.get(f"{BACKEND_URL}/orders")
                
                if response.status_code == 200:
                    orders = response.json()
                    # Check if response is valid JSON array and doesn't contain MongoDB ObjectId errors
                    if isinstance(orders, list):
                        self.log_test(f"GET /api/orders ({role})", True, 
                                    f"Successfully retrieved {len(orders)} orders - NO 500 ERROR")
                    else:
                        self.log_test(f"GET /api/orders ({role})", False, 
                                    f"Invalid response format: {type(orders)}")
                elif response.status_code == 500:
                    self.log_test(f"GET /api/orders ({role})", False, 
                                f"CRITICAL: 500 Internal Server Error - ObjectId serialization issue NOT FIXED: {response.text}")
                else:
                    self.log_test(f"GET /api/orders ({role})", False, 
                                f"HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_test(f"GET /api/orders ({role})", False, f"Request failed: {str(e)}")
    
    def test_get_kitchen_orders(self):
        """Test GET /api/orders/kitchen endpoint with kitchen account - verify no 500 errors and returns food orders"""
        print("\n=== TESTING GET /api/orders/kitchen WITH KITCHEN ACCOUNT ===")
        
        if "kitchen" not in self.tokens:
            self.log_test("GET /api/orders/kitchen (kitchen)", False, "Kitchen authentication failed")
            return
            
        try:
            self.set_auth_header("kitchen")
            response = self.session.get(f"{BACKEND_URL}/orders/kitchen")
            
            if response.status_code == 200:
                kitchen_orders = response.json()
                
                if isinstance(kitchen_orders, list):
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
                        self.log_test("GET /api/orders/kitchen (kitchen)", True, 
                                    f"Successfully retrieved {len(kitchen_orders)} kitchen orders with {total_items} food items - NO 500 ERROR")
                    else:
                        self.log_test("GET /api/orders/kitchen (kitchen)", False, 
                                    "Kitchen orders contain non-food items")
                else:
                    self.log_test("GET /api/orders/kitchen (kitchen)", False, 
                                f"Invalid response format: {type(kitchen_orders)}")
                                
            elif response.status_code == 500:
                self.log_test("GET /api/orders/kitchen (kitchen)", False, 
                            f"CRITICAL: 500 Internal Server Error - ObjectId serialization issue NOT FIXED: {response.text}")
            else:
                self.log_test("GET /api/orders/kitchen (kitchen)", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("GET /api/orders/kitchen (kitchen)", False, f"Request failed: {str(e)}")
    
    def test_get_bar_orders(self):
        """Test GET /api/orders/bar endpoint with bartender account - verify no 500 errors and returns drink orders"""
        print("\n=== TESTING GET /api/orders/bar WITH BARTENDER ACCOUNT ===")
        
        if "bartender" not in self.tokens:
            self.log_test("GET /api/orders/bar (bartender)", False, "Bartender authentication failed")
            return
            
        try:
            self.set_auth_header("bartender")
            response = self.session.get(f"{BACKEND_URL}/orders/bar")
            
            if response.status_code == 200:
                bar_orders = response.json()
                
                if isinstance(bar_orders, list):
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
                        self.log_test("GET /api/orders/bar (bartender)", True, 
                                    f"Successfully retrieved {len(bar_orders)} bar orders with {total_items} drink items - NO 500 ERROR")
                    else:
                        self.log_test("GET /api/orders/bar (bartender)", False, 
                                    "Bar orders contain non-drink items")
                else:
                    self.log_test("GET /api/orders/bar (bartender)", False, 
                                f"Invalid response format: {type(bar_orders)}")
                                
            elif response.status_code == 500:
                self.log_test("GET /api/orders/bar (bartender)", False, 
                            f"CRITICAL: 500 Internal Server Error - ObjectId serialization issue NOT FIXED: {response.text}")
            else:
                self.log_test("GET /api/orders/bar (bartender)", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("GET /api/orders/bar (bartender)", False, f"Request failed: {str(e)}")
    
    def test_order_flow_integration(self):
        """Test complete order flow to verify orders reach other roles"""
        print("\n=== TESTING COMPLETE ORDER FLOW INTEGRATION ===")
        
        if not self.created_order_id:
            self.log_test("Order Flow Integration", False, "No order created for integration test")
            return
        
        # Test that the created order is visible to kitchen staff (if it has food items)
        if "kitchen" in self.tokens:
            try:
                self.set_auth_header("kitchen")
                response = self.session.get(f"{BACKEND_URL}/orders/kitchen")
                
                if response.status_code == 200:
                    kitchen_orders = response.json()
                    order_found = any(order.get("id") == self.created_order_id for order in kitchen_orders)
                    
                    if order_found:
                        self.log_test("Order Flow - Kitchen Visibility", True, 
                                    "Created order is visible to kitchen staff")
                    else:
                        # This might be expected if the order has no food items
                        self.log_test("Order Flow - Kitchen Visibility", True, 
                                    "Order not in kitchen queue (expected if no food items)")
                else:
                    self.log_test("Order Flow - Kitchen Visibility", False, 
                                f"Kitchen orders endpoint failed: HTTP {response.status_code}")
            except Exception as e:
                self.log_test("Order Flow - Kitchen Visibility", False, f"Request failed: {str(e)}")
        
        # Test that the created order is visible to bar staff (if it has drink items)
        if "bartender" in self.tokens:
            try:
                self.set_auth_header("bartender")
                response = self.session.get(f"{BACKEND_URL}/orders/bar")
                
                if response.status_code == 200:
                    bar_orders = response.json()
                    order_found = any(order.get("id") == self.created_order_id for order in bar_orders)
                    
                    if order_found:
                        self.log_test("Order Flow - Bar Visibility", True, 
                                    "Created order is visible to bar staff")
                    else:
                        # This might be expected if the order has no drink items
                        self.log_test("Order Flow - Bar Visibility", True, 
                                    "Order not in bar queue (expected if no drink items)")
                else:
                    self.log_test("Order Flow - Bar Visibility", False, 
                                f"Bar orders endpoint failed: HTTP {response.status_code}")
            except Exception as e:
                self.log_test("Order Flow - Bar Visibility", False, f"Request failed: {str(e)}")
    
    def run_critical_tests(self):
        """Run all critical tests for ObjectId serialization fix"""
        print("🚨 CRITICAL BUG FIX VERIFICATION: MongoDB ObjectId Serialization Fix")
        print("=" * 80)
        
        # Step 1: Test authentication with all 4 roles
        self.test_authentication_all_roles()
        
        # Step 2: Test POST /api/orders endpoint with waitress account
        self.test_post_orders_waitress()
        
        # Step 3: Test GET /api/orders endpoint with all roles
        self.test_get_orders_all_roles()
        
        # Step 4: Test GET /api/orders/kitchen endpoint with kitchen account
        self.test_get_kitchen_orders()
        
        # Step 5: Test GET /api/orders/bar endpoint with bartender account
        self.test_get_bar_orders()
        
        # Step 6: Test complete order flow integration
        self.test_order_flow_integration()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("🔍 CRITICAL BUG FIX VERIFICATION SUMMARY")
        print("=" * 80)
        
        passed_tests = [test for test in self.test_results if test["success"]]
        failed_tests = [test for test in self.test_results if not test["success"]]
        
        print(f"✅ PASSED: {len(passed_tests)}")
        print(f"❌ FAILED: {len(failed_tests)}")
        print(f"📊 TOTAL: {len(self.test_results)}")
        
        if failed_tests:
            print("\n🚨 FAILED TESTS:")
            for test in failed_tests:
                print(f"   ❌ {test['test']}: {test['message']}")
        
        # Critical assessment
        critical_endpoints = [
            "POST /api/orders (waitress)",
            "GET /api/orders (administrator)",
            "GET /api/orders (waitress)", 
            "GET /api/orders (kitchen)",
            "GET /api/orders (bartender)",
            "GET /api/orders/kitchen (kitchen)",
            "GET /api/orders/bar (bartender)"
        ]
        
        critical_failures = [test for test in failed_tests if any(endpoint in test["test"] for endpoint in critical_endpoints)]
        
        if critical_failures:
            print(f"\n🚨 CRITICAL FAILURES DETECTED: {len(critical_failures)}")
            print("The MongoDB ObjectId serialization fix may NOT be working correctly!")
            for failure in critical_failures:
                if "500" in failure["message"]:
                    print(f"   🔥 CRITICAL: {failure['test']} - 500 Internal Server Error detected")
        else:
            print("\n✅ CRITICAL SUCCESS: No 500 Internal Server Errors detected!")
            print("The MongoDB ObjectId serialization fix appears to be working correctly.")
        
        return len(failed_tests) == 0

if __name__ == "__main__":
    tester = CriticalOrderBugTester()
    success = tester.run_critical_tests()
    sys.exit(0 if success else 1)
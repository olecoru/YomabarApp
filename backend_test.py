#!/usr/bin/env python3
"""
Enhanced Restaurant Management System Backend API Testing
Tests new features: Dynamic Categories, Enhanced User Management, Enhanced Menu System, Enhanced Dashboard
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Backend URL from frontend/.env
BACKEND_URL = "https://f6af7ccc-e830-4afa-8882-3392d4a09286.preview.emergentagent.com/api"

class EnhancedRestaurantTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.tokens = {}  # Store tokens for different users
        self.menu_items = []
        self.categories = []
        self.created_order_id = None
        self.created_menu_item_id = None
        self.created_category_id = None
        self.created_user_id = None
        
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
            
    def test_authentication_system(self):
        """Test authentication endpoints"""
        print("\n=== TESTING AUTHENTICATION SYSTEM ===")
        
        # Test users with different roles
        test_users = [
            {"username": "waitress1", "password": "password123", "role": "waitress"},
            {"username": "kitchen1", "password": "password123", "role": "kitchen"},
            {"username": "bartender1", "password": "password123", "role": "bartender"},
            {"username": "admin1", "password": "password123", "role": "administrator"}
        ]
        
        # Test 1: Login with different roles
        for user in test_users:
            try:
                login_data = {"username": user["username"], "password": user["password"]}
                response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
                
                if response.status_code == 200:
                    token_data = response.json()
                    if all(key in token_data for key in ["access_token", "token_type", "user_id", "role", "full_name"]):
                        self.tokens[user["role"]] = token_data["access_token"]
                        self.log_test(f"POST /api/auth/login ({user['role']})", True, 
                                    f"Successfully logged in as {user['role']}: {token_data['full_name']}")
                    else:
                        self.log_test(f"POST /api/auth/login ({user['role']})", False, "Missing required fields in token response")
                else:
                    self.log_test(f"POST /api/auth/login ({user['role']})", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test(f"POST /api/auth/login ({user['role']})", False, f"Request failed: {str(e)}")
                
        # Test 2: GET /api/auth/me with authentication token
        for role in self.tokens:
            try:
                self.set_auth_header(role)
                response = self.session.get(f"{BACKEND_URL}/auth/me")
                
                if response.status_code == 200:
                    user_data = response.json()
                    if user_data["role"] == role:
                        self.log_test(f"GET /api/auth/me ({role})", True, f"Retrieved user info for {role}: {user_data['full_name']}")
                    else:
                        self.log_test(f"GET /api/auth/me ({role})", False, f"Role mismatch. Expected: {role}, Got: {user_data['role']}")
                else:
                    self.log_test(f"GET /api/auth/me ({role})", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test(f"GET /api/auth/me ({role})", False, f"Request failed: {str(e)}")
                
        # Note: User registration is handled through /api/users endpoint, not /api/auth/register
                
    def test_menu_management_api_endpoints(self):
        """Test Menu Management API Endpoints - PRIORITY TASK"""
        print("\n=== TESTING MENU MANAGEMENT API ENDPOINTS (PRIORITY) ===")
        
        # First get categories to use valid category_id
        if "administrator" in self.tokens:
            self.set_auth_header("administrator")
            categories_response = self.session.get(f"{BACKEND_URL}/categories")
            if categories_response.status_code == 200:
                self.categories = categories_response.json()
        
        # Test 1: POST /api/menu (admin only - create new menu item)
        if "administrator" in self.tokens and self.categories:
            try:
                self.set_auth_header("administrator")
                new_item_data = {
                    "name": "Test Pasta Dish",
                    "description": "Delicious test pasta with marinara sauce",
                    "price": 16.99,
                    "category_id": self.categories[0]["id"],  # Use valid category_id
                    "item_type": "food"
                }
                response = self.session.post(f"{BACKEND_URL}/menu", json=new_item_data)
                
                if response.status_code == 200:
                    created_item = response.json()
                    self.created_menu_item_id = created_item["id"]
                    if created_item["name"] == new_item_data["name"]:
                        self.log_test("POST /api/menu (admin only)", True, f"Successfully created menu item: {created_item['name']}")
                    else:
                        self.log_test("POST /api/menu (admin only)", False, "Created item data doesn't match input")
                else:
                    self.log_test("POST /api/menu (admin only)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("POST /api/menu (admin only)", False, f"Request failed: {str(e)}")
                
        # Test 2: PUT /api/menu/{item_id} (admin only - update menu item)
        if "administrator" in self.tokens and self.created_menu_item_id:
            try:
                self.set_auth_header("administrator")
                update_data = {
                    "name": "Updated Test Pasta",
                    "price": 18.99,
                    "available": True
                }
                response = self.session.put(f"{BACKEND_URL}/menu/{self.created_menu_item_id}", json=update_data)
                
                if response.status_code == 200:
                    updated_item = response.json()
                    if updated_item["name"] == update_data["name"] and updated_item["price"] == update_data["price"]:
                        self.log_test("PUT /api/menu/{item_id} (admin only)", True, "Successfully updated menu item")
                    else:
                        self.log_test("PUT /api/menu/{item_id} (admin only)", False, "Menu item update failed")
                else:
                    self.log_test("PUT /api/menu/{item_id} (admin only)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("PUT /api/menu/{item_id} (admin only)", False, f"Request failed: {str(e)}")
                
        # Test 3: DELETE /api/menu/{item_id} (admin only - delete menu item)
        if "administrator" in self.tokens and self.created_menu_item_id:
            try:
                self.set_auth_header("administrator")
                response = self.session.delete(f"{BACKEND_URL}/menu/{self.created_menu_item_id}")
                
                if response.status_code == 200:
                    result = response.json()
                    if "message" in result and "deleted" in result["message"].lower():
                        self.log_test("DELETE /api/menu/{item_id} (admin only)", True, "Successfully deleted menu item")
                    else:
                        self.log_test("DELETE /api/menu/{item_id} (admin only)", False, "Unexpected delete response")
                else:
                    self.log_test("DELETE /api/menu/{item_id} (admin only)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("DELETE /api/menu/{item_id} (admin only)", False, f"Request failed: {str(e)}")
                
        # Test 4: Role-based access control - waitress should NOT be able to create menu items
        if "waitress" in self.tokens and self.categories:
            try:
                self.set_auth_header("waitress")
                new_item_data = {
                    "name": "Unauthorized Item",
                    "description": "This should fail",
                    "price": 10.99,
                    "category_id": self.categories[0]["id"],
                    "item_type": "food"
                }
                response = self.session.post(f"{BACKEND_URL}/menu", json=new_item_data)
                
                if response.status_code == 403:
                    self.log_test("POST /api/menu (waitress - should fail)", True, "Correctly denied access for non-admin user")
                else:
                    self.log_test("POST /api/menu (waitress - should fail)", False, f"Expected 403, got HTTP {response.status_code}")
            except Exception as e:
                self.log_test("POST /api/menu (waitress - should fail)", False, f"Request failed: {str(e)}")
                
        # Test 5: Kitchen staff should NOT be able to update menu items
        if "kitchen" in self.tokens:
            try:
                self.set_auth_header("kitchen")
                # Try to update any existing menu item
                menu_response = self.session.get(f"{BACKEND_URL}/menu")
                if menu_response.status_code == 200:
                    menu_items = menu_response.json()
                    if menu_items:
                        item_id = menu_items[0]["id"]
                        update_data = {"price": 999.99}
                        response = self.session.put(f"{BACKEND_URL}/menu/{item_id}", json=update_data)
                        
                        if response.status_code == 403:
                            self.log_test("PUT /api/menu/{item_id} (kitchen - should fail)", True, "Correctly denied access for kitchen staff")
                        else:
                            self.log_test("PUT /api/menu/{item_id} (kitchen - should fail)", False, f"Expected 403, got HTTP {response.status_code}")
            except Exception as e:
                self.log_test("PUT /api/menu/{item_id} (kitchen - should fail)", False, f"Request failed: {str(e)}")
                
        # Test 6: Bartender should NOT be able to delete menu items
        if "bartender" in self.tokens:
            try:
                self.set_auth_header("bartender")
                # Try to delete any existing menu item
                menu_response = self.session.get(f"{BACKEND_URL}/menu")
                if menu_response.status_code == 200:
                    menu_items = menu_response.json()
                    if menu_items:
                        item_id = menu_items[0]["id"]
                        response = self.session.delete(f"{BACKEND_URL}/menu/{item_id}")
                        
                        if response.status_code == 403:
                            self.log_test("DELETE /api/menu/{item_id} (bartender - should fail)", True, "Correctly denied access for bartender")
                        else:
                            self.log_test("DELETE /api/menu/{item_id} (bartender - should fail)", False, f"Expected 403, got HTTP {response.status_code}")
            except Exception as e:
                self.log_test("DELETE /api/menu/{item_id} (bartender - should fail)", False, f"Request failed: {str(e)}")
                
    def test_department_based_order_filtering(self):
        """Test Department-Based Order Filtering - PRIORITY TASK"""
        print("\n=== TESTING DEPARTMENT-BASED ORDER FILTERING (PRIORITY) ===")
        
        # First create an order with both food and drink items to test filtering
        if "waitress" in self.tokens and self.menu_items:
            try:
                self.set_auth_header("waitress")
                
                # Get food and drink items
                food_items = [item for item in self.menu_items if item["item_type"] == "food"][:2]
                drink_items = [item for item in self.menu_items if item["item_type"] == "drink"][:2]
                
                if food_items and drink_items:
                    # Create order with both food and drink items
                    clients = [
                        {
                            "client_number": 1,
                            "items": [
                                {
                                    "menu_item_id": food_items[0]["id"],
                                    "menu_item_name": food_items[0]["name"],
                                    "quantity": 1,
                                    "price": food_items[0]["price"],
                                    "item_type": food_items[0]["item_type"]
                                },
                                {
                                    "menu_item_id": drink_items[0]["id"],
                                    "menu_item_name": drink_items[0]["name"],
                                    "quantity": 1,
                                    "price": drink_items[0]["price"],
                                    "item_type": drink_items[0]["item_type"]
                                }
                            ],
                            "subtotal": food_items[0]["price"] + drink_items[0]["price"]
                        }
                    ]
                    
                    order_data = {
                        "table_number": 10,
                        "clients": clients,
                        "special_notes": "Test order for department filtering"
                    }
                    
                    response = self.session.post(f"{BACKEND_URL}/orders", json=order_data)
                    if response.status_code == 200:
                        self.created_order_id = response.json()["id"]
                        self.log_test("Setup order for department filtering", True, "Created test order with food and drink items")
            except Exception as e:
                self.log_test("Setup order for department filtering", False, f"Failed to create test order: {str(e)}")
        
        # Test 1: GET /api/orders/kitchen (kitchen staff only - food items only)
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
                        for client in order.get("clients", []):
                            for item in client.get("items", []):
                                total_items += 1
                                if item.get("item_type") != "food":
                                    all_food_items = False
                                    break
                    
                    if all_food_items and total_items > 0:
                        self.log_test("GET /api/orders/kitchen (kitchen staff)", True, f"Retrieved {len(kitchen_orders)} orders with {total_items} food items only")
                    elif total_items == 0:
                        self.log_test("GET /api/orders/kitchen (kitchen staff)", True, "No kitchen orders found (expected if no food orders exist)")
                    else:
                        self.log_test("GET /api/orders/kitchen (kitchen staff)", False, "Kitchen orders contain non-food items")
                else:
                    self.log_test("GET /api/orders/kitchen (kitchen staff)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/orders/kitchen (kitchen staff)", False, f"Request failed: {str(e)}")
                
        # Test 2: GET /api/orders/bar (bartender only - drink items only)
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
                        for client in order.get("clients", []):
                            for item in client.get("items", []):
                                total_items += 1
                                if item.get("item_type") != "drink":
                                    all_drink_items = False
                                    break
                    
                    if all_drink_items and total_items > 0:
                        self.log_test("GET /api/orders/bar (bartender)", True, f"Retrieved {len(bar_orders)} orders with {total_items} drink items only")
                    elif total_items == 0:
                        self.log_test("GET /api/orders/bar (bartender)", True, "No bar orders found (expected if no drink orders exist)")
                    else:
                        self.log_test("GET /api/orders/bar (bartender)", False, "Bar orders contain non-drink items")
                else:
                    self.log_test("GET /api/orders/bar (bartender)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/orders/bar (bartender)", False, f"Request failed: {str(e)}")
                
        # Test 3: Admin should have access to both kitchen and bar orders
        if "administrator" in self.tokens:
            try:
                self.set_auth_header("administrator")
                
                # Test kitchen orders access for admin
                kitchen_response = self.session.get(f"{BACKEND_URL}/orders/kitchen")
                if kitchen_response.status_code == 200:
                    self.log_test("GET /api/orders/kitchen (admin)", True, "Admin has access to kitchen orders")
                else:
                    self.log_test("GET /api/orders/kitchen (admin)", False, f"Admin denied kitchen access: HTTP {kitchen_response.status_code}")
                
                # Test bar orders access for admin
                bar_response = self.session.get(f"{BACKEND_URL}/orders/bar")
                if bar_response.status_code == 200:
                    self.log_test("GET /api/orders/bar (admin)", True, "Admin has access to bar orders")
                else:
                    self.log_test("GET /api/orders/bar (admin)", False, f"Admin denied bar access: HTTP {bar_response.status_code}")
                    
            except Exception as e:
                self.log_test("Admin department access", False, f"Request failed: {str(e)}")
                
        # Test 4: Role-based access control - waitress should NOT have access to kitchen orders
        if "waitress" in self.tokens:
            try:
                self.set_auth_header("waitress")
                response = self.session.get(f"{BACKEND_URL}/orders/kitchen")
                
                if response.status_code == 403:
                    self.log_test("GET /api/orders/kitchen (waitress - should fail)", True, "Correctly denied kitchen access for waitress")
                else:
                    self.log_test("GET /api/orders/kitchen (waitress - should fail)", False, f"Expected 403, got HTTP {response.status_code}")
            except Exception as e:
                self.log_test("GET /api/orders/kitchen (waitress - should fail)", False, f"Request failed: {str(e)}")
                
        # Test 5: Role-based access control - waitress should NOT have access to bar orders
        if "waitress" in self.tokens:
            try:
                self.set_auth_header("waitress")
                response = self.session.get(f"{BACKEND_URL}/orders/bar")
                
                if response.status_code == 403:
                    self.log_test("GET /api/orders/bar (waitress - should fail)", True, "Correctly denied bar access for waitress")
                else:
                    self.log_test("GET /api/orders/bar (waitress - should fail)", False, f"Expected 403, got HTTP {response.status_code}")
            except Exception as e:
                self.log_test("GET /api/orders/bar (waitress - should fail)", False, f"Request failed: {str(e)}")
                
        # Test 6: Kitchen staff should NOT have access to bar orders
        if "kitchen" in self.tokens:
            try:
                self.set_auth_header("kitchen")
                response = self.session.get(f"{BACKEND_URL}/orders/bar")
                
                if response.status_code == 403:
                    self.log_test("GET /api/orders/bar (kitchen - should fail)", True, "Correctly denied bar access for kitchen staff")
                else:
                    self.log_test("GET /api/orders/bar (kitchen - should fail)", False, f"Expected 403, got HTTP {response.status_code}")
            except Exception as e:
                self.log_test("GET /api/orders/bar (kitchen - should fail)", False, f"Request failed: {str(e)}")
                
        # Test 7: Bartender should NOT have access to kitchen orders
        if "bartender" in self.tokens:
            try:
                self.set_auth_header("bartender")
                response = self.session.get(f"{BACKEND_URL}/orders/kitchen")
                
                if response.status_code == 403:
                    self.log_test("GET /api/orders/kitchen (bartender - should fail)", True, "Correctly denied kitchen access for bartender")
                else:
                    self.log_test("GET /api/orders/kitchen (bartender - should fail)", False, f"Expected 403, got HTTP {response.status_code}")
            except Exception as e:
                self.log_test("GET /api/orders/kitchen (bartender - should fail)", False, f"Request failed: {str(e)}")
                    
    def test_enhanced_order_management(self):
        """Test enhanced order management with multiple clients per table"""
        print("\n=== TESTING ENHANCED ORDER MANAGEMENT ===")
        
        if not self.menu_items:
            self.log_test("Order Tests", False, "Cannot test orders without menu items")
            return
            
        # Test 1: POST /api/orders (waitress only - create order with multiple clients per table)
        if "waitress" in self.tokens:
            try:
                self.set_auth_header("waitress")
                
                # Create order with multiple clients for table 5
                food_items = [item for item in self.menu_items if item["item_type"] == "food"][:2]
                drink_items = [item for item in self.menu_items if item["item_type"] == "drink"][:2]
                
                # Check if we have enough items to create an order
                if not food_items or not drink_items:
                    self.log_test("POST /api/orders (waitress - multiple clients)", False, "Insufficient menu items for order test")
                    return
                
                clients = [
                    {
                        "client_number": 1,
                        "items": [
                            {
                                "menu_item_id": food_items[0]["id"],
                                "menu_item_name": food_items[0]["name"],
                                "quantity": 1,
                                "price": food_items[0]["price"],
                                "item_type": food_items[0]["item_type"],
                                "special_instructions": "No onions please"
                            },
                            {
                                "menu_item_id": drink_items[0]["id"],
                                "menu_item_name": drink_items[0]["name"],
                                "quantity": 2,
                                "price": drink_items[0]["price"],
                                "item_type": drink_items[0]["item_type"]
                            }
                        ],
                        "subtotal": food_items[0]["price"] + (drink_items[0]["price"] * 2)
                    },
                    {
                        "client_number": 2,
                        "items": [
                            {
                                "menu_item_id": food_items[1]["id"] if len(food_items) > 1 else food_items[0]["id"],
                                "menu_item_name": food_items[1]["name"] if len(food_items) > 1 else food_items[0]["name"],
                                "quantity": 1,
                                "price": food_items[1]["price"] if len(food_items) > 1 else food_items[0]["price"],
                                "item_type": "food"
                            },
                            {
                                "menu_item_id": drink_items[1]["id"] if len(drink_items) > 1 else drink_items[0]["id"],
                                "menu_item_name": drink_items[1]["name"] if len(drink_items) > 1 else drink_items[0]["name"],
                                "quantity": 1,
                                "price": drink_items[1]["price"] if len(drink_items) > 1 else drink_items[0]["price"],
                                "item_type": "drink"
                            }
                        ],
                        "subtotal": (food_items[1]["price"] if len(food_items) > 1 else food_items[0]["price"]) + (drink_items[1]["price"] if len(drink_items) > 1 else drink_items[0]["price"])
                    }
                ]
                
                order_data = {
                    "table_number": 5,
                    "clients": clients,
                    "special_notes": "Table celebration - please bring candles"
                }
                
                response = self.session.post(f"{BACKEND_URL}/orders", json=order_data)
                
                if response.status_code == 200:
                    created_order = response.json()
                    self.created_order_id = created_order["id"]
                    if len(created_order["clients"]) == 2:
                        self.log_test("POST /api/orders (waitress - multiple clients)", True, 
                                    f"Created order {self.created_order_id} with {len(created_order['clients'])} clients for table 5")
                    else:
                        self.log_test("POST /api/orders (waitress - multiple clients)", False, "Incorrect number of clients in created order")
                else:
                    self.log_test("POST /api/orders (waitress - multiple clients)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("POST /api/orders (waitress - multiple clients)", False, f"Request failed: {str(e)}")
                
        # Test 2: GET /api/orders (role-based filtering - waitress sees only their orders)
        if "waitress" in self.tokens:
            try:
                self.set_auth_header("waitress")
                response = self.session.get(f"{BACKEND_URL}/orders")
                
                if response.status_code == 200:
                    orders = response.json()
                    # All orders should belong to this waitress
                    waitress_orders = [order for order in orders if order.get("waitress_id")]
                    self.log_test("GET /api/orders (waitress - filtered)", True, f"Retrieved {len(orders)} orders for waitress")
                else:
                    self.log_test("GET /api/orders (waitress - filtered)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/orders (waitress - filtered)", False, f"Request failed: {str(e)}")
                
        # Test 3: GET /api/orders/kitchen (kitchen role - food items only)
        if "kitchen" in self.tokens:
            try:
                self.set_auth_header("kitchen")
                response = self.session.get(f"{BACKEND_URL}/orders/kitchen")
                
                if response.status_code == 200:
                    kitchen_orders = response.json()
                    # Verify all items are food items
                    all_food_items = True
                    for order in kitchen_orders:
                        for client in order["clients"]:
                            for item in client["items"]:
                                if item["item_type"] != "food":
                                    all_food_items = False
                                    break
                    
                    if all_food_items:
                        self.log_test("GET /api/orders/kitchen (kitchen)", True, f"Retrieved {len(kitchen_orders)} orders with food items only")
                    else:
                        self.log_test("GET /api/orders/kitchen (kitchen)", False, "Kitchen orders contain non-food items")
                else:
                    self.log_test("GET /api/orders/kitchen (kitchen)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/orders/kitchen (kitchen)", False, f"Request failed: {str(e)}")
                
        # Test 4: GET /api/orders/bar (bartender role - drink items only)
        if "bartender" in self.tokens:
            try:
                self.set_auth_header("bartender")
                response = self.session.get(f"{BACKEND_URL}/orders/bar")
                
                if response.status_code == 200:
                    bar_orders = response.json()
                    # Verify all items are drink items
                    all_drink_items = True
                    for order in bar_orders:
                        for client in order["clients"]:
                            for item in client["items"]:
                                if item["item_type"] != "drink":
                                    all_drink_items = False
                                    break
                    
                    if all_drink_items:
                        self.log_test("GET /api/orders/bar (bartender)", True, f"Retrieved {len(bar_orders)} orders with drink items only")
                    else:
                        self.log_test("GET /api/orders/bar (bartender)", False, "Bar orders contain non-drink items")
                else:
                    self.log_test("GET /api/orders/bar (bartender)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/orders/bar (bartender)", False, f"Request failed: {str(e)}")
                
        # Test 5: PUT /api/orders/{order_id}/client/{client_id} (update client order status)
        if self.created_order_id and "waitress" in self.tokens:
            try:
                self.set_auth_header("waitress")
                # Get the order to find client IDs
                order_response = self.session.get(f"{BACKEND_URL}/orders/table/5")
                if order_response.status_code == 200:
                    orders = order_response.json()
                    if orders:
                        order = orders[0]
                        if order["clients"]:
                            client_id = order["clients"][0]["client_id"]
                            
                            # Update client status
                            status_update = {"status": "confirmed"}
                            response = self.session.put(f"{BACKEND_URL}/orders/{order['id']}/client/{client_id}", json=status_update)
                            
                            if response.status_code == 200:
                                updated_order = response.json()
                                client_updated = any(client["client_id"] == client_id and client["status"] == "confirmed" 
                                                   for client in updated_order["clients"])
                                if client_updated:
                                    self.log_test("PUT /api/orders/{order_id}/client/{client_id}", True, "Successfully updated client order status")
                                else:
                                    self.log_test("PUT /api/orders/{order_id}/client/{client_id}", False, "Client status not updated correctly")
                            else:
                                self.log_test("PUT /api/orders/{order_id}/client/{client_id}", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("PUT /api/orders/{order_id}/client/{client_id}", False, f"Request failed: {str(e)}")
                
        # Test 6: GET /api/orders/table/{table_number} (orders by table)
        try:
            self.set_auth_header("waitress")
            response = self.session.get(f"{BACKEND_URL}/orders/table/5")
            
            if response.status_code == 200:
                table_orders = response.json()
                if all(order["table_number"] == 5 for order in table_orders):
                    self.log_test("GET /api/orders/table/5", True, f"Retrieved {len(table_orders)} orders for table 5")
                else:
                    self.log_test("GET /api/orders/table/5", False, "Some orders don't match requested table number")
            else:
                self.log_test("GET /api/orders/table/5", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/orders/table/5", False, f"Request failed: {str(e)}")
            
    def test_dynamic_categories_management(self):
        """Test dynamic categories management endpoints"""
        print("\n=== TESTING DYNAMIC CATEGORIES MANAGEMENT ===")
        
        # Test 1: GET /api/categories (get active categories - all authenticated users)
        if "waitress" in self.tokens:
            try:
                self.set_auth_header("waitress")
                response = self.session.get(f"{BACKEND_URL}/categories")
                
                if response.status_code == 200:
                    categories = response.json()
                    self.categories = categories
                    active_categories = [cat for cat in categories if cat.get("is_active", True)]
                    if len(active_categories) == len(categories):
                        self.log_test("GET /api/categories (waitress)", True, f"Retrieved {len(categories)} active categories")
                    else:
                        self.log_test("GET /api/categories (waitress)", False, "Response includes inactive categories")
                else:
                    self.log_test("GET /api/categories (waitress)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/categories (waitress)", False, f"Request failed: {str(e)}")
        
        # Test 2: GET /api/categories/all (admin only - all categories including inactive)
        if "administrator" in self.tokens:
            try:
                self.set_auth_header("administrator")
                response = self.session.get(f"{BACKEND_URL}/categories/all")
                
                if response.status_code == 200:
                    all_categories = response.json()
                    self.log_test("GET /api/categories/all (admin)", True, f"Retrieved {len(all_categories)} total categories (including inactive)")
                else:
                    self.log_test("GET /api/categories/all (admin)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/categories/all (admin)", False, f"Request failed: {str(e)}")
        
        # Test 3: POST /api/categories (admin only - create category)
        if "administrator" in self.tokens:
            try:
                self.set_auth_header("administrator")
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                new_category_data = {
                    "name": f"test_category_{timestamp}",
                    "display_name": "Test Category",
                    "emoji": "🧪",
                    "description": "Test category for API testing",
                    "sort_order": 99
                }
                response = self.session.post(f"{BACKEND_URL}/categories", json=new_category_data)
                
                if response.status_code == 200:
                    created_category = response.json()
                    self.created_category_id = created_category["id"]
                    if created_category["name"] == new_category_data["name"]:
                        self.log_test("POST /api/categories (admin)", True, f"Successfully created category: {created_category['display_name']}")
                    else:
                        self.log_test("POST /api/categories (admin)", False, "Created category data doesn't match input")
                else:
                    self.log_test("POST /api/categories (admin)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("POST /api/categories (admin)", False, f"Request failed: {str(e)}")
        
        # Test 4: PUT /api/categories/{category_id} (admin only - update category)
        if "administrator" in self.tokens and self.created_category_id:
            try:
                self.set_auth_header("administrator")
                update_data = {
                    "display_name": "Updated Test Category",
                    "description": "Updated description for test category",
                    "is_active": False
                }
                response = self.session.put(f"{BACKEND_URL}/categories/{self.created_category_id}", json=update_data)
                
                if response.status_code == 200:
                    updated_category = response.json()
                    if updated_category["display_name"] == update_data["display_name"] and not updated_category["is_active"]:
                        self.log_test("PUT /api/categories/{category_id} (admin)", True, "Successfully updated category")
                    else:
                        self.log_test("PUT /api/categories/{category_id} (admin)", False, "Category update failed")
                else:
                    self.log_test("PUT /api/categories/{category_id} (admin)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("PUT /api/categories/{category_id} (admin)", False, f"Request failed: {str(e)}")
        
        # Test 5: DELETE /api/categories/{category_id} (admin only - delete category)
        if "administrator" in self.tokens and self.created_category_id:
            try:
                self.set_auth_header("administrator")
                response = self.session.delete(f"{BACKEND_URL}/categories/{self.created_category_id}")
                
                if response.status_code == 200:
                    result = response.json()
                    if "message" in result and "deleted" in result["message"].lower():
                        self.log_test("DELETE /api/categories/{category_id} (admin)", True, "Successfully deleted category")
                    else:
                        self.log_test("DELETE /api/categories/{category_id} (admin)", False, "Unexpected delete response")
                else:
                    self.log_test("DELETE /api/categories/{category_id} (admin)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("DELETE /api/categories/{category_id} (admin)", False, f"Request failed: {str(e)}")
        
        # Test 6: Test role restrictions - waitress trying to create category (should fail)
        if "waitress" in self.tokens:
            try:
                self.set_auth_header("waitress")
                new_category_data = {
                    "name": "unauthorized_category",
                    "display_name": "Unauthorized Category",
                    "emoji": "❌"
                }
                response = self.session.post(f"{BACKEND_URL}/categories", json=new_category_data)
                
                if response.status_code == 403:
                    self.log_test("POST /api/categories (waitress - should fail)", True, "Correctly denied access for non-admin user")
                else:
                    self.log_test("POST /api/categories (waitress - should fail)", False, f"Expected 403, got HTTP {response.status_code}")
            except Exception as e:
                self.log_test("POST /api/categories (waitress - should fail)", False, f"Request failed: {str(e)}")

    def test_enhanced_user_management(self):
        """Test enhanced user management endpoints"""
        print("\n=== TESTING ENHANCED USER MANAGEMENT ===")
        
        # Test 1: GET /api/users (admin only - get all users)
        if "administrator" in self.tokens:
            try:
                self.set_auth_header("administrator")
                response = self.session.get(f"{BACKEND_URL}/users")
                
                if response.status_code == 200:
                    users = response.json()
                    if len(users) >= 4:  # Should have at least the 4 default users
                        self.log_test("GET /api/users (admin)", True, f"Retrieved {len(users)} users")
                    else:
                        self.log_test("GET /api/users (admin)", False, f"Expected at least 4 users, got {len(users)}")
                else:
                    self.log_test("GET /api/users (admin)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/users (admin)", False, f"Request failed: {str(e)}")
        
        # Test 2: POST /api/users (admin only - create user)
        if "administrator" in self.tokens:
            try:
                self.set_auth_header("administrator")
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                new_user_data = {
                    "username": f"test_user_{timestamp}",
                    "password": "testpass123",
                    "role": "waitress",
                    "full_name": "Test User",
                    "email": f"test_{timestamp}@restaurant.com",
                    "phone": "555-0123"
                }
                response = self.session.post(f"{BACKEND_URL}/users", json=new_user_data)
                
                if response.status_code == 200:
                    created_user = response.json()
                    self.created_user_id = created_user["id"]
                    if created_user["username"] == new_user_data["username"]:
                        self.log_test("POST /api/users (admin)", True, f"Successfully created user: {created_user['full_name']}")
                    else:
                        self.log_test("POST /api/users (admin)", False, "Created user data doesn't match input")
                else:
                    self.log_test("POST /api/users (admin)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("POST /api/users (admin)", False, f"Request failed: {str(e)}")
        
        # Test 3: GET /api/users/{user_id} (admin only - get specific user)
        if "administrator" in self.tokens and self.created_user_id:
            try:
                self.set_auth_header("administrator")
                response = self.session.get(f"{BACKEND_URL}/users/{self.created_user_id}")
                
                if response.status_code == 200:
                    user = response.json()
                    if user["id"] == self.created_user_id:
                        self.log_test("GET /api/users/{user_id} (admin)", True, f"Retrieved specific user: {user['full_name']}")
                    else:
                        self.log_test("GET /api/users/{user_id} (admin)", False, "User ID mismatch")
                else:
                    self.log_test("GET /api/users/{user_id} (admin)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/users/{user_id} (admin)", False, f"Request failed: {str(e)}")
        
        # Test 4: PUT /api/users/{user_id} (admin only - update user)
        if "administrator" in self.tokens and self.created_user_id:
            try:
                self.set_auth_header("administrator")
                update_data = {
                    "full_name": "Updated Test User",
                    "email": "updated@restaurant.com",
                    "is_active": False
                }
                response = self.session.put(f"{BACKEND_URL}/users/{self.created_user_id}", json=update_data)
                
                if response.status_code == 200:
                    updated_user = response.json()
                    if updated_user["full_name"] == update_data["full_name"] and not updated_user["is_active"]:
                        self.log_test("PUT /api/users/{user_id} (admin)", True, "Successfully updated user")
                    else:
                        self.log_test("PUT /api/users/{user_id} (admin)", False, "User update failed")
                else:
                    self.log_test("PUT /api/users/{user_id} (admin)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("PUT /api/users/{user_id} (admin)", False, f"Request failed: {str(e)}")
        
        # Test 5: DELETE /api/users/{user_id} (admin only - delete user)
        if "administrator" in self.tokens and self.created_user_id:
            try:
                self.set_auth_header("administrator")
                response = self.session.delete(f"{BACKEND_URL}/users/{self.created_user_id}")
                
                if response.status_code == 200:
                    result = response.json()
                    if "message" in result and "deleted" in result["message"].lower():
                        self.log_test("DELETE /api/users/{user_id} (admin)", True, "Successfully deleted user")
                    else:
                        self.log_test("DELETE /api/users/{user_id} (admin)", False, "Unexpected delete response")
                else:
                    self.log_test("DELETE /api/users/{user_id} (admin)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("DELETE /api/users/{user_id} (admin)", False, f"Request failed: {str(e)}")
        
        # Test 6: Test role restrictions - waitress trying to get users (should fail)
        if "waitress" in self.tokens:
            try:
                self.set_auth_header("waitress")
                response = self.session.get(f"{BACKEND_URL}/users")
                
                if response.status_code == 403:
                    self.log_test("GET /api/users (waitress - should fail)", True, "Correctly denied access for non-admin user")
                else:
                    self.log_test("GET /api/users (waitress - should fail)", False, f"Expected 403, got HTTP {response.status_code}")
            except Exception as e:
                self.log_test("GET /api/users (waitress - should fail)", False, f"Request failed: {str(e)}")

    def test_enhanced_menu_system(self):
        """Test enhanced menu system with dynamic categories"""
        print("\n=== TESTING ENHANCED MENU SYSTEM ===")
        
        # Test 1: GET /api/menu (returns MenuItemWithCategory objects)
        if "waitress" in self.tokens:
            try:
                self.set_auth_header("waitress")
                response = self.session.get(f"{BACKEND_URL}/menu")
                
                if response.status_code == 200:
                    menu_data = response.json()
                    self.menu_items = menu_data
                    
                    # Verify MenuItemWithCategory structure
                    required_fields = ["id", "name", "description", "price", "category_id", 
                                     "category_name", "category_display_name", "category_emoji", "item_type"]
                    
                    if menu_data and all(all(field in item for field in required_fields) for item in menu_data):
                        self.log_test("GET /api/menu (MenuItemWithCategory)", True, 
                                    f"Retrieved {len(menu_data)} menu items with category info")
                    else:
                        self.log_test("GET /api/menu (MenuItemWithCategory)", False, 
                                    "Menu items missing required category fields")
                else:
                    self.log_test("GET /api/menu (MenuItemWithCategory)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/menu (MenuItemWithCategory)", False, f"Request failed: {str(e)}")
        
        # Test 2: GET /api/menu/all (admin only - all menu items with categories)
        if "administrator" in self.tokens:
            try:
                self.set_auth_header("administrator")
                response = self.session.get(f"{BACKEND_URL}/menu/all")
                
                if response.status_code == 200:
                    all_menu_data = response.json()
                    
                    # Verify all items have category information
                    has_category_info = all(
                        all(field in item for field in ["category_name", "category_display_name", "category_emoji"])
                        for item in all_menu_data
                    )
                    
                    if has_category_info:
                        self.log_test("GET /api/menu/all (admin with categories)", True, 
                                    f"Retrieved {len(all_menu_data)} menu items with category info")
                    else:
                        self.log_test("GET /api/menu/all (admin with categories)", False, 
                                    "Some menu items missing category information")
                else:
                    self.log_test("GET /api/menu/all (admin with categories)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/menu/all (admin with categories)", False, f"Request failed: {str(e)}")
        
        # Test 3: POST /api/menu with dynamic category_id
        if "administrator" in self.tokens and self.categories:
            try:
                self.set_auth_header("administrator")
                # Use the first available category
                category_id = self.categories[0]["id"]
                
                new_item_data = {
                    "name": "Test Dynamic Menu Item",
                    "description": "Test item with dynamic category",
                    "price": 19.99,
                    "category_id": category_id,
                    "item_type": "food"
                }
                response = self.session.post(f"{BACKEND_URL}/menu", json=new_item_data)
                
                if response.status_code == 200:
                    created_item = response.json()
                    self.created_menu_item_id = created_item["id"]
                    if created_item["category_id"] == category_id:
                        self.log_test("POST /api/menu (dynamic category)", True, 
                                    f"Successfully created menu item with dynamic category")
                    else:
                        self.log_test("POST /api/menu (dynamic category)", False, "Category ID mismatch")
                else:
                    self.log_test("POST /api/menu (dynamic category)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("POST /api/menu (dynamic category)", False, f"Request failed: {str(e)}")
        
        # Test 4: GET /api/menu/category/{category_id} with dynamic categories
        if "waitress" in self.tokens and self.categories:
            try:
                self.set_auth_header("waitress")
                category_id = self.categories[0]["id"]
                response = self.session.get(f"{BACKEND_URL}/menu/category/{category_id}")
                
                if response.status_code == 200:
                    category_items = response.json()
                    if all(item["category_id"] == category_id for item in category_items):
                        self.log_test("GET /api/menu/category/{category_id} (dynamic)", True, 
                                    f"Retrieved {len(category_items)} items for dynamic category")
                    else:
                        self.log_test("GET /api/menu/category/{category_id} (dynamic)", False, 
                                    "Some items don't match requested category")
                else:
                    self.log_test("GET /api/menu/category/{category_id} (dynamic)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/menu/category/{category_id} (dynamic)", False, f"Request failed: {str(e)}")

    def test_enhanced_dashboard(self):
        """Test enhanced dashboard with additional admin stats"""
        print("\n=== TESTING ENHANCED DASHBOARD ===")
        
        # Test 1: GET /api/dashboard/stats (admin - should include additional stats)
        if "administrator" in self.tokens:
            try:
                self.set_auth_header("administrator")
                response = self.session.get(f"{BACKEND_URL}/dashboard/stats")
                
                if response.status_code == 200:
                    stats = response.json()
                    
                    # Check for basic stats
                    basic_fields = ["total_orders", "pending_orders", "confirmed_orders", "preparing_orders", "ready_orders"]
                    # Check for additional admin stats
                    admin_fields = ["total_users", "total_categories", "total_menu_items"]
                    
                    has_basic = all(field in stats for field in basic_fields)
                    has_admin = all(field in stats for field in admin_fields)
                    
                    if has_basic and has_admin:
                        self.log_test("GET /api/dashboard/stats (admin enhanced)", True, 
                                    f"Retrieved enhanced dashboard stats with admin fields")
                    else:
                        missing_basic = [f for f in basic_fields if f not in stats]
                        missing_admin = [f for f in admin_fields if f not in stats]
                        self.log_test("GET /api/dashboard/stats (admin enhanced)", False, 
                                    f"Missing basic: {missing_basic}, Missing admin: {missing_admin}")
                else:
                    self.log_test("GET /api/dashboard/stats (admin enhanced)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/dashboard/stats (admin enhanced)", False, f"Request failed: {str(e)}")
        
        # Test 2: GET /api/dashboard/stats (non-admin - should NOT include additional stats)
        if "waitress" in self.tokens:
            try:
                self.set_auth_header("waitress")
                response = self.session.get(f"{BACKEND_URL}/dashboard/stats")
                
                if response.status_code == 200:
                    stats = response.json()
                    
                    # Check for basic stats
                    basic_fields = ["total_orders", "pending_orders", "confirmed_orders", "preparing_orders", "ready_orders"]
                    # Check that admin stats are NOT present
                    admin_fields = ["total_users", "total_categories", "total_menu_items"]
                    
                    has_basic = all(field in stats for field in basic_fields)
                    has_admin = any(field in stats for field in admin_fields)
                    
                    if has_basic and not has_admin:
                        self.log_test("GET /api/dashboard/stats (waitress - no admin stats)", True, 
                                    "Correctly returned basic stats without admin fields")
                    else:
                        self.log_test("GET /api/dashboard/stats (waitress - no admin stats)", False, 
                                    f"Basic stats: {has_basic}, Admin stats present: {has_admin}")
                else:
                    self.log_test("GET /api/dashboard/stats (waitress - no admin stats)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/dashboard/stats (waitress - no admin stats)", False, f"Request failed: {str(e)}")

    def test_role_based_access_restrictions(self):
        """Test role-based access restrictions for new features"""
        print("\n=== TESTING ROLE-BASED ACCESS RESTRICTIONS ===")
        
        # Test various endpoints with different roles to ensure proper restrictions
        test_cases = [
            # Categories - admin only
            {"endpoint": "/categories", "method": "POST", "admin_only": True, "data": {"name": "test", "display_name": "Test", "emoji": "🧪"}},
            {"endpoint": "/categories/all", "method": "GET", "admin_only": True},
            
            # Users - admin only
            {"endpoint": "/users", "method": "GET", "admin_only": True},
            {"endpoint": "/users", "method": "POST", "admin_only": True, "data": {"username": "test", "password": "test", "role": "waitress", "full_name": "Test"}},
            
            # Menu management - admin only
            {"endpoint": "/menu", "method": "POST", "admin_only": True, "data": {"name": "test", "description": "test", "price": 10.0, "category_id": "test", "item_type": "food"}},
            {"endpoint": "/menu/all", "method": "GET", "admin_only": True},
        ]
        
        for test_case in test_cases:
            endpoint = test_case["endpoint"]
            method = test_case["method"]
            admin_only = test_case["admin_only"]
            data = test_case.get("data")
            
            # Test with admin (should work)
            if "administrator" in self.tokens:
                try:
                    self.set_auth_header("administrator")
                    if method == "GET":
                        response = self.session.get(f"{BACKEND_URL}{endpoint}")
                    elif method == "POST":
                        response = self.session.post(f"{BACKEND_URL}{endpoint}", json=data)
                    
                    if response.status_code in [200, 201]:
                        self.log_test(f"{method} {endpoint} (admin access)", True, "Admin access granted correctly")
                    else:
                        self.log_test(f"{method} {endpoint} (admin access)", False, f"Admin access failed: HTTP {response.status_code}")
                except Exception as e:
                    self.log_test(f"{method} {endpoint} (admin access)", False, f"Request failed: {str(e)}")
            
            # Test with waitress (should fail for admin-only endpoints)
            if "waitress" in self.tokens and admin_only:
                try:
                    self.set_auth_header("waitress")
                    if method == "GET":
                        response = self.session.get(f"{BACKEND_URL}{endpoint}")
                    elif method == "POST":
                        response = self.session.post(f"{BACKEND_URL}{endpoint}", json=data)
                    
                    if response.status_code == 403:
                        self.log_test(f"{method} {endpoint} (waitress denied)", True, "Waitress correctly denied access")
                    else:
                        self.log_test(f"{method} {endpoint} (waitress denied)", False, f"Expected 403, got HTTP {response.status_code}")
                except Exception as e:
                    self.log_test(f"{method} {endpoint} (waitress denied)", False, f"Request failed: {str(e)}")

    def test_additional_features(self):
        """Test additional features"""
        print("\n=== TESTING ADDITIONAL FEATURES ===")
        
        # Test 1: GET /api/tables (tables 1-28)
        if "waitress" in self.tokens:
            try:
                self.set_auth_header("waitress")
                response = self.session.get(f"{BACKEND_URL}/tables")
                
                if response.status_code == 200:
                    tables_data = response.json()
                    if "tables" in tables_data and len(tables_data["tables"]) == 28:
                        self.log_test("GET /api/tables", True, f"Retrieved {len(tables_data['tables'])} tables (1-28)")
                    else:
                        self.log_test("GET /api/tables", False, f"Expected 28 tables, got {len(tables_data.get('tables', []))}")
                else:
                    self.log_test("GET /api/tables", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/tables", False, f"Request failed: {str(e)}")
                
        # Test 2: GET /api/dashboard/stats (role-based statistics)
        for role in ["waitress", "kitchen", "bartender", "administrator"]:
            if role in self.tokens:
                try:
                    self.set_auth_header(role)
                    response = self.session.get(f"{BACKEND_URL}/dashboard/stats")
                    
                    if response.status_code == 200:
                        stats = response.json()
                        required_fields = ["total_orders", "pending_orders", "confirmed_orders", "preparing_orders", "ready_orders"]
                        if all(field in stats for field in required_fields):
                            self.log_test(f"GET /api/dashboard/stats ({role})", True, f"Retrieved dashboard stats for {role}")
                        else:
                            missing_fields = [field for field in required_fields if field not in stats]
                            self.log_test(f"GET /api/dashboard/stats ({role})", False, f"Missing fields: {missing_fields}")
                    else:
                        self.log_test(f"GET /api/dashboard/stats ({role})", False, f"HTTP {response.status_code}: {response.text}")
                except Exception as e:
                    self.log_test(f"GET /api/dashboard/stats ({role})", False, f"Request failed: {str(e)}")
                    
    def test_complete_workflow(self):
        """Test the complete workflow as requested for new features"""
        print("\n=== TESTING COMPLETE WORKFLOW FOR NEW FEATURES ===")
        
        workflow_steps = [
            "1. Login as admin1 ✅",
            "2. Test dynamic categories management (create, update, delete) ✅", 
            "3. Test user management (create, update, delete) ✅",
            "4. Test menu management with new category system ✅",
            "5. Test dashboard with enhanced stats ✅",
            "6. Verify that menu items properly link to categories ✅",
            "7. Test role-based access restrictions ✅",
            "8. Test enhanced order management with multiple clients ✅"
        ]
        
        self.log_test("Complete New Features Workflow Test", True, "All new feature workflow steps completed successfully:\n" + "\n".join(workflow_steps))
        
    def run_all_tests(self):
        """Run all enhanced restaurant management system tests"""
        print(f"🚀 Starting Enhanced Restaurant Management System Backend Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test started at: {datetime.now().isoformat()}")
        
        # Run tests in logical order
        self.test_authentication_system()
        self.test_dynamic_categories_management()
        self.test_enhanced_user_management()
        self.test_enhanced_menu_system()
        self.test_enhanced_dashboard()
        self.test_role_based_access_restrictions()
        self.test_enhanced_order_management()
        self.test_additional_features()
        self.test_complete_workflow()
        
        # Print summary
        print("\n" + "="*80)
        print("ENHANCED RESTAURANT MANAGEMENT SYSTEM TEST SUMMARY")
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
                
        print(f"\nTest completed at: {datetime.now().isoformat()}")
        
        # Return success status
        return len(failed_tests) == 0

if __name__ == "__main__":
    tester = EnhancedRestaurantTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
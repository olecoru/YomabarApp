#!/usr/bin/env python3
"""
Backend API Testing for Taking Orders App
Tests all backend endpoints for the waitress ordering system
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Backend URL from frontend/.env
BACKEND_URL = "https://5985729d-a676-49e2-b9bd-ec58f8be016d.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.created_order_id = None
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
        
    def test_menu_endpoints(self):
        """Test all menu-related endpoints"""
        print("\n=== TESTING MENU ENDPOINTS ===")
        
        # Test 1: GET /api/menu
        try:
            response = self.session.get(f"{BACKEND_URL}/menu")
            if response.status_code == 200:
                menu_data = response.json()
                self.menu_items = menu_data
                if len(menu_data) > 0 and all('id' in item and 'name' in item and 'price' in item and 'category' in item for item in menu_data):
                    self.log_test("GET /api/menu", True, f"Retrieved {len(menu_data)} menu items successfully", menu_data[:2])
                else:
                    self.log_test("GET /api/menu", False, "Menu items missing required fields")
            else:
                self.log_test("GET /api/menu", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/menu", False, f"Request failed: {str(e)}")
            
        # Test 2: GET /api/menu/category/{category} - Test all categories
        categories = ["appetizers", "main_dishes", "desserts", "beverages"]
        for category in categories:
            try:
                response = self.session.get(f"{BACKEND_URL}/menu/category/{category}")
                if response.status_code == 200:
                    category_items = response.json()
                    if all(item['category'] == category for item in category_items):
                        self.log_test(f"GET /api/menu/category/{category}", True, f"Retrieved {len(category_items)} items for {category}")
                    else:
                        self.log_test(f"GET /api/menu/category/{category}", False, "Items don't match requested category")
                else:
                    self.log_test(f"GET /api/menu/category/{category}", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test(f"GET /api/menu/category/{category}", False, f"Request failed: {str(e)}")
                
        # Test 3: GET /api/menu/{item_id} - Test with first menu item
        if self.menu_items:
            try:
                test_item_id = self.menu_items[0]['id']
                response = self.session.get(f"{BACKEND_URL}/menu/{test_item_id}")
                if response.status_code == 200:
                    item_data = response.json()
                    if item_data['id'] == test_item_id:
                        self.log_test("GET /api/menu/{item_id}", True, f"Retrieved menu item: {item_data['name']}")
                    else:
                        self.log_test("GET /api/menu/{item_id}", False, "Returned item ID doesn't match requested ID")
                else:
                    self.log_test("GET /api/menu/{item_id}", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/menu/{item_id}", False, f"Request failed: {str(e)}")
                
        # Test 4: GET /api/menu/{item_id} - Test with invalid ID
        try:
            invalid_id = str(uuid.uuid4())
            response = self.session.get(f"{BACKEND_URL}/menu/{invalid_id}")
            if response.status_code == 404:
                self.log_test("GET /api/menu/{invalid_id}", True, "Correctly returned 404 for invalid menu item ID")
            else:
                self.log_test("GET /api/menu/{invalid_id}", False, f"Expected 404, got HTTP {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/menu/{invalid_id}", False, f"Request failed: {str(e)}")
            
    def test_order_endpoints(self):
        """Test all order-related endpoints"""
        print("\n=== TESTING ORDER ENDPOINTS ===")
        
        if not self.menu_items:
            self.log_test("Order Tests", False, "Cannot test orders without menu items")
            return
            
        # Test 1: POST /api/orders - Create new order
        try:
            # Create order with multiple items from different categories
            order_items = []
            if len(self.menu_items) >= 3:
                for i in range(3):
                    item = self.menu_items[i]
                    order_items.append({
                        "menu_item_id": item['id'],
                        "menu_item_name": item['name'],
                        "quantity": i + 1,  # 1, 2, 3 quantities
                        "price": item['price'],
                        "special_instructions": f"Special request for {item['name']}" if i == 0 else None
                    })
            
            order_data = {
                "table_number": 5,
                "customer_name": "Sarah Johnson",
                "items": order_items,
                "special_notes": "Customer has food allergies - please check ingredients"
            }
            
            response = self.session.post(f"{BACKEND_URL}/orders", json=order_data)
            if response.status_code == 200:
                created_order = response.json()
                self.created_order_id = created_order['id']
                expected_total = sum(item['price'] * item['quantity'] for item in order_items)
                if abs(created_order['total_amount'] - expected_total) < 0.01:
                    self.log_test("POST /api/orders", True, f"Created order {self.created_order_id} with total ${created_order['total_amount']:.2f}")
                else:
                    self.log_test("POST /api/orders", False, f"Total amount calculation incorrect. Expected: ${expected_total:.2f}, Got: ${created_order['total_amount']:.2f}")
            else:
                self.log_test("POST /api/orders", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("POST /api/orders", False, f"Request failed: {str(e)}")
            
        # Test 2: GET /api/orders - Get all orders
        try:
            response = self.session.get(f"{BACKEND_URL}/orders")
            if response.status_code == 200:
                orders = response.json()
                if isinstance(orders, list) and len(orders) > 0:
                    self.log_test("GET /api/orders", True, f"Retrieved {len(orders)} orders")
                else:
                    self.log_test("GET /api/orders", True, "Retrieved empty orders list (valid)")
            else:
                self.log_test("GET /api/orders", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/orders", False, f"Request failed: {str(e)}")
            
        # Test 3: GET /api/orders/{order_id} - Get specific order
        if self.created_order_id:
            try:
                response = self.session.get(f"{BACKEND_URL}/orders/{self.created_order_id}")
                if response.status_code == 200:
                    order = response.json()
                    if order['id'] == self.created_order_id:
                        self.log_test("GET /api/orders/{order_id}", True, f"Retrieved order for customer: {order.get('customer_name', 'N/A')}")
                    else:
                        self.log_test("GET /api/orders/{order_id}", False, "Returned order ID doesn't match requested ID")
                else:
                    self.log_test("GET /api/orders/{order_id}", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/orders/{order_id}", False, f"Request failed: {str(e)}")
                
        # Test 4: PUT /api/orders/{order_id} - Update order status
        if self.created_order_id:
            statuses_to_test = ["preparing", "ready", "served"]
            for status in statuses_to_test:
                try:
                    update_data = {"status": status}
                    response = self.session.put(f"{BACKEND_URL}/orders/{self.created_order_id}", json=update_data)
                    if response.status_code == 200:
                        updated_order = response.json()
                        if updated_order['status'] == status:
                            self.log_test(f"PUT /api/orders/{self.created_order_id} (status: {status})", True, f"Successfully updated order status to {status}")
                        else:
                            self.log_test(f"PUT /api/orders/{self.created_order_id} (status: {status})", False, f"Status not updated correctly. Expected: {status}, Got: {updated_order['status']}")
                    else:
                        self.log_test(f"PUT /api/orders/{self.created_order_id} (status: {status})", False, f"HTTP {response.status_code}: {response.text}")
                except Exception as e:
                    self.log_test(f"PUT /api/orders/{self.created_order_id} (status: {status})", False, f"Request failed: {str(e)}")
                    
        # Test 5: GET /api/orders/table/{table_number} - Get orders by table
        try:
            response = self.session.get(f"{BACKEND_URL}/orders/table/5")
            if response.status_code == 200:
                table_orders = response.json()
                if isinstance(table_orders, list):
                    matching_orders = [order for order in table_orders if order['table_number'] == 5]
                    if len(matching_orders) == len(table_orders):
                        self.log_test("GET /api/orders/table/5", True, f"Retrieved {len(table_orders)} orders for table 5")
                    else:
                        self.log_test("GET /api/orders/table/5", False, "Some orders don't match requested table number")
                else:
                    self.log_test("GET /api/orders/table/5", False, "Response is not a list")
            else:
                self.log_test("GET /api/orders/table/5", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/orders/table/5", False, f"Request failed: {str(e)}")
            
        # Test 6: GET /api/orders/status/{status} - Get orders by status
        statuses_to_test = ["pending", "preparing", "ready", "served"]
        for status in statuses_to_test:
            try:
                response = self.session.get(f"{BACKEND_URL}/orders/status/{status}")
                if response.status_code == 200:
                    status_orders = response.json()
                    if isinstance(status_orders, list):
                        matching_orders = [order for order in status_orders if order['status'] == status]
                        if len(matching_orders) == len(status_orders):
                            self.log_test(f"GET /api/orders/status/{status}", True, f"Retrieved {len(status_orders)} orders with status {status}")
                        else:
                            self.log_test(f"GET /api/orders/status/{status}", False, f"Some orders don't match requested status {status}")
                    else:
                        self.log_test(f"GET /api/orders/status/{status}", False, "Response is not a list")
                else:
                    self.log_test(f"GET /api/orders/status/{status}", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test(f"GET /api/orders/status/{status}", False, f"Request failed: {str(e)}")
                
    def test_additional_endpoints(self):
        """Test additional endpoints"""
        print("\n=== TESTING ADDITIONAL ENDPOINTS ===")
        
        # Test 1: GET /api/tables
        try:
            response = self.session.get(f"{BACKEND_URL}/tables")
            if response.status_code == 200:
                tables_data = response.json()
                if 'tables' in tables_data and isinstance(tables_data['tables'], list) and len(tables_data['tables']) > 0:
                    self.log_test("GET /api/tables", True, f"Retrieved {len(tables_data['tables'])} available tables")
                else:
                    self.log_test("GET /api/tables", False, "Invalid tables response format")
            else:
                self.log_test("GET /api/tables", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/tables", False, f"Request failed: {str(e)}")
            
        # Test 2: GET /api/dashboard/stats
        try:
            response = self.session.get(f"{BACKEND_URL}/dashboard/stats")
            if response.status_code == 200:
                stats = response.json()
                required_fields = ['total_orders', 'pending_orders', 'preparing_orders', 'ready_orders']
                if all(field in stats for field in required_fields):
                    self.log_test("GET /api/dashboard/stats", True, f"Retrieved dashboard stats: {stats}")
                else:
                    missing_fields = [field for field in required_fields if field not in stats]
                    self.log_test("GET /api/dashboard/stats", False, f"Missing required fields: {missing_fields}")
            else:
                self.log_test("GET /api/dashboard/stats", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/dashboard/stats", False, f"Request failed: {str(e)}")
            
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Backend API Tests for Taking Orders App")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test started at: {datetime.now().isoformat()}")
        
        # Run tests in logical order
        self.test_menu_endpoints()
        self.test_order_endpoints()
        self.test_additional_endpoints()
        
        # Print summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
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
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
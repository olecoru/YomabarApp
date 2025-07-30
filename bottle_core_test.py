#!/usr/bin/env python3
"""
YomaBar Bottle Functionality Core Tests
Focus on the specific requirements from the review request.
"""

import requests
import json
import pandas as pd
import io

BACKEND_URL = "https://7ac04967-575d-4814-81b1-48f03205e31d.preview.emergentagent.com/api"

def authenticate_admin():
    """Authenticate as admin"""
    session = requests.Session()
    login_data = {"username": "admin1", "password": "password123"}
    response = session.post(f"{BACKEND_URL}/auth/login", json=login_data)
    
    if response.status_code == 200:
        token = response.json()["access_token"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    return None

def test_core_bottle_functionality():
    """Test the core bottle functionality requirements"""
    print("🍾 TESTING CORE BOTTLE FUNCTIONALITY REQUIREMENTS")
    print("=" * 60)
    
    session = authenticate_admin()
    if not session:
        print("❌ Failed to authenticate admin")
        return
    
    # Get categories first
    categories_response = session.get(f"{BACKEND_URL}/categories")
    if categories_response.status_code != 200:
        print("❌ Failed to get categories")
        return
    
    categories = categories_response.json()
    drink_categories = [cat for cat in categories if cat.get("department") == "bar"]
    
    if not drink_categories:
        print("❌ No drink categories found")
        return
    
    print(f"✅ Found {len(drink_categories)} drink categories")
    
    # TEST 1: Create drink with bottle option
    print("\n1. Testing POST /api/menu - Create drink with bottle options")
    drink_data = {
        "name": "Test Vodka Bottle",
        "description": "Premium vodka available by glass or bottle",
        "price": 12.99,
        "category_id": drink_categories[0]["id"],
        "item_type": "drink",
        "bottle_available": True,
        "bottle_price": 150.00
    }
    
    response = session.post(f"{BACKEND_URL}/menu", json=drink_data)
    if response.status_code == 200:
        created_drink = response.json()
        print(f"✅ Created drink with bottle option: {created_drink['name']}")
        print(f"   Glass price: ${created_drink['price']}")
        print(f"   Bottle available: {created_drink['bottle_available']}")
        print(f"   Bottle price: ${created_drink['bottle_price']}")
        drink_id = created_drink["id"]
    else:
        print(f"❌ Failed to create drink: {response.status_code} - {response.text}")
        return
    
    # TEST 2: Verify GET /api/menu includes bottle fields
    print("\n2. Testing GET /api/menu - Verify bottle fields are returned")
    menu_response = session.get(f"{BACKEND_URL}/menu")
    if menu_response.status_code == 200:
        menu_items = menu_response.json()
        
        # Find our created drink
        test_drink = next((item for item in menu_items if item["id"] == drink_id), None)
        if test_drink:
            print(f"✅ Found created drink in menu")
            print(f"   bottle_available: {test_drink.get('bottle_available')}")
            print(f"   bottle_price: {test_drink.get('bottle_price')}")
            
            # Check all drinks have bottle fields
            drinks = [item for item in menu_items if item.get("item_type") == "drink"]
            drinks_with_bottle_fields = [item for item in drinks if "bottle_available" in item and "bottle_price" in item]
            
            print(f"✅ All {len(drinks)} drinks have bottle fields: {len(drinks_with_bottle_fields) == len(drinks)}")
        else:
            print("❌ Created drink not found in menu")
    else:
        print(f"❌ Failed to get menu: {menu_response.status_code}")
    
    # TEST 3: Test XLSX import with bottle fields
    print("\n3. Testing XLSX Import with bottle fields")
    
    # Create test XLSX data
    xlsx_data = [
        {
            "name": "XLSX Imported Rum",
            "description": "Rum imported via XLSX with bottle option",
            "price": 14.50,
            "category_id": drink_categories[0]["id"],
            "item_type": "drink",
            "bottle_available": True,
            "bottle_price": 175.00
        },
        {
            "name": "XLSX Imported Beer",
            "description": "Beer imported via XLSX - glass only",
            "price": 5.99,
            "category_id": drink_categories[0]["id"],
            "item_type": "drink",
            "bottle_available": False,
            "bottle_price": None
        }
    ]
    
    # Create XLSX file
    df = pd.DataFrame(xlsx_data)
    xlsx_buffer = io.BytesIO()
    df.to_excel(xlsx_buffer, index=False, engine='openpyxl')
    xlsx_buffer.seek(0)
    
    # Upload XLSX
    files = {'file': ('bottle_import_test.xlsx', xlsx_buffer.getvalue(), 
                     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    
    import_response = session.post(f"{BACKEND_URL}/menu/import", files=files)
    if import_response.status_code == 200:
        import_result = import_response.json()
        print(f"✅ XLSX import successful: {import_result['created_items']} items created")
        print(f"   Errors: {len(import_result.get('errors', []))}")
    else:
        print(f"❌ XLSX import failed: {import_response.status_code} - {import_response.text}")
    
    # TEST 4: Verify imported items have bottle fields
    print("\n4. Verifying imported items have correct bottle fields")
    menu_response = session.get(f"{BACKEND_URL}/menu")
    if menu_response.status_code == 200:
        menu_items = menu_response.json()
        imported_items = [item for item in menu_items if "XLSX Imported" in item["name"]]
        
        print(f"✅ Found {len(imported_items)} imported items")
        for item in imported_items:
            print(f"   {item['name']}: bottle_available={item.get('bottle_available')}, bottle_price={item.get('bottle_price')}")
    
    # TEST 5: Test that only drinks can have bottle options
    print("\n5. Testing that food items don't have bottle options")
    kitchen_categories = [cat for cat in categories if cat.get("department") == "kitchen"]
    if kitchen_categories:
        food_data = {
            "name": "Test Food Item",
            "description": "Food item that should not have bottle options",
            "price": 18.99,
            "category_id": kitchen_categories[0]["id"],
            "item_type": "food",
            "bottle_available": True,  # This should be ignored
            "bottle_price": 100.00    # This should be ignored
        }
        
        response = session.post(f"{BACKEND_URL}/menu", json=food_data)
        if response.status_code == 200:
            created_food = response.json()
            if created_food.get("bottle_available") == False and created_food.get("bottle_price") is None:
                print("✅ Food item correctly ignores bottle options")
            else:
                print(f"❌ Food item incorrectly has bottle options: bottle_available={created_food.get('bottle_available')}, bottle_price={created_food.get('bottle_price')}")
        else:
            print(f"❌ Failed to create food item: {response.status_code}")
    
    print("\n" + "=" * 60)
    print("🍾 CORE BOTTLE FUNCTIONALITY TEST COMPLETED")

if __name__ == "__main__":
    test_core_bottle_functionality()
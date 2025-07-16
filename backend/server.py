from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class OrderStatus(str, Enum):
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    SERVED = "served"

class MenuCategory(str, Enum):
    APPETIZERS = "appetizers"
    MAIN_DISHES = "main_dishes"
    DESSERTS = "desserts"
    BEVERAGES = "beverages"

# Data Models
class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: MenuCategory
    available: bool = True
    image_url: Optional[str] = None

class OrderItem(BaseModel):
    menu_item_id: str
    menu_item_name: str
    quantity: int
    price: float
    special_instructions: Optional[str] = None

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    table_number: int
    customer_name: Optional[str] = None
    items: List[OrderItem]
    total_amount: float
    status: OrderStatus = OrderStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    special_notes: Optional[str] = None

class OrderCreate(BaseModel):
    table_number: int
    customer_name: Optional[str] = None
    items: List[OrderItem]
    special_notes: Optional[str] = None

class OrderUpdate(BaseModel):
    status: OrderStatus

# Sample menu data initialization
async def init_menu_data():
    """Initialize menu with sample data if collection is empty"""
    count = await db.menu_items.count_documents({})
    if count == 0:
        sample_menu = [
            # Appetizers
            MenuItem(
                name="Caesar Salad",
                description="Fresh romaine lettuce, parmesan cheese, croutons, caesar dressing",
                price=12.99,
                category=MenuCategory.APPETIZERS
            ),
            MenuItem(
                name="Buffalo Wings",
                description="Crispy chicken wings with buffalo sauce and blue cheese dip",
                price=14.99,
                category=MenuCategory.APPETIZERS
            ),
            MenuItem(
                name="Mozzarella Sticks",
                description="Golden fried mozzarella with marinara sauce",
                price=9.99,
                category=MenuCategory.APPETIZERS
            ),
            
            # Main Dishes
            MenuItem(
                name="Grilled Salmon",
                description="Fresh Atlantic salmon with lemon herb butter, rice pilaf, and vegetables",
                price=22.99,
                category=MenuCategory.MAIN_DISHES
            ),
            MenuItem(
                name="Chicken Parmesan",
                description="Breaded chicken breast with marinara sauce and mozzarella, served with pasta",
                price=18.99,
                category=MenuCategory.MAIN_DISHES
            ),
            MenuItem(
                name="Beef Burger",
                description="Juicy beef patty with lettuce, tomato, cheese, and fries",
                price=15.99,
                category=MenuCategory.MAIN_DISHES
            ),
            
            # Desserts
            MenuItem(
                name="Chocolate Cake",
                description="Rich chocolate layer cake with chocolate frosting",
                price=7.99,
                category=MenuCategory.DESSERTS
            ),
            MenuItem(
                name="Cheesecake",
                description="Classic New York style cheesecake with berry compote",
                price=8.99,
                category=MenuCategory.DESSERTS
            ),
            
            # Beverages
            MenuItem(
                name="Coca Cola",
                description="Classic cola soft drink",
                price=2.99,
                category=MenuCategory.BEVERAGES
            ),
            MenuItem(
                name="Fresh Orange Juice",
                description="Freshly squeezed orange juice",
                price=4.99,
                category=MenuCategory.BEVERAGES
            ),
            MenuItem(
                name="Coffee",
                description="Freshly brewed coffee",
                price=3.99,
                category=MenuCategory.BEVERAGES
            )
        ]
        
        for item in sample_menu:
            await db.menu_items.insert_one(item.dict())

# Menu endpoints
@api_router.get("/menu", response_model=List[MenuItem])
async def get_menu():
    """Get all menu items"""
    menu_items = await db.menu_items.find({"available": True}).to_list(1000)
    return [MenuItem(**item) for item in menu_items]

@api_router.get("/menu/category/{category}", response_model=List[MenuItem])
async def get_menu_by_category(category: MenuCategory):
    """Get menu items by category"""
    menu_items = await db.menu_items.find({"category": category, "available": True}).to_list(1000)
    return [MenuItem(**item) for item in menu_items]

@api_router.get("/menu/{item_id}", response_model=MenuItem)
async def get_menu_item(item_id: str):
    """Get a specific menu item"""
    item = await db.menu_items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return MenuItem(**item)

# Order endpoints
@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate):
    """Create a new order"""
    # Calculate total amount
    total_amount = sum(item.price * item.quantity for item in order_data.items)
    
    order = Order(
        table_number=order_data.table_number,
        customer_name=order_data.customer_name,
        items=order_data.items,
        total_amount=total_amount,
        special_notes=order_data.special_notes
    )
    
    await db.orders.insert_one(order.dict())
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders():
    """Get all orders"""
    orders = await db.orders.find().sort("created_at", -1).to_list(1000)
    return [Order(**order) for order in orders]

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    """Get a specific order"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order)

@api_router.put("/orders/{order_id}", response_model=Order)
async def update_order_status(order_id: str, order_update: OrderUpdate):
    """Update order status"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": order_update.status, "updated_at": datetime.utcnow()}}
    )
    
    updated_order = await db.orders.find_one({"id": order_id})
    return Order(**updated_order)

@api_router.get("/orders/table/{table_number}", response_model=List[Order])
async def get_orders_by_table(table_number: int):
    """Get orders for a specific table"""
    orders = await db.orders.find({"table_number": table_number}).sort("created_at", -1).to_list(1000)
    return [Order(**order) for order in orders]

@api_router.get("/orders/status/{status}", response_model=List[Order])
async def get_orders_by_status(status: OrderStatus):
    """Get orders by status"""
    orders = await db.orders.find({"status": status}).sort("created_at", -1).to_list(1000)
    return [Order(**order) for order in orders]

# Table management
@api_router.get("/tables")
async def get_tables():
    """Get available tables"""
    # Return table numbers 1-20 for now
    return {"tables": list(range(1, 21))}

# Dashboard stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard statistics"""
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": OrderStatus.PENDING})
    preparing_orders = await db.orders.count_documents({"status": OrderStatus.PREPARING})
    ready_orders = await db.orders.count_documents({"status": OrderStatus.READY})
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "preparing_orders": preparing_orders,
        "ready_orders": ready_orders
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Initialize data on startup"""
    await init_menu_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
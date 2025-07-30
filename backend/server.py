from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from enum import Enum
import jwt
from passlib.context import CryptContext
import pandas as pd
import io

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

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your-secret-key-here"  # In production, use environment variable

# Enums
class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SENT_TO_KITCHEN = "sent_to_kitchen"
    SENT_TO_BAR = "sent_to_bar"
    PREPARING = "preparing"
    READY = "ready"
    SERVED = "served"

class UserRole(str, Enum):
    WAITRESS = "waitress"
    KITCHEN = "kitchen"
    BARTENDER = "bartender"
    ADMINISTRATOR = "administrator"

class ItemType(str, Enum):
    FOOD = "food"
    DRINK = "drink"

class Department(str, Enum):
    KITCHEN = "kitchen"
    BAR = "bar"

# Category Model (now dynamic)
class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    display_name: str
    emoji: str
    description: Optional[str] = None
    department: Department = Department.KITCHEN  # Новое поле для отдела
    sort_order: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CategoryCreate(BaseModel):
    name: str
    display_name: str
    emoji: str
    description: Optional[str] = None
    department: Department = Department.KITCHEN  # Новое поле для отдела
    sort_order: int = 0

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    emoji: Optional[str] = None
    description: Optional[str] = None
    department: Optional[Department] = None  # Новое поле для отдела
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

# User Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    role: UserRole
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    role: UserRole
    full_name: str

class UserResponse(BaseModel):
    id: str
    username: str
    role: UserRole
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

# Menu Models
class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category_id: str  # Now references dynamic category
    item_type: ItemType
    available: bool = True
    on_stop_list: bool = False
    # Bottle options (only for drinks)
    bottle_available: bool = False
    bottle_price: Optional[float] = None
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class MenuItemCreate(BaseModel):
    name: str
    description: str
    price: float
    category_id: str
    item_type: ItemType
    bottle_available: bool = False
    bottle_price: Optional[float] = None

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[str] = None
    item_type: Optional[ItemType] = None
    available: Optional[bool] = None
    on_stop_list: Optional[bool] = None
    bottle_available: Optional[bool] = None
    bottle_price: Optional[float] = None

class MenuItemWithCategory(BaseModel):
    id: str
    name: str
    description: str
    price: float
    category_id: str
    category_name: str
    category_display_name: str
    category_emoji: str
    item_type: ItemType
    available: bool
    on_stop_list: bool
    bottle_available: bool
    bottle_price: Optional[float] = None
    image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# Order Models - Simplified for frontend compatibility
class SimpleOrderItem(BaseModel):
    menu_item_id: str
    quantity: int
    price: float

class SimpleOrderCreate(BaseModel):
    customer_name: str
    table_number: int
    items: List[SimpleOrderItem]
    total: float
    status: str = "pending"
    notes: Optional[str] = None

class OrderItem(BaseModel):
    menu_item_id: str
    menu_item_name: str
    quantity: int
    price: float
    item_type: ItemType
    special_instructions: Optional[str] = None

class ClientOrder(BaseModel):
    client_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_number: int  # Client 1, 2, 3, etc. at the table
    items: List[OrderItem]
    subtotal: float
    status: OrderStatus = OrderStatus.PENDING
    confirmed_at: Optional[datetime] = None
    sent_to_kitchen_at: Optional[datetime] = None
    sent_to_bar_at: Optional[datetime] = None

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    table_number: int
    waitress_id: str
    waitress_name: str
    clients: List[ClientOrder]
    total_amount: float
    status: OrderStatus = OrderStatus.PENDING
    # Separate status tracking for mixed orders
    kitchen_status: OrderStatus = OrderStatus.PENDING  # For food items
    bar_status: OrderStatus = OrderStatus.PENDING      # For drink items  
    has_food_items: bool = False
    has_drink_items: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    special_notes: Optional[str] = None

class OrderCreate(BaseModel):
    table_number: int
    clients: List[ClientOrder]
    special_notes: Optional[str] = None

class OrderUpdate(BaseModel):
    status: OrderStatus

class ClientOrderUpdate(BaseModel):
    client_id: str
    status: OrderStatus

# Authentication functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm="HS256")

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await db.users.find_one({"id": payload.get("user_id")})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return User(**user)

def require_role(allowed_roles: List[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker

# Initialize default data
async def init_default_data():
    """Initialize default categories, users and menu data"""
    
    # Create default categories if they don't exist
    default_categories = [
        {"name": "appetizers", "display_name": "Закуски", "emoji": "🥗", "description": "Стартеры и небольшие блюда", "department": "kitchen", "sort_order": 1},
        {"name": "main_dishes", "display_name": "Основные блюда", "emoji": "🍽️", "description": "Главные блюда", "department": "kitchen", "sort_order": 2},
        {"name": "desserts", "display_name": "Десерты", "emoji": "🍰", "description": "Сладости и десерты", "department": "kitchen", "sort_order": 3},
        {"name": "beverages", "display_name": "Напитки", "emoji": "🥤", "description": "Напитки и коктейли", "department": "bar", "sort_order": 4},
        {"name": "cocktails", "display_name": "Коктейли", "emoji": "🍹", "description": "Алкогольные коктейли", "department": "bar", "sort_order": 5}
    ]
    
    category_mapping = {}
    for cat_data in default_categories:
        existing_cat = await db.categories.find_one({"name": cat_data["name"]})
        if not existing_cat:
            category = Category(**cat_data)
            await db.categories.insert_one(category.dict())
            category_mapping[cat_data["name"]] = category.id
        else:
            category_mapping[cat_data["name"]] = existing_cat["id"]
    
    # Create default users if they don't exist
    default_users = [
        {"username": "waitress1", "password": "password123", "role": UserRole.WAITRESS, "full_name": "Sarah Johnson", "email": "sarah@restaurant.com"},
        {"username": "kitchen1", "password": "password123", "role": UserRole.KITCHEN, "full_name": "Chef Mike", "email": "chef@restaurant.com"},
        {"username": "bartender1", "password": "password123", "role": UserRole.BARTENDER, "full_name": "Tom Wilson", "email": "tom@restaurant.com"},
        {"username": "admin1", "password": "password123", "role": UserRole.ADMINISTRATOR, "full_name": "Manager Lisa", "email": "admin@restaurant.com"}
    ]
    
    for user_data in default_users:
        existing_user = await db.users.find_one({"username": user_data["username"]})
        if not existing_user:
            user = User(
                username=user_data["username"],
                password_hash=get_password_hash(user_data["password"]),
                role=user_data["role"],
                full_name=user_data["full_name"],
                email=user_data["email"]
            )
            await db.users.insert_one(user.dict())
    
    # Initialize menu data if collection is empty
    count = await db.menu_items.count_documents({})
    if count == 0:
        sample_menu = [
            # Appetizers
            {"name": "Caesar Salad", "description": "Fresh romaine lettuce, parmesan cheese, croutons, caesar dressing", "price": 12.99, "category_id": category_mapping["appetizers"], "item_type": ItemType.FOOD},
            {"name": "Buffalo Wings", "description": "Crispy chicken wings with buffalo sauce and blue cheese dip", "price": 14.99, "category_id": category_mapping["appetizers"], "item_type": ItemType.FOOD},
            {"name": "Mozzarella Sticks", "description": "Golden fried mozzarella with marinara sauce", "price": 9.99, "category_id": category_mapping["appetizers"], "item_type": ItemType.FOOD},
            
            # Main Dishes
            {"name": "Grilled Salmon", "description": "Fresh Atlantic salmon with lemon herb butter, rice pilaf, and vegetables", "price": 22.99, "category_id": category_mapping["main_dishes"], "item_type": ItemType.FOOD},
            {"name": "Chicken Parmesan", "description": "Breaded chicken breast with marinara sauce and mozzarella, served with pasta", "price": 18.99, "category_id": category_mapping["main_dishes"], "item_type": ItemType.FOOD},
            {"name": "Beef Burger", "description": "Juicy beef patty with lettuce, tomato, cheese, and fries", "price": 15.99, "category_id": category_mapping["main_dishes"], "item_type": ItemType.FOOD},
            
            # Desserts
            {"name": "Chocolate Cake", "description": "Rich chocolate layer cake with chocolate frosting", "price": 7.99, "category_id": category_mapping["desserts"], "item_type": ItemType.FOOD},
            {"name": "Cheesecake", "description": "Classic New York style cheesecake with berry compote", "price": 8.99, "category_id": category_mapping["desserts"], "item_type": ItemType.FOOD},
            
            # Beverages
            {"name": "Coca Cola", "description": "Classic cola soft drink", "price": 2.99, "category_id": category_mapping["beverages"], "item_type": ItemType.DRINK},
            {"name": "Fresh Orange Juice", "description": "Freshly squeezed orange juice", "price": 4.99, "category_id": category_mapping["beverages"], "item_type": ItemType.DRINK},
            {"name": "Coffee", "description": "Freshly brewed coffee", "price": 3.99, "category_id": category_mapping["beverages"], "item_type": ItemType.DRINK},
            {"name": "Beer", "description": "Cold draft beer", "price": 5.99, "category_id": category_mapping["beverages"], "item_type": ItemType.DRINK},
            {"name": "Wine Glass", "description": "Red or white wine by the glass", "price": 7.99, "category_id": category_mapping["beverages"], "item_type": ItemType.DRINK}
        ]
        
        for item_data in sample_menu:
            item = MenuItem(**item_data)
            await db.menu_items.insert_one(item.dict())

# Authentication endpoints
@api_router.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    """User login"""
    user = await db.users.find_one({"username": user_credentials.username})
    if not user or not verify_password(user_credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is disabled"
        )
    
    access_token = create_access_token(data={"user_id": user["id"], "role": user["role"]})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user["id"],
        role=user["role"],
        full_name=user["full_name"]
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse(**current_user.dict())

# Category endpoints
@api_router.get("/categories", response_model=List[Category])
async def get_categories(current_user: User = Depends(get_current_user)):
    """Get all categories"""
    categories = await db.categories.find({"is_active": True}).sort("sort_order").to_list(1000)
    return [Category(**cat) for cat in categories]

@api_router.get("/categories/all", response_model=List[Category])
async def get_all_categories(current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Get all categories including inactive ones (admin only)"""
    categories = await db.categories.find().sort("sort_order").to_list(1000)
    return [Category(**cat) for cat in categories]

@api_router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate, current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Create new category (admin only)"""
    # Check if category name already exists
    existing_cat = await db.categories.find_one({"name": category_data.name})
    if existing_cat:
        raise HTTPException(status_code=400, detail="Category name already exists")
    
    category = Category(**category_data.dict())
    await db.categories.insert_one(category.dict())
    return category

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category_data: CategoryUpdate, current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Update category (admin only)"""
    category = await db.categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if new name already exists (if name is being updated)
    if category_data.name and category_data.name != category["name"]:
        existing_cat = await db.categories.find_one({"name": category_data.name})
        if existing_cat:
            raise HTTPException(status_code=400, detail="Category name already exists")
    
    update_data = {k: v for k, v in category_data.dict().items() if v is not None}
    if update_data:
        await db.categories.update_one({"id": category_id}, {"$set": update_data})
    
    updated_category = await db.categories.find_one({"id": category_id})
    return Category(**updated_category)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Delete category (admin only)"""
    # Check if category has associated menu items
    menu_items_count = await db.menu_items.count_documents({"category_id": category_id})
    if menu_items_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete category with associated menu items")
    
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# User Management endpoints
@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Get all users (admin only)"""
    users = await db.users.find().sort("created_at", -1).to_list(1000)
    
    # Handle missing updated_at field for backward compatibility
    result = []
    for user in users:
        if "updated_at" not in user:
            user["updated_at"] = user.get("created_at", datetime.utcnow())
        result.append(UserResponse(**user))
    
    return result

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Create new user (admin only)"""
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(
        username=user_data.username,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        full_name=user_data.full_name,
        email=user_data.email,
        phone=user_data.phone
    )
    
    await db.users.insert_one(user.dict())
    return UserResponse(**user.dict())

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Get specific user (admin only)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserUpdate, current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Update user (admin only)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if new username already exists (if username is being updated)
    if user_data.username and user_data.username != user["username"]:
        existing_user = await db.users.find_one({"username": user_data.username})
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
    
    update_data = {k: v for k, v in user_data.dict().items() if v is not None}
    
    # Hash password if provided
    if user_data.password:
        update_data["password_hash"] = get_password_hash(user_data.password)
        del update_data["password"]
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user_id})
    return UserResponse(**updated_user)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Delete user (admin only)"""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

# Menu endpoints
@api_router.get("/menu", response_model=List[MenuItemWithCategory])
async def get_menu(current_user: User = Depends(get_current_user)):
    """Get all menu items with category information (shows unavailable items to waitresses)"""
    # For waitresses, show all items but mark unavailable ones
    # For other roles, show all items
    pipeline = [
        {"$lookup": {
            "from": "categories",
            "localField": "category_id",
            "foreignField": "id",
            "as": "category"
        }},
        {"$unwind": "$category"},
        {"$match": {"category.is_active": True}},
        {"$sort": {"category.sort_order": 1, "name": 1}}
    ]
    
    menu_items = await db.menu_items.aggregate(pipeline).to_list(1000)
    
    result = []
    for item in menu_items:
        result.append(MenuItemWithCategory(
            id=item["id"],
            name=item["name"],
            description=item["description"],
            price=item["price"],
            category_id=item["category_id"],
            category_name=item["category"]["name"],
            category_display_name=item["category"]["display_name"],
            category_emoji=item["category"]["emoji"],
            item_type=item["item_type"],
            available=item["available"],
            on_stop_list=item["on_stop_list"],
            bottle_available=item.get("bottle_available", False),
            bottle_price=item.get("bottle_price"),
            image_url=item.get("image_url"),
            created_at=item["created_at"],
            updated_at=item["updated_at"]
        ))
    
    return result

@api_router.get("/menu/all", response_model=List[MenuItemWithCategory])
async def get_all_menu_items(current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Get all menu items including unavailable ones (admin only)"""
    pipeline = [
        {"$lookup": {
            "from": "categories",
            "localField": "category_id",
            "foreignField": "id",
            "as": "category"
        }},
        {"$unwind": "$category"},
        {"$sort": {"category.sort_order": 1, "name": 1}}
    ]
    
    menu_items = await db.menu_items.aggregate(pipeline).to_list(1000)
    
    result = []
    for item in menu_items:
        result.append(MenuItemWithCategory(
            id=item["id"],
            name=item["name"],
            description=item["description"],
            price=item["price"],
            category_id=item["category_id"],
            category_name=item["category"]["name"],
            category_display_name=item["category"]["display_name"],
            category_emoji=item["category"]["emoji"],
            item_type=item["item_type"],
            available=item["available"],
            on_stop_list=item["on_stop_list"],
            bottle_available=item.get("bottle_available", False),
            bottle_price=item.get("bottle_price"),
            image_url=item.get("image_url"),
            created_at=item["created_at"],
            updated_at=item["updated_at"]
        ))
    
    return result

@api_router.post("/menu", response_model=MenuItem)
async def create_menu_item(item_data: MenuItemCreate, current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Create new menu item (admin only)"""
    # Verify category exists
    category = await db.categories.find_one({"id": item_data.category_id})
    if not category:
        raise HTTPException(status_code=400, detail="Category not found")
    
    item = MenuItem(**item_data.dict())
    await db.menu_items.insert_one(item.dict())
    return item

@api_router.put("/menu/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, item_data: MenuItemUpdate, current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Update menu item (admin only)"""
    item = await db.menu_items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    # Verify category exists if category_id is being updated
    if item_data.category_id:
        category = await db.categories.find_one({"id": item_data.category_id})
        if not category:
            raise HTTPException(status_code=400, detail="Category not found")
    
    update_data = {k: v for k, v in item_data.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.menu_items.update_one({"id": item_id}, {"$set": update_data})
    
    updated_item = await db.menu_items.find_one({"id": item_id})
    return MenuItem(**updated_item)

@api_router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str, current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Delete menu item (admin only)"""
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted successfully"}

@api_router.get("/menu/category/{category_id}", response_model=List[MenuItemWithCategory])
async def get_menu_by_category(category_id: str, current_user: User = Depends(get_current_user)):
    """Get menu items by category"""
    pipeline = [
        {"$match": {"category_id": category_id, "available": True, "on_stop_list": False}},
        {"$lookup": {
            "from": "categories",
            "localField": "category_id",
            "foreignField": "id",
            "as": "category"
        }},
        {"$unwind": "$category"},
        {"$match": {"category.is_active": True}},
        {"$sort": {"name": 1}}
    ]
    
    menu_items = await db.menu_items.aggregate(pipeline).to_list(1000)
    
    result = []
    for item in menu_items:
        result.append(MenuItemWithCategory(
            id=item["id"],
            name=item["name"],
            description=item["description"],
            price=item["price"],
            category_id=item["category_id"],
            category_name=item["category"]["name"],
            category_display_name=item["category"]["display_name"],
            category_emoji=item["category"]["emoji"],
            item_type=item["item_type"],
            available=item["available"],
            on_stop_list=item["on_stop_list"],
            image_url=item.get("image_url"),
            created_at=item["created_at"],
            updated_at=item["updated_at"]
        ))
    
    return result

@api_router.get("/menu/type/{item_type}", response_model=List[MenuItemWithCategory])
async def get_menu_by_type(item_type: ItemType, current_user: User = Depends(get_current_user)):
    """Get menu items by type (food/drink)"""
    pipeline = [
        {"$match": {"item_type": item_type, "available": True, "on_stop_list": False}},
        {"$lookup": {
            "from": "categories",
            "localField": "category_id",
            "foreignField": "id",
            "as": "category"
        }},
        {"$unwind": "$category"},
        {"$match": {"category.is_active": True}},
        {"$sort": {"category.sort_order": 1, "name": 1}}
    ]
    
    menu_items = await db.menu_items.aggregate(pipeline).to_list(1000)
    
    result = []
    for item in menu_items:
        result.append(MenuItemWithCategory(
            id=item["id"],
            name=item["name"],
            description=item["description"],
            price=item["price"],
            category_id=item["category_id"],
            category_name=item["category"]["name"],
            category_display_name=item["category"]["display_name"],
            category_emoji=item["category"]["emoji"],
            item_type=item["item_type"],
            available=item["available"],
            on_stop_list=item["on_stop_list"],
            image_url=item.get("image_url"),
            created_at=item["created_at"],
            updated_at=item["updated_at"]
        ))
    
    return result

# Order endpoints
@api_router.post("/orders")
async def create_order(order_data: SimpleOrderCreate, current_user: User = Depends(require_role([UserRole.WAITRESS, UserRole.ADMINISTRATOR]))):
    """Create new order with simple format (waitress only)"""
    try:
        # Create simple order document
        order = {
            "id": str(uuid.uuid4()),
            "customer_name": order_data.customer_name,
            "table_number": order_data.table_number,
            "items": [item.dict() for item in order_data.items],
            "total": order_data.total,
            "status": order_data.status,
            "notes": order_data.notes,
            "waitress_id": current_user.id,
            "waitress_name": current_user.full_name,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Determine if order has food and/or drink items
        has_food_items = False
        has_drink_items = False
        
        # Add menu item names to items and check types
        for item in order["items"]:
            menu_item = await db.menu_items.find_one({"id": item["menu_item_id"]})
            if menu_item:
                item["menu_item_name"] = menu_item["name"]
                item["item_type"] = menu_item["item_type"]
                if menu_item["item_type"] == "food":
                    has_food_items = True
                elif menu_item["item_type"] == "drink":
                    has_drink_items = True
            else:
                item["menu_item_name"] = "Unknown Item"
                item["item_type"] = "food"
                has_food_items = True
        
        # Set appropriate statuses based on order contents
        order["has_food_items"] = has_food_items
        order["has_drink_items"] = has_drink_items
        order["kitchen_status"] = "pending" if has_food_items else "ready"
        order["bar_status"] = "pending" if has_drink_items else "ready"
        
        await db.orders.insert_one(order)
        return {"success": True, "order_id": order["id"]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")

@api_router.get("/orders")
async def get_orders(current_user: User = Depends(get_current_user)):
    """Get orders based on user role"""
    if current_user.role == UserRole.WAITRESS:
        # Waitress sees only their own orders
        orders = await db.orders.find({"waitress_id": current_user.id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    else:
        # Kitchen, bartender, and administrator see all orders
        orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    return orders

@api_router.get("/orders/admin")
async def get_admin_orders(
    current_user: User = Depends(require_role([UserRole.ADMINISTRATOR])),
    hours_back: int = Query(24, description="Hours back from now to show orders (default: 24)"),
    from_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    to_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    include_served: bool = Query(False, description="Include orders with 'served' status (default: false)")
):
    """Get orders for administrator with filtering options"""
    
    # Build date filter
    query_filter = {}
    
    if from_date and to_date:
        # Use specific date range
        try:
            start_date = datetime.strptime(from_date, "%Y-%m-%d")
            end_date = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)  # Include full end date
            query_filter["created_at"] = {"$gte": start_date, "$lt": end_date}
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        # Use hours_back from current time
        cutoff_time = datetime.utcnow() - timedelta(hours=hours_back)
        query_filter["created_at"] = {"$gte": cutoff_time}
    
    # Add status filter
    if not include_served:
        query_filter["status"] = {"$ne": "served"}
    
    # Get filtered orders
    orders = await db.orders.find(query_filter, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    return {
        "orders": orders,
        "filters": {
            "hours_back": hours_back,
            "from_date": from_date,
            "to_date": to_date,
            "include_served": include_served,
            "total_count": len(orders)
        }
    }

@api_router.get("/orders/kitchen")
async def get_kitchen_orders(current_user: User = Depends(require_role([UserRole.KITCHEN, UserRole.ADMINISTRATOR]))):
    """Get orders with food items for kitchen"""
    orders = await db.orders.find({"status": {"$in": ["pending", "confirmed", "preparing"]}}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    kitchen_orders = []
    for order in orders:
        # Filter items to show only food items
        food_items = [item for item in order.get("items", []) if item.get("item_type") == "food"]
        if food_items:
            kitchen_order = order.copy()
            kitchen_order["items"] = food_items
            kitchen_orders.append(kitchen_order)
    
    return kitchen_orders

@api_router.get("/orders/bar")
async def get_bar_orders(current_user: User = Depends(require_role([UserRole.BARTENDER, UserRole.ADMINISTRATOR]))):
    """Get orders with drink items for bar"""
    orders = await db.orders.find({"status": {"$in": ["pending", "confirmed", "preparing"]}}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    bar_orders = []
    for order in orders:
        # Filter items to show only drink items
        drink_items = [item for item in order.get("items", []) if item.get("item_type") == "drink"]
        if drink_items:
            bar_order = order.copy()
            bar_order["items"] = drink_items
            bar_orders.append(bar_order)
    
    return bar_orders

@api_router.put("/orders/{order_id}")
async def update_order_status(order_id: str, status_update: dict, current_user: User = Depends(get_current_user)):
    """Update order status with smart mixed order logic"""
    try:
        order = await db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        new_status = status_update.get("status")
        update_fields = {"updated_at": datetime.utcnow()}
        
        # Determine what part of the order to update based on user role
        if current_user.role == UserRole.KITCHEN:
            # Kitchen updates food status
            update_fields["kitchen_status"] = new_status
        elif current_user.role == UserRole.BARTENDER:
            # Bar updates drink status  
            update_fields["bar_status"] = new_status
        else:
            # Admin can update overall status directly
            update_fields["status"] = new_status
            
        # Calculate overall order status for mixed orders
        if current_user.role in [UserRole.KITCHEN, UserRole.BARTENDER]:
            current_kitchen_status = order.get("kitchen_status", "pending")
            current_bar_status = order.get("bar_status", "pending")
            has_food = order.get("has_food_items", False)
            has_drinks = order.get("has_drink_items", False)
            
            # Update the specific status
            if current_user.role == UserRole.KITCHEN:
                current_kitchen_status = new_status
            else:
                current_bar_status = new_status
            
            # Determine overall status
            if has_food and has_drinks:
                # Mixed order - both parts must be ready
                if current_kitchen_status == "ready" and current_bar_status == "ready":
                    update_fields["status"] = "ready"
                elif current_kitchen_status == "served" and current_bar_status == "served":
                    update_fields["status"] = "served"  
                else:
                    update_fields["status"] = "preparing"
            elif has_food:
                # Food-only order
                update_fields["status"] = current_kitchen_status
            elif has_drinks:
                # Drink-only order
                update_fields["status"] = current_bar_status
        
        result = await db.orders.update_one(
            {"id": order_id},
            {"$set": update_fields}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
            
        return {"success": True}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update order: {str(e)}")

@api_router.get("/orders/table/{table_number}")
async def get_orders_by_table(table_number: int, current_user: User = Depends(get_current_user)):
    """Get orders for a specific table"""
    orders = await db.orders.find({"table_number": table_number}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

# Menu item management endpoints
@api_router.post("/menu", response_model=MenuItem)
async def create_menu_item(menu_item: MenuItemCreate, current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Create a new menu item (admin only)"""
    # Verify category exists
    category = await db.categories.find_one({"id": menu_item.category_id})
    if not category:
        raise HTTPException(status_code=400, detail="Category not found")
    
    new_item = MenuItem(**menu_item.dict())
    await db.menu_items.insert_one(new_item.dict())
    return new_item

@api_router.put("/menu/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, menu_item: MenuItemUpdate, current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Update a menu item (admin only)"""
    existing_item = await db.menu_items.find_one({"id": item_id})
    if not existing_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    # If category_id is being updated, verify it exists
    if menu_item.category_id:
        category = await db.categories.find_one({"id": menu_item.category_id})
        if not category:
            raise HTTPException(status_code=400, detail="Category not found")
    
    update_data = {k: v for k, v in menu_item.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.menu_items.update_one(
        {"id": item_id},
        {"$set": update_data}
    )
    
    updated_item = await db.menu_items.find_one({"id": item_id})
    return MenuItem(**updated_item)

@api_router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str, current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Delete a menu item (admin only)"""
    existing_item = await db.menu_items.find_one({"id": item_id})
    if not existing_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    await db.menu_items.delete_one({"id": item_id})
    return {"message": "Menu item deleted successfully"}

# Table management
@api_router.get("/tables")
async def get_tables(current_user: User = Depends(get_current_user)):
    """Get available tables"""
    return {"tables": list(range(1, 29))}  # Tables 1-28

# Dashboard stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    """Get dashboard statistics"""
    if current_user.role == UserRole.WAITRESS:
        # Waitress sees only their own stats
        filter_query = {"waitress_id": current_user.id}
    else:
        # Others see all stats
        filter_query = {}
    
    total_orders = await db.orders.count_documents(filter_query)
    pending_orders = await db.orders.count_documents({**filter_query, "status": OrderStatus.PENDING})
    confirmed_orders = await db.orders.count_documents({**filter_query, "status": OrderStatus.CONFIRMED})
    preparing_orders = await db.orders.count_documents({**filter_query, "status": OrderStatus.PREPARING})
    ready_orders = await db.orders.count_documents({**filter_query, "status": OrderStatus.READY})
    
    # Additional stats for admin
    if current_user.role == UserRole.ADMINISTRATOR:
        total_users = await db.users.count_documents({})
        total_categories = await db.categories.count_documents({"is_active": True})
        total_menu_items = await db.menu_items.count_documents({"available": True})
        
        return {
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "confirmed_orders": confirmed_orders,
            "preparing_orders": preparing_orders,
            "ready_orders": ready_orders,
            "total_users": total_users,
            "total_categories": total_categories,
            "total_menu_items": total_menu_items
        }
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "confirmed_orders": confirmed_orders,
        "preparing_orders": preparing_orders,
        "ready_orders": ready_orders
    }

# XLSX Import Models
class ImportResult(BaseModel):
    success: bool
    total_items: int
    created_items: int
    updated_items: int
    errors: List[str]

class MenuItemAvailabilityToggle(BaseModel):
    item_id: str
    available: bool

# XLSX Menu Import endpoint
@api_router.post("/menu/import", response_model=ImportResult)
async def import_menu_from_xlsx(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))
):
    """Import menu items from XLSX file (admin only)"""
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Only XLSX files are supported")
    
    try:
        # Read the uploaded file
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Expected columns
        required_columns = ['name', 'description', 'price', 'category_id', 'item_type']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        # Get all categories for validation
        categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
        category_ids = {cat['id'] for cat in categories}
        
        created_items = 0
        updated_items = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Validate required fields
                name = str(row['name']).strip()
                if not name or name == 'nan':
                    errors.append(f"Row {index + 2}: Name is required")
                    continue
                
                description = str(row['description']).strip() if pd.notna(row['description']) else ""
                
                try:
                    price = float(row['price'])
                    if price <= 0:
                        errors.append(f"Row {index + 2}: Price must be positive")
                        continue
                except (ValueError, TypeError):
                    errors.append(f"Row {index + 2}: Invalid price format")
                    continue
                
                category_id = str(row['category_id']).strip()
                if category_id not in category_ids:
                    errors.append(f"Row {index + 2}: Category '{category_id}' not found")
                    continue
                
                item_type = str(row['item_type']).strip().lower()
                if item_type not in ['food', 'drink']:
                    errors.append(f"Row {index + 2}: item_type must be 'food' or 'drink'")
                    continue
                
                # Check for existing item by name (case-insensitive)
                existing_item = await db.menu_items.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
                
                menu_item_data = {
                    "name": name,
                    "description": description,
                    "price": price,
                    "category_id": category_id,
                    "item_type": item_type,
                    "available": True,  # Default to available
                    "on_stop_list": False,  # Default to not on stop list
                    "updated_at": datetime.utcnow()
                }
                
                if existing_item:
                    # Update existing item
                    await db.menu_items.update_one(
                        {"id": existing_item["id"]},
                        {"$set": menu_item_data}
                    )
                    updated_items += 1
                else:
                    # Create new item
                    menu_item_data.update({
                        "id": str(uuid.uuid4()),
                        "created_at": datetime.utcnow()
                    })
                    await db.menu_items.insert_one(menu_item_data)
                    created_items += 1
                    
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
        
        return ImportResult(
            success=len(errors) == 0,
            total_items=len(df),
            created_items=created_items,
            updated_items=updated_items,
            errors=errors
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

# Menu item availability toggle endpoint
@api_router.patch("/menu/{item_id}/availability")
async def toggle_menu_item_availability(
    item_id: str,
    availability: MenuItemAvailabilityToggle,
    current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))
):
    """Toggle menu item availability (admin only)"""
    existing_item = await db.menu_items.find_one({"id": item_id})
    if not existing_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    await db.menu_items.update_one(
        {"id": item_id},
        {"$set": {"available": availability.available, "updated_at": datetime.utcnow()}}
    )
    
    return {"success": True, "message": f"Item availability updated to {availability.available}"}

# Get menu stats (including hidden items count)
@api_router.get("/menu/stats")
async def get_menu_stats(current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Get menu statistics (admin only)"""
    total_items = await db.menu_items.count_documents({})
    available_items = await db.menu_items.count_documents({"available": True})
    hidden_items = await db.menu_items.count_documents({"available": False})
    
    # Group by category
    pipeline = [
        {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
        {
            "$lookup": {
                "from": "categories",
                "localField": "_id", 
                "foreignField": "id",
                "as": "category"
            }
        },
        {"$unwind": "$category"},
        {
            "$project": {
                "category_name": "$category.display_name",
                "count": 1
            }
        }
    ]
    
    category_counts = await db.menu_items.aggregate(pipeline).to_list(1000)
    
    return {
        "total_items": total_items,
        "available_items": available_items,
        "hidden_items": hidden_items,
        "by_category": category_counts
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
    await init_default_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
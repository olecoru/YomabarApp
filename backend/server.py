from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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
from datetime import datetime
from enum import Enum
import jwt
from passlib.context import CryptContext

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

class MenuCategory(str, Enum):
    APPETIZERS = "appetizers"
    MAIN_DISHES = "main_dishes"
    DESSERTS = "desserts"
    BEVERAGES = "beverages"

class ItemType(str, Enum):
    FOOD = "food"
    DRINK = "drink"

# User Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    role: UserRole
    full_name: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole
    full_name: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    role: UserRole
    full_name: str

# Menu Models
class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: MenuCategory
    item_type: ItemType
    available: bool = True
    on_stop_list: bool = False
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MenuItemCreate(BaseModel):
    name: str
    description: str
    price: float
    category: MenuCategory
    item_type: ItemType

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[MenuCategory] = None
    item_type: Optional[ItemType] = None
    available: Optional[bool] = None
    on_stop_list: Optional[bool] = None

# Order Models
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

# Initialize default users and menu data
async def init_default_data():
    """Initialize default users and menu data"""
    # Create default users if they don't exist
    default_users = [
        {"username": "waitress1", "password": "password123", "role": UserRole.WAITRESS, "full_name": "Sarah Johnson"},
        {"username": "kitchen1", "password": "password123", "role": UserRole.KITCHEN, "full_name": "Chef Mike"},
        {"username": "bartender1", "password": "password123", "role": UserRole.BARTENDER, "full_name": "Tom Wilson"},
        {"username": "admin1", "password": "password123", "role": UserRole.ADMINISTRATOR, "full_name": "Manager Lisa"}
    ]
    
    for user_data in default_users:
        existing_user = await db.users.find_one({"username": user_data["username"]})
        if not existing_user:
            user = User(
                username=user_data["username"],
                password_hash=get_password_hash(user_data["password"]),
                role=user_data["role"],
                full_name=user_data["full_name"]
            )
            await db.users.insert_one(user.dict())
    
    # Initialize menu data if collection is empty
    count = await db.menu_items.count_documents({})
    if count == 0:
        sample_menu = [
            # Appetizers (Food)
            MenuItem(
                name="Caesar Salad",
                description="Fresh romaine lettuce, parmesan cheese, croutons, caesar dressing",
                price=12.99,
                category=MenuCategory.APPETIZERS,
                item_type=ItemType.FOOD
            ),
            MenuItem(
                name="Buffalo Wings",
                description="Crispy chicken wings with buffalo sauce and blue cheese dip",
                price=14.99,
                category=MenuCategory.APPETIZERS,
                item_type=ItemType.FOOD
            ),
            MenuItem(
                name="Mozzarella Sticks",
                description="Golden fried mozzarella with marinara sauce",
                price=9.99,
                category=MenuCategory.APPETIZERS,
                item_type=ItemType.FOOD
            ),
            
            # Main Dishes (Food)
            MenuItem(
                name="Grilled Salmon",
                description="Fresh Atlantic salmon with lemon herb butter, rice pilaf, and vegetables",
                price=22.99,
                category=MenuCategory.MAIN_DISHES,
                item_type=ItemType.FOOD
            ),
            MenuItem(
                name="Chicken Parmesan",
                description="Breaded chicken breast with marinara sauce and mozzarella, served with pasta",
                price=18.99,
                category=MenuCategory.MAIN_DISHES,
                item_type=ItemType.FOOD
            ),
            MenuItem(
                name="Beef Burger",
                description="Juicy beef patty with lettuce, tomato, cheese, and fries",
                price=15.99,
                category=MenuCategory.MAIN_DISHES,
                item_type=ItemType.FOOD
            ),
            
            # Desserts (Food)
            MenuItem(
                name="Chocolate Cake",
                description="Rich chocolate layer cake with chocolate frosting",
                price=7.99,
                category=MenuCategory.DESSERTS,
                item_type=ItemType.FOOD
            ),
            MenuItem(
                name="Cheesecake",
                description="Classic New York style cheesecake with berry compote",
                price=8.99,
                category=MenuCategory.DESSERTS,
                item_type=ItemType.FOOD
            ),
            
            # Beverages (Drink)
            MenuItem(
                name="Coca Cola",
                description="Classic cola soft drink",
                price=2.99,
                category=MenuCategory.BEVERAGES,
                item_type=ItemType.DRINK
            ),
            MenuItem(
                name="Fresh Orange Juice",
                description="Freshly squeezed orange juice",
                price=4.99,
                category=MenuCategory.BEVERAGES,
                item_type=ItemType.DRINK
            ),
            MenuItem(
                name="Coffee",
                description="Freshly brewed coffee",
                price=3.99,
                category=MenuCategory.BEVERAGES,
                item_type=ItemType.DRINK
            ),
            MenuItem(
                name="Beer",
                description="Cold draft beer",
                price=5.99,
                category=MenuCategory.BEVERAGES,
                item_type=ItemType.DRINK
            ),
            MenuItem(
                name="Wine Glass",
                description="Red or white wine by the glass",
                price=7.99,
                category=MenuCategory.BEVERAGES,
                item_type=ItemType.DRINK
            )
        ]
        
        for item in sample_menu:
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

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate, current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Register new user (admin only)"""
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    user = User(
        username=user_data.username,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        full_name=user_data.full_name
    )
    
    await db.users.insert_one(user.dict())
    return user

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user

# Menu endpoints
@api_router.get("/menu", response_model=List[MenuItem])
async def get_menu(current_user: User = Depends(get_current_user)):
    """Get all available menu items"""
    menu_items = await db.menu_items.find({"available": True, "on_stop_list": False}).to_list(1000)
    return [MenuItem(**item) for item in menu_items]

@api_router.get("/menu/all", response_model=List[MenuItem])
async def get_all_menu_items(current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Get all menu items including unavailable ones (admin only)"""
    menu_items = await db.menu_items.find().to_list(1000)
    return [MenuItem(**item) for item in menu_items]

@api_router.post("/menu", response_model=MenuItem)
async def create_menu_item(item_data: MenuItemCreate, current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Create new menu item (admin only)"""
    item = MenuItem(**item_data.dict())
    await db.menu_items.insert_one(item.dict())
    return item

@api_router.put("/menu/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, item_data: MenuItemUpdate, current_user: User = Depends(require_role([UserRole.ADMINISTRATOR]))):
    """Update menu item (admin only)"""
    item = await db.menu_items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    update_data = {k: v for k, v in item_data.dict().items() if v is not None}
    if update_data:
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

@api_router.get("/menu/category/{category}", response_model=List[MenuItem])
async def get_menu_by_category(category: MenuCategory, current_user: User = Depends(get_current_user)):
    """Get menu items by category"""
    menu_items = await db.menu_items.find({"category": category, "available": True, "on_stop_list": False}).to_list(1000)
    return [MenuItem(**item) for item in menu_items]

@api_router.get("/menu/type/{item_type}", response_model=List[MenuItem])
async def get_menu_by_type(item_type: ItemType, current_user: User = Depends(get_current_user)):
    """Get menu items by type (food/drink)"""
    menu_items = await db.menu_items.find({"item_type": item_type, "available": True, "on_stop_list": False}).to_list(1000)
    return [MenuItem(**item) for item in menu_items]

# Order endpoints
@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, current_user: User = Depends(require_role([UserRole.WAITRESS, UserRole.ADMINISTRATOR]))):
    """Create new order (waitress only)"""
    # Calculate totals for each client
    for client in order_data.clients:
        client.subtotal = sum(item.price * item.quantity for item in client.items)
    
    total_amount = sum(client.subtotal for client in order_data.clients)
    
    order = Order(
        table_number=order_data.table_number,
        waitress_id=current_user.id,
        waitress_name=current_user.full_name,
        clients=order_data.clients,
        total_amount=total_amount,
        special_notes=order_data.special_notes
    )
    
    await db.orders.insert_one(order.dict())
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: User = Depends(get_current_user)):
    """Get orders based on user role"""
    if current_user.role == UserRole.WAITRESS:
        # Waitress sees only their own orders
        orders = await db.orders.find({"waitress_id": current_user.id}).sort("created_at", -1).to_list(1000)
    elif current_user.role in [UserRole.KITCHEN, UserRole.BARTENDER]:
        # Kitchen and bartender see all orders
        orders = await db.orders.find().sort("created_at", -1).to_list(1000)
    else:
        # Administrator sees all orders
        orders = await db.orders.find().sort("created_at", -1).to_list(1000)
    
    return [Order(**order) for order in orders]

@api_router.get("/orders/kitchen", response_model=List[Order])
async def get_kitchen_orders(current_user: User = Depends(require_role([UserRole.KITCHEN, UserRole.ADMINISTRATOR]))):
    """Get orders with food items for kitchen"""
    orders = await db.orders.find().sort("created_at", -1).to_list(1000)
    
    # Filter orders to show only those with food items
    kitchen_orders = []
    for order in orders:
        order_obj = Order(**order)
        # Filter clients to show only those with food items
        filtered_clients = []
        for client in order_obj.clients:
            food_items = [item for item in client.items if item.item_type == ItemType.FOOD]
            if food_items:
                filtered_client = client.copy()
                filtered_client.items = food_items
                filtered_clients.append(filtered_client)
        
        if filtered_clients:
            order_obj.clients = filtered_clients
            kitchen_orders.append(order_obj)
    
    return kitchen_orders

@api_router.get("/orders/bar", response_model=List[Order])
async def get_bar_orders(current_user: User = Depends(require_role([UserRole.BARTENDER, UserRole.ADMINISTRATOR]))):
    """Get orders with drink items for bartender"""
    orders = await db.orders.find().sort("created_at", -1).to_list(1000)
    
    # Filter orders to show only those with drink items
    bar_orders = []
    for order in orders:
        order_obj = Order(**order)
        # Filter clients to show only those with drink items
        filtered_clients = []
        for client in order_obj.clients:
            drink_items = [item for item in client.items if item.item_type == ItemType.DRINK]
            if drink_items:
                filtered_client = client.copy()
                filtered_client.items = drink_items
                filtered_clients.append(filtered_client)
        
        if filtered_clients:
            order_obj.clients = filtered_clients
            bar_orders.append(order_obj)
    
    return bar_orders

@api_router.put("/orders/{order_id}/client/{client_id}", response_model=Order)
async def update_client_order_status(order_id: str, client_id: str, status_update: OrderUpdate, current_user: User = Depends(get_current_user)):
    """Update client order status"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update the specific client's status
    updated = False
    for client in order["clients"]:
        if client["client_id"] == client_id:
            client["status"] = status_update.status
            if status_update.status == OrderStatus.CONFIRMED:
                client["confirmed_at"] = datetime.utcnow()
            elif status_update.status == OrderStatus.SENT_TO_KITCHEN:
                client["sent_to_kitchen_at"] = datetime.utcnow()
            elif status_update.status == OrderStatus.SENT_TO_BAR:
                client["sent_to_bar_at"] = datetime.utcnow()
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=404, detail="Client not found in order")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"clients": order["clients"], "updated_at": datetime.utcnow()}}
    )
    
    updated_order = await db.orders.find_one({"id": order_id})
    return Order(**updated_order)

@api_router.get("/orders/table/{table_number}", response_model=List[Order])
async def get_orders_by_table(table_number: int, current_user: User = Depends(get_current_user)):
    """Get orders for a specific table"""
    orders = await db.orders.find({"table_number": table_number}).sort("created_at", -1).to_list(1000)
    return [Order(**order) for order in orders]

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
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "confirmed_orders": confirmed_orders,
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
    await init_default_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
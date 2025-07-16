import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Components
const MenuSection = ({ title, items, onAddToOrder }) => (
  <div className="mb-8">
    <h2 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-orange-500 pb-2">
      {title}
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
          <h3 className="font-semibold text-gray-800 mb-2">{item.name}</h3>
          <p className="text-gray-600 text-sm mb-3">{item.description}</p>
          <div className="flex justify-between items-center">
            <span className="font-bold text-green-600">${item.price.toFixed(2)}</span>
            <button
              onClick={() => onAddToOrder(item)}
              className="bg-orange-500 text-white px-3 py-1 rounded-md hover:bg-orange-600 transition-colors"
            >
              Add to Order
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const OrderItem = ({ item, onUpdateQuantity, onRemove }) => (
  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg mb-2">
    <div className="flex-1">
      <h4 className="font-semibold text-gray-800">{item.menu_item_name}</h4>
      <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
    </div>
    <div className="flex items-center space-x-2">
      <button
        onClick={() => onUpdateQuantity(item.menu_item_id, item.quantity - 1)}
        className="bg-red-500 text-white w-6 h-6 rounded-full text-xs hover:bg-red-600"
      >
        -
      </button>
      <span className="w-8 text-center font-semibold">{item.quantity}</span>
      <button
        onClick={() => onUpdateQuantity(item.menu_item_id, item.quantity + 1)}
        className="bg-green-500 text-white w-6 h-6 rounded-full text-xs hover:bg-green-600"
      >
        +
      </button>
      <button
        onClick={() => onRemove(item.menu_item_id)}
        className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 ml-2"
      >
        Remove
      </button>
    </div>
  </div>
);

const OrderSummary = ({ currentOrder, onUpdateQuantity, onRemove, onSubmitOrder, tableNumber, setTableNumber, customerName, setCustomerName }) => {
  const total = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Current Order</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Table Number</label>
        <input
          type="number"
          value={tableNumber}
          onChange={(e) => setTableNumber(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          min="1"
          max="20"
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name (Optional)</label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Enter customer name"
        />
      </div>
      
      <div className="mb-4 max-h-64 overflow-y-auto">
        {currentOrder.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No items in order</p>
        ) : (
          currentOrder.map((item) => (
            <OrderItem
              key={item.menu_item_id}
              item={item}
              onUpdateQuantity={onUpdateQuantity}
              onRemove={onRemove}
            />
          ))
        )}
      </div>
      
      {currentOrder.length > 0 && (
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-lg">Total: ${total.toFixed(2)}</span>
          </div>
          <button
            onClick={onSubmitOrder}
            disabled={!tableNumber || currentOrder.length === 0}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Submit Order
          </button>
        </div>
      )}
    </div>
  );
};

const OrderStatus = ({ orders, onUpdateStatus }) => (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <h2 className="text-xl font-bold text-gray-800 mb-4">Order Status</h2>
    <div className="max-h-96 overflow-y-auto">
      {orders.map((order) => (
        <div key={order.id} className="border-b pb-4 mb-4 last:border-b-0">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold">Table {order.table_number}</h3>
              {order.customer_name && (
                <p className="text-sm text-gray-600">{order.customer_name}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold text-green-600">${order.total_amount.toFixed(2)}</p>
              <p className="text-xs text-gray-500">
                {new Date(order.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          
          <div className="mb-3">
            <h4 className="font-medium text-sm mb-1">Items:</h4>
            <ul className="text-sm text-gray-600">
              {order.items.map((item, index) => (
                <li key={index}>
                  {item.quantity}x {item.menu_item_name}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex justify-between items-center">
            <select
              value={order.status}
              onChange={(e) => onUpdateStatus(order.id, e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="served">Served</option>
            </select>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
              order.status === 'ready' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

function App() {
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState([]);
  const [tableNumber, setTableNumber] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [activeTab, setActiveTab] = useState("menu");
  const [loading, setLoading] = useState(false);

  // Fetch menu items
  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${API}/menu`);
      setMenu(response.data);
    } catch (error) {
      console.error("Error fetching menu:", error);
    }
  };

  // Fetch orders
  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  // Add item to current order
  const addToOrder = (menuItem) => {
    setCurrentOrder(prev => {
      const existingItem = prev.find(item => item.menu_item_id === menuItem.id);
      if (existingItem) {
        return prev.map(item =>
          item.menu_item_id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, {
          menu_item_id: menuItem.id,
          menu_item_name: menuItem.name,
          quantity: 1,
          price: menuItem.price
        }];
      }
    });
  };

  // Update item quantity
  const updateQuantity = (menuItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromOrder(menuItemId);
    } else {
      setCurrentOrder(prev =>
        prev.map(item =>
          item.menu_item_id === menuItemId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  // Remove item from order
  const removeFromOrder = (menuItemId) => {
    setCurrentOrder(prev => prev.filter(item => item.menu_item_id !== menuItemId));
  };

  // Submit order
  const submitOrder = async () => {
    if (!tableNumber || currentOrder.length === 0) return;
    
    setLoading(true);
    try {
      const orderData = {
        table_number: tableNumber,
        customer_name: customerName || null,
        items: currentOrder
      };
      
      await axios.post(`${API}/orders`, orderData);
      setCurrentOrder([]);
      setCustomerName("");
      setActiveTab("orders");
      fetchOrders();
    } catch (error) {
      console.error("Error submitting order:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/orders/${orderId}`, { status: newStatus });
      fetchOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  // Group menu items by category
  const groupedMenu = menu.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  useEffect(() => {
    fetchMenu();
    fetchOrders();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Restaurant Order System</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab("menu")}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeTab === "menu"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Menu
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeTab === "orders"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Orders
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "menu" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Menu</h2>
                {Object.entries(groupedMenu).map(([category, items]) => (
                  <MenuSection
                    key={category}
                    title={category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    items={items}
                    onAddToOrder={addToOrder}
                  />
                ))}
              </div>
            </div>
            <div className="lg:col-span-1">
              <OrderSummary
                currentOrder={currentOrder}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromOrder}
                onSubmitOrder={submitOrder}
                tableNumber={tableNumber}
                setTableNumber={setTableNumber}
                customerName={customerName}
                setCustomerName={setCustomerName}
              />
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <OrderStatus orders={orders} onUpdateStatus={updateOrderStatus} />
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Submitting order...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
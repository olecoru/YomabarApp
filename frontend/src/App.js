import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Verify token
      axios.get(`${API}/auth/me`)
        .then(response => {
          setUser(response.data);
        })
        .catch(() => {
          localStorage.removeItem("token");
          delete axios.defaults.headers.common["Authorization"];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { access_token, user_id, role, full_name } = response.data;
      
      localStorage.setItem("token", access_token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      
      setUser({ id: user_id, username, role, full_name });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || "Login failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const Login = () => {
  const { login } = React.useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await login(username, password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Restaurant Management System
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center">
          <h3 className="text-lg font-medium text-gray-900">Demo Accounts</h3>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <p>Waitress: <code>waitress1</code> / <code>password123</code></p>
            <p>Kitchen: <code>kitchen1</code> / <code>password123</code></p>
            <p>Bartender: <code>bartender1</code> / <code>password123</code></p>
            <p>Admin: <code>admin1</code> / <code>password123</code></p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Waitress Interface
const WaitressInterface = () => {
  const { user } = React.useContext(AuthContext);
  const [selectedTable, setSelectedTable] = useState(null);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState({ clients: [] });
  const [activeTab, setActiveTab] = useState("tables");

  useEffect(() => {
    fetchMenu();
    fetchOrders();
  }, []);

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${API}/menu`);
      setMenu(response.data);
    } catch (error) {
      console.error("Error fetching menu:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const startNewOrder = (tableNumber) => {
    setSelectedTable(tableNumber);
    setCurrentOrder({ 
      table_number: tableNumber, 
      clients: [{ client_number: 1, items: [] }] 
    });
    setActiveTab("menu");
  };

  const addClient = () => {
    setCurrentOrder(prev => ({
      ...prev,
      clients: [...prev.clients, { client_number: prev.clients.length + 1, items: [] }]
    }));
  };

  const addItemToClient = (clientIndex, menuItem) => {
    setCurrentOrder(prev => {
      const newOrder = { ...prev };
      const client = newOrder.clients[clientIndex];
      const existingItem = client.items.find(item => item.menu_item_id === menuItem.id);
      
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        client.items.push({
          menu_item_id: menuItem.id,
          menu_item_name: menuItem.name,
          quantity: 1,
          price: menuItem.price,
          item_type: menuItem.item_type
        });
      }
      
      return newOrder;
    });
  };

  const submitOrder = async () => {
    try {
      const orderData = {
        table_number: selectedTable,
        clients: currentOrder.clients.map(client => ({
          client_number: client.client_number,
          items: client.items,
          subtotal: client.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        }))
      };

      await axios.post(`${API}/orders`, orderData);
      setCurrentOrder({ clients: [] });
      setSelectedTable(null);
      setActiveTab("tables");
      fetchOrders();
    } catch (error) {
      console.error("Error submitting order:", error);
    }
  };

  const confirmOrder = async (orderId, clientId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/client/${clientId}`, { status: "confirmed" });
      fetchOrders();
    } catch (error) {
      console.error("Error confirming order:", error);
    }
  };

  const sendToKitchen = async (orderId, clientId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/client/${clientId}`, { status: "sent_to_kitchen" });
      fetchOrders();
    } catch (error) {
      console.error("Error sending to kitchen:", error);
    }
  };

  const sendToBar = async (orderId, clientId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/client/${clientId}`, { status: "sent_to_bar" });
      fetchOrders();
    } catch (error) {
      console.error("Error sending to bar:", error);
    }
  };

  const groupedMenu = menu.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const categoryDisplayNames = {
    appetizers: "🥗 Appetizers",
    main_dishes: "🍽️ Main Dishes", 
    desserts: "🍰 Desserts",
    beverages: "🥤 Beverages"
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Waitress: {user.full_name}
            </h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab("tables")}
                className={`px-4 py-2 rounded-md ${
                  activeTab === "tables" ? "bg-orange-500 text-white" : "bg-gray-200"
                }`}
              >
                Tables
              </button>
              <button
                onClick={() => setActiveTab("menu")}
                className={`px-4 py-2 rounded-md ${
                  activeTab === "menu" ? "bg-orange-500 text-white" : "bg-gray-200"
                }`}
                disabled={!selectedTable}
              >
                Menu
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-4 py-2 rounded-md ${
                  activeTab === "orders" ? "bg-orange-500 text-white" : "bg-gray-200"
                }`}
              >
                My Orders
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "tables" && (
          <div>
            <h2 className="text-xl font-bold mb-4">Select Table</h2>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
              {Array.from({ length: 28 }, (_, i) => i + 1).map((tableNum) => (
                <button
                  key={tableNum}
                  onClick={() => startNewOrder(tableNum)}
                  className="h-16 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-gray-200 hover:border-orange-500"
                >
                  <div className="text-center">
                    <div className="font-bold text-gray-800">Table {tableNum}</div>
                    <div className="text-xs text-gray-500">
                      {orders.filter(order => order.table_number === tableNum && order.status !== "served").length} orders
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "menu" && selectedTable && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Table {selectedTable} - Order Menu</h2>
              <button
                onClick={addClient}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
              >
                Add Client
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                {Object.entries(groupedMenu).map(([category, items]) => (
                  <div key={category} className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">
                      {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {items.map((item) => (
                        <div key={item.id} className="bg-white p-4 rounded-lg shadow-md">
                          <h4 className="font-semibold text-gray-800">{item.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-green-600">${item.price.toFixed(2)}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              item.item_type === 'food' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {item.item_type}
                            </span>
                          </div>
                          <div className="mt-2">
                            {currentOrder.clients.map((client, index) => (
                              <button
                                key={index}
                                onClick={() => addItemToClient(index, item)}
                                className="mr-2 mb-2 bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600"
                              >
                                Add to Client {client.client_number}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-lg shadow-lg sticky top-4">
                  <h3 className="text-lg font-bold mb-4">Current Order</h3>
                  {currentOrder.clients.map((client, index) => (
                    <div key={index} className="mb-4 p-3 bg-gray-50 rounded">
                      <h4 className="font-semibold text-gray-800 mb-2">Client {client.client_number}</h4>
                      {client.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.menu_item_name}</span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="font-semibold text-right mt-2">
                        Subtotal: ${client.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4">
                    <div className="font-bold text-lg">
                      Total: ${currentOrder.clients.reduce((sum, client) => 
                        sum + client.items.reduce((clientSum, item) => clientSum + (item.price * item.quantity), 0), 0
                      ).toFixed(2)}
                    </div>
                    <button
                      onClick={submitOrder}
                      disabled={currentOrder.clients.every(client => client.items.length === 0)}
                      className="w-full mt-4 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:bg-gray-400"
                    >
                      Submit Order
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div>
            <h2 className="text-xl font-bold mb-4">My Orders</h2>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Table {order.table_number}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${order.total_amount.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  {order.clients.map((client, index) => (
                    <div key={index} className="mb-4 p-3 border rounded">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">Client {client.client_number}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          client.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          client.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          client.status === 'sent_to_kitchen' ? 'bg-orange-100 text-orange-800' :
                          client.status === 'sent_to_bar' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {client.status}
                        </span>
                      </div>
                      
                      <div className="mb-2">
                        {client.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.menu_item_name}</span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex space-x-2">
                        {client.status === 'pending' && (
                          <button
                            onClick={() => confirmOrder(order.id, client.client_id)}
                            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                          >
                            Confirm
                          </button>
                        )}
                        {client.status === 'confirmed' && (
                          <>
                            {client.items.some(item => item.item_type === 'food') && (
                              <button
                                onClick={() => sendToKitchen(order.id, client.client_id)}
                                className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600"
                              >
                                Send to Kitchen
                              </button>
                            )}
                            {client.items.some(item => item.item_type === 'drink') && (
                              <button
                                onClick={() => sendToBar(order.id, client.client_id)}
                                className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
                              >
                                Send to Bar
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Kitchen Interface
const KitchenInterface = () => {
  const { user } = React.useContext(AuthContext);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchKitchenOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/kitchen`);
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching kitchen orders:", error);
    }
  };

  const updateOrderStatus = async (orderId, clientId, status) => {
    try {
      await axios.put(`${API}/orders/${orderId}/client/${clientId}`, { status });
      fetchKitchenOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Kitchen: {user.full_name}
            </h1>
            <button
              onClick={fetchKitchenOrders}
              className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600"
            >
              Refresh Orders
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-xl font-bold mb-4">Food Orders</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            order.clients.map((client, index) => (
              <div key={`${order.id}-${index}`} className="bg-white p-4 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">Table {order.table_number}</h3>
                    <p className="text-sm text-gray-600">Client {client.client_number}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    client.status === 'sent_to_kitchen' ? 'bg-orange-100 text-orange-800' :
                    client.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {client.status}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  {client.items.filter(item => item.item_type === 'food').map((item, itemIndex) => (
                    <div key={itemIndex} className="flex justify-between">
                      <span className="font-medium">{item.quantity}x {item.menu_item_name}</span>
                      {item.special_instructions && (
                        <span className="text-xs text-red-600">{item.special_instructions}</span>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex space-x-2">
                  {client.status === 'sent_to_kitchen' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, client.client_id, 'preparing')}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                    >
                      Start Preparing
                    </button>
                  )}
                  {client.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, client.client_id, 'ready')}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                    >
                      Ready
                    </button>
                  )}
                </div>
              </div>
            ))
          ))}
        </div>
      </div>
    </div>
  );
};

// Bartender Interface
const BartenderInterface = () => {
  const { user } = React.useContext(AuthContext);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchBarOrders();
    const interval = setInterval(fetchBarOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchBarOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/bar`);
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching bar orders:", error);
    }
  };

  const updateOrderStatus = async (orderId, clientId, status) => {
    try {
      await axios.put(`${API}/orders/${orderId}/client/${clientId}`, { status });
      fetchBarOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Bar: {user.full_name}
            </h1>
            <button
              onClick={fetchBarOrders}
              className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600"
            >
              Refresh Orders
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-xl font-bold mb-4">Drink Orders</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            order.clients.map((client, index) => (
              <div key={`${order.id}-${index}`} className="bg-white p-4 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">Table {order.table_number}</h3>
                    <p className="text-sm text-gray-600">Client {client.client_number}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    client.status === 'sent_to_bar' ? 'bg-purple-100 text-purple-800' :
                    client.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {client.status}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  {client.items.filter(item => item.item_type === 'drink').map((item, itemIndex) => (
                    <div key={itemIndex} className="flex justify-between">
                      <span className="font-medium">{item.quantity}x {item.menu_item_name}</span>
                      {item.special_instructions && (
                        <span className="text-xs text-red-600">{item.special_instructions}</span>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex space-x-2">
                  {client.status === 'sent_to_bar' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, client.client_id, 'preparing')}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                    >
                      Start Preparing
                    </button>
                  )}
                  {client.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, client.client_id, 'ready')}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                    >
                      Ready
                    </button>
                  )}
                </div>
              </div>
            ))
          ))}
        </div>
      </div>
    </div>
  );
};

// Administrator Interface
const AdministratorInterface = () => {
  const { user } = React.useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [newMenuItem, setNewMenuItem] = useState({
    name: "",
    description: "",
    price: 0,
    category: "appetizers",
    item_type: "food"
  });

  useEffect(() => {
    fetchOrders();
    fetchAllMenu();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const fetchAllMenu = async () => {
    try {
      const response = await axios.get(`${API}/menu/all`);
      setMenu(response.data);
    } catch (error) {
      console.error("Error fetching menu:", error);
    }
  };

  const addMenuItem = async () => {
    try {
      await axios.post(`${API}/menu`, newMenuItem);
      setNewMenuItem({
        name: "",
        description: "",
        price: 0,
        category: "appetizers",
        item_type: "food"
      });
      fetchAllMenu();
    } catch (error) {
      console.error("Error adding menu item:", error);
    }
  };

  const toggleStopList = async (itemId, onStopList) => {
    try {
      await axios.put(`${API}/menu/${itemId}`, { on_stop_list: !onStopList });
      fetchAllMenu();
    } catch (error) {
      console.error("Error updating stop list:", error);
    }
  };

  const toggleAvailable = async (itemId, available) => {
    try {
      await axios.put(`${API}/menu/${itemId}`, { available: !available });
      fetchAllMenu();
    } catch (error) {
      console.error("Error updating availability:", error);
    }
  };

  const deleteMenuItem = async (itemId) => {
    if (window.confirm("Are you sure you want to delete this menu item?")) {
      try {
        await axios.delete(`${API}/menu/${itemId}`);
        fetchAllMenu();
      } catch (error) {
        console.error("Error deleting menu item:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Administrator: {user.full_name}
            </h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-4 py-2 rounded-md ${
                  activeTab === "orders" ? "bg-orange-500 text-white" : "bg-gray-200"
                }`}
              >
                All Orders
              </button>
              <button
                onClick={() => setActiveTab("menu")}
                className={`px-4 py-2 rounded-md ${
                  activeTab === "menu" ? "bg-orange-500 text-white" : "bg-gray-200"
                }`}
              >
                Menu Management
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "orders" && (
          <div>
            <h2 className="text-xl font-bold mb-4">All Orders</h2>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Table {order.table_number}</h3>
                      <p className="text-sm text-gray-600">Waitress: {order.waitress_name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${order.total_amount.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  {order.clients.map((client, index) => (
                    <div key={index} className="mb-4 p-3 border rounded">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">Client {client.client_number}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          client.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          client.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          client.status === 'preparing' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {client.status}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        {client.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.menu_item_name}</span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="font-semibold text-right mt-2">
                        Subtotal: ${client.subtotal.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "menu" && (
          <div>
            <h2 className="text-xl font-bold mb-4">Menu Management</h2>
            
            {/* Add new menu item */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New Menu Item</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Item Name"
                  value={newMenuItem.name}
                  onChange={(e) => setNewMenuItem({...newMenuItem, name: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newMenuItem.description}
                  onChange={(e) => setNewMenuItem({...newMenuItem, description: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={newMenuItem.price}
                  onChange={(e) => setNewMenuItem({...newMenuItem, price: parseFloat(e.target.value)})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <select
                  value={newMenuItem.category}
                  onChange={(e) => setNewMenuItem({...newMenuItem, category: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="appetizers">Appetizers</option>
                  <option value="main_dishes">Main Dishes</option>
                  <option value="desserts">Desserts</option>
                  <option value="beverages">Beverages</option>
                </select>
                <select
                  value={newMenuItem.item_type}
                  onChange={(e) => setNewMenuItem({...newMenuItem, item_type: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="food">Food</option>
                  <option value="drink">Drink</option>
                </select>
                <button
                  onClick={addMenuItem}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                >
                  Add Item
                </button>
              </div>
            </div>
            
            {/* Menu items list */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Current Menu Items</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {menu.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.category.replace(/_/g, ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.item_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${item.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.available ? 'Available' : 'Unavailable'}
                            </span>
                            {item.on_stop_list && (
                              <span className="block px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                                Stop List
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => toggleAvailable(item.id, item.available)}
                            className={`px-2 py-1 rounded text-xs ${
                              item.available ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >
                            {item.available ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => toggleStopList(item.id, item.on_stop_list)}
                            className={`px-2 py-1 rounded text-xs ${
                              item.on_stop_list ? 'bg-gray-500 text-white hover:bg-gray-600' : 'bg-yellow-500 text-white hover:bg-yellow-600'
                            }`}
                          >
                            {item.on_stop_list ? 'Remove Stop' : 'Add Stop'}
                          </button>
                          <button
                            onClick={() => deleteMenuItem(item.id)}
                            className="px-2 py-1 rounded text-xs bg-red-500 text-white hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
const MainApp = () => {
  const { user, logout } = React.useContext(AuthContext);

  if (!user) {
    return <Login />;
  }

  const renderInterface = () => {
    switch (user.role) {
      case 'waitress':
        return <WaitressInterface />;
      case 'kitchen':
        return <KitchenInterface />;
      case 'bartender':
        return <BartenderInterface />;
      case 'administrator':
        return <AdministratorInterface />;
      default:
        return <div>Unknown role</div>;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={logout}
        className="absolute top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
      >
        Logout
      </button>
      {renderInterface()}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
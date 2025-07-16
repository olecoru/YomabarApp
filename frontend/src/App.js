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

// Admin Interface - Focus on the new features
const AdminInterface = () => {
  const { user } = React.useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("categories");
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(false);

  // Category management
  const [newCategory, setNewCategory] = useState({
    name: "", display_name: "", emoji: "", description: "", sort_order: 1
  });

  // User management
  const [newUser, setNewUser] = useState({
    username: "", password: "", role: "waitress", full_name: "", email: "", phone: ""
  });

  useEffect(() => {
    fetchCategories();
    fetchUsers();
    fetchMenu();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories/all`);
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${API}/menu/all`);
      setMenu(response.data);
    } catch (error) {
      console.error("Error fetching menu:", error);
    }
  };

  const addCategory = async () => {
    if (!newCategory.name || !newCategory.display_name || !newCategory.emoji) {
      alert("Please fill in all required fields");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/categories`, newCategory);
      setNewCategory({ name: "", display_name: "", emoji: "", description: "", sort_order: 1 });
      fetchCategories();
    } catch (error) {
      alert("Error: " + (error.response?.data?.detail || "Failed to add category"));
    } finally {
      setLoading(false);
    }
  };

  const addUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name) {
      alert("Please fill in all required fields");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/users`, newUser);
      setNewUser({ username: "", password: "", role: "waitress", full_name: "", email: "", phone: "" });
      fetchUsers();
    } catch (error) {
      alert("Error: " + (error.response?.data?.detail || "Failed to add user"));
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        await axios.delete(`${API}/categories/${categoryId}`);
        fetchCategories();
      } catch (error) {
        alert("Error: " + (error.response?.data?.detail || "Failed to delete category"));
      }
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await axios.delete(`${API}/users/${userId}`);
        fetchUsers();
      } catch (error) {
        alert("Error: " + (error.response?.data?.detail || "Failed to delete user"));
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 admin-interface">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Administrator: {user.full_name}
            </h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab("categories")}
                className={`px-4 py-2 rounded-md ${activeTab === "categories" ? "bg-orange-500 text-white" : "bg-gray-200"}`}
              >
                Categories
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`px-4 py-2 rounded-md ${activeTab === "users" ? "bg-orange-500 text-white" : "bg-gray-200"}`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab("menu")}
                className={`px-4 py-2 rounded-md ${activeTab === "menu" ? "bg-orange-500 text-white" : "bg-gray-200"}`}
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === "categories" && (
          <div>
            <h2 className="text-xl font-bold mb-4">✨ Category Management</h2>
            
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New Category</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Category Name (e.g., appetizers)"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="text"
                  placeholder="Display Name (e.g., Appetizers)"
                  value={newCategory.display_name}
                  onChange={(e) => setNewCategory({...newCategory, display_name: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="text"
                  placeholder="Emoji (e.g., 🥗)"
                  value={newCategory.emoji}
                  onChange={(e) => setNewCategory({...newCategory, emoji: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="number"
                  placeholder="Sort Order"
                  value={newCategory.sort_order}
                  onChange={(e) => setNewCategory({...newCategory, sort_order: parseInt(e.target.value)})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={addCategory}
                  disabled={loading}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400"
                >
                  {loading ? "Adding..." : "Add Category"}
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">{category.emoji}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{category.name}</div>
                            <div className="text-sm text-gray-500">{category.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {category.display_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${
                          category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => deleteCategory(category.id)}
                          className="text-red-600 hover:text-red-900"
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
        )}

        {activeTab === "users" && (
          <div>
            <h2 className="text-xl font-bold mb-4">👥 User Management</h2>
            
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New User</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="waitress">Waitress</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="bartender">Bartender</option>
                  <option value="administrator">Administrator</option>
                </select>
                <button
                  onClick={addUser}
                  disabled={loading}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400"
                >
                  {loading ? "Adding..." : "Add User"}
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.full_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'administrator' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'waitress' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'kitchen' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{user.email || 'No email'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
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
        )}

        {activeTab === "menu" && (
          <div>
            <h2 className="text-xl font-bold mb-4">🍽️ Menu Items with Dynamic Categories</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {menu.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{item.category_emoji}</span>
                          <span className="text-sm text-gray-900">{item.category_display_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.item_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.available ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple interface for other roles
const SimpleInterface = ({ role }) => {
  const { user } = React.useContext(AuthContext);
  
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {role.charAt(0).toUpperCase() + role.slice(1)}: {user.full_name}
        </h2>
        <p className="text-gray-600 mb-4">
          Welcome to the Restaurant Management System
        </p>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="text-sm">
            ✅ <strong>Enhanced Features Added:</strong>
          </p>
          <ul className="text-sm mt-2 space-y-1">
            <li>• Dynamic categories (editable by admin)</li>
            <li>• Enhanced user management</li>
            <li>• Role-based access control</li>
            <li>• Improved menu system</li>
          </ul>
        </div>
        <p className="text-sm text-gray-500">
          Full {role} interface with enhanced features available in the complete version.
        </p>
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
      case 'administrator':
        return <AdminInterface />;
      case 'waitress':
        return <SimpleInterface role="waitress" />;
      case 'kitchen':
        return <SimpleInterface role="kitchen" />;
      case 'bartender':
        return <SimpleInterface role="bartender" />;
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
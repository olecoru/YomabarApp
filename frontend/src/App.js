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
      return { success: false, error: error.response?.data?.detail || "Ошибка входа" };
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
            Система Управления Рестораном
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Пожалуйста, войдите в свою учетную запись
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Имя пользователя"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Пароль"
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
              {loading ? "Вход..." : "Войти"}
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center">
          <h3 className="text-lg font-medium text-gray-900">Демо Аккаунты</h3>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <p>Официант: <code>waitress1</code> / <code>password123</code></p>
            <p>Кухня: <code>kitchen1</code> / <code>password123</code></p>
            <p>Бармен: <code>bartender1</code> / <code>password123</code></p>
            <p>Администратор: <code>admin1</code> / <code>password123</code></p>
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
      console.error("Ошибка загрузки категорий:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error("Ошибка загрузки пользователей:", error);
    }
  };

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${API}/menu/all`);
      setMenu(response.data);
    } catch (error) {
      console.error("Ошибка загрузки меню:", error);
    }
  };

  const addCategory = async () => {
    if (!newCategory.name || !newCategory.display_name || !newCategory.emoji) {
      alert("Пожалуйста, заполните все обязательные поля");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/categories`, newCategory);
      setNewCategory({ name: "", display_name: "", emoji: "", description: "", sort_order: 1 });
      fetchCategories();
    } catch (error) {
      alert("Ошибка: " + (error.response?.data?.detail || "Не удалось добавить категорию"));
    } finally {
      setLoading(false);
    }
  };

  const addUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name) {
      alert("Пожалуйста, заполните все обязательные поля");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/users`, newUser);
      setNewUser({ username: "", password: "", role: "waitress", full_name: "", email: "", phone: "" });
      fetchUsers();
    } catch (error) {
      alert("Ошибка: " + (error.response?.data?.detail || "Не удалось добавить пользователя"));
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId) => {
    if (window.confirm("Вы уверены, что хотите удалить эту категорию?")) {
      try {
        await axios.delete(`${API}/categories/${categoryId}`);
        fetchCategories();
      } catch (error) {
        alert("Ошибка: " + (error.response?.data?.detail || "Не удалось удалить категорию"));
      }
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm("Вы уверены, что хотите удалить этого пользователя?")) {
      try {
        await axios.delete(`${API}/users/${userId}`);
        fetchUsers();
      } catch (error) {
        alert("Ошибка: " + (error.response?.data?.detail || "Не удалось удалить пользователя"));
      }
    }
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'waitress': 'Официант',
      'kitchen': 'Кухня',
      'bartender': 'Бармен',
      'administrator': 'Администратор'
    };
    return roleNames[role] || role;
  };

  return (
    <div className="min-h-screen bg-gray-100 admin-interface">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Администратор: {user.full_name}
            </h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab("categories")}
                className={`px-4 py-2 rounded-md ${activeTab === "categories" ? "bg-orange-500 text-white" : "bg-gray-200"}`}
              >
                Категории
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`px-4 py-2 rounded-md ${activeTab === "users" ? "bg-orange-500 text-white" : "bg-gray-200"}`}
              >
                Пользователи
              </button>
              <button
                onClick={() => setActiveTab("menu")}
                className={`px-4 py-2 rounded-md ${activeTab === "menu" ? "bg-orange-500 text-white" : "bg-gray-200"}`}
              >
                Меню
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === "categories" && (
          <div>
            <h2 className="text-xl font-bold mb-4">✨ Управление Категориями</h2>
            
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-lg font-semibold mb-4">Добавить Новую Категорию</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Название категории (например, appetizers)"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="text"
                  placeholder="Отображаемое название (например, Закуски)"
                  value={newCategory.display_name}
                  onChange={(e) => setNewCategory({...newCategory, display_name: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="text"
                  placeholder="Эмодзи (например, 🥗)"
                  value={newCategory.emoji}
                  onChange={(e) => setNewCategory({...newCategory, emoji: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="text"
                  placeholder="Описание (необязательно)"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="number"
                  placeholder="Порядок сортировки"
                  value={newCategory.sort_order}
                  onChange={(e) => setNewCategory({...newCategory, sort_order: parseInt(e.target.value)})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={addCategory}
                  disabled={loading}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400"
                >
                  {loading ? "Добавление..." : "Добавить Категорию"}
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Категория</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Отображение</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
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
                          {category.is_active ? 'Активная' : 'Неактивная'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => deleteCategory(category.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Удалить
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
            <h2 className="text-xl font-bold mb-4">👥 Управление Пользователями</h2>
            
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-lg font-semibold mb-4">Добавить Нового Пользователя</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Имя пользователя"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="password"
                  placeholder="Пароль"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="text"
                  placeholder="Полное имя"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="email"
                  placeholder="Email (необязательно)"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="waitress">Официант</option>
                  <option value="kitchen">Кухня</option>
                  <option value="bartender">Бармен</option>
                  <option value="administrator">Администратор</option>
                </select>
                <button
                  onClick={addUser}
                  disabled={loading}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400"
                >
                  {loading ? "Добавление..." : "Добавить Пользователя"}
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Пользователь</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Роль</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Контакты</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
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
                          {getRoleDisplayName(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{user.email || 'Нет email'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Удалить
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
            <h2 className="text-xl font-bold mb-4">🍽️ Меню с Динамическими Категориями</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Блюдо</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Категория</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
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
                        {item.item_type === 'food' ? 'Еда' : 'Напиток'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.available ? 'Доступно' : 'Недоступно'}
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
  
  const getRoleDisplayName = (role) => {
    const roleNames = {
      'waitress': 'Официант',
      'kitchen': 'Кухня',
      'bartender': 'Бармен',
      'administrator': 'Администратор'
    };
    return roleNames[role] || role;
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {getRoleDisplayName(role)}: {user.full_name}
        </h2>
        <p className="text-gray-600 mb-4">
          Добро пожаловать в Систему Управления Рестораном
        </p>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="text-sm">
            ✅ <strong>Добавлены Улучшенные Функции:</strong>
          </p>
          <ul className="text-sm mt-2 space-y-1">
            <li>• Динамические категории (редактируемые администратором)</li>
            <li>• Расширенное управление пользователями</li>
            <li>• Контроль доступа на основе ролей</li>
            <li>• Улучшенная система меню</li>
          </ul>
        </div>
        <p className="text-sm text-gray-500">
          Полный интерфейс для роли "{getRoleDisplayName(role)}" с расширенными функциями доступен в полной версии.
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
        return <div>Неизвестная роль</div>;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={logout}
        className="absolute top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
      >
        Выйти
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
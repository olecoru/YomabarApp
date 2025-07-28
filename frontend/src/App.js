import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Фразы для приветствия официантов
const WELCOME_PHRASES = [
  "Привет, котёнок! Желаю удачной смены, милых клиентов и щедрых чаевых!",
  "Здравствуй, цыплёнок! Пусть сегодня будет отличная смена и добрые гости с хорошими чаевыми!",
  "Привет, зайчик! Удачной смены, приятных посетителей и больших чаевых!",
  "Добро пожаловать, лапушка! Желаю мягких улыбок гостей и щедрых поощрений!",
  "Привет, душечка! Отличной смены, вежливых клиентов и здоровских чаевых!"
];

// Фразы-похвала после каждого заказа
const COMPLETION_PHRASES = [
  "Отлично, котёнок! Ты справилась с этим, дальше – лучше!",
  "Молодчинка, цыплёнок! Справилась на отлично, дальше – лучше!",
  "Супер, зайчик! Ты молодец, дальше – лучше!",
  "Браво, лапушка! Отлично получилось, дальше – лучше!",
  "Отлично справилась, душечка! Ты справилась с этим, дальше – лучше!"
];

// Функция для случайного выбора фразы
const getRandomPhrase = (phrases) => {
  return phrases[Math.floor(Math.random() * phrases.length)];
};

// Auth Context
const AuthContext = React.createContext();

// Push notification utilities
const registerPushNotifications = async (user) => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Push notifications enabled for:', user.role);
        return registration;
      }
    } catch (error) {
      console.error('Push notification setup failed:', error);
    }
  }
  return null;
};

const sendLocalNotification = (title, body, role) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: body,
      icon: '/icon-192.png',
      tag: `yomabar-${role}`,
      vibrate: [200, 100, 200]
    });
  }
};

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
      
      const userData = { id: user_id, username, role, full_name };
      setUser(userData);
      
      // Register push notifications after successful login
      registerPushNotifications(userData);
      
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="yoma-logo">
              <h1 className="text-4xl font-bold text-red-600">YomaBar</h1>
              <p className="text-red-500 text-sm font-medium">Система Управления Рестораном</p>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Добро пожаловать в YomaBar
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                placeholder="Имя пользователя"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
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
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? "Вход..." : "Войти"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ИСПРАВЛЕННЫЙ Waitress Interface с правильной логикой
const WaitressInterface = () => {
  const { user } = React.useContext(AuthContext);
  const [activeStep, setActiveStep] = useState("greeting");
  const [selectedTable, setSelectedTable] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [welcomePhrase, setWelcomePhrase] = useState("");
  const [completionPhrase, setCompletionPhrase] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentOrder, setCurrentOrder] = useState({}); // Для заказа без клиентов

  // Новые состояния для "Мои заказы"
  const [activeTab, setActiveTab] = useState("new_order"); // "new_order" или "my_orders"
  const [myOrders, setMyOrders] = useState([]);

  useEffect(() => {
    setWelcomePhrase(getRandomPhrase(WELCOME_PHRASES));
    fetchMenu();
    fetchCategories();
    if (activeTab === "my_orders") {
      fetchMyOrders();
    }
  }, [activeTab]);

  const fetchMyOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setMyOrders(response.data.filter(order => order.waitress_id === user.id));
    } catch (error) {
      console.error("Ошибка загрузки моих заказов:", error);
    }
  };

  const markOrderAsServed = async (orderId) => {
    try {
      await axios.put(`${API}/orders/${orderId}`, { status: "served" });
      fetchMyOrders(); // Обновляем список
      alert("Заказ помечен как отданный!");
    } catch (error) {
      alert("Ошибка при обновлении статуса заказа");
    }
  };

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${API}/menu`);
      setMenu(response.data);
    } catch (error) {
      console.error("Ошибка загрузки меню:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Ошибка загрузки категорий:", error);
    }
  };

  const filteredMenu = selectedCategory === "all" ? menu : menu.filter(item => item.category_id === selectedCategory);

  // ИСПРАВЛЕНО: функции для клиентов
  const addClient = () => {
    const newClient = {
      id: Date.now(),
      name: `Клиент ${clients.length + 1}`,
      order: []
    };
    
    setClients([...clients, newClient]);
    setActiveClient(newClient.id);
  };

  const removeClient = (clientId) => {
    // Не разрешаем удалять единственного клиента
    if (clients.length <= 1) {
      return;
    }
    
    const updatedClients = clients.filter(client => client.id !== clientId);
    setClients(updatedClients);
    
    if (activeClient === clientId) {
      setActiveClient(updatedClients[0].id);
    }
  };

  const updateClientName = (clientId, newName) => {
    setClients(clients.map(client => 
      client.id === clientId ? { ...client, name: newName } : client
    ));
  };

  const getCurrentClient = () => {
    return clients.find(client => client.id === activeClient);
  };

  const addToOrder = (menuItem) => {
    if (!activeClient) return;
    
    setClients(clients.map(client => {
      if (client.id === activeClient) {
        const existingItem = client.order.find(item => item.id === menuItem.id);
        if (existingItem) {
          return {
            ...client,
            order: client.order.map(item => 
              item.id === menuItem.id 
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          };
        } else {
          return {
            ...client,
            order: [...client.order, { ...menuItem, quantity: 1 }]
          };
        }
      }
      return client;
    }));
  };

  const removeFromOrder = (menuItemId) => {
    if (!activeClient) return;
    
    setClients(clients.map(client => {
      if (client.id === activeClient) {
        return {
          ...client,
          order: client.order.filter(item => item.id !== menuItemId)
        };
      }
      return client;
    }));
  };

  const updateQuantity = (menuItemId, quantity) => {
    if (!activeClient) return;
    
    if (quantity <= 0) {
      removeFromOrder(menuItemId);
    } else {
      setClients(clients.map(client => {
        if (client.id === activeClient) {
          return {
            ...client,
            order: client.order.map(item => 
              item.id === menuItemId 
                ? { ...item, quantity: quantity }
                : item
            )
          };
        }
        return client;
      }));
    }
  };

  const calculateClientTotal = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return 0;
    return client.order.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateGrandTotal = () => {
    return clients.reduce((total, client) => total + calculateClientTotal(client.id), 0);
  };

  const getTotalItemsCount = () => {
    return clients.reduce((total, client) => 
      total + client.order.reduce((clientTotal, item) => clientTotal + item.quantity, 0), 0
    );
  };

  // ИСПРАВЛЕНО: убрана проверка обязательного имени клиента
  const submitOrder = async () => {
    // Проверяем, есть ли заказы у клиентов
    const hasOrders = clients.some(client => client.order.length > 0);
    
    if (!hasOrders) {
      alert("Добавьте хотя бы одну позицию в заказ");
      return;
    }

    setLoading(true);
    try {
      const allItems = [];
      let orderNotes = `Стол: ${selectedTable}`;
      if (teamName.trim()) {
        orderNotes += ` | Команда: ${teamName}`;
      }
      
      // Показываем распределение по клиентам
      orderNotes += "\n\nРаспределение по клиентам:\n";
      clients.forEach(client => {
        if (client.order.length > 0) {
          orderNotes += `${client.name}:\n`;
          client.order.forEach(item => {
            allItems.push({
              menu_item_id: item.id,
              quantity: item.quantity,
              price: item.price
            });
            orderNotes += `  - ${item.name} x${item.quantity} ($${(item.price * item.quantity).toFixed(2)})\n`;
          });
          orderNotes += `  Итого: $${calculateClientTotal(client.id).toFixed(2)}\n\n`;
        }
      });

      const orderData = {
        customer_name: teamName.trim() || `Стол ${selectedTable}`,
        table_number: selectedTable,
        items: allItems,
        total: calculateGrandTotal(),
        status: "pending",
        notes: orderNotes
      };

      await axios.post(`${API}/orders`, orderData);
      
      // Send notifications to kitchen, bar, and admin about new order
      const hasFood = allItems.some(item => item.item_type === 'food');
      const hasDrinks = allItems.some(item => item.item_type === 'drink');
      
      if (hasFood) {
        sendLocalNotification(
          '🍽️ YomaBar - Новый заказ!',
          `Стол ${selectedTable}: ${allItems.filter(item => item.item_type === 'food').length} блюд`,
          'kitchen'
        );
      }
      
      if (hasDrinks) {
        sendLocalNotification(
          '🍻 YomaBar - Новый заказ!',
          `Стол ${selectedTable}: ${allItems.filter(item => item.item_type === 'drink').length} напитков`,
          'bar'
        );
      }
      
      sendLocalNotification(
        '📋 YomaBar - Новый заказ!',
        `Стол ${selectedTable}: ${allItems.length} позиций на $${calculateGrandTotal().toFixed(2)}`,
        'admin'
      );
      
      setCompletionPhrase(getRandomPhrase(COMPLETION_PHRASES));
      // Сбросить состояние для нового заказа
      setClients([]);
      setActiveClient(null);
      setCurrentOrder({});
      setTeamName("");
      setActiveStep("success");
      
    } catch (error) {
      alert("Ошибка при отправке заказа: " + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const startNewOrder = () => {
    setClients([]);
    setActiveClient(null);
    setCurrentOrder({});
    setTeamName("");
    setActiveStep("table");
  };

  // Приветственный экран
  if (activeStep === "greeting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
        {/* Навигация вкладок */}
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-4 py-3">
              <button
                onClick={() => setActiveTab("new_order")}
                className={`px-4 py-2 rounded-md font-medium ${activeTab === "new_order" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
              >
                Новый заказ
              </button>
              <button
                onClick={() => setActiveTab("my_orders")}
                className={`px-4 py-2 rounded-md font-medium ${activeTab === "my_orders" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
              >
                Мои заказы
              </button>
            </div>
          </div>
        </div>

        {activeTab === "new_order" ? (
          <div className="flex items-center justify-center pt-20">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-red-600 mb-2">YomaBar</h1>
                <p className="text-gray-600">Система управления заказами</p>
              </div>
              
              <div className="mb-8">
                <div className="text-4xl mb-4">👋</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {welcomePhrase}
                </h2>
                <p className="text-gray-600">Официант: {user.full_name}</p>
              </div>
              
              <button
                onClick={() => setActiveStep("table")}
                className="w-full bg-red-600 text-white py-3 rounded-md font-medium hover:bg-red-700 transition-colors"
              >
                Начать работу
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📋 Мои заказы</h2>
            
            {myOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-lg">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Нет заказов</h3>
                <p className="text-gray-600">Ваши заказы будут отображаться здесь</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md">
                <div className="grid gap-4 p-6">
                  {myOrders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">Стол {order.table_number}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleString('ru-RU')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'preparing' ? 'bg-orange-100 text-orange-800' :
                            order.status === 'ready' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status === 'pending' ? 'Ожидание' :
                             order.status === 'confirmed' ? 'Подтверждён' :
                             order.status === 'preparing' ? 'Готовится' :
                             order.status === 'ready' ? 'Готов' : 'Отдан'}
                          </span>
                          {order.status === 'ready' && (
                            <button
                              onClick={() => markOrderAsServed(order.id)}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              Отдать
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Позиций: {order.items?.length || 0}</p>
                        {order.customer_name && <p>Клиент: {order.customer_name}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Экран успеха
  if (activeStep === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-red-600 mb-2">YomaBar</h1>
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-xl font-semibold text-gray-900">
              Заказ успешно отправлен!
            </h2>
          </div>
          
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium text-lg">
              {completionPhrase}
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={startNewOrder}
              className="w-full bg-red-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-red-700 transition-colors"
            >
              Новый заказ
            </button>
            <button
              onClick={() => setActiveStep("greeting")}
              className="w-full bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Вернуться к приветствию
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Выбор стола
  if (activeStep === "table") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-red-600 mb-2">YomaBar</h1>
              <h2 className="text-xl font-semibold text-gray-900">
                Выберите стол
              </h2>
            </div>
            
            <div className="grid grid-cols-4 md:grid-cols-7 gap-3 mb-6">
              {Array.from({ length: 28 }, (_, i) => i + 1).map(tableNumber => (
                <button
                  key={tableNumber}
                  onClick={() => {
                    setSelectedTable(tableNumber);
                    // Автоматически создаём "Клиент 1" при выборе стола
                    const firstClient = {
                      id: Date.now(),
                      name: "Клиент 1",
                      order: []
                    };
                    setClients([firstClient]);
                    setActiveClient(firstClient.id);
                    setCurrentOrder({}); // Очищаем общий заказ
                    setActiveStep("order");
                  }}
                  className="aspect-square bg-red-600 text-white font-bold text-lg rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                >
                  {tableNumber}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setActiveStep("greeting")}
              className="w-full bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ИСПРАВЛЕННЫЙ интерфейс создания заказа
  if (activeStep === "order") {
    const currentClient = getCurrentClient();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
        <div className="max-w-6xl mx-auto p-4">
          <div className="bg-white rounded-lg shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-red-600">YomaBar</h1>
                  <p className="text-gray-600">
                    Стол {selectedTable} | {user.full_name}
                    {teamName && (
                      <span className="ml-2 bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">
                        {teamName}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Заказ</p>
                  <p className="text-lg font-semibold">{getTotalItemsCount()} позиций</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  {/* ИСПРАВЛЕНО: поле команды необязательно */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Название команды (необязательно)
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Введите название команды для квиза"
                    />
                  </div>

                  {/* Упрощённое управление клиентами */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Клиенты за столом
                      </label>
                      <button
                        onClick={addClient}
                        className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 transition-colors"
                      >
                        + Добавить клиента
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {clients.map((client, index) => (
                        <div
                          key={client.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                            activeClient === client.id
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                          }`}
                          onClick={() => setActiveClient(client.id)}
                        >
                          <input
                            type="text"
                            value={client.name}
                            onChange={(e) => updateClientName(client.id, e.target.value)}
                            className="bg-transparent border-none outline-none text-sm font-medium min-w-0"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-xs text-gray-500">
                            ({client.order.length})
                          </span>
                          {/* Разрешаем удалять только если это не единственный клиент */}
                          {clients.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeClient(client.id);
                              }}
                              className="text-red-500 hover:text-red-700 ml-1"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Категория
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCategory("all")}
                        className={`px-4 py-2 rounded-md font-medium text-sm ${
                          selectedCategory === "all"
                            ? "bg-red-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        Все
                      </button>
                      {categories.map(category => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`px-4 py-2 rounded-md font-medium text-sm ${
                            selectedCategory === category.id
                              ? "bg-red-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {category.emoji} {category.display_name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredMenu.map(item => (
                      <div key={item.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          <span className="text-red-600 font-bold">${item.price.toFixed(2)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {item.category_emoji} {item.category_display_name}
                          </span>
                          <button
                            onClick={() => addToOrder(item)}
                            disabled={!activeClient}
                            className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Добавить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <div className="bg-gray-50 p-4 rounded-lg sticky top-4">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      {currentClient ? `Заказ - ${currentClient.name}` : "Выберите клиента"}
                    </h3>
                    
                    {!activeClient ? (
                      <p className="text-gray-500 text-sm">Выберите клиента для добавления блюд</p>
                    ) : currentClient?.order.length === 0 ? (
                      <p className="text-gray-500 text-sm">Заказ пуст</p>
                    ) : (
                      <div className="space-y-3 mb-4">
                        {currentClient?.order.map(item => (
                          <div key={item.id} className="flex justify-between items-center">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-gray-500">${item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-700"
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-700"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">📋 Сводка по всем клиентам:</h4>
                      <div className="space-y-3 mb-4">
                        {clients.map(client => (
                            <div key={client.id} className="bg-white p-3 rounded-lg border">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-gray-900">{client.name}</span>
                                <span className="font-semibold text-red-600">${calculateClientTotal(client.id).toFixed(2)}</span>
                              </div>
                              {client.order.length > 0 ? (
                                <div className="space-y-1">
                                  {client.order.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-xs text-gray-600">
                                      <span>{item.name} x{item.quantity}</span>
                                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400">Ничего не заказано</p>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex justify-between items-center font-semibold text-lg mb-4 pt-2 border-t">
                          <span>Общий итог:</span>
                          <span className="text-red-600">${calculateGrandTotal().toFixed(2)}</span>
                        </div>
                      </div>

                    <div className="border-t pt-2 font-semibold">
                      Итого: ${activeClient ? calculateClientTotal(activeClient).toFixed(2) : '0.00'}
                    </div>
                    
                    <div className="space-y-2">
                      <button
                        onClick={submitOrder}
                        disabled={loading || !clients.some(c => c.order.length > 0)}
                        className="w-full bg-red-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? "Отправка..." : "Отправить заказ"}
                      </button>
                      
                      <button
                        onClick={() => setActiveStep("table")}
                        className="w-full bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Сменить стол
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Kitchen Interface - полный функционал
const KitchenInterface = () => {
  const { user } = React.useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchKitchenOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/kitchen`);
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Ошибка загрузки заказов кухни:", error);
      setOrders([]);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setLoading(true);
    try {
      await axios.put(`${API}/orders/${orderId}`, { status: newStatus });
      fetchKitchenOrders();
      
      // Send notification when order is ready
      if (newStatus === 'ready') {
        sendLocalNotification(
          '🍽️ YomaBar - Заказ готов!',
          `Заказ #${orderId.slice(-8)} готов к выдаче`,
          'waitress'
        );
      }
    } catch (error) {
      alert("Ошибка при обновлении статуса заказа");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-orange-100 text-orange-800';
      case 'ready': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Ожидание';
      case 'confirmed': return 'Подтверждён';
      case 'preparing': return 'Готовится';
      case 'ready': return 'Готов';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-red-600 mb-2">YomaBar - Кухня</h1>
          <p className="text-gray-600">{user.full_name} | Активных заказов: {orders.length}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-lg">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Нет активных заказов</h3>
              <p className="text-gray-600">Все заказы обработаны!</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Стол {order.table_number}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {order.customer_name || `Заказ #${order.id.slice(-6)}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  {(order.items || []).map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{item.category_emoji || '🍽️'}</span>
                        <div>
                          <p className="font-medium">{item.name || item.menu_item_name}</p>
                          <p className="text-sm text-gray-600">{item.category_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg">×{item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'confirmed')}
                      disabled={loading}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Принять
                    </button>
                  )}
                  {order.status === 'confirmed' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      disabled={loading}
                      className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
                    >
                      Готовить
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      disabled={loading}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      Готово
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Bar Interface - полный функционал
const BarInterface = () => {
  const { user } = React.useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBarOrders();
    const interval = setInterval(fetchBarOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBarOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/bar`);
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Ошибка загрузки заказов бара:", error);
      setOrders([]);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setLoading(true);
    try {
      await axios.put(`${API}/orders/${orderId}`, { status: newStatus });
      fetchBarOrders();
      
      // Send notification when drink order is ready
      if (newStatus === 'ready') {
        sendLocalNotification(
          '🍻 YomaBar - Напитки готовы!',
          `Заказ #${orderId.slice(-8)} готов к выдаче`,
          'waitress'
        );
      }
    } catch (error) {
      alert("Ошибка при обновлении статуса заказа");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-orange-100 text-orange-800';
      case 'ready': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Ожидание';
      case 'confirmed': return 'Подтверждён';
      case 'preparing': return 'Готовится';
      case 'ready': return 'Готов';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-red-600 mb-2">YomaBar - Бар</h1>
          <p className="text-gray-600">{user.full_name} | Активных заказов: {orders.length}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-lg">
              <div className="text-6xl mb-4">🍹</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Нет активных заказов</h3>
              <p className="text-gray-600">Все напитки приготовлены!</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Стол {order.table_number}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {order.customer_name || `Заказ #${order.id.slice(-6)}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  {(order.items || []).map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{item.category_emoji || '🍹'}</span>
                        <div>
                          <p className="font-medium">{item.name || item.menu_item_name}</p>
                          <p className="text-sm text-gray-600">{item.category_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg">×{item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'confirmed')}
                      disabled={loading}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Принять
                    </button>
                  )}
                  {order.status === 'confirmed' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      disabled={loading}
                      className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
                    >
                      Готовить
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      disabled={loading}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      Готово
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Admin Interface - полный функционал
const AdminInterface = () => {
  const { user } = React.useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menu, setMenu] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Фильтры заказов
  const [orderFilters, setOrderFilters] = useState({
    hoursBack: 24,
    fromDate: "",
    toDate: "",
    includeServed: false
  });
  const [orderStats, setOrderStats] = useState({ totalCount: 0 });

  // Новая категория
  const [newCategory, setNewCategory] = useState({
    name: "", display_name: "", emoji: "", description: "", department: "kitchen", sort_order: 1
  });

  // Новое блюдо
  const [newMenuItem, setNewMenuItem] = useState({
    name: "", description: "", price: "", category_id: "", item_type: "food"
  });

  // Новый пользователь
  const [newUser, setNewUser] = useState({
    username: "", password: "", full_name: "", role: "waitress"
  });

  useEffect(() => {
    fetchOrders();
    fetchCategories();
    fetchMenu();
    fetchUsers();
    
    // Автообновление заказов каждые 30 секунд
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async (customFilters = null) => {
    try {
      const filters = customFilters || orderFilters;
      let url = `${API}/orders/admin?hours_back=${filters.hoursBack}&include_served=${filters.includeServed}`;
      
      if (filters.fromDate && filters.toDate) {
        url += `&from_date=${filters.fromDate}&to_date=${filters.toDate}`;
      }
      
      const response = await axios.get(url);
      setOrders(Array.isArray(response.data.orders) ? response.data.orders : []);
      setOrderStats({ totalCount: response.data.filters.total_count });
    } catch (error) {
      console.error("Ошибка загрузки заказов:", error);
      setOrders([]);
      setOrderStats({ totalCount: 0 });
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories/all`);
      setCategories(response.data);
    } catch (error) {
      console.error("Ошибка загрузки категорий:", error);
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

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error("Ошибка загрузки пользователей:", error);
    }
  };

  // Обновление фильтров заказов
  const updateOrderFilters = (newFilters) => {
    const updatedFilters = { ...orderFilters, ...newFilters };
    setOrderFilters(updatedFilters);
    fetchOrders(updatedFilters);
  };

  // Сегодня для быстрого доступа
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Переключение показа отданных заказов
  const toggleServedOrders = () => {
    updateOrderFilters({ includeServed: !orderFilters.includeServed });
  };

  const addCategory = async () => {
    if (!newCategory.name || !newCategory.display_name || !newCategory.emoji) {
      alert("Пожалуйста, заполните все обязательные поля");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/categories`, newCategory);
      setNewCategory({ name: "", display_name: "", emoji: "", description: "", department: "kitchen", sort_order: 1 });
      fetchCategories();
    } catch (error) {
      alert("Ошибка: " + (error.response?.data?.detail || "Не удалось добавить категорию"));
    } finally {
      setLoading(false);
    }
  };

  const addMenuItem = async () => {
    if (!newMenuItem.name || !newMenuItem.description || !newMenuItem.price || !newMenuItem.category_id) {
      alert("Пожалуйста, заполните все обязательные поля");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/menu`, {
        ...newMenuItem,
        price: parseFloat(newMenuItem.price)
      });
      setNewMenuItem({ name: "", description: "", price: "", category_id: "", item_type: "food" });
      fetchMenu();
    } catch (error) {
      alert("Ошибка: " + (error.response?.data?.detail || "Не удалось добавить блюдо"));
    } finally {
      setLoading(false);
    }
  };

  const addUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name || !newUser.role) {
      alert("Пожалуйста, заполните все обязательные поля");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/users`, newUser);
      setNewUser({ username: "", password: "", full_name: "", role: "waitress" });
      fetchUsers();
      alert("Пользователь успешно добавлен!");
    } catch (error) {
      alert("Ошибка: " + (error.response?.data?.detail || "Не удалось добавить пользователя"));
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId, categoryName) => {
    if (!confirm(`Вы уверены, что хотите удалить категорию "${categoryName}"?`)) {
      return;
    }
    
    setLoading(true);
    try {
      await axios.delete(`${API}/categories/${categoryId}`);
      fetchCategories();
      alert("Категория успешно удалена!");
    } catch (error) {
      alert("Ошибка: " + (error.response?.data?.detail || "Не удалось удалить категорию"));
    } finally {
      setLoading(false);
    }
  };

  const deleteMenuItem = async (itemId, itemName) => {
    if (!confirm(`Вы уверены, что хотите удалить блюдо "${itemName}"?`)) {
      return;
    }
    
    setLoading(true);
    try {
      await axios.delete(`${API}/menu/${itemId}`);
      fetchMenu();
      alert("Блюдо успешно удалено!");
    } catch (error) {
      alert("Ошибка: " + (error.response?.data?.detail || "Не удалось удалить блюдо"));
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId, userName) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя "${userName}"?`)) {
      return;
    }
    
    setLoading(true);
    try {
      await axios.delete(`${API}/users/${userId}`);
      fetchUsers();
      alert("Пользователь успешно удален!");
    } catch (error) {
      alert("Ошибка: " + (error.response?.data?.detail || "Не удалось удалить пользователя"));
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/orders/${orderId}`, { status: newStatus });
      fetchOrders();
    } catch (error) {
      alert("Ошибка при обновлении статуса заказа");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-orange-100 text-orange-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'served': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Ожидание';
      case 'confirmed': return 'Подтверждён';
      case 'preparing': return 'Готовится';
      case 'ready': return 'Готов';
      case 'served': return 'Подан';
      default: return status;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'administrator': return 'bg-red-100 text-red-800';
      case 'waitress': return 'bg-blue-100 text-blue-800';
      case 'kitchen': return 'bg-orange-100 text-orange-800';
      case 'bartender': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'administrator': return 'Администратор';
      case 'waitress': return 'Официант';
      case 'kitchen': return 'Кухня';
      case 'bartender': return 'Бармен';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
      {/* Мобильно-дружественный header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-4">
            <div className="mb-2 sm:mb-0">
              <h1 className="text-lg sm:text-2xl font-bold text-red-600">YomaBar</h1>
              <p className="text-xs sm:text-base text-gray-600">Администратор: {user.full_name}</p>
            </div>
            
            {/* Мобильная навигация */}
            <div className="flex flex-wrap gap-1 sm:gap-4">
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-2 sm:px-4 py-2 rounded-md font-medium text-xs sm:text-sm ${activeTab === "orders" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
              >
                Заказы
              </button>
              <button
                onClick={() => setActiveTab("categories")}
                className={`px-2 sm:px-4 py-2 rounded-md font-medium text-xs sm:text-sm ${activeTab === "categories" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
              >
                Категории
              </button>
              <button
                onClick={() => setActiveTab("menu")}
                className={`px-2 sm:px-4 py-2 rounded-md font-medium text-xs sm:text-sm ${activeTab === "menu" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
              >
                Меню
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`px-2 sm:px-4 py-2 rounded-md font-medium text-xs sm:text-sm ${activeTab === "users" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
              >
                Пользователи
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <>
          {activeTab === "orders" && (
          <div>
            <h2 className="text-xl font-bold mb-4">📋 Управление Заказами</h2>
            
            {/* Мобильно-дружественные фильтры заказов */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-4">
              <h3 className="text-base sm:text-lg font-semibold mb-3">🔍 Фильтры заказов</h3>
              
              <div className="space-y-3">
                {/* Основные фильтры */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Показать заказы за:
                  </label>
                  <select
                    value={orderFilters.hoursBack}
                    onChange={(e) => updateOrderFilters({ 
                      hoursBack: parseInt(e.target.value),
                      fromDate: "",
                      toDate: ""
                    })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value={6}>Последние 6 часов</option>
                    <option value={12}>Последние 12 часов</option>
                    <option value={24}>Последние 24 часа</option>
                    <option value={48}>Последние 2 дня</option>
                    <option value={168}>Последняя неделя</option>
                  </select>
                </div>

                {/* Даты */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Дата от:
                    </label>
                    <input
                      type="date"
                      value={orderFilters.fromDate}
                      onChange={(e) => updateOrderFilters({ 
                        fromDate: e.target.value,
                        hoursBack: 24
                      })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Дата до:
                    </label>
                    <input
                      type="date"
                      value={orderFilters.toDate}
                      onChange={(e) => updateOrderFilters({ 
                        toDate: e.target.value,
                        hoursBack: 24
                      })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                {/* Быстрые кнопки */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateOrderFilters({
                      hoursBack: 24,
                      fromDate: getTodayDate(),
                      toDate: getTodayDate()
                    })}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
                  >
                    📅 Сегодня
                  </button>
                  
                  <button
                    onClick={toggleServedOrders}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      orderFilters.includeServed
                        ? 'bg-gray-500 hover:bg-gray-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {orderFilters.includeServed ? '👁️ Скрыть отданные' : '👁️ Показать отданные'}
                  </button>
                </div>
                
                <div className="text-sm text-gray-600">
                  Найдено заказов: <strong>{orderStats.totalCount}</strong>
                  {!orderFilters.includeServed && " (исключая отданные)"}
                </div>
              </div>
            </div>
            
            {orders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-lg">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Нет заказов</h3>
                <p className="text-gray-600">
                  {orderFilters.includeServed 
                    ? "Заказы в выбранном периоде не найдены" 
                    : "Нет активных заказов в выбранном периоде. Попробуйте включить отданные заказы."}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs sm:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Заказ</th>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Клиент</th>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Блюда</th>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">Стол {order.table_number}</div>
                            <div className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString('ru-RU')}</div>
                          </td>
                          <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm text-gray-900">{order.customer_name}</div>
                          </td>
                          <td className="px-2 sm:px-6 py-4">
                            <div className="text-xs sm:text-sm text-gray-900">
                              {(order.items || []).map((item, index) => (
                                <div key={index} className="flex justify-between">
                                  <span>{item.menu_item_name || item.name}</span>
                                  <span>×{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">${(order.total || 0).toFixed(2)}</div>
                          </td>
                          <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                              {getStatusText(order.status)}
                            </span>
                          </td>
                          <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                            <select
                              value={order.status}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                              className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              <option value="pending">Ожидание</option>
                              <option value="confirmed">Подтверждён</option>
                              <option value="preparing">Готовится</option>
                              <option value="ready">Готов</option>
                              <option value="served">Подан</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "categories" && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold mb-4">🍽️ Управление Категориями</h2>
            
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-base sm:text-lg font-semibold mb-4">Добавить Новую Категорию</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Название (например, appetizers)"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <input
                  type="text"
                  placeholder="Русское название (например, Закуски)"
                  value={newCategory.display_name}
                  onChange={(e) => setNewCategory({...newCategory, display_name: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <input
                  type="text"
                  placeholder="Эмодзи (например, 🥗)"
                  value={newCategory.emoji}
                  onChange={(e) => setNewCategory({...newCategory, emoji: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <select
                  value={newCategory.department}
                  onChange={(e) => setNewCategory({...newCategory, department: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="kitchen">Кухня</option>
                  <option value="bar">Бар</option>
                </select>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Отдел</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Порядок</th>
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
                            <div className="text-sm font-medium text-gray-900">{category.display_name}</div>
                            <div className="text-sm text-gray-500">{category.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          category.department === 'kitchen' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {category.department === 'kitchen' ? 'Кухня' : 'Бар'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {category.sort_order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => deleteCategory(category.id, category.display_name)}
                          disabled={loading}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:bg-gray-400"
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
            <h2 className="text-xl font-bold mb-4">🍽️ Управление Меню</h2>
            
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-lg font-semibold mb-4">Добавить Новое Блюдо</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Название блюда"
                  value={newMenuItem.name}
                  onChange={(e) => setNewMenuItem({...newMenuItem, name: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <input
                  type="text"
                  placeholder="Описание блюда"
                  value={newMenuItem.description}
                  onChange={(e) => setNewMenuItem({...newMenuItem, description: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Цена"
                  value={newMenuItem.price}
                  onChange={(e) => setNewMenuItem({...newMenuItem, price: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <select
                  value={newMenuItem.category_id}
                  onChange={(e) => setNewMenuItem({...newMenuItem, category_id: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Выберите категорию</option>
                  {categories.filter(cat => cat.is_active).map(category => (
                    <option key={category.id} value={category.id}>
                      {category.emoji} {category.display_name}
                    </option>
                  ))}
                </select>
                <select
                  value={newMenuItem.item_type}
                  onChange={(e) => setNewMenuItem({...newMenuItem, item_type: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="food">Еда</option>
                  <option value="drink">Напиток</option>
                </select>
                <button
                  onClick={addMenuItem}
                  disabled={loading}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400"
                >
                  {loading ? "Добавление..." : "Добавить Блюдо"}
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Блюдо</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Категория</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
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
                        <button
                          onClick={() => deleteMenuItem(item.id, item.name)}
                          disabled={loading}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:bg-gray-400"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Имя пользователя"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <input
                  type="password"
                  placeholder="Пароль"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <input
                  type="text"
                  placeholder="Полное имя"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="waitress">Официант</option>
                  <option value="kitchen">Кухня</option>
                  <option value="bartender">Бармен</option>
                  <option value="administrator">Администратор</option>
                </select>
              </div>
              <button
                onClick={addUser}
                disabled={loading}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400 mt-4"
              >
                {loading ? "Добавление..." : "Добавить Пользователя"}
              </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Пользователь</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Роль</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата создания</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(user.role)}`}>
                          {getRoleText(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleString('ru-RU')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Активный
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => deleteUser(user.id, user.full_name)}
                          disabled={loading}
                          className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 disabled:bg-gray-400"
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
        </>
      </div>
    </div>
  );
};

// Простые интерфейсы для тестирования - УДАЛЕНЫ, заменены полными
const SimpleInterface = ({ role, user }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-red-600 mb-2">YomaBar</h1>
          <h2 className="text-xl font-semibold text-gray-900">
            {role === 'kitchen' ? 'Кухня' : role === 'bartender' ? 'Бар' : 'Администратор'}: {user.full_name}
          </h2>
        </div>
        
        <p className="text-gray-600 mb-4">
          Интерфейс {role === 'kitchen' ? 'кухни' : role === 'bartender' ? 'бара' : 'администратора'} работает!
        </p>
        
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">
            ✅ Роль-основанная авторизация работает корректно
          </p>
        </div>
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
        return <BarInterface />;
      case 'administrator':
        return <AdminInterface />;
      default:
        return <div>Неизвестная роль</div>;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={logout}
        className="absolute top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 font-medium"
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
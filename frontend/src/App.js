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
  "Привет, душечка! Отличной смены, вежливых клиентов и здоровских чаевых!",
  "Добро пожаловать, солнышко! Пусть смена пройдёт легко, а гости оставят щедрые чаевые!",
  "Здравствуй, родненький! Удачной смены и море довольных гостей с хорошими чаевыми!",
  "Приятной смены, пушистик! Желаю много улыбок и щедрых чаевых!",
  "Привет, цветочек! Пусть сегодня смена будет лёгкой и клиенты очень благодарными!",
  "Добро пожаловать, милашка! Желаю чудесных гостей и солидных чаевых!",
  "Привет, сладенькая! Удачной смены и приятных сюрпризов от клиентов!",
  "С новым днём, конфетка! Пусть гости будут добрыми, а чаевые — большими!",
  "Добро пожаловать, ягодка! Желаю отличной смены и благодарных клиентов!",
  "Приятной работы, звездочка! Пусть гости дарят улыбки и щедрые чаевые!",
  "Доброе утро, ангелочек! Удачной смены и море вежливых посетителей!",
  "Привет, пупсик! Желаю лёгкой смены, дружелюбных гостей и хороших чаевых!",
  "Здравствуй, рыбка! Удачи сегодня, милых клиентов и достойных чаевых!",
  "Приятной смены, птичка! Пусть гости будут в настроении платить щедро!",
  "Добро пожаловать, зайчонок! Желаю отличных клиентов и больших чаевых!",
  "Привет, карапузик! Лёгкой смены, добрых гостей и солидных бонусов от чаевых!",
  "Добро пожаловать, чудо! Удачной смены и благодарных посетителей!",
  "Здравствуй, медвежонок! Пусть смена пройдёт гладко и в копилке будут щедрые чаевые!",
  "Привет, гусёнок! Желаю тёплых улыбок гостей и достойных чаевых!",
  "Доброе утро, лимончик! Удачной смены, приятных клиентов и щедрых чаевых!",
  "Приятной смены, бабочка! Пусть каждый гость приносит радость и хорошие чаевые!"
];

// Фразы-похвала после каждого заказа
const COMPLETION_PHRASES = [
  "Отлично, котёнок! Ты справилась с этим, дальше – лучше!",
  "Молодчинка, цыплёнок! Справилась на отлично, дальше – лучше!",
  "Супер, зайчик! Ты молодец, дальше – лучше!",
  "Браво, лапушка! Отлично получилось, дальше – лучше!",
  "Отлично справилась, душечка! Ты справилась с этим, дальше – лучше!",
  "Блестяще, солнышко! Ты молодец, дальше – лучше!",
  "Ты лучшая, родненький! Справилась отлично, дальше – лучше!",
  "Великолепно, пушистик! Ты справилась с этим, дальше – лучше!",
  "Превосходно, милашка! Справилась на ура, дальше – лучше!",
  "Умничка, сладенькая! Ты справилась с этим, дальше – лучше!",
  "Замечательно, конфетка! Супер работа, дальше – лучше!",
  "Отлично поработала, ягодка! Ты справилась с этим, дальше – лучше!",
  "Ты супер, звездочка! Справилась отлично, дальше – лучше!",
  "Потрясающе, ангелочек! Ты справилась с этим, дальше – лучше!",
  "Круто, пупсик! Справилась на отлично, дальше – лучше!",
  "Обалденно, рыбка! Ты справилась с этим, дальше – лучше!",
  "Шикарно, птичка! Супер результат, дальше – лучше!",
  "Блистательно, зайчонок! Ты справилась с этим, дальше – лучше!",
  "Ты ас, карапузик! Справилась на ура, дальше – лучше!",
  "Бесподобно, бусинка! Ты справилась с этим, дальше – лучше!",
  "Великолепно, медвежонок! Справилась отлично, дальше – лучше!",
  "Прекрасно, гусёнок! Ты справилась с этим, дальше – лучше!",
  "Исключительно, лимончик! Супер работа, дальше – лучше!",
  "Фантастика, бабочка! Ты справилась с этим, дальше – лучше!",
  "Невероятно, чудо! Справилась на отлично, дальше – лучше!"
];

// Функция для случайного выбора фразы
const getRandomPhrase = (phrases) => {
  return phrases[Math.floor(Math.random() * phrases.length)];
};

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
        
        <div className="mt-6 text-center">
          <h3 className="text-lg font-medium text-gray-900">Демо Аккаунты</h3>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <p>Официант: <code className="bg-gray-100 px-2 py-1 rounded">waitress1</code> / <code className="bg-gray-100 px-2 py-1 rounded">password123</code></p>
            <p>Кухня: <code className="bg-gray-100 px-2 py-1 rounded">kitchen1</code> / <code className="bg-gray-100 px-2 py-1 rounded">password123</code></p>
            <p>Бармен: <code className="bg-gray-100 px-2 py-1 rounded">bartender1</code> / <code className="bg-gray-100 px-2 py-1 rounded">password123</code></p>
            <p>Администратор: <code className="bg-gray-100 px-2 py-1 rounded">admin1</code> / <code className="bg-gray-100 px-2 py-1 rounded">password123</code></p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Waitress Interface - Complete implementation
const WaitressInterface = () => {
  const { user } = React.useContext(AuthContext);
  const [activeStep, setActiveStep] = useState("welcome");
  const [selectedTable, setSelectedTable] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [welcomePhrase, setWelcomePhrase] = useState("");
  const [completionPhrase, setCompletionPhrase] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    // Показать приветственную фразу при загрузке
    setWelcomePhrase(getRandomPhrase(WELCOME_PHRASES));
    fetchMenu();
    fetchCategories();
  }, []);

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
    const updatedClients = clients.filter(client => client.id !== clientId);
    setClients(updatedClients);
    if (activeClient === clientId) {
      setActiveClient(updatedClients.length > 0 ? updatedClients[0].id : null);
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

  const submitOrder = async () => {
    if (clients.length === 0) {
      alert("Добавьте хотя бы одного клиента");
      return;
    }

    const hasItems = clients.some(client => client.order.length > 0);
    if (!hasItems) {
      alert("Добавьте блюда в заказ");
      return;
    }

    setLoading(true);
    try {
      // Создаем один заказ для всего стола
      const allItems = [];
      let orderNotes = `Стол: ${selectedTable}`;
      if (teamName.trim()) {
        orderNotes += ` | Команда: ${teamName}`;
      }
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
      
      // Показать фразу-похвалу
      setCompletionPhrase(getRandomPhrase(COMPLETION_PHRASES));
      
      // Очистить данные
      setClients([]);
      setActiveClient(null);
      setTeamName("");
      
      // Показать экран успеха
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
    setTeamName("");
    setActiveStep("table");
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

  // Приветственный экран
  if (activeStep === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-red-600 mb-2">YomaBar</h1>
            <h2 className="text-xl font-semibold text-gray-900">
              {getRoleDisplayName(user.role)}: {user.full_name}
            </h2>
          </div>
          
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium text-lg">
              {welcomePhrase}
            </p>
          </div>
          
          <button
            onClick={() => setActiveStep("table")}
            className="w-full bg-red-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-red-700 transition-colors"
          >
            Начать работу
          </button>
        </div>
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
              onClick={() => setActiveStep("welcome")}
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
                    setActiveStep("order");
                  }}
                  className="aspect-square bg-red-600 text-white font-bold text-lg rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                >
                  {tableNumber}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setActiveStep("welcome")}
              className="w-full bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Интерфейс создания заказа
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
                    
                    {clients.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {clients.map(client => (
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeClient(client.id);
                              }}
                              className="text-red-500 hover:text-red-700 ml-1"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                      Заказ{currentClient ? ` - ${currentClient.name}` : ''}
                    </h3>
                    
                    {!activeClient ? (
                      <p className="text-gray-500 text-sm">Выберите клиента для добавления блюд</p>
                    ) : currentClient.order.length === 0 ? (
                      <p className="text-gray-500 text-sm">Заказ пуст</p>
                    ) : (
                      <div className="space-y-3 mb-4">
                        {currentClient.order.map(item => (
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

                    {clients.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Итого по клиентам:</h4>
                        <div className="space-y-1 mb-4">
                          {clients.map(client => (
                            <div key={client.id} className="flex justify-between text-sm">
                              <span>{client.name}:</span>
                              <span className="font-medium">${calculateClientTotal(client.id).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex justify-between items-center font-semibold text-lg mb-4 pt-2 border-t">
                          <span>Общий итог:</span>
                          <span className="text-red-600">${calculateGrandTotal().toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <button
                        onClick={submitOrder}
                        disabled={loading || clients.length === 0 || !clients.some(c => c.order.length > 0)}
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

// Admin Interface
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-red-600">YomaBar</h1>
              <p className="text-gray-600">Администратор: {user.full_name}</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab("categories")}
                className={`px-4 py-2 rounded-md font-medium ${activeTab === "categories" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
              >
                Категории
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`px-4 py-2 rounded-md font-medium ${activeTab === "users" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
              >
                Пользователи
              </button>
              <button
                onClick={() => setActiveTab("menu")}
                className={`px-4 py-2 rounded-md font-medium ${activeTab === "menu" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
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
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <input
                  type="text"
                  placeholder="Отображаемое название (например, Закуски)"
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
                <input
                  type="text"
                  placeholder="Описание (необязательно)"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <input
                  type="number"
                  placeholder="Порядок сортировки"
                  value={newCategory.sort_order}
                  onChange={(e) => setNewCategory({...newCategory, sort_order: parseInt(e.target.value)})}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                <input
                  type="email"
                  placeholder="Email (необязательно)"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
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

// Kitchen Interface
const KitchenInterface = () => {
  const { user } = React.useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchKitchenOrders();
    // Обновляем заказы каждые 30 секунд
    const interval = setInterval(fetchKitchenOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchKitchenOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/kitchen`);
      setOrders(response.data);
    } catch (error) {
      console.error("Ошибка загрузки заказов кухни:", error);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setLoading(true);
    try {
      await axios.put(`${API}/orders/${orderId}`, { status: newStatus });
      fetchKitchenOrders();
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
        <div className="yoma-header mb-6">
          <h1>YomaBar - Кухня</h1>
          <p>{user.full_name} | Активных заказов: {orders.length}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.length === 0 ? (
            <div className="col-span-full text-center py-12">
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
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{item.category_emoji}</span>
                        <div>
                          <p className="font-medium">{item.name}</p>
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

// Bar Interface
const BarInterface = () => {
  const { user } = React.useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBarOrders();
    // Обновляем заказы каждые 30 секунд
    const interval = setInterval(fetchBarOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBarOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/bar`);
      setOrders(response.data);
    } catch (error) {
      console.error("Ошибка загрузки заказов бара:", error);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setLoading(true);
    try {
      await axios.put(`${API}/orders/${orderId}`, { status: newStatus });
      fetchBarOrders();
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
        <div className="yoma-header mb-6">
          <h1>YomaBar - Бар</h1>
          <p>{user.full_name} | Активных заказов: {orders.length}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.length === 0 ? (
            <div className="col-span-full text-center py-12">
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
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{item.category_emoji}</span>
                        <div>
                          <p className="font-medium">{item.name}</p>
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

// Simple interface for kitchen and bartender roles
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-red-600 mb-2">YomaBar</h1>
          <h2 className="text-xl font-semibold text-gray-900">
            {getRoleDisplayName(role)}: {user.full_name}
          </h2>
        </div>
        
        <p className="text-gray-600 mb-4">
          Добро пожаловать в Систему Управления Рестораном YomaBar
        </p>
        
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-green-800">
            ✅ <strong>Расширенные функции:</strong>
          </p>
          <ul className="text-sm mt-2 space-y-1 text-green-700">
            <li>• Динамические категории</li>
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
        return <WaitressInterface />;
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
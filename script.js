// ===== ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ =====
// Инициализация приложения SocialSphere

// Основной объект приложения
const SocialSphere = {
    // Состояние приложения
    state: {
        currentUser: null,
        isAuthenticated: false,
        currentPage: 'home',
        theme: 'light',
        notifications: [],
        onlineUsers: [],
        posts: [],
        users: [],
        settings: {},
        db: null,
        isOnline: true,
        drafts: [],
        notificationsEnabled: true,
        lastActivity: Date.now()
    },

    // Инициализация приложения
    init() {
        console.log('Инициализация SocialSphere...');
        
        // Инициализация базы данных
        this.initDB().then(() => {
            console.log('База данных инициализирована');
            
            // Загрузка сохраненных данных
            this.loadSavedData();
            
            // Настройка обработчиков событий
            this.setupEventListeners();
            
            // Проверка авторизации
            this.checkAuth();
             
            // Инициализация UI (если UI существует)
            if (typeof UI !== 'undefined') {
                UI.init();
            } else {
                console.warn('UI модуль не загружен');
            }
            
            // Загрузка начальных данных
            this.loadInitialData();
            
            // Запуск периодических задач
            this.startPeriodicTasks();
            
            // Скрытие загрузочного экрана
            setTimeout(() => {
                document.getElementById('loading-screen').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('loading-screen').style.display = 'none';
                    document.getElementById('app').style.display = 'flex';
                }, 500);
            }, 1000);
            
            console.log('SocialSphere успешно инициализирован');
        }).catch(error => {
            console.error('Ошибка инициализации:', error);
            this.showToast('Ошибка инициализации приложения', 'error');
        });
    },

    // Инициализация IndexedDB
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SocialSphereDB', 3);
            
            request.onerror = (event) => {
                console.error('Ошибка открытия базы данных:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                this.state.db = event.target.result;
                console.log('База данных успешно открыта');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Создание хранилища пользователей
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id' });
                    userStore.createIndex('username', 'username', { unique: true });
                    userStore.createIndex('email', 'email', { unique: false });
                    userStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
                
                // Создание хранилища постов
                if (!db.objectStoreNames.contains('posts')) {
                    const postStore = db.createObjectStore('posts', { keyPath: 'id' });
                    postStore.createIndex('userId', 'userId', { unique: false });
                    postStore.createIndex('createdAt', 'createdAt', { unique: false });
                    postStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                }
                
                // Создание хранилища комментариев
                if (!db.objectStoreNames.contains('comments')) {
                    const commentStore = db.createObjectStore('comments', { keyPath: 'id' });
                    commentStore.createIndex('postId', 'postId', { unique: false });
                    commentStore.createIndex('userId', 'userId', { unique: false });
                    commentStore.createIndex('parentId', 'parentId', { unique: false });
                }
                
                // Создание хранилища уведомлений
                if (!db.objectStoreNames.contains('notifications')) {
                    const notificationStore = db.createObjectStore('notifications', { keyPath: 'id' });
                    notificationStore.createIndex('userId', 'userId', { unique: false });
                    notificationStore.createIndex('read', 'read', { unique: false });
                }
                
                // Создание хранилища друзей
                if (!db.objectStoreNames.contains('friends')) {
                    const friendStore = db.createObjectStore('friends', { keyPath: 'id' });
                    friendStore.createIndex('userId', 'userId', { unique: false });
                    friendStore.createIndex('friendId', 'friendId', { unique: false });
                    friendStore.createIndex('status', 'status', { unique: false });
                }
                
                // Создание хранилища сообщений
                if (!db.objectStoreNames.contains('messages')) {
                    const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
                    messageStore.createIndex('conversationId', 'conversationId', { unique: false });
                    messageStore.createIndex('senderId', 'senderId', { unique: false });
                }
                
                // Создание хранилища настроек
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'userId' });
                }
                
                console.log('Структура базы данных создана');
            };
        });
    },

    // Загрузка сохраненных данных из LocalStorage
    loadSavedData() {
        // Загрузка темы
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.state.theme = savedTheme;
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
        
        // Загрузка языка
        const savedLang = localStorage.getItem('language');
        if (savedLang) {
            this.state.language = savedLang;
        }
        
        // Загрузка настроек
        const savedSettings = localStorage.getItem('settings');
        if (savedSettings) {
            this.state.settings = JSON.parse(savedSettings);
        }
        
        // Загрузка черновиков
        const savedDrafts = localStorage.getItem('drafts');
        if (savedDrafts) {
            this.state.drafts = JSON.parse(savedDrafts);
        }
        
        // Проверка состояния сети
        this.state.isOnline = navigator.onLine;
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            this.showToast('Соединение восстановлено', 'success');
        });
        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            this.showToast('Отсутствует соединение с интернетом', 'warning');
        });
    },

    // Настройка обработчиков событий
    setupEventListeners() {
        // Авторизация
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const demoLoginBtn = document.getElementById('demo-login');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
        if (demoLoginBtn) {
            demoLoginBtn.addEventListener('click', () => this.handleDemoLogin());
        }
        
        // Модальные окна
        const closeAuthModal = document.getElementById('close-auth-modal');
        const closeSettingsModal = document.getElementById('close-settings-modal');
        const closeCreatePostModal = document.getElementById('close-create-post-modal');
        const closeNotificationsModal = document.getElementById('close-notifications-modal');
        
        if (closeAuthModal) {
            closeAuthModal.addEventListener('click', () => this.hideModal('auth-modal'));
        }
        if (closeSettingsModal) {
            closeSettingsModal.addEventListener('click', () => this.hideModal('settings-modal'));
        }
        if (closeCreatePostModal) {
            closeCreatePostModal.addEventListener('click', () => this.hideModal('create-post-modal'));
        }
        if (closeNotificationsModal) {
            closeNotificationsModal.addEventListener('click', () => this.hideModal('notifications-modal'));
        }
        
        // Навигация
        const logo = document.getElementById('logo');
        const menuToggle = document.getElementById('menu-toggle');
        const createPostBtn = document.getElementById('create-post-btn');
        const notificationsBtn = document.getElementById('notifications-btn');
        const themeToggle = document.getElementById('theme-toggle');
        
        if (logo) logo.addEventListener('click', () => this.navigateTo('home'));
        if (menuToggle) menuToggle.addEventListener('click', () => this.toggleSidebar());
        if (createPostBtn) createPostBtn.addEventListener('click', () => this.showModal('create-post-modal'));
        if (notificationsBtn) notificationsBtn.addEventListener('click', () => this.showNotifications());
        if (themeToggle) themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Навигация по страницам
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.getAttribute('data-page');
                this.navigateTo(page);
            });
        });
        
        // Выпадающее меню пользователя
        const userDropdownToggle = document.getElementById('user-dropdown-toggle');
        if (userDropdownToggle) {
            userDropdownToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown('user-dropdown');
            });
        }
        
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const action = e.currentTarget.getAttribute('data-action');
                this.handleUserAction(action);
            });
        });
        
        // Закрытие выпадающих меню при клике вне их
        document.addEventListener('click', () => {
            this.closeAllDropdowns();
        });
        
        // Поиск
        const globalSearch = document.getElementById('global-search');
        const searchBtn = document.getElementById('search-btn');
        
        if (globalSearch) {
            globalSearch.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.handleSearch(document.getElementById('global-search')?.value || '');
            });
        }
        
        // Создание поста
        const createPostForm = document.getElementById('create-post-form');
        const postContent = document.getElementById('post-content');
        
        if (createPostForm) {
            createPostForm.addEventListener('submit', (e) => this.handleCreatePost(e));
        }
        if (postContent) {
            postContent.addEventListener('input', (e) => this.handlePostContentChange(e));
        }
        
        // Отслеживание активности
        document.addEventListener('mousemove', () => this.updateLastActivity());
        document.addEventListener('keypress', () => this.updateLastActivity());
        
        // Горячие клавиши
        document.addEventListener('keydown', (e) => this.handleHotkeys(e));
        
        // Предотвращение закрытия страницы при наличии несохраненных данных
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?';
            }
        });
    },

    // Проверка авторизации (ИСПРАВЛЕННЫЙ МЕТОД)
    checkAuth() {
        // Защитная проверка: если UI еще не загружен, отложим проверку
        if (typeof UI === 'undefined') {
            console.warn('Модуль UI еще не загружен, откладываю проверку авторизации...');
            setTimeout(() => this.checkAuth(), 100);
            return;
        }

        const savedUser = localStorage.getItem('currentUser');
        const authToken = localStorage.getItem('authToken');
        
        if (savedUser && authToken) {
            try {
                this.state.currentUser = JSON.parse(savedUser);
                this.state.isAuthenticated = true;
                this.updateUIAfterAuth();
                this.loadUserData();
            } catch (error) {
                console.error('Ошибка загрузки пользователя:', error);
                this.logout();
            }
        } else {
            this.showAuthModal();
        }
    },

    // Показать модальное окно авторизации (ИСПРАВЛЕННЫЙ МЕТОД)
    showAuthModal() {
        // Проверяем, что UI доступен
        if (typeof UI !== 'undefined' && UI.showModal) {
            UI.showModal('auth-modal');
        } else {
            console.error('Модуль UI недоступен для показа модального окна');
            // Резервный вариант: показать окно напрямую
            const authModal = document.getElementById('auth-modal');
            const modalOverlay = document.getElementById('modal-overlay');
            
            if (authModal) authModal.style.display = 'block';
            if (modalOverlay) modalOverlay.style.display = 'block';
        }
    },

    // Обновление UI после авторизации
    updateUIAfterAuth() {
        // Обновление информации о пользователе
        const userNameElement = document.getElementById('user-name');
        const userRoleElement = document.getElementById('user-role');
        
        if (userNameElement && this.state.currentUser) {
            userNameElement.textContent = this.state.currentUser.username;
        }
        if (userRoleElement) {
            userRoleElement.textContent = 'Пользователь';
        }
        
        // Обновление аватара
        const avatarImg = document.getElementById('avatar-img');
        if (avatarImg && this.state.currentUser?.avatar) {
            avatarImg.src = this.state.currentUser.avatar;
        }
        
        // Показать основной интерфейс
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.classList.add('hidden');
        }
        
        // Обновление виджетов
        this.updateProfileWidget();
        this.updateOnlineStatus(true);
        
        // Загрузка уведомлений
        this.loadNotifications();
        
        // Обновление счетчиков
        this.updateCounters();
    },

    // Обработка входа
    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('login-username')?.value;
        const password = document.getElementById('login-password')?.value;
        const rememberMe = document.getElementById('remember-me')?.checked;
        
        if (!username || !password) {
            this.showToast('Заполните все поля', 'error');
            return;
        }
        
        try {
            // Временно создаем пользователя для демо
            const user = {
                id: 'user_' + Date.now(),
                username: username,
                email: '',
                avatar: 'assets/default-avatar.png',
                createdAt: Date.now(),
                postsCount: 0,
                friendsCount: 0
            };
            
            this.state.currentUser = user;
            this.state.isAuthenticated = true;
            
            // Сохранение данных
            if (rememberMe) {
                localStorage.setItem('currentUser', JSON.stringify(user));
                localStorage.setItem('authToken', 'demo_token_' + user.id);
            } else {
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                sessionStorage.setItem('authToken', 'demo_token_' + user.id);
            }
            
            // Обновление UI
            this.updateUIAfterAuth();
            this.hideModal('auth-modal');
            this.showToast('Успешный вход!', 'success');
            
            // Загрузка данных пользователя
            this.loadUserData();
            
            // Запись в историю активности
            this.logActivity('login', `Пользователь ${username} вошел в систему`);
        } catch (error) {
            this.showToast('Ошибка входа: ' + error.message, 'error');
        }
    },

    // Обработка регистрации
    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('register-username')?.value;
        const email = document.getElementById('register-email')?.value;
        const password = document.getElementById('register-password')?.value;
        const confirmPassword = document.getElementById('register-confirm')?.value;
        
        if (!username || !password || !confirmPassword) {
            this.showToast('Заполните обязательные поля', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showToast('Пароли не совпадают', 'error');
            return;
        }
        
        try {
            // Создаем нового пользователя
            const user = {
                id: 'user_' + Date.now(),
                username: username,
                email: email || '',
                avatar: 'assets/default-avatar.png',
                createdAt: Date.now(),
                postsCount: 0,
                friendsCount: 0,
                bio: 'Новый пользователь SocialSphere'
            };
            
            // Сохраняем в базу данных
            if (this.state.db) {
                await this.saveUserToDB(user);
            }
            
            this.showToast('Регистрация успешна! Теперь вы можете войти.', 'success');
            
            // Переключение на вкладку входа
            const loginTab = document.querySelector('.auth-tab[data-tab="login"]');
            if (loginTab) loginTab.click();
            
            document.getElementById('login-username').value = username;
            document.getElementById('login-password').value = password;
        } catch (error) {
            this.showToast('Ошибка регистрации: ' + error.message, 'error');
        }
    },

    // Сохранить пользователя в IndexedDB
    async saveUserToDB(user) {
        return new Promise((resolve, reject) => {
            if (!this.state.db) {
                reject(new Error('База данных не инициализирована'));
                return;
            }
            
            const transaction = this.state.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const request = store.add(user);
            
            request.onsuccess = () => resolve(user);
            request.onerror = (event) => reject(event.target.error);
        });
    },

    // Демо-вход
    async handleDemoLogin() {
        try {
            // Создание демо-пользователя
            const demoUser = {
                id: 'demo_user_123',
                username: 'demo_user',
                email: 'demo@example.com',
                avatar: 'assets/default-avatar.png',
                createdAt: Date.now(),
                postsCount: 3,
                friendsCount: 5,
                bio: 'Демо-пользователь для тестирования SocialSphere'
            };
            
            this.state.currentUser = demoUser;
            this.state.isAuthenticated = true;
            
            // Сохранение в sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(demoUser));
            sessionStorage.setItem('authToken', 'demo_token');
            
            // Обновление UI
            this.updateUIAfterAuth();
            this.hideModal('auth-modal');
            this.showToast('Демо-режим активирован', 'success');
            
            // Создание демо-данных
            this.createDemoData();
        } catch (error) {
            this.showToast('Ошибка демо-входа: ' + error.message, 'error');
        }
    },

    // Создание демо-данных
    async createDemoData() {
        // Создание демо-постов
        const demoPosts = [
            {
                id: 'post_1',
                content: 'Привет! Это демо-пост. Добро пожаловать в SocialSphere! 🚀',
                author: 'demo_user',
                authorId: 'demo_user_123',
                authorAvatar: 'assets/default-avatar.png',
                tags: ['добро пожаловать', 'демо'],
                privacy: 'public',
                createdAt: Date.now() - 3600000,
                likes: ['user_1', 'user_2'],
                comments: []
            },
            {
                id: 'post_2',
                content: 'Проверяем работу лайков и комментариев. Как вам дизайн? 🎨',
                author: 'demo_user',
                authorId: 'demo_user_123',
                authorAvatar: 'assets/default-avatar.png',
                tags: ['дизайн', 'фидбек'],
                privacy: 'public',
                createdAt: Date.now() - 7200000,
                likes: ['user_1'],
                comments: []
            },
            {
                id: 'post_3',
                content: 'Сегодня отличный день для тестирования нового социального сайта! ☀️',
                author: 'demo_user',
                authorId: 'demo_user_123',
                authorAvatar: 'assets/default-avatar.png',
                tags: ['тестирование', 'новости'],
                privacy: 'public',
                createdAt: Date.now() - 10800000,
                likes: [],
                comments: []
            }
        ];
        
        // Добавляем демо-посты в состояние
        this.state.posts = [...demoPosts, ...this.state.posts];
        
        // Обновляем ленту
        this.loadHomeFeed();
        
        // Создаем демо-пользователей
        const demoUsers = [
            { id: 'user_1', username: 'alex_test', avatar: 'assets/default-avatar.png', lastActivity: Date.now() - 300000 },
            { id: 'user_2', username: 'maria_dev', avatar: 'assets/default-avatar.png', lastActivity: Date.now() - 600000 },
            { id: 'user_3', username: 'ivan_code', avatar: 'assets/default-avatar.png', lastActivity: Date.now() - 1800000 }
        ];
        
        this.state.users = [...demoUsers, ...this.state.users];
        
        // Обновляем виджеты
        this.updateActiveUsers();
        this.updateFooterStats();
    },

    // ===== БАЗОВЫЕ UI МЕТОДЫ (если UI не загружен) =====
    
    showModal(modalId) {
        if (typeof UI !== 'undefined' && UI.showModal) {
            UI.showModal(modalId);
        } else {
            const modal = document.getElementById(modalId);
            const overlay = document.getElementById('modal-overlay');
            
            if (modal) modal.style.display = 'block';
            if (overlay) overlay.style.display = 'block';
        }
    },
    
    hideModal(modalId) {
        if (typeof UI !== 'undefined' && UI.hideModal) {
            UI.hideModal(modalId);
        } else {
            const modal = document.getElementById(modalId);
            const overlay = document.getElementById('modal-overlay');
            
            if (modal) modal.style.display = 'none';
            if (overlay) overlay.style.display = 'none';
        }
    },
    
    toggleSidebar() {
        if (typeof UI !== 'undefined' && UI.toggleSidebar) {
            UI.toggleSidebar();
        } else {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('show');
        }
    },
    
    toggleDropdown(dropdownId) {
        if (typeof UI !== 'undefined' && UI.toggleDropdown) {
            UI.toggleDropdown(dropdownId);
        } else {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) dropdown.classList.toggle('show');
        }
    },
    
    closeAllDropdowns() {
        if (typeof UI !== 'undefined' && UI.closeAllDropdowns) {
            UI.closeAllDropdowns();
        } else {
            document.querySelectorAll('.dropdown-menu.show').forEach(dropdown => {
                dropdown.classList.remove('show');
            });
        }
    },

    // ===== ОСТАЛЬНЫЕ МЕТОДЫ (сокращены для краткости) =====
    
    // Навигация по страницам
    navigateTo(page) {
        this.state.currentPage = page;
        
        // Обновление активной навигации
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === page) {
                item.classList.add('active');
            }
        });
        
        // Обновление заголовка страницы
        const pageTitles = {
            'home': 'Главная',
            'feed': 'Лента',
            'explore': 'Исследовать',
            'messages': 'Сообщения',
            'friends': 'Друзья',
            'groups': 'Группы',
            'events': 'События',
            'gallery': 'Галерея',
            'achievements': 'Достижения'
        };
        
        const pageTitleElement = document.getElementById('page-title');
        if (pageTitleElement) {
            pageTitleElement.textContent = pageTitles[page] || 'Страница';
        }
        
        // Загрузка контента страницы
        this.loadPageContent(page);
        
        // Закрытие сайдбара на мобильных устройствах
        if (window.innerWidth < 992) {
            this.hideSidebar();
        }
    },

    // Загрузка контента страницы
    loadPageContent(page) {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) return;
        
        switch (page) {
            case 'home':
                this.loadHomePage(contentArea);
                break;
            case 'feed':
                this.loadFeedPage(contentArea);
                break;
            default:
                contentArea.innerHTML = '<div class="empty-state"><h3>Страница в разработке</h3></div>';
        }
    },

    // Загрузка главной страницы
    loadHomePage(container) {
        if (!this.state.isAuthenticated) {
            container.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-card">
                        <h2>Добро пожаловать в SocialSphere!</h2>
                        <p>Присоединяйтесь к сообществу, делитесь мыслями, находите друзей и открывайте новое.</p>
                        <div class="welcome-actions">
                            <button class="btn btn-primary btn-large" id="welcome-login-btn">Войти</button>
                            <button class="btn btn-secondary btn-large" id="welcome-register-btn">Зарегистрироваться</button>
                        </div>
                    </div>
                    
                    <div class="features-grid">
                        <div class="feature-card">
                            <div class="feature-icon">🔒</div>
                            <h3>Безопасность</h3>
                            <p>Ваши данные защищены современными алгоритмами шифрования</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">🚀</div>
                            <h3>Скорость</h3>
                            <p>Быстрая работа без перезагрузки страниц</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">🎨</div>
                            <h3>Кастомизация</h3>
                            <p>Настройте внешний вид под свой вкус</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">📱</div>
                            <h3>Адаптивность</h3>
                            <p>Работает на любых устройствах</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Добавляем обработчики для кнопок
            const welcomeLoginBtn = document.getElementById('welcome-login-btn');
            const welcomeRegisterBtn = document.getElementById('welcome-register-btn');
            
            if (welcomeLoginBtn) {
                welcomeLoginBtn.addEventListener('click', () => this.showAuthModal());
            }
            if (welcomeRegisterBtn) {
                welcomeRegisterBtn.addEventListener('click', () => {
                    this.showAuthModal();
                    const registerTab = document.querySelector('.auth-tab[data-tab="register"]');
                    if (registerTab) registerTab.click();
                });
            }
        } else {
            container.innerHTML = `
                <div class="home-container">
                    <div class="quick-stats">
                        <div class="stat-card">
                            <div class="stat-value" id="total-friends">${this.state.currentUser?.friendsCount || 0}</div>
                            <div class="stat-label">Друзей</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="total-posts-count">${this.state.currentUser?.postsCount || 0}</div>
                            <div class="stat-label">Постов</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="total-likes">0</div>
                            <div class="stat-label">Лайков</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="total-comments">0</div>
                            <div class="stat-label">Комментариев</div>
                        </div>
                    </div>
                    
                    <div class="content-feed" id="home-feed">
                        <div class="feed-header">
                            <h3>Последние обновления</h3>
                            <button class="btn btn-small" id="refresh-feed">Обновить</button>
                        </div>
                        <div class="posts-container" id="home-posts"></div>
                    </div>
                </div>
            `;
            
            this.loadHomeFeed();
            
            // Обработчик кнопки обновления
            const refreshBtn = document.getElementById('refresh-feed');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.loadHomeFeed());
            }
        }
    },

    // Загрузка ленты на главной
    async loadHomeFeed() {
        const container = document.getElementById('home-posts');
        if (!container) return;
        
        // Показываем индикатор загрузки
        container.innerHTML = '<div class="loading-posts">Загрузка постов...</div>';
        
        // Имитация загрузки
        setTimeout(() => {
            if (this.state.posts.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>Пока нет постов. Будьте первым!</p></div>';
            } else {
                this.displayPosts(this.state.posts.slice(0, 10), 'home-posts');
            }
        }, 500);
    },

    // Отображение постов
    displayPosts(posts, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (posts.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Пока нет постов</p></div>';
            return;
        }
        
        container.innerHTML = posts.map(post => this.createPostHTML(post)).join('');
        
        // Добавление обработчиков событий для постов
        this.attachPostEventListeners();
    },

    // Создание HTML для поста
    createPostHTML(post) {
        const isLiked = post.likes && post.likes.includes(this.state.currentUser?.id);
        const likeCount = post.likes ? post.likes.length : 0;
        const commentCount = post.comments ? post.comments.length : 0;
        const timeAgo = this.formatTimeAgo(post.createdAt);
        
        return `
            <div class="post" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-avatar">
                        <img src="${post.authorAvatar || 'assets/default-avatar.png'}" alt="${post.author}">
                    </div>
                    <div class="post-info">
                        <div class="post-author">${post.author}</div>
                        <div class="post-meta">
                            ${timeAgo}
                            ${post.privacy === 'private' ? '🔒' : ''}
                        </div>
                    </div>
                    <div class="post-actions">
                        <button class="post-dropdown">⋮</button>
                    </div>
                </div>
                <div class="post-content">
                    <div class="post-text">${this.formatPostContent(post.content)}</div>
                    ${post.tags && post.tags.length > 0 ? `
                        <div class="post-tags">
                            ${post.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="post-footer">
                    <button class="post-action like-btn ${isLiked ? 'liked' : ''}" data-action="like">
                        <span class="action-icon">❤️</span>
                        <span class="action-count">${likeCount}</span>
                    </button>
                    <button class="post-action" data-action="comment">
                        <span class="action-icon">💬</span>
                        <span class="action-count">${commentCount}</span>
                    </button>
                    <button class="post-action" data-action="share">
                        <span class="action-icon">↪️</span>
                        <span class="action-text">Поделиться</span>
                    </button>
                </div>
            </div>
        `;
    },

    // Форматирование содержимого поста
    formatPostContent(content) {
        // Простой форматировщик
        if (!content) return '';
        
        // Замена ссылок
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        content = content.replace(urlRegex, url => `<a href="${url}" target="_blank" class="post-link">${url}</a>`);
        
        // Замена хэштегов
        const hashtagRegex = /#(\w+)/g;
        content = content.replace(hashtagRegex, (match, tag) => 
            `<a href="#" class="hashtag" data-tag="${tag}">${match}</a>`
        );
        
        // Замена переносов строк
        content = content.replace(/\n/g, '<br>');
        
        return content;
    },

    // Обработка действий с постом
    attachPostEventListeners() {
        // Лайки
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const postElement = e.target.closest('.post');
                const postId = postElement.getAttribute('data-post-id');
                
                // Простая имитация лайка
                const likeCountElement = btn.querySelector('.action-count');
                const currentCount = parseInt(likeCountElement.textContent) || 0;
                
                if (btn.classList.contains('liked')) {
                    btn.classList.remove('liked');
                    likeCountElement.textContent = currentCount - 1;
                } else {
                    btn.classList.add('liked');
                    likeCountElement.textContent = currentCount + 1;
                    btn.classList.add('like-animation');
                    setTimeout(() => btn.classList.remove('like-animation'), 300);
                }
                
                this.showToast('Лайк обновлен', 'success');
            });
        });
        
        // Комментарии
        document.querySelectorAll('.post-action[data-action="comment"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const postElement = e.target.closest('.post');
                const postId = postElement.getAttribute('data-post-id');
                
                // Показываем поле для комментария
                const commentForm = document.createElement('div');
                commentForm.className = 'comment-form';
                commentForm.innerHTML = `
                    <textarea placeholder="Напишите комментарий..." rows="2"></textarea>
                    <div class="comment-form-actions">
                        <button class="btn btn-small btn-ghost cancel-comment">Отмена</button>
                        <button class="btn btn-small btn-primary submit-comment">Отправить</button>
                    </div>
                `;
                
                // Вставляем после поста
                postElement.appendChild(commentForm);
                
                // Обработчики для формы комментария
                const cancelBtn = commentForm.querySelector('.cancel-comment');
                const submitBtn = commentForm.querySelector('.submit-comment');
                const textarea = commentForm.querySelector('textarea');
                
                cancelBtn.addEventListener('click', () => commentForm.remove());
                submitBtn.addEventListener('click', () => {
                    if (textarea.value.trim()) {
                        this.showToast('Комментарий добавлен', 'success');
                        commentForm.remove();
                        
                        // Обновляем счетчик комментариев
                        const commentCountElement = btn.querySelector('.action-count');
                        const currentCount = parseInt(commentCountElement.textContent) || 0;
                        commentCountElement.textContent = currentCount + 1;
                    }
                });
            });
        });
    },

    // Форматирование времени
    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minute = 60 * 1000;
        const hour = minute * 60;
        const day = hour * 24;
        const week = day * 7;
        const month = day * 30;
        
        if (diff < minute) {
            return 'только что';
        } else if (diff < hour) {
            const minutes = Math.floor(diff / minute);
            return `${minutes} ${this.declension(minutes, ['минуту', 'минуты', 'минут'])} назад`;
        } else if (diff < day) {
            const hours = Math.floor(diff / hour);
            return `${hours} ${this.declension(hours, ['час', 'часа', 'часов'])} назад`;
        } else if (diff < week) {
            const days = Math.floor(diff / day);
            return `${days} ${this.declension(days, ['день', 'дня', 'дней'])} назад`;
        } else if (diff < month) {
            const weeks = Math.floor(diff / week);
            return `${weeks} ${this.declension(weeks, ['неделю', 'недели', 'недель'])} назад`;
        } else {
            const date = new Date(timestamp);
            return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        }
    },

    // Склонение слов
    declension(number, titles) {
        const cases = [2, 0, 1, 1, 1, 2];
        return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
    },

    // Загрузка начальных данных
    async loadInitialData() {
        if (this.state.isAuthenticated) {
            try {
                // Имитация загрузки данных
                setTimeout(() => {
                    this.updateActiveUsers();
                    this.updateFooterStats();
                    this.updateProfileWidget();
                }, 500);
            } catch (error) {
                console.error('Ошибка загрузки начальных данных:', error);
            }
        }
    },

    // Загрузка уведомлений
    async loadNotifications() {
        if (!this.state.isAuthenticated) return;
        
        try {
            // Имитация уведомлений
            this.state.notifications = [
                { id: 'notif_1', type: 'like', message: 'Пользователю понравился ваш пост', read: false, timestamp: Date.now() - 3600000 },
                { id: 'notif_2', type: 'comment', message: 'Новый комментарий к вашему посту', read: true, timestamp: Date.now() - 7200000 },
                { id: 'notif_3', type: 'friend_request', message: 'Новый запрос в друзья', read: false, timestamp: Date.now() - 10800000 }
            ];
            
            this.updateNotificationBadge();
        } catch (error) {
            console.error('Ошибка загрузки уведомлений:', error);
        }
    },

    // Обновление бейджа уведомлений
    updateNotificationBadge() {
        const unreadCount = this.state.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notification-badge');
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    // Показать уведомления
    showNotifications() {
        this.showModal('notifications-modal');
        this.renderNotifications();
    },

    // Отображение уведомлений
    renderNotifications() {
        const container = document.getElementById('notifications-list');
        if (!container) return;
        
        if (this.state.notifications.length === 0) {
            container.innerHTML = '<div class="empty-notifications">Нет уведомлений</div>';
            return;
        }
        
        container.innerHTML = this.state.notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}">
                <div class="notification-icon">${this.getNotificationIcon(notification.type)}</div>
                <div class="notification-content">
                    <div class="notification-text">${notification.message}</div>
                    <div class="notification-time">${this.formatTimeAgo(notification.timestamp)}</div>
                </div>
                ${!notification.read ? '<div class="notification-dot"></div>' : ''}
            </div>
        `).join('');
    },

    // Получение иконки для уведомления
    getNotificationIcon(type) {
        const icons = {
            'like': '❤️',
            'comment': '💬',
            'friend_request': '👤',
            'message': '✉️',
            'system': '🔔'
        };
        
        return icons[type] || '🔔';
    },

    // Обновление счетчиков
    updateCounters() {
        // Обновление счетчика новых постов
        const newPosts = this.state.posts.filter(post => 
            post.createdAt > Date.now() - 24 * 60 * 60 * 1000
        ).length;
        
        const newPostsBadge = document.getElementById('new-posts-count');
        if (newPostsBadge) {
            if (newPosts > 0) {
                newPostsBadge.textContent = newPosts > 99 ? '99+' : newPosts;
                newPostsBadge.style.display = 'flex';
            } else {
                newPostsBadge.style.display = 'none';
            }
        }
    },

    // Обновление активных пользователей
    updateActiveUsers() {
        const container = document.querySelector('.users-list');
        if (!container) return;
        
        // Имитация активных пользователей
        const activeUsers = [
            { username: 'alex_test', avatar: 'assets/default-avatar.png', online: true },
            { username: 'maria_dev', avatar: 'assets/default-avatar.png', online: true },
            { username: 'demo_user', avatar: 'assets/default-avatar.png', online: true }
        ];
        
        if (activeUsers.length === 0) {
            container.innerHTML = '<div class="no-users">Нет активных пользователей</div>';
            return;
        }
        
        container.innerHTML = activeUsers.map(user => `
            <div class="active-user">
                <div class="user-avatar small">
                    <img src="${user.avatar}" alt="${user.username}">
                    <span class="online-status" style="background-color: ${user.online ? '#28a745' : '#6c757d'}"></span>
                </div>
                <span class="user-name">${user.username}</span>
            </div>
        `).join('');
    },

    // Обновление статистики в футере
    updateFooterStats() {
        const totalUsersElement = document.getElementById('total-users');
        const totalPostsElement = document.getElementById('total-posts');
        const onlineUsersElement = document.getElementById('online-users');
        
        if (totalUsersElement) totalUsersElement.textContent = this.state.users.length + 3; // + демо пользователи
        if (totalPostsElement) totalPostsElement.textContent = this.state.posts.length;
        if (onlineUsersElement) onlineUsersElement.textContent = this.state.users.filter(user => 
            user.lastActivity > Date.now() - 15 * 60 * 1000
        ).length + 3; // + демо пользователи
    },

    // Обновление виджета профиля
    updateProfileWidget() {
        const widget = document.getElementById('user-profile-widget');
        if (!widget || !this.state.currentUser) return;
        
        const content = widget.querySelector('.widget-content');
        if (!content) return;
        
        content.innerHTML = `
            <div class="profile-summary">
                <div class="profile-avatar-large">
                    <img src="${this.state.currentUser.avatar || 'assets/default-avatar.png'}" alt="Аватар">
                </div>
                <div class="profile-info">
                    <h4>${this.state.currentUser.username}</h4>
                    <p class="profile-bio">${this.state.currentUser.bio || 'Нет описания'}</p>
                    <div class="profile-stats">
                        <div class="stat">
                            <div class="stat-value">${this.state.currentUser.friendsCount || 0}</div>
                            <div class="stat-label">Друзей</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${this.state.currentUser.postsCount || 0}</div>
                            <div class="stat-label">Постов</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Обновление онлайн статуса
    updateOnlineStatus(isOnline) {
        const statusElement = document.getElementById('online-status');
        if (statusElement) {
            statusElement.style.backgroundColor = isOnline ? '#28a745' : '#6c757d';
        }
    },

    // Переключение темы
    toggleTheme() {
        const themes = ['light', 'dark', 'neon', 'glass'];
        const currentIndex = themes.indexOf(this.state.theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.setTheme(themes[nextIndex]);
    },

    // Установка темы
    setTheme(theme) {
        this.state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Обновление текста кнопки
        const themeTexts = {
            'light': 'Светлая тема',
            'dark': 'Темная тема',
            'neon': 'Неоновая тема',
            'glass': 'Стеклянная тема'
        };
        
        const themeTextElement = document.querySelector('.theme-text');
        if (themeTextElement) {
            themeTextElement.textContent = themeTexts[theme] || 'Тема';
        }
        
        this.showToast(`Тема изменена на "${themeTexts[theme]}"`, 'success');
    },

    // Обработка поиска
    handleSearch(query) {
        if (query.length < 2) {
            const searchResults = document.getElementById('search-results');
            if (searchResults) searchResults.style.display = 'none';
            return;
        }
        
        // Простой поиск
        const results = {
            users: this.state.users.filter(user => 
                user.username.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 3),
            posts: this.state.posts.filter(post =>
                post.content.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 3)
        };
        
        this.displaySearchResults(results);
    },

    // Отображение результатов поиска
    displaySearchResults(results) {
        const container = document.getElementById('search-results');
        if (!container) return;
        
        let html = '';
        
        if (results.users.length > 0) {
            html += `
                <div class="search-category">
                    <div class="category-title">Пользователи</div>
                    ${results.users.map(user => `
                        <div class="search-result-item" data-type="user" data-id="${user.id}">
                            <div class="result-avatar">
                                <img src="${user.avatar || 'assets/default-avatar.png'}" alt="${user.username}">
                            </div>
                            <div class="result-info">
                                <div class="result-title">${user.username}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (results.posts.length > 0) {
            html += `
                <div class="search-category">
                    <div class="category-title">Посты</div>
                    ${results.posts.map(post => `
                        <div class="search-result-item" data-type="post" data-id="${post.id}">
                            <div class="result-icon">📝</div>
                            <div class="result-info">
                                <div class="result-title">Пост от ${post.author}</div>
                                <div class="result-preview">${post.content.substring(0, 50)}...</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (html === '') {
            html = '<div class="no-results">Ничего не найдено</div>';
        }
        
        container.innerHTML = html;
        container.style.display = 'block';
        
        // Обработчики кликов по результатам
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', (e) => {
                container.style.display = 'none';
                const searchInput = document.getElementById('global-search');
                if (searchInput) searchInput.value = '';
                this.showToast('Переход к результату поиска', 'info');
            });
        });
    },

    // Обработка создания поста
    async handleCreatePost(e) {
        if (e) e.preventDefault();
        
        const content = document.getElementById('post-content')?.value.trim();
        if (!content) {
            this.showToast('Пост не может быть пустым', 'error');
            return;
        }
        
        if (!this.state.currentUser) {
            this.showToast('Вы не авторизованы', 'error');
            return;
        }
        
        try {
            const postData = {
                id: 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                content,
                author: this.state.currentUser.username,
                authorId: this.state.currentUser.id,
                authorAvatar: this.state.currentUser.avatar,
                createdAt: Date.now(),
                privacy: 'public',
                tags: this.extractTags(content),
                likes: [],
                comments: []
            };
            
            // Добавляем пост
            this.state.posts.unshift(postData);
            
            // Очистка формы
            document.getElementById('post-content').value = '';
            document.getElementById('char-count').textContent = '0/5000';
            
            // Закрытие модального окна
            this.hideModal('create-post-modal');
            
            // Обновление ленты
            this.loadHomeFeed();
            
            this.showToast('Пост опубликован!', 'success');
        } catch (error) {
            this.showToast('Ошибка при создании поста', 'error');
            console.error(error);
        }
    },

    // Извлечение тегов из текста
    extractTags(content) {
        const tagRegex = /#(\w+)/g;
        const tags = [];
        let match;
        
        while ((match = tagRegex.exec(content)) !== null) {
            tags.push(match[1]);
        }
        
        return [...new Set(tags)];
    },

    // Обработка изменения содержимого поста
    handlePostContentChange(e) {
        const content = e.target.value;
        const charCount = content.length;
        
        // Обновление счетчика символов
        const charCountElement = document.getElementById('char-count');
        if (charCountElement) {
            charCountElement.textContent = `${charCount}/5000`;
        }
    },

    // Обработка действий пользователя
    handleUserAction(action) {
        switch (action) {
            case 'profile':
                this.navigateTo('home');
                this.showToast('Переход в профиль', 'info');
                break;
            case 'friends':
                this.navigateTo('friends');
                this.showToast('Переход к друзьям', 'info');
                break;
            case 'bookmarks':
                this.showToast('Закладки в разработке', 'info');
                break;
            case 'drafts':
                this.showToast('Черновики в разработке', 'info');
                break;
            case 'settings':
                this.showSettings();
                break;
            case 'help':
                this.showToast('Помощь в разработке', 'info');
                break;
            case 'logout':
                this.logout();
                break;
        }
    },

    // Показать настройки
    showSettings() {
        this.showModal('settings-modal');
    },

    // Выход из системы
    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            // Очистка данных сессии
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
            sessionStorage.clear();
            
            // Сброс состояния
            this.state.currentUser = null;
            this.state.isAuthenticated = false;
            this.state.posts = [];
            this.state.users = [];
            this.state.notifications = [];
            
            // Обновление UI
            const userNameElement = document.getElementById('user-name');
            const userRoleElement = document.getElementById('user-role');
            const avatarImg = document.getElementById('avatar-img');
            
            if (userNameElement) userNameElement.textContent = 'Гость';
            if (userRoleElement) userRoleElement.textContent = 'Не авторизован';
            if (avatarImg) avatarImg.src = 'assets/default-avatar.png';
            
            // Показ приветственного экрана
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) {
                welcomeMessage.classList.remove('hidden');
            }
            
            // Скрытие виджетов
            const profileWidget = document.getElementById('user-profile-widget');
            if (profileWidget) {
                const widgetContent = profileWidget.querySelector('.widget-content');
                if (widgetContent) widgetContent.innerHTML = '';
            }
            
            // Обновление контента
            this.navigateTo('home');
            
            this.showToast('Вы успешно вышли из системы', 'success');
        }
    },

    // Загрузка данных пользователя
    async loadUserData() {
        if (!this.state.currentUser) return;
        
        // Имитация загрузки данных пользователя
        console.log('Загрузка данных пользователя...');
    },

    // Запуск периодических задач
    startPeriodicTasks() {
        // Обновление онлайн статуса
        setInterval(() => {
            this.updateLastActivity();
        }, 60000);
        
        // Автосохранение данных
        setInterval(() => {
            this.autoSaveData();
        }, 60000);
    },

    // Обновление времени последней активности
    updateLastActivity() {
        this.state.lastActivity = Date.now();
        
        if (this.state.currentUser) {
            this.state.currentUser.lastActivity = Date.now();
            
            // Сохранение в LocalStorage
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                const user = JSON.parse(savedUser);
                user.lastActivity = Date.now();
                localStorage.setItem('currentUser', JSON.stringify(user));
            }
        }
    },

    // Автосохранение данных
    autoSaveData() {
        if (this.state.isAuthenticated) {
            // Сохранение настроек
            localStorage.setItem('settings', JSON.stringify(this.state.settings));
            
            // Сохранение темы
            localStorage.setItem('theme', this.state.theme);
            
            // Сохранение черновиков
            localStorage.setItem('drafts', JSON.stringify(this.state.drafts));
            
            console.log('Данные автосохранены');
        }
    },

    // Проверка наличия несохраненных изменений
    hasUnsavedChanges() {
        const draftContent = document.getElementById('post-content')?.value;
        return draftContent && draftContent.trim().length > 0;
    },

    // Обработка горячих клавиш
    handleHotkeys(e) {
        // Ctrl/Cmd + N: новый пост
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.showModal('create-post-modal');
        }
        
        // Ctrl/Cmd + /: поиск
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            const searchInput = document.getElementById('global-search');
            if (searchInput) searchInput.focus();
        }
        
        // Ctrl/Cmd + D: темная тема
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            this.toggleTheme();
        }
        
        // Esc: закрыть модальные окна
        if (e.key === 'Escape') {
            this.hideAllModals();
            this.closeAllDropdowns();
        }
    },

    // Скрыть все модальные окна
    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            const modalId = modal.id;
            this.hideModal(modalId);
        });
    },

    // Скрыть сайдбар
    hideSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('show');
    },

    // Загрузка страницы ленты
    loadFeedPage(container) {
        container.innerHTML = `
            <div class="feed-page">
                <h2>Лента новостей</h2>
                <div class="feed-filters">
                    <button class="filter-btn active">Все</button>
                    <button class="filter-btn">Популярные</button>
                    <button class="filter-btn">Подписки</button>
                </div>
                <div class="posts-container" id="feed-posts"></div>
            </div>
        `;
        
        // Загружаем посты
        this.displayPosts(this.state.posts, 'feed-posts');
    },

    // Показать toast-уведомление
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${this.getToastIcon(type)}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close">&times;</button>
        `;
        
        const container = document.getElementById('toast-container');
        if (!container) {
            // Создаем контейнер, если его нет
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        document.getElementById('toast-container').appendChild(toast);
        
        // Анимация появления
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 10);
        
        // Закрытие по кнопке
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.hideToast(toast);
        });
        
        // Автоматическое закрытие
        setTimeout(() => {
            this.hideToast(toast);
        }, 5000);
    },

    // Получение иконки для toast
    getToastIcon(type) {
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        return icons[type] || '💬';
    },

    // Скрыть toast
    hideToast(toast) {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    },

    // Запись в историю активности
    logActivity(action, details) {
        const activity = {
            id: 'activity_' + Date.now(),
            userId: this.state.currentUser?.id,
            action,
            details,
            timestamp: Date.now(),
            ip: 'local'
        };
        
        // Сохранение в LocalStorage
        const activities = JSON.parse(localStorage.getItem('activities') || '[]');
        activities.unshift(activity);
        localStorage.setItem('activities', JSON.stringify(activities.slice(0, 100)));
        
        console.log('Активность записана:', activity);
    }
};

// ===== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ =====
document.addEventListener('DOMContentLoaded', () => {
    SocialSphere.init();
});

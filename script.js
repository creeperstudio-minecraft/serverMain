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
            
            // Инициализация UI
            UI.init();
            
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
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('demo-login').addEventListener('click', () => this.handleDemoLogin());
        
        // Модальные окна
        document.getElementById('close-auth-modal').addEventListener('click', () => UI.hideModal('auth-modal'));
        document.getElementById('close-settings-modal').addEventListener('click', () => UI.hideModal('settings-modal'));
        document.getElementById('close-create-post-modal').addEventListener('click', () => UI.hideModal('create-post-modal'));
        document.getElementById('close-notifications-modal').addEventListener('click', () => UI.hideModal('notifications-modal'));
        
        // Навигация
        document.getElementById('logo').addEventListener('click', () => this.navigateTo('home'));
        document.getElementById('menu-toggle').addEventListener('click', () => UI.toggleSidebar());
        document.getElementById('create-post-btn').addEventListener('click', () => UI.showModal('create-post-modal'));
        document.getElementById('notifications-btn').addEventListener('click', () => this.showNotifications());
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
        
        // Навигация по страницам
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.getAttribute('data-page');
                this.navigateTo(page);
            });
        });
        
        // Выпадающее меню пользователя
        document.getElementById('user-dropdown-toggle').addEventListener('click', (e) => {
            e.stopPropagation();
            UI.toggleDropdown('user-dropdown');
        });
        
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const action = e.currentTarget.getAttribute('data-action');
                this.handleUserAction(action);
            });
        });
        
        // Закрытие выпадающих меню при клике вне их
        document.addEventListener('click', () => {
            UI.closeAllDropdowns();
        });
        
        // Поиск
        document.getElementById('global-search').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        document.getElementById('search-btn').addEventListener('click', () => {
            this.handleSearch(document.getElementById('global-search').value);
        });
        
        // Создание поста
        document.getElementById('create-post-form').addEventListener('submit', (e) => this.handleCreatePost(e));
        document.getElementById('post-content').addEventListener('input', (e) => this.handlePostContentChange(e));
        
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

    // Проверка авторизации
    checkAuth() {
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

    // Обновление UI после авторизации
    updateUIAfterAuth() {
        // Обновление информации о пользователе
        document.getElementById('user-name').textContent = this.state.currentUser.username;
        document.getElementById('user-role').textContent = 'Пользователь';
        
        // Обновление аватара
        const avatarImg = document.getElementById('avatar-img');
        if (this.state.currentUser.avatar) {
            avatarImg.src = this.state.currentUser.avatar;
        }
        
        // Показать основной интерфейс
        document.getElementById('welcome-message').classList.add('hidden');
        
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
        
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;
        
        try {
            const user = await Auth.login(username, password);
            
            if (user) {
                this.state.currentUser = user;
                this.state.isAuthenticated = true;
                
                // Сохранение данных
                if (rememberMe) {
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    localStorage.setItem('authToken', Auth.generateToken(user.id));
                } else {
                    sessionStorage.setItem('currentUser', JSON.stringify(user));
                    sessionStorage.setItem('authToken', Auth.generateToken(user.id));
                }
                
                // Обновление UI
                this.updateUIAfterAuth();
                UI.hideModal('auth-modal');
                this.showToast('Успешный вход!', 'success');
                
                // Загрузка данных пользователя
                this.loadUserData();
                
                // Запись в историю активности
                this.logActivity('login', `Пользователь ${username} вошел в систему`);
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    // Обработка регистрации
    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;
        
        if (password !== confirmPassword) {
            this.showToast('Пароли не совпадают', 'error');
            return;
        }
        
        try {
            const user = await Auth.register(username, email, password);
            
            if (user) {
                this.showToast('Регистрация успешна! Теперь вы можете войти.', 'success');
                
                // Переключение на вкладку входа
                document.querySelector('.auth-tab[data-tab="login"]').click();
                document.getElementById('login-username').value = username;
                document.getElementById('login-password').value = password;
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    // Демо-вход
    async handleDemoLogin() {
        try {
            // Создание демо-пользователя, если его нет
            const demoUser = {
                username: 'demo_user',
                email: 'demo@example.com',
                password: 'demo123'
            };
            
            let user = await Auth.login(demoUser.username, demoUser.password);
            
            if (!user) {
                user = await Auth.register(demoUser.username, demoUser.email, demoUser.password);
            }
            
            this.state.currentUser = user;
            this.state.isAuthenticated = true;
            
            // Сохранение в sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            sessionStorage.setItem('authToken', Auth.generateToken(user.id));
            
            // Обновление UI
            this.updateUIAfterAuth();
            UI.hideModal('auth-modal');
            this.showToast('Демо-режим активирован', 'success');
            
            // Создание демо-данных
            this.createDemoData();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    // Создание демо-данных
    async createDemoData() {
        // Создание демо-постов
        const demoPosts = [
            {
                content: 'Привет! Это демо-пост. Добро пожаловать в SocialSphere! 🚀',
                tags: ['добро пожаловать', 'демо'],
                privacy: 'public'
            },
            {
                content: 'Проверяем работу лайков и комментариев. Как вам дизайн? 🎨',
                tags: ['дизайн', 'фидбек'],
                privacy: 'public'
            },
            {
                content: 'Сегодня отличный день для тестирования нового социального сайта! ☀️',
                tags: ['тестирование', 'новости'],
                privacy: 'public'
            }
        ];
        
        for (const postData of demoPosts) {
            await this.createPost(postData);
        }
        
        // Обновление ленты
        this.loadPosts();
    },

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
        
        document.getElementById('page-title').textContent = pageTitles[page] || 'Страница';
        
        // Загрузка контента страницы
        this.loadPageContent(page);
        
        // Закрытие сайдбара на мобильных устройствах
        if (window.innerWidth < 992) {
            UI.hideSidebar();
        }
    },

    // Загрузка контента страницы
    loadPageContent(page) {
        const contentArea = document.getElementById('content-area');
        
        switch (page) {
            case 'home':
                this.loadHomePage(contentArea);
                break;
            case 'feed':
                this.loadFeedPage(contentArea);
                break;
            case 'explore':
                this.loadExplorePage(contentArea);
                break;
            case 'messages':
                this.loadMessagesPage(contentArea);
                break;
            case 'friends':
                this.loadFriendsPage(contentArea);
                break;
            case 'groups':
                this.loadGroupsPage(contentArea);
                break;
            case 'events':
                this.loadEventsPage(contentArea);
                break;
            case 'gallery':
                this.loadGalleryPage(contentArea);
                break;
            case 'achievements':
                this.loadAchievementsPage(contentArea);
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
            
            document.getElementById('welcome-login-btn').addEventListener('click', () => this.showAuthModal());
            document.getElementById('welcome-register-btn').addEventListener('click', () => {
                this.showAuthModal();
                document.querySelector('.auth-tab[data-tab="register"]').click();
            });
        } else {
            container.innerHTML = `
                <div class="home-container">
                    <div class="quick-stats">
                        <div class="stat-card">
                            <div class="stat-value" id="total-friends">0</div>
                            <div class="stat-label">Друзей</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="total-posts-count">0</div>
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
                        <h3>Последние обновления</h3>
                        <div class="posts-container" id="home-posts"></div>
                    </div>
                </div>
            `;
            
            this.loadHomeFeed();
            this.updateHomeStats();
        }
    },

    // Загрузка ленты на главной
    async loadHomeFeed() {
        try {
            const posts = await DB.getPosts({ limit: 10 });
            this.displayPosts(posts, 'home-posts');
        } catch (error) {
            console.error('Ошибка загрузки ленты:', error);
        }
    },

    // Обновление статистики на главной
    async updateHomeStats() {
        // Здесь будет логика обновления статистики
        // Пока используем заглушки
        document.getElementById('total-friends').textContent = '12';
        document.getElementById('total-posts-count').textContent = this.state.posts.length;
        document.getElementById('total-likes').textContent = '45';
        document.getElementById('total-comments').textContent = '23';
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
                            ${post.pinned ? '<span class="post-pinned">📌</span>' : ''}
                        </div>
                    </div>
                    <div class="post-actions">
                        <button class="post-dropdown">⋮</button>
                    </div>
                </div>
                <div class="post-content">
                    <div class="post-text">${this.formatPostContent(post.content)}</div>
                    ${post.image ? `<img src="${post.image}" class="post-image" alt="Изображение поста">` : ''}
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
                    <button class="post-action" data-action="bookmark">
                        <span class="action-icon">🔖</span>
                    </button>
                </div>
                <div class="comments-section" id="comments-${post.id}" style="display: none;">
                    <!-- Комментарии будут загружены по запросу -->
                </div>
            </div>
        `;
    },

    // Обработка действий с постом
    attachPostEventListeners() {
        // Лайки
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const postElement = e.target.closest('.post');
                const postId = postElement.getAttribute('data-post-id');
                
                try {
                    const result = await this.toggleLike(postId);
                    
                    if (result.liked) {
                        btn.classList.add('liked');
                        btn.querySelector('.action-count').textContent = result.likeCount;
                        
                        // Анимация лайка
                        btn.classList.add('like-animation');
                        setTimeout(() => btn.classList.remove('like-animation'), 300);
                    } else {
                        btn.classList.remove('liked');
                        btn.querySelector('.action-count').textContent = result.likeCount;
                    }
                } catch (error) {
                    this.showToast('Ошибка при обработке лайка', 'error');
                }
            });
        });
        
        // Комментарии
        document.querySelectorAll('.post-action[data-action="comment"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const postElement = e.target.closest('.post');
                const postId = postElement.getAttribute('data-post-id');
                const commentsSection = document.getElementById(`comments-${postId}`);
                
                if (commentsSection.style.display === 'none') {
                    await this.loadComments(postId);
                    commentsSection.style.display = 'block';
                } else {
                    commentsSection.style.display = 'none';
                }
            });
        });
        
        // Выпадающее меню поста
        document.querySelectorAll('.post-dropdown').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showPostDropdown(e.target.closest('.post'));
            });
        });
    },

    // Переключение лайка
    async toggleLike(postId) {
        // Здесь будет логика работы с лайками
        // Пока используем заглушку
        return { liked: true, likeCount: Math.floor(Math.random() * 100) };
    },

    // Загрузка комментариев
    async loadComments(postId) {
        // Здесь будет логика загрузки комментариев
        // Пока используем заглушку
        const commentsSection = document.getElementById(`comments-${postId}`);
        commentsSection.innerHTML = '<div class="loading-comments">Загрузка комментариев...</div>';
    },

    // Показать выпадающее меню поста
    showPostDropdown(postElement) {
        // Создание меню
        const menu = document.createElement('div');
        menu.className = 'post-dropdown-menu';
        menu.innerHTML = `
            <button class="dropdown-item" data-action="edit">✏️ Редактировать</button>
            <button class="dropdown-item" data-action="delete">🗑️ Удалить</button>
            <button class="dropdown-item" data-action="pin">📌 Закрепить</button>
            <button class="dropdown-item" data-action="report">🚩 Пожаловаться</button>
        `;
        
        // Позиционирование
        const rect = postElement.getBoundingClientRect();
        menu.style.position = 'absolute';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.right = `${window.innerWidth - rect.right}px`;
        menu.style.zIndex = '1000';
        
        document.body.appendChild(menu);
        
        // Обработчики событий
        menu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                this.handlePostAction(action, postElement);
                menu.remove();
            });
        });
        
        // Закрытие при клике вне меню
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && !postElement.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    },

    // Обработка действий с постом
    handlePostAction(action, postElement) {
        const postId = postElement.getAttribute('data-post-id');
        
        switch (action) {
            case 'edit':
                this.editPost(postId);
                break;
            case 'delete':
                this.deletePost(postId);
                break;
            case 'pin':
                this.togglePinPost(postId);
                break;
            case 'report':
                this.reportPost(postId);
                break;
        }
    },

    // Редактирование поста
    editPost(postId) {
        this.showToast('Функция редактирования в разработке', 'info');
    },

    // Удаление поста
    deletePost(postId) {
        if (confirm('Вы уверены, что хотите удалить этот пост?')) {
            // Логика удаления поста
            this.showToast('Пост удален', 'success');
        }
    },

    // Закрепление поста
    togglePinPost(postId) {
        this.showToast('Функция закрепления в разработке', 'info');
    },

    // Жалоба на пост
    reportPost(postId) {
        this.showToast('Функция жалобы в разработке', 'info');
    },

    // Форматирование содержимого поста
    formatPostContent(content) {
        // Замена ссылок на кликабельные
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        content = content.replace(urlRegex, url => `<a href="${url}" target="_blank" class="post-link">${url}</a>`);
        
        // Замена хэштегов
        const hashtagRegex = /#(\w+)/g;
        content = content.replace(hashtagRegex, (match, tag) => 
            `<a href="#" class="hashtag" data-tag="${tag}">${match}</a>`
        );
        
        // Замена упоминаний
        const mentionRegex = /@(\w+)/g;
        content = content.replace(mentionRegex, (match, username) => 
            `<a href="#" class="mention" data-user="${username}">${match}</a>`
        );
        
        return content;
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
        const year = day * 365;
        
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
        } else if (diff < year) {
            const months = Math.floor(diff / month);
            return `${months} ${this.declension(months, ['месяц', 'месяца', 'месяцев'])} назад`;
        } else {
            const years = Math.floor(diff / year);
            return `${years} ${this.declension(years, ['год', 'года', 'лет'])} назад`;
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
                // Загрузка постов
                this.state.posts = await DB.getPosts({ limit: 20 });
                
                // Загрузка пользователей
                this.state.users = await DB.getUsers({ limit: 50 });
                
                // Загрузка уведомлений
                await this.loadNotifications();
                
                // Обновление счетчиков
                this.updateCounters();
                
                // Обновление виджета активных пользователей
                this.updateActiveUsers();
                
                // Обновление статистики в футере
                this.updateFooterStats();
            } catch (error) {
                console.error('Ошибка загрузки начальных данных:', error);
            }
        }
    },

    // Загрузка уведомлений
    async loadNotifications() {
        if (!this.state.isAuthenticated) return;
        
        try {
            this.state.notifications = await DB.getNotifications(this.state.currentUser.id);
            this.updateNotificationBadge();
        } catch (error) {
            console.error('Ошибка загрузки уведомлений:', error);
        }
    },

    // Обновление бейджа уведомлений
    updateNotificationBadge() {
        const unreadCount = this.state.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notification-badge');
        
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    },

    // Показать уведомления
    showNotifications() {
        UI.showModal('notifications-modal');
        this.renderNotifications();
    },

    // Отображение уведомлений
    renderNotifications() {
        const container = document.getElementById('notifications-list');
        
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
        
        // Обработчики событий для уведомлений
        container.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const notificationId = item.getAttribute('data-id');
                this.handleNotificationClick(notificationId);
            });
        });
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

    // Обработка клика по уведомлению
    handleNotificationClick(notificationId) {
        // Пометить как прочитанное
        const notification = this.state.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            DB.updateNotification(notificationId, { read: true });
            this.updateNotificationBadge();
        }
        
        // Выполнить действие в зависимости от типа уведомления
        switch (notification.type) {
            case 'like':
                // Перейти к посту
                break;
            case 'comment':
                // Открыть комментарии
                break;
            case 'friend_request':
                // Открыть запросы в друзья
                break;
        }
        
        // Обновить отображение
        this.renderNotifications();
    },

    // Обновление счетчиков
    updateCounters() {
        // Обновление счетчика новых постов
        const newPosts = this.state.posts.filter(post => 
            post.createdAt > Date.now() - 24 * 60 * 60 * 1000
        ).length;
        
        const newPostsBadge = document.getElementById('new-posts-count');
        if (newPosts > 0) {
            newPostsBadge.textContent = newPosts > 99 ? '99+' : newPosts;
            newPostsBadge.style.display = 'flex';
        } else {
            newPostsBadge.style.display = 'none';
        }
        
        // Здесь можно добавить обновление других счетчиков
    },

    // Обновление активных пользователей
    updateActiveUsers() {
        const container = document.querySelector('.users-list');
        if (!container) return;
        
        const activeUsers = this.state.users.filter(user => 
            user.lastActivity > Date.now() - 15 * 60 * 1000
        ).slice(0, 5);
        
        if (activeUsers.length === 0) {
            container.innerHTML = '<div class="no-users">Нет активных пользователей</div>';
            return;
        }
        
        container.innerHTML = activeUsers.map(user => `
            <div class="active-user">
                <div class="user-avatar small">
                    <img src="${user.avatar || 'assets/default-avatar.png'}" alt="${user.username}">
                    <span class="online-status"></span>
                </div>
                <span class="user-name">${user.username}</span>
            </div>
        `).join('');
    },

    // Обновление статистики в футере
    updateFooterStats() {
        document.getElementById('total-users').textContent = this.state.users.length;
        document.getElementById('total-posts').textContent = this.state.posts.length;
        document.getElementById('online-users').textContent = this.state.users.filter(user => 
            user.lastActivity > Date.now() - 15 * 60 * 1000
        ).length;
    },

    // Обновление виджета профиля
    updateProfileWidget() {
        const widget = document.getElementById('user-profile-widget');
        if (!widget || !this.state.currentUser) return;
        
        const content = widget.querySelector('.widget-content');
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
        
        document.querySelector('.theme-text').textContent = themeTexts[theme];
        this.showToast(`Тема изменена на "${themeTexts[theme]}"`, 'success');
    },

    // Обработка поиска
    handleSearch(query) {
        if (query.length < 2) {
            document.getElementById('search-results').style.display = 'none';
            return;
        }
        
        const results = this.searchContent(query);
        this.displaySearchResults(results);
    },

    // Поиск контента
    searchContent(query) {
        const lowerQuery = query.toLowerCase();
        const results = {
            users: [],
            posts: [],
            tags: []
        };
        
        // Поиск пользователей
        results.users = this.state.users.filter(user => 
            user.username.toLowerCase().includes(lowerQuery) ||
            (user.name && user.name.toLowerCase().includes(lowerQuery))
        ).slice(0, 5);
        
        // Поиск постов
        results.posts = this.state.posts.filter(post =>
            post.content.toLowerCase().includes(lowerQuery) ||
            post.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        ).slice(0, 5);
        
        // Поиск тегов
        const allTags = this.state.posts.flatMap(post => post.tags || []);
        results.tags = [...new Set(allTags)]
            .filter(tag => tag.toLowerCase().includes(lowerQuery))
            .slice(0, 5);
        
        return results;
    },

    // Отображение результатов поиска
    displaySearchResults(results) {
        const container = document.getElementById('search-results');
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
                                ${user.name ? `<div class="result-subtitle">${user.name}</div>` : ''}
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
                                <div class="result-preview">${post.content.substring(0, 100)}...</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (results.tags.length > 0) {
            html += `
                <div class="search-category">
                    <div class="category-title">Теги</div>
                    ${results.tags.map(tag => `
                        <div class="search-result-item" data-type="tag" data-value="${tag}">
                            <div class="result-icon">🏷️</div>
                            <div class="result-info">
                                <div class="result-title">#${tag}</div>
                                <div class="result-subtitle">${this.countTagPosts(tag)} постов</div>
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
                const type = item.getAttribute('data-type');
                const id = item.getAttribute('data-id');
                const value = item.getAttribute('data-value');
                
                this.handleSearchResultClick(type, id, value);
                container.style.display = 'none';
                document.getElementById('global-search').value = '';
            });
        });
        
        // Закрытие при клике вне
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target) && e.target.id !== 'global-search') {
                container.style.display = 'none';
            }
        });
    },

    // Подсчет постов по тегу
    countTagPosts(tag) {
        return this.state.posts.filter(post => 
            post.tags && post.tags.includes(tag)
        ).length;
    },

    // Обработка клика по результату поиска
    handleSearchResultClick(type, id, value) {
        switch (type) {
            case 'user':
                this.viewUserProfile(id);
                break;
            case 'post':
                this.viewPost(id);
                break;
            case 'tag':
                this.viewTagPosts(value);
                break;
        }
    },

    // Просмотр профиля пользователя
    viewUserProfile(userId) {
        this.showToast('Просмотр профиля в разработке', 'info');
    },

    // Просмотр поста
    viewPost(postId) {
        this.showToast('Просмотр поста в разработке', 'info');
    },

    // Просмотр постов по тегу
    viewTagPosts(tag) {
        this.showToast(`Просмотр тега #${tag} в разработке`, 'info');
    },

    // Обработка создания поста
    async handleCreatePost(e) {
        e.preventDefault();
        
        const content = document.getElementById('post-content').value.trim();
        if (!content) {
            this.showToast('Пост не может быть пустым', 'error');
            return;
        }
        
        try {
            const postData = {
                content,
                author: this.state.currentUser.username,
                authorId: this.state.currentUser.id,
                authorAvatar: this.state.currentUser.avatar,
                createdAt: Date.now(),
                privacy: 'public',
                tags: this.extractTags(content)
            };
            
            const post = await this.createPost(postData);
            
            // Очистка формы
            document.getElementById('post-content').value = '';
            document.getElementById('char-count').textContent = '0/5000';
            
            // Закрытие модального окна
            UI.hideModal('create-post-modal');
            
            // Обновление ленты
            this.loadHomeFeed();
            
            this.showToast('Пост опубликован!', 'success');
            
            // Запись в историю активности
            this.logActivity('create_post', 'Пользователь создал новый пост');
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
        
        return [...new Set(tags)]; // Удаление дубликатов
    },

    // Создание поста
    async createPost(postData) {
        // Генерация ID
        postData.id = 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Добавление в состояние
        this.state.posts.unshift(postData);
        
        // Сохранение в IndexedDB
        await DB.addPost(postData);
        
        // Обновление счетчика постов пользователя
        if (this.state.currentUser) {
            this.state.currentUser.postsCount = (this.state.currentUser.postsCount || 0) + 1;
            await DB.updateUser(this.state.currentUser.id, { postsCount: this.state.currentUser.postsCount });
        }
        
        return postData;
    },

    // Обработка изменения содержимого поста
    handlePostContentChange(e) {
        const content = e.target.value;
        const charCount = content.length;
        
        // Обновление счетчика символов
        document.getElementById('char-count').textContent = `${charCount}/5000`;
        
        // Автосохранение черновика
        this.autoSaveDraft(content);
    },

    // Автосохранение черновика
    autoSaveDraft(content) {
        if (!content.trim()) return;
        
        const draft = {
            id: 'draft_' + Date.now(),
            content,
            lastSaved: Date.now()
        };
        
        // Сохранение в LocalStorage
        const drafts = JSON.parse(localStorage.getItem('drafts') || '[]');
        const existingDraftIndex = drafts.findIndex(d => d.id === draft.id);
        
        if (existingDraftIndex !== -1) {
            drafts[existingDraftIndex] = draft;
        } else {
            drafts.push(draft);
        }
        
        localStorage.setItem('drafts', JSON.stringify(drafts));
        this.state.drafts = drafts;
        
        // Показать статус автосохранения
        const statusElement = document.getElementById('auto-save-status');
        statusElement.textContent = 'Сохранено';
        statusElement.style.opacity = '1';
        
        setTimeout(() => {
            statusElement.style.opacity = '0';
        }, 2000);
    },

    // Обработка действий пользователя
    handleUserAction(action) {
        switch (action) {
            case 'profile':
                this.viewUserProfile(this.state.currentUser.id);
                break;
            case 'friends':
                this.navigateTo('friends');
                break;
            case 'bookmarks':
                this.showBookmarks();
                break;
            case 'drafts':
                this.showDrafts();
                break;
            case 'settings':
                this.showSettings();
                break;
            case 'help':
                this.showHelp();
                break;
            case 'logout':
                this.logout();
                break;
        }
    },

    // Показать настройки
    showSettings() {
        UI.showModal('settings-modal');
        this.loadSettingsContent();
    },

    // Загрузка контента настроек
    loadSettingsContent() {
        const content = document.querySelector('.settings-content');
        
        content.innerHTML = `
            <div class="settings-tab-content active" data-tab="general">
                <h3>Основные настройки</h3>
                <div class="settings-group">
                    <div class="setting-item">
                        <label>Язык</label>
                        <select id="language-select">
                            <option value="ru">Русский</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                    <div class="setting-item">
                        <label>Часовой пояс</label>
                        <select id="timezone-select">
                            <option value="UTC+3">Москва (UTC+3)</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="settings-tab-content" data-tab="appearance">
                <h3>Внешний вид</h3>
                <div class="settings-group">
                    <div class="setting-item">
                        <label>Тема оформления</label>
                        <div class="theme-options">
                            <button class="theme-option ${this.state.theme === 'light' ? 'active' : ''}" data-theme="light">
                                <div class="theme-preview light"></div>
                                <span>Светлая</span>
                            </button>
                            <button class="theme-option ${this.state.theme === 'dark' ? 'active' : ''}" data-theme="dark">
                                <div class="theme-preview dark"></div>
                                <span>Темная</span>
                            </button>
                            <button class="theme-option ${this.state.theme === 'neon' ? 'active' : ''}" data-theme="neon">
                                <div class="theme-preview neon"></div>
                                <span>Неоновая</span>
                            </button>
                            <button class="theme-option ${this.state.theme === 'glass' ? 'active' : ''}" data-theme="glass">
                                <div class="theme-preview glass"></div>
                                <span>Стеклянная</span>
                            </button>
                        </div>
                    </div>
                    <div class="setting-item">
                        <label>Размер шрифта</label>
                        <select id="font-size-select">
                            <option value="small">Маленький</option>
                            <option value="medium" selected>Средний</option>
                            <option value="large">Большой</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="settings-tab-content" data-tab="privacy">
                <h3>Приватность</h3>
                <div class="settings-group">
                    <div class="setting-item">
                        <label class="checkbox">
                            <input type="checkbox" id="private-profile" ${this.state.currentUser?.privateProfile ? 'checked' : ''}>
                            <span>Закрытый профиль</span>
                        </label>
                        <div class="setting-hint">Только друзья смогут видеть ваши посты</div>
                    </div>
                    <div class="setting-item">
                        <label class="checkbox">
                            <input type="checkbox" id="show-online" ${this.state.currentUser?.showOnlineStatus ? 'checked' : ''}>
                            <span>Показывать онлайн статус</span>
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="settings-tab-content" data-tab="account">
                <h3>Аккаунт</h3>
                <div class="settings-group">
                    <div class="setting-item">
                        <button class="btn btn-secondary" id="change-password-btn">Сменить пароль</button>
                    </div>
                    <div class="setting-item">
                        <button class="btn btn-secondary" id="export-data-btn">Экспорт данных</button>
                    </div>
                    <div class="setting-item">
                        <button class="btn btn-danger" id="delete-account-btn">Удалить аккаунт</button>
                    </div>
                </div>
            </div>
            
            <div class="settings-tab-content" data-tab="advanced">
                <h3>Расширенные настройки</h3>
                <div class="settings-group">
                    <div class="setting-item">
                        <label class="checkbox">
                            <input type="checkbox" id="dev-mode" ${localStorage.getItem('devMode') === 'true' ? 'checked' : ''}>
                            <span>Режим разработчика</span>
                        </label>
                    </div>
                    <div class="setting-item">
                        <button class="btn btn-secondary" id="clear-cache-btn">Очистить кэш</button>
                    </div>
                    <div class="setting-item">
                        <button class="btn btn-secondary" id="reset-settings-btn">Сбросить настройки</button>
                    </div>
                </div>
            </div>
        `;
        
        // Настройка вкладок
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                
                // Обновление активной вкладки
                document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                // Показ соответствующего контента
                document.querySelectorAll('.settings-tab-content').forEach(content => {
                    content.classList.remove('active');
                    if (content.getAttribute('data-tab') === tabName) {
                        content.classList.add('active');
                    }
                });
            });
        });
        
        // Обработчики событий для настроек
        this.setupSettingsEventListeners();
    },

    // Настройка обработчиков событий для настроек
    setupSettingsEventListeners() {
        // Выбор темы
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.currentTarget.getAttribute('data-theme');
                this.setTheme(theme);
                
                // Обновление активной темы
                document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
        
        // Смена пароля
        document.getElementById('change-password-btn')?.addEventListener('click', () => {
            this.showChangePasswordModal();
        });
        
        // Экспорт данных
        document.getElementById('export-data-btn')?.addEventListener('click', () => {
            this.exportUserData();
        });
        
        // Удаление аккаунта
        document.getElementById('delete-account-btn')?.addEventListener('click', () => {
            this.deleteAccount();
        });
        
        // Очистка кэша
        document.getElementById('clear-cache-btn')?.addEventListener('click', () => {
            this.clearCache();
        });
        
        // Сброс настроек
        document.getElementById('reset-settings-btn')?.addEventListener('click', () => {
            this.resetSettings();
        });
        
        // Режим разработчика
        document.getElementById('dev-mode')?.addEventListener('change', (e) => {
            localStorage.setItem('devMode', e.target.checked);
            this.showToast('Режим разработчика ' + (e.target.checked ? 'включен' : 'выключен'), 'info');
        });
    },

    // Показать модальное окно смены пароля
    showChangePasswordModal() {
        // Реализация смены пароля
        this.showToast('Функция смены пароля в разработке', 'info');
    },

    // Экспорт данных пользователя
    exportUserData() {
        const data = {
            user: this.state.currentUser,
            posts: this.state.posts.filter(post => post.authorId === this.state.currentUser.id),
            settings: this.state.settings,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `socialsphere_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Данные успешно экспортированы', 'success');
    },

    // Удаление аккаунта
    deleteAccount() {
        if (confirm('Вы уверены, что хотите удалить аккаунт? Это действие необратимо.')) {
            // Реализация удаления аккаунта
            this.showToast('Функция удаления аккаунта в разработке', 'info');
        }
    },

    // Очистка кэша
    clearCache() {
        localStorage.clear();
        sessionStorage.clear();
        
        // Очистка IndexedDB
        indexedDB.deleteDatabase('SocialSphereDB');
        
        this.showToast('Кэш очищен. Страница будет перезагружена.', 'success');
        
        setTimeout(() => {
            location.reload();
        }, 2000);
    },

    // Сброс настроек
    resetSettings() {
        if (confirm('Вы уверены, что хотите сбросить все настройки?')) {
            localStorage.removeItem('theme');
            localStorage.removeItem('settings');
            localStorage.removeItem('language');
            
            this.showToast('Настройки сброшены. Страница будет перезагружена.', 'success');
            
            setTimeout(() => {
                location.reload();
            }, 2000);
        }
    },

    // Показать закладки
    showBookmarks() {
        this.showToast('Функция закладок в разработке', 'info');
    },

    // Показать черновики
    showDrafts() {
        if (this.state.drafts.length === 0) {
            this.showToast('Нет сохраненных черновиков', 'info');
            return;
        }
        
        // Реализация отображения черновиков
        this.showToast('Функция черновиков в разработке', 'info');
    },

    // Показать справку
    showHelp() {
        // Реализация справки
        this.showToast('Функция справки в разработке', 'info');
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
            
            // Обновление UI
            document.getElementById('user-name').textContent = 'Гость';
            document.getElementById('user-role').textContent = 'Не авторизован';
            document.getElementById('avatar-img').src = 'assets/default-avatar.png';
            
            // Показ приветственного экрана
            document.getElementById('welcome-message').classList.remove('hidden');
            
            // Скрытие виджетов
            document.getElementById('user-profile-widget').querySelector('.widget-content').innerHTML = '';
            
            // Запись в историю активности
            this.logActivity('logout', 'Пользователь вышел из системы');
            
            this.showToast('Вы успешно вышли из системы', 'success');
        }
    },

    // Показать модальное окно авторизации
    showAuthModal() {
        UI.showModal('auth-modal');
    },

    // Загрузка данных пользователя
    async loadUserData() {
        if (!this.state.currentUser) return;
        
        try {
            // Загрузка постов пользователя
            const userPosts = await DB.getPostsByUser(this.state.currentUser.id);
            this.state.userPosts = userPosts;
            
            // Загрузка друзей
            const friends = await DB.getFriends(this.state.currentUser.id);
            this.state.friends = friends;
            
            // Загрузка сообщений
            const messages = await DB.getMessages(this.state.currentUser.id);
            this.state.messages = messages;
            
        } catch (error) {
            console.error('Ошибка загрузки данных пользователя:', error);
        }
    },

    // Запуск периодических задач
    startPeriodicTasks() {
        // Обновление онлайн статуса
        setInterval(() => {
            this.updateLastActivity();
            this.updateOnlineStatus(true);
        }, 60000); // Каждую минуту
        
        // Проверка новых уведомлений
        setInterval(() => {
            if (this.state.isAuthenticated) {
                this.checkNewNotifications();
            }
        }, 30000); // Каждые 30 секунд
        
        // Автосохранение данных
        setInterval(() => {
            this.autoSaveData();
        }, 60000); // Каждую минуту
        
        // Обновление активных пользователей
        setInterval(() => {
            this.updateActiveUsers();
        }, 120000); // Каждые 2 минуты
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

    // Проверка новых уведомлений
    async checkNewNotifications() {
        try {
            const newNotifications = await DB.getNewNotifications(this.state.currentUser.id, this.state.notifications);
            if (newNotifications.length > 0) {
                this.state.notifications.unshift(...newNotifications);
                this.updateNotificationBadge();
                
                // Показать тосты для новых уведомлений
                newNotifications.forEach(notification => {
                    if (this.state.notificationsEnabled && !notification.read) {
                        this.showToast(notification.message, 'info');
                    }
                });
            }
        } catch (error) {
            console.error('Ошибка проверки уведомлений:', error);
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
            UI.showModal('create-post-modal');
        }
        
        // Ctrl/Cmd + /: поиск
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            document.getElementById('global-search').focus();
        }
        
        // Ctrl/Cmd + D: темная тема
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            this.toggleTheme();
        }
        
        // Esc: закрыть модальные окна
        if (e.key === 'Escape') {
            UI.hideAllModals();
        }
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
        container.appendChild(toast);
        
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
            toast.remove();
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
            ip: 'local' // В реальном приложении здесь был бы IP пользователя
        };
        
        // Сохранение в LocalStorage
        const activities = JSON.parse(localStorage.getItem('activities') || '[]');
        activities.unshift(activity);
        localStorage.setItem('activities', JSON.stringify(activities.slice(0, 100))); // Храним только последние 100 записей
        
        console.log('Активность записана:', activity);
    }
};

// ===== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ =====
document.addEventListener('DOMContentLoaded', () => {
    SocialSphere.init();
});
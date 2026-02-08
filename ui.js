// ===== МОДУЛЬ ПОЛЬЗОВАТЕЛЬСКОГО ИНТЕРФЕЙСА =====

const UI = {
    // Инициализация UI
    init() {
        console.log('UI модуль инициализирован');
        this.initEventListeners();
    },

    // Инициализация обработчиков событий UI
    initEventListeners() {
        // Закрытие модальных окон при клике на overlay
        document.getElementById('modal-overlay').addEventListener('click', () => {
            this.hideAllModals();
        });

        // Закрытие модальных окон клавишей Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
                this.closeAllDropdowns();
            }
        });

        // Переключение вкладок авторизации
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchAuthTab(tabName);
            });
        });

        // Переключение вкладок настроек
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchSettingsTab(tabName);
            });
        });
    },

    // Показать модальное окно
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('modal-overlay');
        
        if (!modal || !overlay) {
            console.error(`Модальное окно ${modalId} не найдено`);
            return;
        }

        modal.style.display = 'block';
        overlay.style.display = 'block';
        
        // Анимация появления
        setTimeout(() => {
            modal.classList.add('active');
            overlay.classList.add('active');
        }, 10);
        
        console.log(`Открыто модальное окно: ${modalId}`);
    },

    // Скрыть модальное окно
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('modal-overlay');
        
        if (!modal || !overlay) return;

        modal.classList.remove('active');
        overlay.classList.remove('active');
        
        // После завершения анимации скрываем
        setTimeout(() => {
            modal.style.display = 'none';
            overlay.style.display = 'none';
        }, 300);
    },

    // Скрыть все модальные окна
    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            const modalId = modal.id;
            this.hideModal(modalId);
        });
    },

    // Переключение сайдбара
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('show');
    },

    // Скрыть сайдбар
    hideSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('show');
    },

    // Переключение выпадающего меню
    toggleDropdown(dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;
        
        // Закрыть другие дропдауны
        this.closeAllDropdowns();
        
        // Переключить текущий
        dropdown.classList.toggle('show');
    },

    // Закрыть все выпадающие меню
    closeAllDropdowns() {
        document.querySelectorAll('.dropdown-menu.show').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    },

    // Переключение вкладок авторизации
    switchAuthTab(tabName) {
        // Обновить активные вкладки
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            }
        });

        // Показать активную форму
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
            if (form.id === `${tabName}-form`) {
                form.classList.add('active');
            }
        });

        // Обновить заголовок
        const titleMap = {
            'login': 'Вход в SocialSphere',
            'register': 'Регистрация в SocialSphere'
        };
        document.getElementById('auth-title').textContent = titleMap[tabName] || 'Авторизация';
    },

    // Переключение вкладок настроек
    switchSettingsTab(tabName) {
        // Обновить активные вкладки
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            }
        });

        // Показать активный контент
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.getAttribute('data-tab') === tabName) {
                content.classList.add('active');
            }
        });
    },

    // Обновить аватар пользователя в интерфейсе
    updateUserAvatar(avatarUrl) {
        const avatarImg = document.getElementById('avatar-img');
        if (avatarImg && avatarUrl) {
            avatarImg.src = avatarUrl;
        }
    },

    // Обновить информацию о пользователе
    updateUserInfo(username, role = 'Пользователь') {
        const userNameElement = document.getElementById('user-name');
        const userRoleElement = document.getElementById('user-role');
        
        if (userNameElement) userNameElement.textContent = username;
        if (userRoleElement) userRoleElement.textContent = role;
    },

    // Показать/скрыть бейдж уведомлений
    updateNotificationBadge(count) {
        const badge = document.getElementById('notification-badge');
        if (!badge) return;
        
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    },

    // Показать загрузочный экран
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            loadingScreen.style.opacity = '1';
        }
    },

    // Скрыть загрузочный экран
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    },

    // Показать основной интерфейс
    showAppInterface() {
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.style.display = 'flex';
        }
    },

    // Скрыть основной интерфейс
    hideAppInterface() {
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.style.display = 'none';
        }
    },

    // Обновить индикатор онлайн статуса
    updateOnlineStatus(isOnline) {
        const statusElement = document.getElementById('online-status');
        if (statusElement) {
            statusElement.style.backgroundColor = isOnline ? '#28a745' : '#6c757d';
        }
    },

    // Добавить CSS класс к элементу
    addClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add(className);
        }
    },

    // Удалить CSS класс у элемента
    removeClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove(className);
        }
    },

    // Включить/выключить элемент
    setElementDisabled(elementId, disabled) {
        const element = document.getElementById(elementId);
        if (element) {
            element.disabled = disabled;
        }
    },

    // Установить текст элемента
    setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    },

    // Установить значение поля ввода
    setInputValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value;
        }
    },

    // Очистить поле ввода
    clearInput(elementId) {
        this.setInputValue(elementId, '');
    },

    // Показать элемент
    showElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
        }
    },

    // Скрыть элемент
    hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    },

    // Переключить видимость элемента
    toggleElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            if (element.style.display === 'none') {
                this.showElement(elementId);
            } else {
                this.hideElement(elementId);
            }
        }
    },

    // Обновить заголовок страницы
    updatePageTitle(title) {
        const titleElement = document.getElementById('page-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    },

    // Обновить содержимое области контента
    updateContentArea(html) {
        const contentArea = document.getElementById('content-area');
        if (contentArea) {
            contentArea.innerHTML = html;
        }
    },

    // Добавить обработчик события
    addEventListener(elementId, eventType, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(eventType, handler);
        }
    },

    // Удалить обработчик события
    removeEventListener(elementId, eventType, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.removeEventListener(eventType, handler);
        }
    },

    // Показать временное сообщение (аналог toast)
    showMessage(message, type = 'info') {
        // Создаем элемент сообщения
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = message;
        
        // Добавляем в контейнер
        const container = document.getElementById('toast-container') || document.body;
        container.appendChild(messageElement);
        
        // Автоматическое удаление через 3 секунды
        setTimeout(() => {
            messageElement.remove();
        }, 3000);
    }
};

// Инициализация UI при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM готов, инициализируем UI...');
    UI.init();
});

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}

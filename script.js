/**
 * ===========================================
 * ПОМОЩНИК ПУТЕШЕСТВЕННИКА - Главный скрипт
 * Школьный проект с интеграцией Yandex GPT
 * ===========================================
 */

// ============================================
// ТИПЫ ДАННЫХ (JSDoc для документации)
// ============================================

/**
 * Элемент маршрута (достопримечательность, еда, прогулка)
 * @typedef {Object} RouteItem
 * @property {string} [time] - Время посещения (например "10:00–13:00")
 * @property {string} title - Название места
 * @property {string} description - Описание места
 * @property {'sight' | 'food' | 'walk'} type - Тип места
 * @property {string} [address] - Адрес места (необязательно)
 */

/**
 * План на один день
 * @typedef {Object} DayPlan
 * @property {string} label - Название дня (например "День 1")
 * @property {RouteItem[]} items - Список мест на этот день
 */

/**
 * Полный маршрут от Yandex GPT
 * @typedef {Object} RouteData
 * @property {string} city - Название города
 * @property {DayPlan[]} days - Массив дней с маршрутами
 */

// ============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================

/** @type {RouteData | null} */
let currentRoute = null;

/** @type {number} */
let activeDay = 0;

// URL бэкенд-сервера (автоматически переключается между localhost и Render)
const API_BASE =
  location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://travel-helper-backend.onrender.com';

// ============================================
// НАВИГАЦИЯ МЕЖДУ СТРАНИЦАМИ
// ============================================

/**
 * Показать указанную страницу и скрыть остальные
 * @param {string} pageId - ID страницы для показа
 */
function showPage(pageId) {
    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Показываем нужную страницу
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Показываем/скрываем навигационную панель
    const navBar = document.getElementById('navBar');
    if (navBar) {
        // Показываем навбар на всех страницах кроме главной
        navBar.style.display = (pageId === 'page-home') ? 'none' : 'flex';
    }
    
    // Прокручиваем страницу вверх
    window.scrollTo(0, 0);
}

/**
 * Переход на главную страницу
 */
function goHome() {
    showPage('page-home');
}

// ============================================
// РАБОТА С ФОРМОЙ И YANDEX GPT
// ============================================

/**
 * Генерация маршрута через Yandex GPT
 * Отправляет запрос на бэкенд и получает маршрут
 */
async function generateRoute() {
    // Получаем значения из формы
    const cityInput = document.getElementById('cityInput');
    const daysInput = document.getElementById('daysInput');
    const commentInput = document.getElementById('commentInput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const searchButton = document.getElementById('searchButton');
    
    // Валидация города
    const city = cityInput.value.trim();
    if (!city) {
        showError('Пожалуйста, введите название города');
        cityInput.focus();
        return;
    }
    
    // Валидация количества дней
    const days = parseInt(daysInput.value) || 1;
    if (days < 1 || days > 14) {
        showError('Количество дней должно быть от 1 до 14');
        daysInput.focus();
        return;
    }
    
    // Получаем комментарий (может быть пустым)
    const comment = commentInput.value.trim();
    
    // Показываем индикатор загрузки
    loadingIndicator.style.display = 'block';
    errorMessage.style.display = 'none';
    searchButton.disabled = true;
    
    try {
        // Отправляем запрос на бэкенд
        const response = await fetch(`${API_BASE}/api/generate-route`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                city: city,
                days: days,
                comment: comment
            })
        });
        
        // Проверяем ответ
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }
        
        // Получаем данные маршрута
        const routeData = await response.json();
        
        // Сохраняем маршрут и отображаем
        currentRoute = routeData;
        activeDay = 0;
        displayRoute();
        
        // Переходим на страницу маршрута
        showPage('page-route');
        
    } catch (error) {
        console.error('Ошибка генерации маршрута:', error);
        showError(`Не удалось создать маршрут: ${error.message}`);
    } finally {
        // Скрываем индикатор загрузки
        loadingIndicator.style.display = 'none';
        searchButton.disabled = false;
    }
}

/**
 * Показать сообщение об ошибке
 * @param {string} message - Текст ошибки
 */
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

// ============================================
// ОТОБРАЖЕНИЕ МАРШРУТА
// ============================================

/**
 * Отобразить маршрут на странице
 */
function displayRoute() {
    if (!currentRoute) return;
    
    // Обновляем заголовок
    const routeCity = document.getElementById('routeCity');
    const routeDays = document.getElementById('routeDays');
    
    if (routeCity) {
        routeCity.textContent = currentRoute.city;
    }
    if (routeDays) {
        const daysCount = currentRoute.days.length;
        const daysWord = getDaysWord(daysCount);
        routeDays.textContent = `Маршрут на ${daysCount} ${daysWord}`;
    }
    
    // Создаём кнопки для дней
    renderDayButtons();
    
    // Отображаем содержимое первого дня
    renderDayContent(activeDay);
}

/**
 * Получить правильное склонение слова "день"
 * @param {number} n - Количество дней
 * @returns {string}
 */
function getDaysWord(n) {
    const lastTwo = n % 100;
    const lastOne = n % 10;
    
    if (lastTwo >= 11 && lastTwo <= 19) return 'дней';
    if (lastOne === 1) return 'день';
    if (lastOne >= 2 && lastOne <= 4) return 'дня';
    return 'дней';
}

/**
 * Создать кнопки для переключения между днями
 */
function renderDayButtons() {
    const container = document.getElementById('dayButtons');
    if (!container || !currentRoute) return;
    
    container.innerHTML = '';
    
    currentRoute.days.forEach((day, index) => {
        const button = document.createElement('button');
        button.className = `day-btn ${index === activeDay ? 'active' : ''}`;
        button.textContent = day.label || `День ${index + 1}`;
        button.onclick = () => selectDay(index);
        container.appendChild(button);
    });
}

/**
 * Выбрать день для отображения
 * @param {number} dayIndex - Индекс дня
 */
function selectDay(dayIndex) {
    activeDay = dayIndex;
    
    // Обновляем активную кнопку
    document.querySelectorAll('.day-btn').forEach((btn, index) => {
        btn.classList.toggle('active', index === dayIndex);
    });
    
    // Отображаем содержимое дня
    renderDayContent(dayIndex);
}

/**
 * Отобразить содержимое конкретного дня
 * @param {number} dayIndex - Индекс дня
 */
function renderDayContent(dayIndex) {
    const container = document.getElementById('routeContent');
    if (!container || !currentRoute || !currentRoute.days[dayIndex]) return;
    
    const day = currentRoute.days[dayIndex];
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Создаём карточки для каждого места
    day.items.forEach(item => {
        const card = createRouteItemCard(item);
        container.appendChild(card);
    });
}

/**
 * Создать карточку места
 * @param {RouteItem} item - Данные о месте
 * @returns {HTMLElement}
 */
function createRouteItemCard(item) {
    const card = document.createElement('div');
    card.className = `route-item type-${item.type}`;
    
    // Определяем иконку по типу
    const icons = {
        'sight': '🏛️',
        'food': '🍽️',
        'walk': '🚶'
    };
    const icon = icons[item.type] || '📍';
    
    card.innerHTML = `
        <div class="route-item-icon">${icon}</div>
        <div class="route-item-content">
            ${item.time ? `<div class="route-item-time">🕐 ${item.time}</div>` : ''}
            <div class="route-item-title">${escapeHtml(item.title)}</div>
            <div class="route-item-description">${escapeHtml(item.description)}</div>
            ${item.address ? `<div class="route-item-address">📍 ${escapeHtml(item.address)}</div>` : ''}
        </div>
    `;
    
    return card;
}

/**
 * Экранирование HTML для предотвращения XSS
 * @param {string} text - Исходный текст
 * @returns {string}
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// AR КАМЕРА - РЕАЛЬНОЕ РАСПОЗНАВАНИЕ С YANDEX VISION
// ============================================

/** @type {MediaStream | null} */
let cameraStream = null;

/**
 * Запуск камеры с использованием getUserMedia API
 * Использует заднюю камеру на мобильных устройствах
 */
async function startCamera() {
    const video = document.getElementById('cameraVideo');
    const startBtn = document.getElementById('startCameraBtn');
    const scanBtn = document.getElementById('scanObjectBtn');
    const stopBtn = document.getElementById('stopCameraBtn');
    const info = document.getElementById('arObjectInfo');

    if (!video || !startBtn || !scanBtn || !stopBtn) {
        return;
    }

    if (info) {
        info.textContent = '';
    }

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: {
                facingMode: 'environment', // Задняя камера на мобильных
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        video.srcObject = cameraStream;

        startBtn.disabled = true;
        scanBtn.disabled = false;
        stopBtn.disabled = false;
    } catch (err) {
        console.error('Unable to start camera', err);
        
        let errorMessage = 'Не удалось получить доступ к камере.';
        if (err.name === 'NotAllowedError') {
            errorMessage = 'Доступ к камере запрещён. Разрешите доступ в настройках браузера.';
        } else if (err.name === 'NotFoundError') {
            errorMessage = 'Камера не найдена на этом устройстве.';
        } else if (err.name === 'NotReadableError') {
            errorMessage = 'Камера занята другим приложением.';
        }
        
        if (info) {
            info.textContent = errorMessage;
        }
    }
}

/**
 * Остановка камеры и освобождение ресурсов
 */
function stopCamera() {
    const video = document.getElementById('cameraVideo');
    const startBtn = document.getElementById('startCameraBtn');
    const scanBtn = document.getElementById('scanObjectBtn');
    const stopBtn = document.getElementById('stopCameraBtn');

    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    if (video) {
        video.srcObject = null;
    }

    if (startBtn && scanBtn && stopBtn) {
        startBtn.disabled = false;
        scanBtn.disabled = true;
        stopBtn.disabled = true;
    }
}

/**
 * Сканирование объекта с помощью Yandex Vision API
 * Захватывает текущий кадр с камеры и отправляет на распознавание
 */
async function scanObject() {
    const video = document.getElementById('cameraVideo');
    const info = document.getElementById('arObjectInfo');

    if (!video || !info) return;
    if (!cameraStream) {
        info.textContent = 'Сначала запустите камеру.';
        return;
    }

    info.textContent = '🔍 Сканирование объекта...';

    try {
        // Capture current video frame into a canvas
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        const blob = await new Promise(resolve =>
            canvas.toBlob(resolve, 'image/jpeg', 0.9)
        );

        if (!blob) {
            info.textContent = 'Не удалось получить изображение с камеры.';
            return;
        }

        const formData = new FormData();
        formData.append('image', blob, 'frame.jpg');

        const response = await fetch(`${API_BASE}/api/recognize-object`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('recognize-object error', errText);
            info.textContent = 'Ошибка при распознавании объекта. Попробуйте еще раз.';
            return;
        }

        const result = await response.json();
        const title = result.title || 'Объект';
        const description = result.description || '';

        info.innerHTML = `
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(description)}</p>
        `;
    } catch (err) {
        console.error('scanObject failed', err);
        info.textContent = 'Произошла ошибка при обращении к серверу.';
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, какая страница загружена
    const isARPage = document.querySelector('.ar-background');
    
    if (isARPage) {
        // На AR странице подключаем обработчики кнопок
        const startBtn = document.getElementById('startCameraBtn');
        const scanBtn = document.getElementById('scanObjectBtn');
        const stopBtn = document.getElementById('stopCameraBtn');

        if (startBtn) startBtn.addEventListener('click', startCamera);
        if (scanBtn) scanBtn.addEventListener('click', scanObject);
        if (stopBtn) stopBtn.addEventListener('click', stopCamera);
        
        return; // На AR странице не нужна дополнительная инициализация
    }
    
    // На главной странице (index.html) показываем домашнюю страницу
    const homePage = document.getElementById('page-home');
    if (homePage) {
        // Скрываем навбар на главной странице
        const navBar = document.getElementById('navBar');
        if (navBar) {
            navBar.style.display = 'none';
        }
        
        // Убеждаемся что только домашняя страница активна
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        homePage.classList.add('active');
    }
});

// Обработка кнопки "Назад" браузера
window.addEventListener('popstate', () => {
    // При нажатии кнопки назад в браузере
    // останавливаем камеру, если она работает
    if (cameraStream) {
        stopCamera();
    }
});

// Останавливаем камеру при закрытии/обновлении страницы
window.addEventListener('beforeunload', () => {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
});


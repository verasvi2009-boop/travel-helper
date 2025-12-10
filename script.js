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

/** @type {MediaStream | null} */
let cameraStream = null;

// URL бэкенд-сервера (измените при деплое)
const API_URL = 'http://localhost:3000';

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
        const response = await fetch(`${API_URL}/api/generate-route`, {
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
// AR КАМЕРА - ФУНКЦИИ
// ============================================

/**
 * Словарь AR объектов для демонстрации
 * В реальном проекте это будет заполняться на основе данных маршрута
 * или результатов распознавания изображений
 */
const AR_OBJECTS = {
    '🏛': {
        name: 'Архитектурный памятник',
        description: 'Здание построено в 1928 году в стиле советского конструктивизма. Является объектом культурного наследия.'
    },
    '🌳': {
        name: 'Старый дуб',
        description: 'Возраст дерева более 150 лет. Охраняется государством как памятник природы.'
    },
    '🦆': {
        name: 'Городской пруд',
        description: 'Популярное место отдыха горожан. Здесь можно покормить уток и насладиться природой.'
    },
    '🗿': {
        name: 'Скульптура',
        description: 'Современная городская скульптура. Установлена в 2015 году к юбилею города.'
    }
};

/**
 * Запуск камеры с использованием getUserMedia API
 * Использует заднюю камеру на мобильных устройствах
 */
async function startCamera() {
    const cameraPreview = document.querySelector('.camera-preview');
    const startBtn = document.querySelector('.start-camera-btn');
    const stopBtn = document.querySelector('.stop-camera-btn');
    
    // Проверяем поддержку камеры
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showCameraError('Камера не поддерживается в этом браузере');
        return;
    }
    
    try {
        // Запрашиваем доступ к камере
        // facingMode: 'environment' выбирает заднюю камеру на телефоне
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        // Создаём интерфейс с видео и маркерами
        cameraPreview.innerHTML = `
            <video class="camera-video" autoplay playsinline muted></video>
            <div class="camera-viewfinder"></div>
            <div class="object-marker" data-icon="🏛" onclick="onMarkerClick('🏛')">🏛</div>
            <div class="object-marker" data-icon="🌳" onclick="onMarkerClick('🌳')">🌳</div>
            <div class="object-marker" data-icon="🦆" onclick="onMarkerClick('🦆')">🦆</div>
            <div class="object-marker" data-icon="🗿" onclick="onMarkerClick('🗿')">🗿</div>
            <div class="scan-overlay">
                <div class="scan-dot"></div>
                🔍 Нажмите на объект для информации
            </div>
        `;
        
        // Подключаем видео поток к элементу video
        const video = cameraPreview.querySelector('.camera-video');
        video.srcObject = cameraStream;
        
        // Ждём загрузки метаданных видео и запускаем воспроизведение
        video.onloadedmetadata = () => {
            video.play().catch(err => {
                console.error('Ошибка воспроизведения видео:', err);
            });
        };
        
        // Обновляем состояние кнопок
        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
        
        // TODO: Здесь можно добавить интеграцию с реальным распознаванием объектов
        // Пример реализации:
        // 1. Захватить кадр из видео на canvas
        // 2. Отправить изображение на бэкенд (например, Yandex Vision API)
        // 3. Получить результаты распознавания
        // 4. Вызвать showObjectInfo с полученными данными
        
    } catch (error) {
        console.error('Ошибка доступа к камере:', error);
        
        // Определяем причину ошибки
        let errorMessage = 'Не удалось получить доступ к камере';
        
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Доступ к камере запрещён. Разрешите доступ в настройках браузера.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'Камера не найдена на этом устройстве.';
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'Камера занята другим приложением.';
        }
        
        showCameraError(errorMessage);
    }
}

/**
 * Остановка камеры и освобождение ресурсов
 */
function stopCamera() {
    const cameraPreview = document.querySelector('.camera-preview');
    const startBtn = document.querySelector('.start-camera-btn');
    const stopBtn = document.querySelector('.stop-camera-btn');
    
    // Останавливаем все треки медиа-потока
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => {
            track.stop();
        });
        cameraStream = null;
    }
    
    // Возвращаем начальный интерфейс
    cameraPreview.innerHTML = `
        <div style="font-size: 50px;">📷</div>
        <div style="margin-top: 20px; color: #4CAF50; font-weight: bold;">
            Нажмите "Запустить камеру" для начала сканирования
        </div>
    `;
    
    // Обновляем состояние кнопок
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    
    // Скрываем информационную панель, если она была открыта
    const objectInfo = document.querySelector('.object-info');
    if (objectInfo) {
        objectInfo.remove();
    }
}

/**
 * Обработчик клика на маркер объекта
 * @param {string} icon - Иконка (эмодзи) объекта
 */
function onMarkerClick(icon) {
    const objectData = AR_OBJECTS[icon];
    if (objectData) {
        showObjectInfo(icon, objectData.name, objectData.description);
    }
}

/**
 * Показать информацию об объекте
 * @param {string} icon - Иконка объекта
 * @param {string} name - Название объекта
 * @param {string} description - Описание объекта
 */
function showObjectInfo(icon, name, description) {
    const cameraPreview = document.querySelector('.camera-preview');
    if (!cameraPreview) return;
    
    // Удаляем предыдущую информационную панель, если есть
    let objectInfo = cameraPreview.querySelector('.object-info');
    if (objectInfo) {
        objectInfo.remove();
    }
    
    // Создаём новую информационную панель
    objectInfo = document.createElement('div');
    objectInfo.className = 'object-info';
    
    objectInfo.innerHTML = `
        <div class="object-info-icon">${icon}</div>
        <div class="object-info-name">${escapeHtml(name)}</div>
        <div class="object-info-description">${escapeHtml(description)}</div>
    `;
    
    cameraPreview.appendChild(objectInfo);
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        if (objectInfo && objectInfo.parentNode) {
            objectInfo.style.opacity = '0';
            objectInfo.style.transition = 'opacity 0.3s ease';
            setTimeout(() => objectInfo.remove(), 300);
        }
    }, 5000);
}

/**
 * Показать сообщение об ошибке камеры
 * @param {string} message - Текст ошибки
 */
function showCameraError(message) {
    const cameraPreview = document.querySelector('.camera-preview');
    if (cameraPreview) {
        cameraPreview.innerHTML = `
            <div class="camera-not-supported">
                <div style="font-size: 50px; margin-bottom: 15px;">⚠️</div>
                <h3>${escapeHtml(message)}</h3>
                <p style="opacity: 0.7; margin-top: 10px;">
                    Попробуйте открыть сайт на мобильном устройстве или в другом браузере
                </p>
            </div>
        `;
    }
    
    // Блокируем кнопки
    const startBtn = document.querySelector('.start-camera-btn');
    if (startBtn) startBtn.disabled = true;
}

/**
 * Проверка поддержки камеры при загрузке AR страницы
 */
function checkCameraSupport() {
    const startBtn = document.querySelector('.start-camera-btn');
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showCameraError('Ваш браузер не поддерживает доступ к камере');
        if (startBtn) startBtn.disabled = true;
        return false;
    }
    
    return true;
}

// TODO: Функция для интеграции с реальным распознаванием объектов
// В будущем можно добавить:
/**
 * Захват кадра для распознавания
 * @returns {string | null} - Base64 изображение или null при ошибке
 */
function captureFrame() {
    const video = document.querySelector('.camera-video');
    if (!video) return null;
    
    // Создаём canvas для захвата кадра
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Возвращаем изображение в формате base64
    return canvas.toDataURL('image/jpeg', 0.8);
}

// TODO: Отправка изображения на сервер для распознавания
/**
 * Отправить кадр на распознавание (заглушка для будущей реализации)
 * @param {string} imageBase64 - Изображение в формате base64
 */
async function recognizeImage(imageBase64) {
    // В будущем здесь будет вызов API для распознавания изображений
    // Например, Yandex Vision API или другой сервис
    
    // Пример запроса:
    // const response = await fetch(`${API_URL}/api/recognize`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ image: imageBase64 })
    // });
    // const result = await response.json();
    // if (result.objects && result.objects.length > 0) {
    //     showObjectInfo(result.objects[0].icon, result.objects[0].name, result.objects[0].description);
    // }
    
    console.log('TODO: Implement image recognition');
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, какая страница загружена
    const isARPage = document.querySelector('.ar-background');
    
    if (isARPage) {
        // На AR странице проверяем поддержку камеры
        checkCameraSupport();
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


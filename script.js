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

/** @type {Object | null} - Последний запрос на генерацию маршрута (для пересоздания на другом языке) */
let lastRouteRequest = null;

// URL бэкенд-сервера (автоматически переключается между localhost и Render)
const API_BASE =
  location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://travel-helper-backend.onrender.com';

// ============================================
// ИНТЕРНАЦИОНАЛИЗАЦИЯ (i18n)
// ============================================

/** @type {'ru' | 'en' | 'zh'} */
let currentLanguage = 'ru';

/** Словарь переводов для всех страниц */
const translations = {
    ru: {
        // Навигация
        'nav.back': '← Назад',
        'nav.home': '🏠 Главная',
        // Главная страница
        'home.title': 'Помощник Путешественника',
        'home.subtitle': 'Создайте идеальный маршрут с помощью ИИ',
        'home.startBtn': '🚀 Начать планирование',
        'home.arBtn': '📷 AR Камера',
        // О нас
        'about.title': 'О нас',
        'about.description': 'Добро пожаловать в компанию Travel. Мы поможем вам составить персональный маршрут с помощью искусственного интеллекта Yandex GPT.',
        'about.phone': 'Телефон:',
        'about.email': 'Email:',
        'about.hours': 'Часы работы:',
        'about.address': 'Адрес:',
        'about.telegram': '📱 Наш Telegram канал',
        // Форма
        'form.title': 'Создайте свой маршрут',
        'form.subtitle': 'Введите город и пожелания — Yandex GPT создаст для вас уникальный маршрут!',
        'form.cityLabel': '🏙️ Город',
        'form.cityPlaceholder': 'Введите название города (например: Санкт-Петербург)',
        'form.daysLabel': '📅 Количество дней',
        'form.daysPlaceholder': 'Введите количество дней (1-14)',
        'form.wishesLabel': '💭 Пожелания (необязательно)',
        'form.wishesPlaceholder': 'Например: едем с детьми, хотим парки развлечений, не много музеев...',
        'form.submitBtn': '🔍 СОЗДАТЬ МАРШРУТ',
        'form.loading': 'Yandex GPT создаёт маршрут...',
        'form.loadingHint': 'Это может занять до 30 секунд',
        // Маршрут
        'route.daysCount': 'Маршрут на {n} {word}',
        'route.day': 'День',
        'route.editBtn': '✏️ Редактировать день',
        'route.editPlaceholder': 'Опишите, что изменить в этом дне (например: добавить парк, заменить ресторан на кафе, больше мест для детей)...',
        'route.applyBtn': '✅ Применить изменения',
        'route.cancelBtn': '❌ Отмена',
        'route.savePdf': '📄 Сохранить маршрут в PDF',
        'route.openMaps': '🗺️ Открыть в Яндекс.Картах',
        'route.arLink': '📷 Открыть AR камеру для осмотра',
        'route.updating': '⏳ Обновляем маршрут для этого дня...',
        'route.regenerateConfirm': 'Пересоздать маршрут на выбранном языке?\n\nВсе изменения текущего маршрута будут потеряны.',
        'route.regenerating': '🔄 Пересоздаём маршрут на новом языке...',
        // AR страница
        'ar.title': 'AR Распознавание объектов',
        'ar.subtitle': 'Наведите камеру на достопримечательность, и мы попробуем её распознать с помощью Yandex Vision API.',
        'ar.startBtn': '▶️ Запустить камеру',
        'ar.scanBtn': '🔍 Сканировать объект',
        'ar.stopBtn': '⏹️ Остановить камеру',
        'ar.tipsTitle': '💡 Советы:',
        'ar.tip1': 'Направьте камеру на интересующий объект',
        'ar.tip2': 'Нажмите "Сканировать объект" для распознавания',
        'ar.tip3': 'Функция работает лучше при хорошем освещении',
        'ar.scanning': '🔍 Сканирование объекта...',
        // AR результаты распознавания
        'ar.objectRecognizedTitle': '✅ Объект распознан',
        'ar.objectMaybeTitle': '🤔 Возможно, это',
        'ar.objectNotRecognizedTitle': '❓ Объект не распознан',
        'ar.objectErrorTitle': '❌ Ошибка сервиса',
        'ar.confidenceLabel': 'Уверенность',
        'ar.visionTagsLabel': 'Нейросеть видит',
        'ar.notRecognizedHint': 'Попробуйте подойти ближе или изменить угол съёмки.',
        // Ошибки
        'errors.cityRequired': 'Пожалуйста, введите название города',
        'errors.daysRange': 'Количество дней должно быть от 1 до 14',
        'errors.routeFailed': 'Не удалось создать маршрут',
        'errors.refineFailed': 'Не удалось обновить',
        'errors.refineEmpty': 'Введите пожелания для изменения маршрута',
        'errors.cameraAccess': 'Не удалось получить доступ к камере.',
        'errors.cameraDenied': 'Доступ к камере запрещён. Разрешите доступ в настройках браузера.',
        'errors.cameraNotFound': 'Камера не найдена на этом устройстве.',
        'errors.cameraBusy': 'Камера занята другим приложением.',
        'errors.cameraStart': 'Сначала запустите камеру.',
        'errors.imageCapture': 'Не удалось получить изображение с камеры.',
        'errors.recognition': 'Ошибка при распознавании объекта. Попробуйте ещё раз.',
        'errors.server': 'Произошла ошибка при обращении к серверу.',
        // Склонения
        'days.one': 'день',
        'days.few': 'дня',
        'days.many': 'дней'
    },
    en: {
        // Navigation
        'nav.back': '← Back',
        'nav.home': '🏠 Home',
        // Home page
        'home.title': 'Travel Helper',
        'home.subtitle': 'Create the perfect route with AI',
        'home.startBtn': '🚀 Start Planning',
        'home.arBtn': '📷 AR Camera',
        // About
        'about.title': 'About Us',
        'about.description': 'Welcome to Travel company. We will help you create a personalized route using Yandex GPT artificial intelligence.',
        'about.phone': 'Phone:',
        'about.email': 'Email:',
        'about.hours': 'Working hours:',
        'about.address': 'Address:',
        'about.telegram': '📱 Our Telegram Channel',
        // Form
        'form.title': 'Create Your Route',
        'form.subtitle': 'Enter a city and preferences — Yandex GPT will create a unique route for you!',
        'form.cityLabel': '🏙️ City',
        'form.cityPlaceholder': 'Enter city name (e.g., Saint Petersburg)',
        'form.daysLabel': '📅 Number of Days',
        'form.daysPlaceholder': 'Enter number of days (1-14)',
        'form.wishesLabel': '💭 Preferences (optional)',
        'form.wishesPlaceholder': 'E.g., traveling with kids, want amusement parks, not many museums...',
        'form.submitBtn': '🔍 CREATE ROUTE',
        'form.loading': 'Yandex GPT is creating the route...',
        'form.loadingHint': 'This may take up to 30 seconds',
        // Route
        'route.daysCount': 'Route for {n} {word}',
        'route.day': 'Day',
        'route.editBtn': '✏️ Edit day',
        'route.editPlaceholder': 'Describe what to change (e.g., add a park, replace restaurant with café, more kid-friendly places)...',
        'route.applyBtn': '✅ Apply Changes',
        'route.cancelBtn': '❌ Cancel',
        'route.savePdf': '📄 Save Route as PDF',
        'route.openMaps': '🗺️ Open in Yandex Maps',
        'route.arLink': '📷 Open AR camera for viewing',
        'route.updating': '⏳ Updating route for this day...',
        'route.regenerateConfirm': 'Regenerate the route in the selected language?\n\nAll changes to the current route will be lost.',
        'route.regenerating': '🔄 Regenerating route in new language...',
        // AR page
        'ar.title': 'AR Object Recognition',
        'ar.subtitle': 'Point the camera at a landmark, and we will try to recognize it using Yandex Vision API.',
        'ar.startBtn': '▶️ Start Camera',
        'ar.scanBtn': '🔍 Scan Object',
        'ar.stopBtn': '⏹️ Stop Camera',
        'ar.tipsTitle': '💡 Tips:',
        'ar.tip1': 'Point the camera at the object of interest',
        'ar.tip2': 'Press "Scan Object" to recognize',
        'ar.tip3': 'Works better in good lighting',
        'ar.scanning': '🔍 Scanning object...',
        // AR recognition results
        'ar.objectRecognizedTitle': '✅ Object recognized',
        'ar.objectMaybeTitle': '🤔 This might be',
        'ar.objectNotRecognizedTitle': '❓ Object not recognized',
        'ar.objectErrorTitle': '❌ Service error',
        'ar.confidenceLabel': 'Confidence',
        'ar.visionTagsLabel': 'AI sees',
        'ar.notRecognizedHint': 'Try getting closer or changing the angle.',
        // Errors
        'errors.cityRequired': 'Please enter a city name',
        'errors.daysRange': 'Number of days must be between 1 and 14',
        'errors.routeFailed': 'Failed to create route',
        'errors.refineFailed': 'Failed to update',
        'errors.refineEmpty': 'Enter your preferences to change the route',
        'errors.cameraAccess': 'Could not access camera.',
        'errors.cameraDenied': 'Camera access denied. Allow access in browser settings.',
        'errors.cameraNotFound': 'Camera not found on this device.',
        'errors.cameraBusy': 'Camera is being used by another app.',
        'errors.cameraStart': 'Start the camera first.',
        'errors.imageCapture': 'Could not capture image from camera.',
        'errors.recognition': 'Error recognizing object. Please try again.',
        'errors.server': 'Server error occurred.',
        // Plurals
        'days.one': 'day',
        'days.few': 'days',
        'days.many': 'days'
    },
    zh: {
        // 导航
        'nav.back': '← 返回',
        'nav.home': '🏠 首页',
        // 首页
        'home.title': '旅行助手',
        'home.subtitle': '用人工智能创建完美路线',
        'home.startBtn': '🚀 开始规划',
        'home.arBtn': '📷 AR相机',
        // 关于我们
        'about.title': '关于我们',
        'about.description': '欢迎来到Travel公司。我们将使用Yandex GPT人工智能帮助您创建个性化路线。',
        'about.phone': '电话：',
        'about.email': '邮箱：',
        'about.hours': '工作时间：',
        'about.address': '地址：',
        'about.telegram': '📱 我们的Telegram频道',
        // 表单
        'form.title': '创建您的路线',
        'form.subtitle': '输入城市和偏好 - Yandex GPT将为您创建独特的路线！',
        'form.cityLabel': '🏙️ 城市',
        'form.cityPlaceholder': '输入城市名称（例如：圣彼得堡）',
        'form.daysLabel': '📅 天数',
        'form.daysPlaceholder': '输入天数（1-14）',
        'form.wishesLabel': '💭 偏好（可选）',
        'form.wishesPlaceholder': '例如：带孩子旅行，想去游乐园，不要太多博物馆...',
        'form.submitBtn': '🔍 创建路线',
        'form.loading': 'Yandex GPT正在创建路线...',
        'form.loadingHint': '这可能需要30秒',
        // 路线
        'route.daysCount': '{n}天路线',
        'route.day': '第',
        'route.editBtn': '✏️ 编辑当天',
        'route.editPlaceholder': '描述要更改的内容（例如：添加公园，用咖啡馆替换餐厅，更多适合儿童的地方）...',
        'route.applyBtn': '✅ 应用更改',
        'route.cancelBtn': '❌ 取消',
        'route.savePdf': '📄 保存为PDF',
        'route.openMaps': '🗺️ 在Yandex地图中打开',
        'route.arLink': '📷 打开AR相机查看',
        'route.updating': '⏳ 正在更新当天路线...',
        'route.regenerateConfirm': '用所选语言重新生成路线？\n\n当前路线的所有更改都将丢失。',
        'route.regenerating': '🔄 正在用新语言重新生成路线...',
        // AR页面
        'ar.title': 'AR物体识别',
        'ar.subtitle': '将相机对准地标，我们将尝试使用Yandex Vision API识别它。',
        'ar.startBtn': '▶️ 启动相机',
        'ar.scanBtn': '🔍 扫描物体',
        'ar.stopBtn': '⏹️ 停止相机',
        'ar.tipsTitle': '💡 提示：',
        'ar.tip1': '将相机对准感兴趣的物体',
        'ar.tip2': '点击"扫描物体"进行识别',
        'ar.tip3': '光线充足时效果更好',
        'ar.scanning': '🔍 正在扫描物体...',
        // AR识别结果
        'ar.objectRecognizedTitle': '✅ 物体已识别',
        'ar.objectMaybeTitle': '🤔 这可能是',
        'ar.objectNotRecognizedTitle': '❓ 无法识别物体',
        'ar.objectErrorTitle': '❌ 服务错误',
        'ar.confidenceLabel': '置信度',
        'ar.visionTagsLabel': 'AI识别到',
        'ar.notRecognizedHint': '请尝试靠近或改变拍摄角度。',
        // 错误
        'errors.cityRequired': '请输入城市名称',
        'errors.daysRange': '天数必须在1到14之间',
        'errors.routeFailed': '无法创建路线',
        'errors.refineFailed': '无法更新',
        'errors.refineEmpty': '请输入您的更改偏好',
        'errors.cameraAccess': '无法访问相机。',
        'errors.cameraDenied': '相机访问被拒绝。请在浏览器设置中允许访问。',
        'errors.cameraNotFound': '未在此设备上找到相机。',
        'errors.cameraBusy': '相机正被其他应用使用。',
        'errors.cameraStart': '请先启动相机。',
        'errors.imageCapture': '无法从相机捕获图像。',
        'errors.recognition': '识别物体时出错。请重试。',
        'errors.server': '服务器错误。',
        // 复数
        'days.one': '天',
        'days.few': '天',
        'days.many': '天'
    }
};

/**
 * Получить перевод по ключу
 * @param {string} key - Ключ перевода
 * @param {Object} [params] - Параметры для подстановки
 * @returns {string}
 */
function t(key, params = {}) {
    let text = translations[currentLanguage]?.[key] || translations['ru'][key] || key;
    // Подстановка параметров {name}
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });
    return text;
}

/**
 * Применить переводы к DOM элементам с data-i18n атрибутами
 * @param {string} lang - Код языка
 */
function applyLanguageToDom(lang) {
    // Переводим текстовое содержимое
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang]?.[key]) {
            el.textContent = translations[lang][key];
        }
    });
    // Переводим плейсхолдеры
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang]?.[key]) {
            el.placeholder = translations[lang][key];
        }
    });
}

/**
 * Установить язык интерфейса
 * @param {string} lang - Код языка (ru, en, zh)
 */
function setLanguage(lang) {
    if (!['ru', 'en', 'zh'].includes(lang)) return;
    
    const previousLanguage = currentLanguage;
    currentLanguage = lang;
    localStorage.setItem('travelHelperLanguage', lang);
    applyLanguageToDom(lang);
    
    // Обновляем активную кнопку языка
    document.querySelectorAll('.lang-switch-btn').forEach(btn => {
        btn.classList.toggle('active-lang', btn.getAttribute('data-lang') === lang);
    });
    
    // Если мы на странице маршрута и язык изменился, предложить пересоздать маршрут
    if (previousLanguage !== lang && isOnRoutePage() && lastRouteRequest && currentRoute) {
        // Используем setTimeout чтобы UI успел обновиться
        setTimeout(() => {
            if (confirm(t('route.regenerateConfirm'))) {
                regenerateRouteInNewLanguage();
            }
        }, 100);
    }
}

/**
 * Проверяет, находимся ли мы на странице маршрута
 * @returns {boolean}
 */
function isOnRoutePage() {
    const routePage = document.getElementById('page-route');
    return routePage && routePage.classList.contains('active');
}

/**
 * Пересоздаёт маршрут на новом языке с теми же параметрами
 */
async function regenerateRouteInNewLanguage() {
    if (!lastRouteRequest) {
        console.warn('No previous route request to regenerate');
        return;
    }
    
    const loadingIndicator = document.getElementById('loadingIndicator');
    const routeContent = document.getElementById('routeContent');
    const savePdfBtn = document.getElementById('savePdfBtn');
    
    // Показываем индикатор загрузки на странице маршрута
    if (routeContent) {
        routeContent.innerHTML = `
            <div class="route-regenerating">
                <div class="loading-spinner"></div>
                <p>${t('route.regenerating')}</p>
                <p class="loading-hint">${t('form.loadingHint')}</p>
            </div>
        `;
    }
    
    // Отключаем кнопку PDF пока идёт загрузка
    if (savePdfBtn) savePdfBtn.disabled = true;
    
    // Создаём новый запрос с текущим языком
    const newRequestBody = { 
        ...lastRouteRequest, 
        language: currentLanguage 
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/generate-route`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newRequestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        const routeData = await response.json();
        
        // Обновляем сохранённый запрос и маршрут
        lastRouteRequest = newRequestBody;
        currentRoute = routeData;
        activeDay = 0;
        
        // Перерисовываем маршрут
        displayRoute();
        
    } catch (error) {
        console.error('Error regenerating route:', error);
        
        // Показываем ошибку
        if (routeContent) {
            routeContent.innerHTML = `
                <div class="route-error">
                    <p>❌ ${t('errors.routeFailed')}: ${error.message}</p>
                </div>
            `;
        }
    } finally {
        // Включаем кнопку PDF обратно
        if (savePdfBtn) savePdfBtn.disabled = false;
    }
}

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
        showError(t('errors.cityRequired'));
        cityInput.focus();
        return;
    }
    
    // Валидация количества дней
    const days = parseInt(daysInput.value) || 1;
    if (days < 1 || days > 14) {
        showError(t('errors.daysRange'));
        daysInput.focus();
        return;
    }
    
    // Получаем комментарий (может быть пустым)
    const comment = commentInput.value.trim();
    
    // Показываем индикатор загрузки
    loadingIndicator.style.display = 'block';
    errorMessage.style.display = 'none';
    searchButton.disabled = true;
    
    // Сохраняем параметры запроса для возможного пересоздания на другом языке
    const requestBody = {
        city: city,
        days: days,
        comment: comment,
        language: currentLanguage
    };
    lastRouteRequest = { ...requestBody };
    
    try {
        // Отправляем запрос на бэкенд
        const response = await fetch(`${API_BASE}/api/generate-route`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
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
        showError(`${t('errors.routeFailed')}: ${error.message}`);
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
    
    // Создаём панель редактирования дня
    const editPanel = document.createElement('div');
    editPanel.className = 'day-edit-panel';
    editPanel.innerHTML = `
        <button class="day-edit-btn" data-day-index="${dayIndex}">✏️ Редактировать день</button>
        <div class="day-edit-form" style="display: none;">
            <textarea class="day-edit-comment" rows="3" placeholder="Опишите, что изменить в этом дне (например: добавить парк, заменить ресторан на кафе, больше мест для детей)..."></textarea>
            <div class="day-edit-actions">
                <button class="day-edit-apply-btn" data-day-index="${dayIndex}">✅ Применить изменения</button>
                <button class="day-edit-cancel-btn">❌ Отмена</button>
            </div>
            <div class="day-edit-error" style="display: none;"></div>
            <div class="day-edit-loading" style="display: none;">⏳ Обновляем маршрут для этого дня...</div>
        </div>
    `;
    container.appendChild(editPanel);
    
    // Привязываем обработчики для этой панели
    const editBtn = editPanel.querySelector('.day-edit-btn');
    const editForm = editPanel.querySelector('.day-edit-form');
    const applyBtn = editPanel.querySelector('.day-edit-apply-btn');
    const cancelBtn = editPanel.querySelector('.day-edit-cancel-btn');
    
    editBtn.addEventListener('click', () => {
        editForm.style.display = editForm.style.display === 'none' ? 'block' : 'none';
    });
    
    cancelBtn.addEventListener('click', () => {
        editForm.style.display = 'none';
        editPanel.querySelector('.day-edit-comment').value = '';
        editPanel.querySelector('.day-edit-error').style.display = 'none';
    });
    
    applyBtn.addEventListener('click', () => refineDayHandler(dayIndex, editPanel));
    
    // Создаём карточки для каждого места
    day.items.forEach(item => {
        const card = createRouteItemCard(item);
        container.appendChild(card);
    });
}

/**
 * Обработчик уточнения дня через API
 * @param {number} dayIndex - Индекс дня
 * @param {HTMLElement} editPanel - Панель редактирования
 */
async function refineDayHandler(dayIndex, editPanel) {
    const textarea = editPanel.querySelector('.day-edit-comment');
    const errorDiv = editPanel.querySelector('.day-edit-error');
    const loadingDiv = editPanel.querySelector('.day-edit-loading');
    const applyBtn = editPanel.querySelector('.day-edit-apply-btn');
    const editForm = editPanel.querySelector('.day-edit-form');
    
    const comment = textarea.value.trim();
    if (!comment) {
        errorDiv.textContent = t('errors.refineEmpty');
        errorDiv.style.display = 'block';
        return;
    }
    
    // Скрываем ошибку, показываем загрузку
    errorDiv.style.display = 'none';
    loadingDiv.textContent = t('route.updating');
    loadingDiv.style.display = 'block';
    applyBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE}/api/refine-day`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                city: currentRoute.city,
                totalDays: currentRoute.days.length,
                dayIndex: dayIndex,
                originalDayPlan: currentRoute.days[dayIndex],
                userComment: comment,
                language: currentLanguage
            })
        });
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || t('errors.server'));
        }
        
        const updatedDay = await response.json();
        
        // Обновляем маршрут в памяти
        currentRoute.days[dayIndex] = updatedDay;
        
        // Перерисовываем только этот день
        renderDayContent(dayIndex);
        
    } catch (err) {
        console.error('Ошибка уточнения дня:', err);
        errorDiv.textContent = `${t('errors.refineFailed')}: ${err.message}`;
        errorDiv.style.display = 'block';
    } finally {
        loadingDiv.style.display = 'none';
        applyBtn.disabled = false;
    }
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
    
    // Название места: ссылка на сайт или просто текст
    const titleHtml = item.websiteUrl 
        ? `<a href="${escapeHtml(item.websiteUrl)}" target="_blank" rel="noopener noreferrer" class="route-item-link">${escapeHtml(item.title)}</a>`
        : escapeHtml(item.title);
    
    // Ссылка на Яндекс.Карты
    const city = currentRoute ? currentRoute.city : '';
    const mapsQuery = encodeURIComponent(city + ' ' + item.title);
    const mapsUrl = `https://yandex.ru/maps/?text=${mapsQuery}`;
    
    card.innerHTML = `
        <div class="route-item-icon">${icon}</div>
        <div class="route-item-content">
            ${item.time ? `<div class="route-item-time">🕐 ${item.time}</div>` : ''}
            <div class="route-item-title">${titleHtml}</div>
            <div class="route-item-description">${escapeHtml(item.description)}</div>
            ${item.address ? `<div class="route-item-address">📍 ${escapeHtml(item.address)}</div>` : ''}
            <div class="route-item-maps">
                <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="maps-link">🗺️ Открыть в Яндекс.Картах</a>
            </div>
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

    // Clear previous state before starting camera
    if (info) {
        info.textContent = '';
        info.classList.remove('error', 'success');
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
        
        let errorMessage = t('errors.cameraAccess');
        if (err.name === 'NotAllowedError') {
            errorMessage = t('errors.cameraDenied');
        } else if (err.name === 'NotFoundError') {
            errorMessage = t('errors.cameraNotFound');
        } else if (err.name === 'NotReadableError') {
            errorMessage = t('errors.cameraBusy');
        }
        
        // Show error with bright red styling
        if (info) {
            info.textContent = errorMessage;
            info.classList.remove('success');
            info.classList.add('error');
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
    const info = document.getElementById('arObjectInfo');

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
    
    // Reset info block to neutral state
    if (info) {
        info.textContent = '';
        info.classList.remove('error', 'success');
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
    
    // Check if camera is running
    if (!cameraStream) {
        info.textContent = t('errors.cameraStart');
        info.classList.remove('success');
        info.classList.add('error');
        return;
    }

    // Reset classes and show scanning state
    info.textContent = t('ar.scanning');
    info.classList.remove('error', 'success');

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
            info.textContent = t('errors.imageCapture');
            info.classList.remove('success');
            info.classList.add('error');
            return;
        }

        // Prepare form data with image and language
        const formData = new FormData();
        formData.append('image', blob, 'frame.jpg');
        formData.append('language', currentLanguage);

        const response = await fetch(`${API_BASE}/api/recognize-object`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('recognize-object error', errText);
            info.textContent = t('errors.recognition');
            info.classList.remove('success');
            info.classList.add('error');
            return;
        }

        const result = await response.json();
        
        // Handle the new response format:
        // { success, recognized, mode, title, description, confidence, rawTags }
        
        if (result.success === false || result.mode === 'error') {
            // Server returned an error
            info.classList.remove('success');
            info.classList.add('error');
            info.innerHTML = `
                <h3>${t('ar.objectErrorTitle')}</h3>
                <p>${escapeHtml(result.description || t('errors.recognition'))}</p>
            `;
            return;
        }
        
        if (result.recognized) {
            // Object was recognized
            info.classList.remove('error');
            info.classList.add('success');
            
            const confidencePercent = Math.round((result.confidence || 0) * 100);
            const headerText = result.mode === 'vision+gpt' 
                ? t('ar.objectMaybeTitle')
                : t('ar.objectRecognizedTitle');
            
            let tagsHtml = '';
            if (result.rawTags && result.rawTags.length > 0) {
                const tagsPreview = result.rawTags.slice(0, 5).join(', ');
                tagsHtml = `<p class="ar-tags"><small>${t('ar.visionTagsLabel')}: ${escapeHtml(tagsPreview)}</small></p>`;
            }
            
            info.innerHTML = `
                <h3>${headerText}</h3>
                <h2>${escapeHtml(result.title || '')}</h2>
                <p>${escapeHtml(result.description || '')}</p>
                <p class="ar-confidence"><small>${t('ar.confidenceLabel')}: ~${confidencePercent}%</small></p>
                ${tagsHtml}
            `;
        } else {
            // Object was NOT recognized
            info.classList.remove('success');
            info.classList.add('error');
            
            let tagsHtml = '';
            if (result.rawTags && result.rawTags.length > 0) {
                const tagsPreview = result.rawTags.slice(0, 5).join(', ');
                tagsHtml = `<p class="ar-tags"><small>${t('ar.visionTagsLabel')}: ${escapeHtml(tagsPreview)}</small></p>`;
            }
            
            info.innerHTML = `
                <h3>${t('ar.objectNotRecognizedTitle')}</h3>
                <p>${escapeHtml(result.description || t('ar.notRecognizedHint'))}</p>
                ${tagsHtml}
            `;
        }
        
    } catch (err) {
        console.error('scanObject failed', err);
        info.textContent = t('errors.server');
        info.classList.remove('success');
        info.classList.add('error');
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // ========================================
    // Инициализация языка (на всех страницах)
    // ========================================
    const savedLang = localStorage.getItem('travelHelperLanguage');
    if (savedLang && ['ru', 'en', 'zh'].includes(savedLang)) {
        currentLanguage = savedLang;
    } else {
        currentLanguage = 'ru';
    }
    setLanguage(currentLanguage);
    
    // Подключаем переключатели языка
    document.querySelectorAll('.lang-switch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            if (lang && ['ru', 'en', 'zh'].includes(lang)) {
                setLanguage(lang);
            }
        });
    });
    
    // ========================================
    // AR страница
    // ========================================
    const isARPage = document.querySelector('.ar-background');
    if (isARPage) {
        const startBtn = document.getElementById('startCameraBtn');
        const scanBtn = document.getElementById('scanObjectBtn');
        const stopBtn = document.getElementById('stopCameraBtn');

        if (startBtn) startBtn.addEventListener('click', startCamera);
        if (scanBtn) scanBtn.addEventListener('click', scanObject);
        if (stopBtn) stopBtn.addEventListener('click', stopCamera);
        
        return; // На AR странице не нужна дополнительная инициализация
    }
    
    // ========================================
    // Главная страница (index.html)
    // ========================================
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
    
    // Подключаем кнопку сохранения в PDF
    const savePdfBtn = document.getElementById('savePdfBtn');
    if (savePdfBtn) {
        savePdfBtn.addEventListener('click', () => {
            window.print();
        });
    }
    
    // Подключаем кнопку "Назад" в навбаре
    const navBackBtn = document.getElementById('navBackBtn');
    if (navBackBtn) {
        navBackBtn.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                goHome();
            }
        });
    }
    
    // Подключаем кнопку "Назад" на странице маршрута (если есть отдельная)
    const routeBackBtn = document.getElementById('routeBackBtn');
    if (routeBackBtn) {
        routeBackBtn.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'index.html';
            }
        });
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


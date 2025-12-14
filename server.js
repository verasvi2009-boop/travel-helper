/**
 * ===========================================
 * СЕРВЕР ДЛЯ ПОМОЩНИКА ПУТЕШЕСТВЕННИКА
 * Интеграция с Yandex GPT для генерации маршрутов
 * ===========================================
 * 
 * Для запуска сервера:
 * 1. Установите зависимости: npm install
 * 2. Создайте файл .env с переменными YANDEX_API_KEY и YANDEX_FOLDER_ID
 * 3. Запустите: node server.js
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const upload = multer();

// Загрузка переменных окружения из .env файла
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// НАСТРОЙКА MIDDLEWARE
// ============================================

app.use(cors());          // allow requests from GitHub Pages and other origins
app.use(express.json());  // make sure JSON body parsing is enabled

// Раздача статических файлов (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// ============================================
// КОНФИГУРАЦИЯ YANDEX GPT
// ============================================

// Получаем учётные данные из переменных окружения
const YANDEX_API_KEY = process.env.YANDEX_API_KEY;
const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID;

// URL для Yandex GPT API (Foundation Models)
const YANDEX_GPT_URL = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

// Модель для генерации текста
const YANDEX_MODEL = `gpt://${YANDEX_FOLDER_ID}/yandexgpt-lite`;

// ============================================
// ТИПЫ ДАННЫХ (JSDoc)
// ============================================

/**
 * @typedef {Object} RouteItem
 * @property {string} [time] - Время посещения
 * @property {string} title - Название места
 * @property {string} description - Описание
 * @property {'sight' | 'food' | 'walk'} type - Тип места
 * @property {string} [address] - Адрес
 */

/**
 * @typedef {Object} DayPlan
 * @property {string} label - Название дня
 * @property {RouteItem[]} items - Список мест
 */

/**
 * @typedef {Object} RouteData
 * @property {string} city - Город
 * @property {DayPlan[]} days - Дни маршрута
 */

// ============================================
// ГЛАВНЫЙ ENDPOINT: ГЕНЕРАЦИЯ МАРШРУТА
// ============================================

/**
 * POST /api/generate-route
 * Генерирует маршрут для путешествия с помощью Yandex GPT
 * 
 * Тело запроса:
 * {
 *   "city": "Санкт-Петербург",
 *   "days": 3,
 *   "comment": "Едем с детьми, хотим парки развлечений"
 * }
 */
app.post('/api/generate-route', async (req, res) => {
    try {
        const { city, days, comment } = req.body;
        
        // Валидация входных данных
        if (!city || typeof city !== 'string' || city.trim().length === 0) {
            return res.status(400).json({ 
                error: 'Необходимо указать город' 
            });
        }
        
        const daysCount = parseInt(days) || 1;
        if (daysCount < 1 || daysCount > 14) {
            return res.status(400).json({ 
                error: 'Количество дней должно быть от 1 до 14' 
            });
        }
        
        // Проверяем наличие API ключа
        if (!YANDEX_API_KEY || !YANDEX_FOLDER_ID) {
            console.error('Отсутствуют YANDEX_API_KEY или YANDEX_FOLDER_ID');
            return res.status(500).json({ 
                error: 'Сервер не настроен. Добавьте YANDEX_API_KEY и YANDEX_FOLDER_ID в .env файл' 
            });
        }
        
        console.log(`Генерация маршрута: ${city}, ${daysCount} дней`);
        if (comment) {
            console.log(`Пожелания: ${comment}`);
        }
        
        // Генерируем маршрут через Yandex GPT
        const routeData = await generateRouteWithYandexGPT(city.trim(), daysCount, comment || '');
        
        // Возвращаем результат
        res.json(routeData);
        
    } catch (error) {
        console.error('Ошибка генерации маршрута:', error);
        res.status(500).json({ 
            error: error.message || 'Произошла ошибка при генерации маршрута' 
        });
    }
});

// ============================================
// ФУНКЦИЯ ГЕНЕРАЦИИ МАРШРУТА ЧЕРЕЗ YANDEX GPT
// ============================================

/**
 * Генерирует маршрут путешествия с помощью Yandex GPT
 * @param {string} city - Название города
 * @param {number} days - Количество дней
 * @param {string} comment - Дополнительные пожелания
 * @returns {Promise<RouteData>}
 */
async function generateRouteWithYandexGPT(city, days, comment) {
    // Формируем промпт для модели
    const systemPrompt = `Ты — профессиональный туристический гид и планировщик путешествий.
Твоя задача — создавать детальные маршруты для туристов.

ВАЖНЫЕ ПРАВИЛА:
1. Отвечай ТОЛЬКО валидным JSON без дополнительного текста
2. Не добавляй комментарии или пояснения до или после JSON
3. Используй только реальные достопримечательности и места
4. Для каждого дня создавай уникальный маршрут (без повторений)
5. Учитывай логистику — места должны быть близко друг к другу в рамках дня
6. Добавляй время приёма пищи (обед, ужин) в подходящее время`;

    const userPrompt = `Создай туристический маршрут по городу "${city}" на ${days} ${getDaysWord(days)}.
${comment ? `\nПожелания туриста: ${comment}` : ''}

Ответь СТРОГО в формате JSON:
{
  "city": "${city}",
  "days": [
    {
      "label": "День 1",
      "items": [
        {
          "type": "sight",
          "title": "Название достопримечательности",
          "time": "10:00–12:00",
          "description": "Подробное описание места и что там интересного (2-3 предложения)",
          "address": "Точный адрес"
        },
        {
          "type": "food",
          "title": "Название кафе/ресторана",
          "time": "12:30–13:30",
          "description": "Описание заведения и рекомендуемые блюда",
          "address": "Адрес"
        }
      ]
    }
  ]
}

Типы мест:
- "sight" — достопримечательности, музеи, памятники
- "food" — кафе, рестораны, места для еды
- "walk" — парки, прогулочные зоны, скверы

Каждый день должен содержать 5-7 мест (включая обед и ужин).
Для каждого дня планируй разные места!`;

    // Отправляем запрос к Yandex GPT
    const response = await fetch(YANDEX_GPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Api-Key ${YANDEX_API_KEY}`,
            'x-folder-id': YANDEX_FOLDER_ID
        },
        body: JSON.stringify({
            modelUri: YANDEX_MODEL,
            completionOptions: {
                stream: false,
                temperature: 0.6,
                maxTokens: 8000
            },
            messages: [
                {
                    role: 'system',
                    text: systemPrompt
                },
                {
                    role: 'user',
                    text: userPrompt
                }
            ]
        })
    });
    
    // Проверяем статус ответа
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Ошибка Yandex GPT API:', response.status, errorText);
        throw new Error(`Ошибка API Yandex GPT: ${response.status}`);
    }
    
    // Парсим ответ
    const data = await response.json();
    
    // Извлекаем текст ответа
    const resultText = data.result?.alternatives?.[0]?.message?.text;
    
    if (!resultText) {
        console.error('Пустой ответ от Yandex GPT:', data);
        throw new Error('Не удалось получить ответ от Yandex GPT');
    }
    
    console.log('Ответ от Yandex GPT получен, длина:', resultText.length);
    
    // Пытаемся извлечь JSON из ответа
    const routeData = parseRouteJSON(resultText);
    
    // Валидируем и дополняем данные
    return validateAndFixRouteData(routeData, city, days);
}

/**
 * Парсит JSON из текста ответа модели
 * @param {string} text - Текст ответа
 * @returns {Object}
 */
function parseRouteJSON(text) {
    // Удаляем возможные markdown-блоки кода
    let cleanText = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();
    
    // Пробуем найти JSON в тексте
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleanText = jsonMatch[0];
    }
    
    try {
        return JSON.parse(cleanText);
    } catch (error) {
        console.error('Ошибка парсинга JSON:', error);
        console.error('Текст для парсинга:', cleanText.substring(0, 500));
        throw new Error('Не удалось разобрать ответ от AI. Попробуйте ещё раз.');
    }
}

/**
 * Валидирует и исправляет данные маршрута
 * @param {Object} data - Данные от модели
 * @param {string} expectedCity - Ожидаемый город
 * @param {number} expectedDays - Ожидаемое количество дней
 * @returns {RouteData}
 */
function validateAndFixRouteData(data, expectedCity, expectedDays) {
    // Базовая структура
    const route = {
        city: data.city || expectedCity,
        days: []
    };
    
    // Проверяем наличие дней
    if (!Array.isArray(data.days) || data.days.length === 0) {
        throw new Error('AI не сгенерировал маршрут. Попробуйте ещё раз.');
    }
    
    // Обрабатываем каждый день
    data.days.forEach((day, index) => {
        const dayPlan = {
            label: day.label || `День ${index + 1}`,
            items: []
        };
        
        // Проверяем наличие элементов маршрута
        if (Array.isArray(day.items)) {
            day.items.forEach(item => {
                // Валидируем тип
                const validTypes = ['sight', 'food', 'walk'];
                const type = validTypes.includes(item.type) ? item.type : 'sight';
                
                dayPlan.items.push({
                    type: type,
                    title: item.title || 'Без названия',
                    time: item.time || '',
                    description: item.description || '',
                    address: item.address || ''
                });
            });
        }
        
        route.days.push(dayPlan);
    });
    
    return route;
}

/**
 * Получить правильное склонение слова "день"
 * @param {number} n - Количество
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

// ============================================
// ДОПОЛНИТЕЛЬНЫЕ ENDPOINTS
// ============================================

/**
 * GET /api/health
 * Проверка работоспособности сервера
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'Сервер работает',
        hasApiKey: !!YANDEX_API_KEY,
        hasFolderId: !!YANDEX_FOLDER_ID
    });
});

/**
 * Обработка главной страницы
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// YANDEX VISION: РАСПОЗНАВАНИЕ ОБЪЕКТОВ
// ============================================

/**
 * POST /api/recognize-object
 * Распознаёт объект на изображении с помощью Yandex Vision API
 */
app.post('/api/recognize-object', upload.single('image'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const apiKey = process.env.YANDEX_API_KEY;
    const folderId = process.env.YANDEX_FOLDER_ID;

    if (!apiKey) {
      return res.status(500).json({ error: 'YANDEX_API_KEY is not configured on the server' });
    }

    // Convert image to base64
    const imageBase64 = req.file.buffer.toString('base64');

    const requestBody = {
      folderId,
      analyze_specs: [
        {
          content: imageBase64,
          features: [
            {
              type: 'CLASSIFICATION'
              // no extra config: use default classification model
            }
          ]
        }
      ]
    };

    const visionResponse = await fetch(
      'https://vision.api.cloud.yandex.net/vision/v1/batchAnalyze',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Api-Key ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      }
    );

    const visionJson = await visionResponse.json();

    if (!visionResponse.ok) {
      console.error('Yandex Vision API error:', visionJson);
      return res.status(visionResponse.status).json({
        error: 'Vision API error',
        details: visionJson
      });
    }

    // Try to extract the most probable class label
    let title = 'Объект не распознан';
    let labels = [];
    const firstResult = visionJson.results?.[0];
    const featureResults = firstResult?.results || firstResult?.analysis_results;

    if (Array.isArray(featureResults) && featureResults.length > 0) {
      const classAnnotations =
        featureResults[0].classification || featureResults[0].classifications;

      const classes = classAnnotations?.classes || classAnnotations?.[0]?.classes;
      if (Array.isArray(classes) && classes.length > 0) {
        labels = classes.map(c => c.name);
        title = classes[0].name;
      }
    }

    res.json({
      title,
      labels,
      description:
        labels.length > 0
          ? `Похоже, что это: ${labels.join(', ')}.`
          : 'К сожалению, сервис не смог распознать объект. Попробуйте подойти ближе или изменить ракурс.'
    });
  } catch (err) {
    console.error('recognize-object error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================

app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🚀 Сервер "Помощник Путешественника" запущен!');
    console.log(`📍 Адрес: http://localhost:${PORT}`);
    console.log('='.repeat(50));
    
    // Проверяем наличие ключей
    if (!YANDEX_API_KEY) {
        console.warn('⚠️  ВНИМАНИЕ: Не указан YANDEX_API_KEY');
        console.warn('   Создайте файл .env с переменной YANDEX_API_KEY');
    }
    if (!YANDEX_FOLDER_ID) {
        console.warn('⚠️  ВНИМАНИЕ: Не указан YANDEX_FOLDER_ID');
        console.warn('   Создайте файл .env с переменной YANDEX_FOLDER_ID');
    }
    
    if (YANDEX_API_KEY && YANDEX_FOLDER_ID) {
        console.log('✅ Yandex GPT настроен корректно');
    }
    
    console.log('='.repeat(50));
});


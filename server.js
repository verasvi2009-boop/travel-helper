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
        
        // Нормализуем язык (по умолчанию русский)
        let language = req.body.language;
        if (!['ru', 'en', 'zh'].includes(language)) {
            language = 'ru';
        }
        
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
        
        console.log(`Генерация маршрута: ${city}, ${daysCount} дней, язык: ${language}`);
        if (comment) {
            console.log(`Пожелания: ${comment}`);
        }
        
        // Генерируем маршрут через Yandex GPT
        const routeData = await generateRouteWithYandexGPT(city.trim(), daysCount, comment || '', language);
        
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
 * @param {string} language - Язык ответа (ru, en, zh)
 * @returns {Promise<RouteData>}
 */
async function generateRouteWithYandexGPT(city, days, comment, language = 'ru') {
    // Инструкции по языку ответа
    const languageInstructions = {
        ru: {
            instruction: 'Отвечай на русском языке.',
            dayLabel: 'День',
            wishesNote: 'Пожелания туриста могут быть на любом языке, но твой ответ должен быть на русском.'
        },
        en: {
            instruction: 'Answer in English.',
            dayLabel: 'Day',
            wishesNote: 'User wishes may be in any language, but your response MUST be in English.'
        },
        zh: {
            instruction: '请用中文回答。',
            dayLabel: '第',
            wishesNote: '用户的愿望可能是任何语言，但你的回答必须是中文。'
        }
    };
    
    const langConfig = languageInstructions[language] || languageInstructions.ru;
    
    // Формируем промпт для модели
    const systemPrompt = `You are a professional travel guide and trip planner.
Your task is to create detailed routes for tourists.

IMPORTANT RULES:
1. Respond ONLY with valid JSON without any additional text
2. Do not add comments or explanations before or after JSON
3. Use only real attractions and places
4. Create a unique route for each day (no repetitions)
5. Consider logistics — places should be close to each other within a day
6. Add meal times (lunch, dinner) at appropriate times

LANGUAGE: ${langConfig.instruction}
${langConfig.wishesNote}`;

    const userPrompt = `Create a tourist route for the city "${city}" for ${days} day(s).
${comment ? `\nUser wishes: ${comment}` : ''}

Respond STRICTLY in JSON format:
{
  "city": "${city}",
  "days": [
    {
      "label": "${langConfig.dayLabel} 1",
      "items": [
        {
          "type": "sight",
          "title": "Name of attraction",
          "time": "10:00–12:00",
          "description": "Detailed description of the place (2-3 sentences)",
          "address": "Exact address",
          "websiteUrl": "https://... (if you know the official website, otherwise leave empty)"
        },
        {
          "type": "food",
          "title": "Name of café/restaurant",
          "time": "12:30–13:30",
          "description": "Description of the place and recommended dishes",
          "address": "Address",
          "websiteUrl": ""
        }
      ]
    }
  ]
}

Place types:
- "sight" — attractions, museums, monuments
- "food" — cafés, restaurants, places to eat
- "walk" — parks, walking areas

For each place, if you know the official website — add it to "websiteUrl". If not — leave empty string.

Each day should contain 5-7 places (including lunch and dinner).
Plan different places for each day!

REMEMBER: ${langConfig.instruction} All text content (titles, descriptions, addresses) must be in the specified language.`;

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

// Пороги уверенности для Vision
const VISION_GOOD_THRESHOLD = 0.65;  // Высокая уверенность
const VISION_MIN_THRESHOLD = 0.35;   // Минимальная уверенность для попытки GPT

// Общие/неинформативные теги, при которых нужно вызвать GPT
const GENERIC_TAGS = ['building', 'tower', 'city', 'tree', 'sky', 'outdoor', 'indoor', 'object', 'architecture', 'structure', 'landscape'];

/**
 * Локализованные сообщения для AR распознавания
 */
const AR_MESSAGES = {
    ru: {
        notRecognized: 'Объект не распознан',
        notRecognizedDesc: 'К сожалению, сервис не смог распознать объект. Попробуйте подойти ближе или изменить ракурс.',
        errorTitle: 'Ошибка',
        errorDesc: 'Не удалось распознать объект. Попробуйте ещё раз позже.',
        noImage: 'Изображение не загружено',
        serverNotConfigured: 'Сервер не настроен'
    },
    en: {
        notRecognized: 'Object not recognized',
        notRecognizedDesc: 'Unfortunately, the service could not recognize the object. Try getting closer or changing the angle.',
        errorTitle: 'Error',
        errorDesc: 'Could not recognize the object. Please try again later.',
        noImage: 'No image uploaded',
        serverNotConfigured: 'Server not configured'
    },
    zh: {
        notRecognized: '无法识别对象',
        notRecognizedDesc: '抱歉，服务无法识别该对象。请尝试靠近或改变角度。',
        errorTitle: '错误',
        errorDesc: '无法识别对象。请稍后再试。',
        noImage: '未上传图片',
        serverNotConfigured: '服务器未配置'
    }
};

/**
 * Извлекает теги и оценки уверенности из ответа Yandex Vision
 * @param {Object} visionJson - Ответ от Yandex Vision API
 * @returns {{ bestLabel: string, bestScore: number, tags: string[], allClasses: Array<{name: string, confidence: number}> }}
 */
function extractVisionTags(visionJson) {
    let bestLabel = '';
    let bestScore = 0;
    let tags = [];
    let allClasses = [];
    
    try {
        const firstResult = visionJson.results?.[0];
        const featureResults = firstResult?.results || firstResult?.analysis_results;
        
        if (Array.isArray(featureResults) && featureResults.length > 0) {
            const classAnnotations = featureResults[0].classification || featureResults[0].classifications;
            const classes = classAnnotations?.classes || classAnnotations?.[0]?.classes;
            
            if (Array.isArray(classes) && classes.length > 0) {
                // Сортируем по уверенности
                allClasses = classes
                    .map(c => ({ name: c.name || '', confidence: parseFloat(c.confidence) || 0 }))
                    .sort((a, b) => b.confidence - a.confidence);
                
                // Лучший результат
                bestLabel = allClasses[0].name;
                bestScore = allClasses[0].confidence;
                
                // Топ-10 тегов (только имена)
                tags = allClasses.slice(0, 10).map(c => c.name);
            }
        }
    } catch (e) {
        console.error('[extractVisionTags] Error:', e);
    }
    
    return { bestLabel, bestScore, tags, allClasses };
}

/**
 * Проверяет, является ли тег слишком общим/неинформативным
 * @param {string} label - Название тега
 * @returns {boolean}
 */
function isGenericTag(label) {
    if (!label) return true;
    const lower = label.toLowerCase();
    return GENERIC_TAGS.some(g => lower.includes(g));
}

/**
 * Использует Yandex GPT для описания объекта на основе тегов Vision
 * @param {string[]} tags - Теги от Vision
 * @param {string} language - Язык ответа (ru, en, zh)
 * @returns {Promise<{ title: string, description: string, canGuess: boolean }>}
 */
async function describeObjectWithYandexGPT(tags, language = 'ru') {
    const langInstructions = {
        ru: 'Отвечай на русском языке.',
        en: 'Answer in English.',
        zh: '请用中文回答。'
    };
    
    const langInstruction = langInstructions[language] || langInstructions.ru;
    
    const systemPrompt = `You are a knowledgeable tour guide who can identify landmarks and objects.
Your task: based on image classification tags, guess what landmark or object this might be.
${langInstruction}

RULES:
1. Return ONLY valid JSON, no extra text
2. If tags suggest a famous landmark (like Eiffel Tower, Kremlin, etc.), identify it
3. If tags are too vague, set canGuess to false
4. Keep title short (2-4 words)
5. Keep description brief (1-3 sentences)`;

    const userPrompt = `Image classification tags: ${tags.join(', ')}

Based on these tags, try to identify what landmark or object this might be.

Return JSON ONLY:
{
  "title": "Short name of object (2-4 words)",
  "description": "Brief description for a tourist (1-3 sentences)",
  "canGuess": true or false
}

If the tags are too generic or you cannot make a reasonable guess, set canGuess to false and explain in description that the image is unclear.

IMPORTANT: ${langInstruction}`;

    try {
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
                    temperature: 0.4,
                    maxTokens: 500
                },
                messages: [
                    { role: 'system', text: systemPrompt },
                    { role: 'user', text: userPrompt }
                ]
            })
        });
        
        if (!response.ok) {
            console.error('[describeObjectWithYandexGPT] GPT API error:', response.status);
            return { title: '', description: '', canGuess: false };
        }
        
        const data = await response.json();
        const resultText = data.result?.alternatives?.[0]?.message?.text;
        
        if (!resultText) {
            return { title: '', description: '', canGuess: false };
        }
        
        // Парсим JSON из ответа
        const cleanText = resultText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                title: parsed.title || '',
                description: parsed.description || '',
                canGuess: parsed.canGuess === true
            };
        }
        
        return { title: '', description: '', canGuess: false };
        
    } catch (err) {
        console.error('[describeObjectWithYandexGPT] Error:', err);
        return { title: '', description: '', canGuess: false };
    }
}

/**
 * POST /api/recognize-object
 * Распознаёт объект на изображении с помощью Yandex Vision API
 * При низкой уверенности использует Yandex GPT для улучшения результата
 */
app.post('/api/recognize-object', upload.single('image'), async (req, res) => {
    // Нормализуем язык (по умолчанию русский)
    let language = req.body.language;
    if (!['ru', 'en', 'zh'].includes(language)) {
        language = 'ru';
    }
    
    const messages = AR_MESSAGES[language] || AR_MESSAGES.ru;
    
    try {
        // Проверяем наличие изображения
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                recognized: false,
                mode: 'error',
                title: messages.noImage,
                description: messages.noImage,
                confidence: 0,
                rawTags: []
            });
        }
        
        // Проверяем конфигурацию сервера
        if (!YANDEX_API_KEY || !YANDEX_FOLDER_ID) {
            return res.status(500).json({
                success: false,
                recognized: false,
                mode: 'error',
                title: messages.serverNotConfigured,
                description: messages.serverNotConfigured,
                confidence: 0,
                rawTags: []
            });
        }
        
        console.log(`[recognize-object] Начало распознавания, язык: ${language}`);
        
        // Конвертируем изображение в base64
        const imageBase64 = req.file.buffer.toString('base64');
        
        // Вызываем Yandex Vision API
        const visionResponse = await fetch(
            'https://vision.api.cloud.yandex.net/vision/v1/batchAnalyze',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Api-Key ${YANDEX_API_KEY}`
                },
                body: JSON.stringify({
                    folderId: YANDEX_FOLDER_ID,
                    analyze_specs: [{
                        content: imageBase64,
                        features: [{ type: 'CLASSIFICATION' }]
                    }]
                })
            }
        );
        
        if (!visionResponse.ok) {
            const errorText = await visionResponse.text();
            console.error('[recognize-object] Vision API error:', visionResponse.status, errorText);
            return res.status(500).json({
                success: false,
                recognized: false,
                mode: 'error',
                title: messages.errorTitle,
                description: messages.errorDesc,
                confidence: 0,
                rawTags: []
            });
        }
        
        const visionJson = await visionResponse.json();
        
        // Извлекаем теги и оценки
        const { bestLabel, bestScore, tags, allClasses } = extractVisionTags(visionJson);
        
        console.log(`[recognize-object] Vision result: bestLabel="${bestLabel}", bestScore=${bestScore.toFixed(2)}, tags=${tags.length}`);
        
        // Определяем, достаточно ли уверено распознавание
        const isConfident = bestScore >= VISION_GOOD_THRESHOLD && !isGenericTag(bestLabel);
        const canTryGPT = bestScore >= VISION_MIN_THRESHOLD && tags.length > 0;
        
        let recognized = false;
        let mode = 'unknown';
        let title = messages.notRecognized;
        let description = messages.notRecognizedDesc;
        
        if (isConfident) {
            // Vision достаточно уверен — используем его результат
            recognized = true;
            mode = 'vision';
            title = bestLabel;
            description = tags.length > 1 
                ? (language === 'ru' ? `Похоже, это: ${tags.slice(0, 5).join(', ')}.` :
                   language === 'en' ? `This appears to be: ${tags.slice(0, 5).join(', ')}.` :
                   `这看起来是：${tags.slice(0, 5).join(', ')}。`)
                : (language === 'ru' ? `Распознано: ${bestLabel}` :
                   language === 'en' ? `Recognized: ${bestLabel}` :
                   `识别结果：${bestLabel}`);
            
            console.log(`[recognize-object] Mode: vision (confident)`);
            
        } else if (canTryGPT) {
            // Vision не уверен — пробуем GPT
            console.log(`[recognize-object] Vision uncertain, calling GPT...`);
            
            const gptResult = await describeObjectWithYandexGPT(tags, language);
            
            if (gptResult.canGuess && gptResult.title) {
                recognized = true;
                mode = 'vision+gpt';
                title = gptResult.title;
                description = gptResult.description || messages.notRecognizedDesc;
                
                console.log(`[recognize-object] Mode: vision+gpt, title="${title}"`);
            } else {
                // GPT тоже не смог
                mode = 'unknown';
                recognized = false;
                
                // Если GPT дал хоть какое-то описание, используем его
                if (gptResult.description) {
                    description = gptResult.description;
                }
                
                console.log(`[recognize-object] Mode: unknown (GPT could not guess)`);
            }
            
        } else {
            // Слишком низкая уверенность даже для GPT
            mode = 'unknown';
            recognized = false;
            
            console.log(`[recognize-object] Mode: unknown (score too low)`);
        }
        
        // Формируем и отправляем ответ
        res.json({
            success: true,
            recognized,
            mode,
            title,
            description,
            confidence: bestScore,
            rawTags: tags,
            // Сохраняем совместимость со старым форматом
            labels: tags
        });
        
    } catch (err) {
        console.error('[recognize-object] Error:', err);
        res.status(500).json({
            success: false,
            recognized: false,
            mode: 'error',
            title: messages.errorTitle,
            description: messages.errorDesc,
            confidence: 0,
            rawTags: []
        });
    }
});

// ============================================
// REFINE DAY: УТОЧНЕНИЕ ОДНОГО ДНЯ МАРШРУТА
// ============================================

/**
 * POST /api/refine-day
 * Уточняет план одного дня маршрута на основе пожеланий пользователя
 */
app.post('/api/refine-day', async (req, res) => {
    const { city, totalDays, dayIndex, originalDayPlan, userComment } = req.body;
    
    // Нормализуем язык (по умолчанию русский)
    let language = req.body.language;
    if (!['ru', 'en', 'zh'].includes(language)) {
        language = 'ru';
    }
    
    // Валидация
    if (!city) return res.status(400).json({ error: 'Не указан город (city)' });
    if (dayIndex === undefined) return res.status(400).json({ error: 'Не указан индекс дня (dayIndex)' });
    if (!originalDayPlan) return res.status(400).json({ error: 'Не передан текущий план дня (originalDayPlan)' });
    if (!userComment?.trim()) return res.status(400).json({ error: 'Не указаны пожелания (userComment)' });
    
    if (!YANDEX_API_KEY || !YANDEX_FOLDER_ID) {
        return res.status(500).json({ error: 'Сервер не настроен для работы с Yandex GPT' });
    }
    
    console.log(`[refine-day] День ${dayIndex + 1}, город "${city}", язык: ${language}, пожелание: "${userComment}"`);
    
    // Настройки языка
    const langConfig = {
        ru: { instruction: 'Отвечай на русском языке.', dayLabel: 'День', wishesNote: 'Пожелание пользователя может быть на любом языке, но ответ ДОЛЖЕН быть на русском.' },
        en: { instruction: 'Answer in English.', dayLabel: 'Day', wishesNote: 'User comment may be in any language, but your response MUST be in English.' },
        zh: { instruction: '请用中文回答。', dayLabel: '第', wishesNote: '用户评论可能是任何语言，但您的回复必须是中文。' }
    }[language] || { instruction: 'Отвечай на русском языке.', dayLabel: 'День', wishesNote: '' };
    
    try {
        const systemPrompt = `You are a travel guide. Improve the day plan based on user wishes.
RULES: 1) Respond ONLY with JSON 2) 5-7 places 3) Optimize for walking 4) If children mentioned — choose kid-friendly places 5) Use real places only
LANGUAGE: ${langConfig.instruction}
${langConfig.wishesNote}`;

        const userPrompt = `Current plan for day ${dayIndex + 1} in "${city}":
${JSON.stringify(originalDayPlan, null, 2)}

USER WISH: "${userComment}"

Return a NEW plan in JSON format:
{"label":"${langConfig.dayLabel} ${dayIndex + 1}","items":[{"type":"sight|food|walk","title":"...","time":"10:00–12:00","description":"...","address":"...","websiteUrl":""}]}

IMPORTANT: ${langConfig.instruction} All text content must be in the specified language.`;

        const response = await fetch(YANDEX_GPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Api-Key ${YANDEX_API_KEY}`, 'x-folder-id': YANDEX_FOLDER_ID },
            body: JSON.stringify({
                modelUri: YANDEX_MODEL,
                completionOptions: { stream: false, temperature: 0.6, maxTokens: 4000 },
                messages: [{ role: 'system', text: systemPrompt }, { role: 'user', text: userPrompt }]
            })
        });
        
        if (!response.ok) {
            console.error('[refine-day] GPT error:', response.status, await response.text());
            return res.status(500).json({ error: 'Ошибка при обращении к Yandex GPT' });
        }
        
        const data = await response.json();
        const resultText = data.result?.alternatives?.[0]?.message?.text;
        if (!resultText) return res.status(500).json({ error: 'Пустой ответ от Yandex GPT' });
        
        // Parse JSON
        let refinedDay;
        try {
            const clean = resultText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
            const match = clean.match(/\{[\s\S]*\}/);
            refinedDay = match ? JSON.parse(match[0]) : null;
            if (!refinedDay) throw new Error('No JSON found');
        } catch (e) {
            console.error('[refine-day] Parse error:', e, resultText);
            return res.status(500).json({ error: 'Не удалось распарсить ответ' });
        }
        
        // Validate & fix
        refinedDay.label = refinedDay.label || `День ${dayIndex + 1}`;
        refinedDay.items = (refinedDay.items || []).map(item => ({
            type: item.type || 'sight', title: item.title || '', time: item.time || '',
            description: item.description || '', address: item.address || '', websiteUrl: item.websiteUrl || ''
        }));
        
        console.log(`[refine-day] OK, ${refinedDay.items.length} мест`);
        res.json(refinedDay);
    } catch (err) {
        console.error('[refine-day] Error:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
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


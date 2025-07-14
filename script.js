// Ждем полной загрузки DOM перед выполнением скрипта
document.addEventListener('DOMContentLoaded', function() {
    // Получаем элементы DOM
    const cityInput = document.getElementById('city-input'); // Поле ввода города
    const searchBtn = document.getElementById('search-btn'); // Кнопка поиска
    const currentWeatherElement = document.getElementById('current-weather'); // Блок текущей погоды
    const dailyForecastElement = document.getElementById('daily-forecast'); // Блок прогноза
    const temperatureChartCtx = document.getElementById('temperature-chart').getContext('2d'); // Контекст для графика
    
    let temperatureChart = null; // Здесь будет храниться экземпляр графика

    // Загружаем погоду для Москвы по умолчанию
    loadWeather('Москва');

    // Обработчик клика по кнопке поиска
    searchBtn.addEventListener('click', function() {
        const city = cityInput.value.trim(); // Получаем и очищаем значение поля ввода
        if (city) { // Проверяем, что поле не пустое
            loadWeather(city); // Загружаем погоду для введенного города
        }
    });

    // Обработчик нажатия Enter в поле ввода
    cityInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { // Проверяем нажатие Enter
            const city = cityInput.value.trim();
            if (city) {
                loadWeather(city);
            }
        }
    });

    /**
     * Основная функция загрузки и отображения погоды
     * @param {string} city - Название города
     */
    function loadWeather(city) {
        fetchYandexWeather(city)
            .then(data => {
                // Обновляем все части интерфейса
                updateCurrentWeather(data);
                updateDailyForecast(data.forecasts);
                updateTemperatureChart(data.forecasts);
            })
            .catch(error => {
                console.error('Yandex Weather Error:', error);
                alert('Ошибка: ' + error.message);
            });
    }

    /**
     * Получение данных о погоде с Яндекс.Погоды API
     * @param {string} city - Название города
     * @returns {Promise} - Обещание с данными о погоде
     */
    async function fetchYandexWeather(city) {
        try {
            // 1. Получаем координаты города через Яндекс.Геокодер
            const geocodeUrl = `https://geocode-maps.yandex.ru/1.x/?format=json&apikey=${YANDEX_API_KEY}&geocode=${encodeURIComponent(city)}`;
            
            const geoResponse = await fetch(geocodeUrl);
            if (!geoResponse.ok) throw new Error('Город не найден');
            
            const geoData = await geoResponse.json();
            
            // Проверяем, что есть результаты геокодирования
            if (!geoData.response.GeoObjectCollection.featureMember.length) {
                throw new Error('Город не найден');
            }
            
            // Извлекаем координаты (долгота и широта)
            const pos = geoData.response.GeoObjectCollection.featureMember[0]
                       .GeoObject.Point.pos.split(' ');
            const [lon, lat] = pos; // Яндекс возвращает в порядке "долгота широта"

            // 2. Запрашиваем погоду по координатам
            const weatherUrl = `https://api.weather.yandex.ru/v2/forecast?lat=${lat}&lon=${lon}&lang=ru_RU&limit=5`;
            
            const weatherResponse = await fetch(weatherUrl, {
                headers: { 'X-Yandex-API-Key': YANDEX_API_KEY }
            });
            
            if (!weatherResponse.ok) throw new Error('Ошибка получения данных о погоде');
            return await weatherResponse.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw new Error('Не удалось получить данные о погоде');
        }
    }

    /**
     * Обновление блока текущей погоды
     * @param {Object} data - Данные о текущей погоде от Яндекс.Погоды
     */
    function updateCurrentWeather(data) {
        const fact = data.fact; // Текущие погодные данные
        
        // Форматируем дату для отображения
        const formattedDate = new Date().toLocaleDateString('ru-RU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Получаем URL иконки погоды от Яндекса
        const weatherIconUrl = `https://yastatic.net/weather/i/icons/blueye/color/svg/${fact.condition}.svg`;
        
        // Генерируем HTML для блока текущей погоды
        currentWeatherElement.innerHTML = `
            <h2>${cityInput.value || 'Москва'}</h2> <!-- Название города -->
            <div>${formattedDate}</div> <!-- Форматированная дата -->
            <img src="${weatherIconUrl}" alt="${getYandexCondition(fact.condition)}" class="weather-icon">
            <div class="current-temp">${fact.temp}°C</div> <!-- Температура -->
            <div class="current-description">${getYandexCondition(fact.condition)}</div> <!-- Описание -->
            <div class="current-details">
                <div class="detail-item">
                    <span class="detail-value">${fact.feels_like}°C</span>
                    <span class="detail-label">Ощущается</span>
                </div>
                <div class="detail-item">
                    <span class="detail-value">${fact.humidity}%</span>
                    <span class="detail-label">Влажность</span>
                </div>
                <div class="detail-item">
                    <span class="detail-value">${fact.wind_speed} м/с</span>
                    <span class="detail-label">Ветер</span>
                </div>
                <div class="detail-item">
                    <span class="detail-value">${fact.pressure_mm} мм рт.ст.</span>
                    <span class="detail-label">Давление</span>
                </div>
            </div>
        `;
    }

    /**
     * Преобразует коды погодных условий Яндекса в читаемый текст
     * @param {string} condition - Код погодного условия
     * @returns {string} - Описание на русском
     */
    function getYandexCondition(condition) {
        const conditions = {
            'clear': 'ясно',
            'partly-cloudy': 'малооблачно',
            'cloudy': 'облачно',
            'overcast': 'пасмурно',
            'drizzle': 'морось',
            'light-rain': 'небольшой дождь',
            'rain': 'дождь',
            'moderate-rain': 'умеренный дождь',
            'heavy-rain': 'сильный дождь',
            'continuous-heavy-rain': 'длительный сильный дождь',
            'showers': 'ливень',
            'wet-snow': 'дождь со снегом',
            'light-snow': 'небольшой снег',
            'snow': 'снег',
            'snow-showers': 'снегопад',
            'hail': 'град',
            'thunderstorm': 'гроза',
            'thunderstorm-with-rain': 'дождь с грозой',
            'thunderstorm-with-hail': 'гроза с градом'
        };
        return conditions[condition] || condition;
    }

    /**
     * Обновление блока с прогнозом на 5 дней
     * @param {Array} forecasts - Массив с данными прогноза
     */
    function updateDailyForecast(forecasts) {
        dailyForecastElement.innerHTML = ''; // Очищаем контейнер
        
        // Для каждого дня создаем карточку (максимум 5 дней)
        forecasts.slice(0, 5).forEach(day => {
            // Форматируем дату дня
            const date = new Date(day.date);
            const formattedDate = date.toLocaleDateString('ru-RU', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short' 
            });
            
            // Получаем URL иконки погоды для дневного времени
            const weatherIconUrl = `https://yastatic.net/weather/i/icons/blueye/color/svg/${day.parts.day.condition}.svg`;
            
            // Создаем элемент карточки
            const card = document.createElement('div');
            card.className = 'weather-card';
            card.innerHTML = `
                <div class="date">${formattedDate}</div> <!-- Дата -->
                <img src="${weatherIconUrl}" alt="${getYandexCondition(day.parts.day.condition)}" class="weather-icon">
                <div class="current-description">${getYandexCondition(day.parts.day.condition)}</div> <!-- Описание -->
                <div>
                    <span class="temp-day">${day.parts.day.temp_avg}°</span> / <!-- Дневная температура -->
                    <span class="temp-night">${day.parts.night.temp_avg}°</span> <!-- Ночная температура -->
                </div>
                <div style="margin-top: 10px;">
                    <span>💧 ${day.parts.day.humidity}%</span> | <!-- Влажность -->
                    <span>🌬️ ${day.parts.day.wind_speed} м/с</span> <!-- Скорость ветра -->
                </div>
            `;
            
            // Добавляем карточку в контейнер
            dailyForecastElement.appendChild(card);
        });
    }

    /**
     * Обновление графика температур
     * @param {Array} forecasts - Массив с данными прогноза
     */
    function updateTemperatureChart(forecasts) {
        // Подготавливаем подписи для оси X (дни недели)
        const labels = forecasts.slice(0, 5).map(day => {
            const date = new Date(day.date);
            return date.toLocaleDateString('ru-RU', { weekday: 'short' });
        });
        
        // Получаем данные для графика
        const dayTemps = forecasts.slice(0, 5).map(day => day.parts.day.temp_avg); // Дневные температуры
        const nightTemps = forecasts.slice(0, 5).map(day => day.parts.night.temp_avg); // Ночные температуры
        
        // Если график уже существует - уничтожаем его
        if (temperatureChart) {
            temperatureChart.destroy();
        }
        
        // Создаем новый график
        temperatureChart = new Chart(temperatureChartCtx, {
            type: 'line', // Тип графика - линейный
            data: {
                labels: labels, // Подписи оси X
                datasets: [
                    { // Дневные температуры
                        label: 'Дневная температура',
                        data: dayTemps,
                        borderColor: '#e74c3c', // Красная линия
                        backgroundColor: 'rgba(231, 76, 60, 0.1)', // Светло-красная заливка
                        tension: 0.3, // Сглаживание линий
                        fill: true // Включить заливку под линией
                    },
                    { // Ночные температуры
                        label: 'Ночная температура',
                        data: nightTemps,
                        borderColor: '#3498db', // Синяя линия
                        backgroundColor: 'rgba(52, 152, 219, 0.1)', // Светло-синяя заливка
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true, // Адаптивность
                plugins: {
                    title: { // Заголовок графика
                        display: true,
                        text: 'Температура днем и ночью (°C)',
                        font: {
                            size: 16
                        }
                    },
                    legend: { // Легенда
                        position: 'top',
                    }
                },
                scales: {
                    y: { // Настройки оси Y
                        beginAtZero: false // Не начинать с нуля
                    }
                }
            }
        });
    }
});

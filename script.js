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
    loadWeather('Moscow');

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
        fetchWeatherData(city)
            .then(data => {
                // Обновляем все части интерфейса
                updateCurrentWeather(data.current);
                updateDailyForecast(data.daily);
                updateTemperatureChart(data.daily);
            })
            .catch(error => {
                console.error('Error fetching weather data:', error);
                alert('Не удалось получить данные о погоде. Проверьте название города и попробуйте снова.');
            });
    }

    /**
     * Получение данных о погоде с API OpenWeatherMap
     * @param {string} city - Название города
     * @returns {Promise} - Обещание с данными о погоде
     */
    function fetchWeatherData(city) {
        // Первый запрос - получаем текущую погоду и координаты города
        return fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=ru`)
            .then(response => {
                if (!response.ok) { // Если ответ не успешный
                    throw new Error('City not found'); // Генерируем ошибку
                }
                return response.json(); // Парсим JSON ответа
            })
            .then(currentData => {
                // Извлекаем координаты из ответа
                const lat = currentData.coord.lat;
                const lon = currentData.coord.lon;
                
                // Второй запрос - получаем прогноз по координатам
                return fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&appid=${API_KEY}&units=metric&lang=ru`)
                    .then(response => response.json())
                    .then(forecastData => {
                        // Объединяем данные текущей погоды и прогноза
                        return {
                            current: {
                                ...currentData, // Основные данные о городе
                                ...forecastData.current // Текущие погодные данные
                            },
                            daily: forecastData.daily.slice(0, 5) // Берем только 5 дней прогноза
                        };
                    });
            });
    }

    /**
     * Обновление блока текущей погоды
     * @param {Object} data - Данные о текущей погоде
     */
    function updateCurrentWeather(data) {
        // Форматируем дату для отображения
        const date = new Date(data.dt * 1000); // Конвертируем timestamp в дату
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = date.toLocaleDateString('ru-RU', options);
        
        // Получаем URL иконки погоды
        const weatherIconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        
        // Генерируем HTML для блока текущей погоды
        currentWeatherElement.innerHTML = `
            <h2>${data.name}</h2> <!-- Название города -->
            <div>${formattedDate}</div> <!-- Форматированная дата -->
            <img src="${weatherIconUrl}" alt="${data.weather[0].description}" class="weather-icon">
            <div class="current-temp">${Math.round(data.temp)}°C</div> <!-- Температура -->
            <div class="current-description">${data.weather[0].description}</div> <!-- Описание -->
            <div class="current-details">
                <div class="detail-item">
                    <span class="detail-value">${Math.round(data.feels_like)}°C</span>
                    <span class="detail-label">Ощущается</span>
                </div>
                <div class="detail-item">
                    <span class="detail-value">${data.humidity}%</span>
                    <span class="detail-label">Влажность</span>
                </div>
                <div class="detail-item">
                    <span class="detail-value">${Math.round(data.wind_speed)} м/с</span>
                    <span class="detail-label">Ветер</span>
                </div>
                <div class="detail-item">
                    <span class="detail-value">${data.pressure} hPa</span>
                    <span class="detail-label">Давление</span>
                </div>
            </div>
        `;
    }

    /**
     * Обновление блока с прогнозом на 5 дней
     * @param {Array} dailyData - Массив с данными прогноза
     */
    function updateDailyForecast(dailyData) {
        dailyForecastElement.innerHTML = ''; // Очищаем контейнер
        
        // Для каждого дня создаем карточку
        dailyData.forEach(day => {
            // Форматируем дату дня
            const date = new Date(day.dt * 1000);
            const options = { weekday: 'short', day: 'numeric', month: 'short' };
            const formattedDate = date.toLocaleDateString('ru-RU', options);
            
            // Получаем URL иконки погоды
            const weatherIconUrl = `https://openweathermap.org/img/wn/${day.weather[0].icon}.png`;
            
            // Создаем элемент карточки
            const card = document.createElement('div');
            card.className = 'weather-card';
            card.innerHTML = `
                <div class="date">${formattedDate}</div> <!-- Дата -->
                <img src="${weatherIconUrl}" alt="${day.weather[0].description}" class="weather-icon">
                <div class="current-description">${day.weather[0].description}</div> <!-- Описание -->
                <div>
                    <span class="temp-day">${Math.round(day.temp.day)}°</span> / <!-- Дневная температура -->
                    <span class="temp-night">${Math.round(day.temp.night)}°</span> <!-- Ночная температура -->
                </div>
                <div style="margin-top: 10px;">
                    <span>💧 ${day.humidity}%</span> | <!-- Влажность -->
                    <span>🌬️ ${Math.round(day.wind_speed)} м/с</span> <!-- Скорость ветра -->
                </div>
            `;
            
            // Добавляем карточку в контейнер
            dailyForecastElement.appendChild(card);
        });
    }

    /**
     * Обновление графика температур
     * @param {Array} dailyData - Массив с данными прогноза
     */
    function updateTemperatureChart(dailyData) {
        // Подготавливаем подписи для оси X (дни недели)
        const labels = dailyData.map(day => {
            const date = new Date(day.dt * 1000);
            return date.toLocaleDateString('ru-RU', { weekday: 'short' });
        });
        
        // Получаем данные для графика
        const dayTemps = dailyData.map(day => Math.round(day.temp.day)); // Дневные температуры
        const nightTemps = dailyData.map(day => Math.round(day.temp.night)); // Ночные температуры
        
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

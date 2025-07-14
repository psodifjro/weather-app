document.addEventListener('DOMContentLoaded', function() {
    // Проверка наличия API ключа
    if (typeof YANDEX_API_KEY === 'undefined') {
        alert('API ключ Яндекс.Погоды не настроен. Создайте config.js на основе config.js.template');
        return;
    }

    // Элементы DOM
    const cityInput = document.getElementById('city-input');
    const searchBtn = document.getElementById('search-btn');
    const currentWeatherDiv = document.getElementById('current-weather');
    const forecastContainer = document.getElementById('forecast-container');
    const temperatureChartCtx = document.getElementById('temperature-chart').getContext('2d');
    
    // Переменные состояния
    let temperatureChart = null;
    let currentCity = 'Москва';
    let currentCoords = { lat: 55.7558, lon: 37.6173 }; // Координаты Москвы по умолчанию

    // Получение координат города (упрощенная версия)
    async function fetchCoords(city) {
        const cities = {
            'москва': { lat: 55.7558, lon: 37.6173 },
            'санкт-петербург': { lat: 59.9343, lon: 30.3351 },
            'новосибирск': { lat: 55.0084, lon: 82.9357 },
            'казань': { lat: 55.7963, lon: 49.1088 },
            'екатеринбург': { lat: 56.8389, lon: 60.6057 }
        };
        return cities[city.toLowerCase()] || currentCoords;
    }

    // Загрузка данных о погоде
    async function fetchWeather(city) {
        try {
            currentCoords = await fetchCoords(city);
            currentCity = city;
            
            const response = await fetch(
                `${YANDEX_API_URL}?lat=${currentCoords.lat}&lon=${currentCoords.lon}&limit=5&lang=ru_RU&hours=false&extra=false`,
                {
                    headers: { 'X-Yandex-API-Key': YANDEX_API_KEY }
                }
            );

            if (!response.ok) {
                throw new Error(`Ошибка API: ${response.status}`);
            }

            const data = await response.json();
            console.log('Данные от API:', data); // Для отладки
            
            displayCurrentWeather(data);
            displayForecast(data);
            createTemperatureChart(data);
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            alert(`Ошибка: ${error.message}. Проверьте название города и API ключ.`);
        }
    }

    // Отображение текущей погоды
    function displayCurrentWeather(data) {
        const fact = data.fact;
        currentWeatherDiv.innerHTML = `
            <div class="main-info">
                <div class="temp">${fact.temp}°C</div>
                <div class="details">
                    <div class="condition">${getConditionText(fact.condition)}</div>
                    <div class="location">${currentCity}</div>
                </div>
                <img src="https://yastatic.net/weather/i/icons/funky/dark/${fact.icon}.svg" 
                     alt="${fact.condition}" class="weather-icon">
            </div>
            <div class="extra-info">
                <div>Ощущается как: ${fact.feels_like}°C</div>
                <div>Влажность: ${fact.humidity}%</div>
                <div>Ветер: ${fact.wind_speed} м/с</div>
            </div>
        `;
    }

    // Отображение прогноза на 5 дней
    function displayForecast(data) {
        forecastContainer.innerHTML = '';
        
        data.forecasts.slice(0, 5).forEach(day => {
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString('ru-RU', { weekday: 'long' });
            const shortDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            
            const dayElement = document.createElement('div');
            dayElement.className = 'forecast-day';
            dayElement.innerHTML = `
                <div class="day-name">${capitalizeFirstLetter(dayName)}</div>
                <div class="day-date">${shortDate}</div>
                <img src="https://yastatic.net/weather/i/icons/funky/dark/${day.parts.day_short.icon}.svg" 
                     alt="${day.parts.day_short.condition}">
                <div class="day-condition">${getConditionText(day.parts.day_short.condition)}</div>
                <div class="day-temp">
                    <span class="temp-day">Днём: ${day.parts.day_short.temp}°C</span>
                    <span class="temp-night">Ночью: ${day.parts.night_short.temp}°C</span>
                </div>
            `;
            
            forecastContainer.appendChild(dayElement);
        });
    }

    // Создание графика температур
    function createTemperatureChart(data) {
        const days = data.forecasts.slice(0, 5);
        const labels = days.map(day => {
            const date = new Date(day.date);
            return date.toLocaleDateString('ru-RU', { weekday: 'short' });
        });
        
        const dayTemps = days.map(day => day.parts.day_short.temp);
        const nightTemps = days.map(day => day.parts.night_short.temp);

        // Уничтожаем старый график если существует
        if (temperatureChart) {
            temperatureChart.destroy();
        }

        temperatureChart = new Chart(temperatureChartCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Дневная температура (°C)',
                        data: dayTemps,
                        borderColor: 'rgba(231, 76, 60, 1)',
                        backgroundColor: 'rgba(231, 76, 60, 0.2)',
                        borderWidth: 2,
                        tension: 0.3
                    },
                    {
                        label: 'Ночная температура (°C)',
                        data: nightTemps,
                        borderColor: 'rgba(52, 152, 219, 1)',
                        backgroundColor: 'rgba(52, 152, 219, 0.2)',
                        borderWidth: 2,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Прогноз температуры на 5 дней',
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Температура (°C)'
                        }
                    }
                }
            }
        });
    }

    // Преобразование кодов погоды в текст
    function getConditionText(condition) {
        const conditions = {
            'clear': 'Ясно',
            'partly-cloudy': 'Переменная облачность',
            'cloudy': 'Облачно',
            'overcast': 'Пасмурно',
            'partly-cloudy-and-light-rain': 'Небольшой дождь',
            'light-rain': 'Небольшой дождь',
            'rain': 'Дождь',
            'heavy-rain': 'Сильный дождь',
            'showers': 'Ливень',
            'wet-snow': 'Мокрый снег',
            'light-snow': 'Небольшой снег',
            'snow': 'Снег',
            'snow-showers': 'Снегопад'
        };
        return conditions[condition] || condition;
    }

    // Вспомогательная функция
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Обработчики событий
    searchBtn.addEventListener('click', () => {
        const city = cityInput.value.trim();
        if (city) {
            fetchWeather(city);
        }
    });

    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = cityInput.value.trim();
            if (city) {
                fetchWeather(city);
            }
        }
    });

    // Инициализация
    fetchWeather(currentCity);
});

document.addEventListener('DOMContentLoaded', function() {
    if (typeof YANDEX_API_KEY === 'undefined') {
        alert('API ключ не настроен. Создайте config.js на основе config.js.template');
        return;
    }

    const cityInput = document.getElementById('city-input');
    const searchBtn = document.getElementById('search-btn');
    const currentWeatherDiv = document.getElementById('current-weather');
    const forecastContainer = document.getElementById('forecast-container');
    const temperatureChartCtx = document.getElementById('temperature-chart').getContext('2d');
    
    let temperatureChart = null;
    let currentCity = 'Москва';

    // Координаты по умолчанию (Москва)
    let currentCoords = { lat: 55.7558, lon: 37.6173 };

    async function fetchCoords(city) {
        // Для упрощения используем статические координаты
        // В реальном проекте подключите API геокодирования (Яндекс.Геокодер)
        const cities = {
            'москва': { lat: 55.7558, lon: 37.6173 },
            'санкт-петербург': { lat: 59.9343, lon: 30.3351 },
            'новосибирск': { lat: 55.0084, lon: 82.9357 }
        };
        return cities[city.toLowerCase()] || currentCoords;
    }

    async function fetchWeather(city) {
        try {
            currentCoords = await fetchCoords(city);
            const response = await fetch(`${YANDEX_API_URL}?lat=${currentCoords.lat}&lon=${currentCoords.lon}&limit=5`, {
                headers: { 'X-Yandex-API-Key': YANDEX_API_KEY }
            });
            const data = await response.json();
            
            displayCurrentWeather(data);
            displayForecast(data);
            createTemperatureChart(data);
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка загрузки данных. Проверьте город и API ключ.');
        }
    }

    function displayCurrentWeather(data) {
        const fact = data.fact;
        currentWeatherDiv.innerHTML = `
            <div class="main-info">
                <div class="temp">${fact.temp}°C</div>
                <div class="details">
                    <div class="condition">${getConditionText(fact.condition)}</div>
                    <div class="location">${currentCity}</div>
                </div>
            </div>
            <div class="extra-info">
                <div>Влажность: ${fact.humidity}%</div>
                <div>Ветер: ${fact.wind_speed} м/с</div>
                <div>Ощущается как: ${fact.feels_like}°C</div>
            </div>
        `;
    }

    function displayForecast(data) {
        forecastContainer.innerHTML = '';
        data.forecasts.slice(0, 5).forEach(day => {
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString('ru-RU', { weekday: 'long' });
            
            const dayElement = document.createElement('div');
            dayElement.className = 'forecast-day';
            dayElement.innerHTML = `
                <div class="day-name">${capitalizeFirstLetter(dayName)}</div>
                <div class="day-date">${day.date}</div>
                <div class="day-condition">${getConditionText(day.parts.day.condition)}</div>
                <div class="day-temp">
                    <span class="temp-day">Днём: ${day.parts.day.temp_avg}°C</span>
                    <span class="temp-night">Ночью: ${day.parts.night.temp_avg}°C</span>
                </div>
            `;
            forecastContainer.appendChild(dayElement);
        });
    }

    function createTemperatureChart(data) {
        const days = data.forecasts.slice(0, 5);
        const labels = days.map(day => new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' }));
        const dayTemps = days.map(day => day.parts.day.temp_avg);
        const nightTemps = days.map(day => day.parts.night.temp_avg);

        if (temperatureChart) {
            temperatureChart.data.labels = labels;
            temperatureChart.data.datasets[0].data = dayTemps;
            temperatureChart.data.datasets[1].data = nightTemps;
            temperatureChart.update();
            return;
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
                        tension: 0.3
                    },
                    {
                        label: 'Ночная температура (°C)',
                        data: nightTemps,
                        borderColor: 'rgba(52, 152, 219, 1)',
                        backgroundColor: 'rgba(52, 152, 219, 0.2)',
                        tension: 0.3
                    }
                ]
            },
            options: { /* ... (как в предыдущей версии) ... */ }
        });
    }

    // Вспомогательные функции
    function getConditionText(condition) {
        const conditions = {
            'clear': 'Ясно',
            'partly-cloudy': 'Переменная облачность',
            'cloudy': 'Пасмурно',
            'rain': 'Дождь'
        };
        return conditions[condition] || condition;
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Инициализация
    searchBtn.addEventListener('click', () => {
        const city = cityInput.value.trim();
        if (city) {
            currentCity = city;
            fetchWeather(city);
        }
    });

    fetchWeather(currentCity);
});

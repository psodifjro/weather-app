document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, что конфиг загружен
    if (typeof WEATHER_API_KEY === 'undefined') {
        alert('Ошибка: API ключ не настроен. Пожалуйста, создайте файл config.js на основе config.js.template');
        return;
    }

    const cityInput = document.getElementById('city-input');
    const searchBtn = document.getElementById('search-btn');
    const currentWeatherDiv = document.getElementById('current-weather');
    const forecastContainer = document.getElementById('forecast-container');
    const temperatureChartCtx = document.getElementById('temperature-chart').getContext('2d');
    
    let temperatureChart = null;
    let currentCity = 'Москва'; // Город по умолчанию

    // Инициализация приложения
    function init() {
        fetchWeather(currentCity);
        
        // Обработчик кнопки поиска
        searchBtn.addEventListener('click', function() {
            const city = cityInput.value.trim();
            if (city) {
                currentCity = city;
                fetchWeather(city);
            }
        });
        
        // Обработчик нажатия Enter в поле ввода
        cityInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const city = cityInput.value.trim();
                if (city) {
                    currentCity = city;
                    fetchWeather(city);
                }
            }
        });
    }

    // Загрузка данных о погоде
    async function fetchWeather(city) {
        try {
            // Загрузка текущей погоды
            const currentResponse = await fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${city}&lang=ru`);
            const currentData = await currentResponse.json();
            
            // Загрузка прогноза на 5 дней
            const forecastResponse = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${city}&days=5&lang=ru`);
            const forecastData = await forecastResponse.json();
            
            // Отображение данных
            displayCurrentWeather(currentData);
            displayForecast(forecastData);
            createTemperatureChart(forecastData);
        } catch (error) {
            console.error('Ошибка при загрузке данных о погоде:', error);
            alert('Не удалось загрузить данные о погоде. Проверьте название города и попробуйте снова.');
        }
    }

    // Отображение текущей погоды
    function displayCurrentWeather(data) {
        const current = data.current;
        const location = data.location;
        
        currentWeatherDiv.innerHTML = `
            <div class="main-info">
                <div class="temp">${Math.round(current.temp_c)}°C</div>
                <div class="details">
                    <div class="condition">${current.condition.text}</div>
                    <div class="location">${location.name}, ${location.country}</div>
                </div>
            </div>
            <div class="extra-info">
                <div>Влажность: ${current.humidity}%</div>
                <div>Ветер: ${current.wind_kph} км/ч</div>
                <div>Ощущается как: ${Math.round(current.feelslike_c)}°C</div>
            </div>
            <img src="${current.condition.icon}" alt="${current.condition.text}" class="weather-icon">
        `;
    }

    // Отображение прогноза на 5 дней
    function displayForecast(data) {
        const forecastDays = data.forecast.forecastday;
        
        forecastContainer.innerHTML = '';
        
        forecastDays.forEach(day => {
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString('ru-RU', { weekday: 'long' });
            const formattedDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
            
            const dayElement = document.createElement('div');
            dayElement.className = 'forecast-day';
            dayElement.innerHTML = `
                <div class="day-name">${capitalizeFirstLetter(dayName)}</div>
                <div class="day-date">${formattedDate}</div>
                <img src="${day.day.condition.icon}" alt="${day.day.condition.text}">
                <div class="day-condition">${day.day.condition.text}</div>
                <div class="day-temp">
                    <span class="temp-day">Днём: ${Math.round(day.day.maxtemp_c)}°C</span>
                    <span class="temp-night">Ночью: ${Math.round(day.day.mintemp_c)}°C</span>
                </div>
            `;
            
            forecastContainer.appendChild(dayElement);
        });
    }

    // Создание графика температур
    function createTemperatureChart(data) {
        const forecastDays = data.forecast.forecastday;
        
        const labels = forecastDays.map(day => {
            const date = new Date(day.date);
            return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
        });
        
        const dayTemps = forecastDays.map(day => Math.round(day.day.maxtemp_c));
        const nightTemps = forecastDays.map(day => Math.round(day.day.mintemp_c));
        
        // Если график уже существует, обновляем его данные
        if (temperatureChart) {
            temperatureChart.data.labels = labels;
            temperatureChart.data.datasets[0].data = dayTemps;
            temperatureChart.data.datasets[1].data = nightTemps;
            temperatureChart.update();
            return;
        }
        
        // Создаем новый график
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
                        tension: 0.3,
                        fill: false
                    },
                    {
                        label: 'Ночная температура (°C)',
                        data: nightTemps,
                        borderColor: 'rgba(52, 152, 219, 1)',
                        backgroundColor: 'rgba(52, 152, 219, 0.2)',
                        tension: 0.3,
                        fill: false
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

    // Вспомогательная функция для капитализации первой буквы строки
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Запуск приложения
    init();
});

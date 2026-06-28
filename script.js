// ===== Modal: about.sh =====
const bioBtn = document.getElementById('bioBtn');
const bioModal = document.getElementById('bioModal');
const closeBio = document.getElementById('closeBio');

// Open
bioBtn.addEventListener('click', (e) => {
	e.preventDefault();
	bioModal.classList.add('open');
	document.body.style.overflow = 'hidden';
});

// Close by ×
closeBio.addEventListener('click', () => {
	closeModal();
});

// Close by backdrop click
bioModal.addEventListener('click', (e) => {
	if (e.target === bioModal) closeModal();
});

// Close by Escape
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && bioModal.classList.contains('open')) {
		closeModal();
	}
});

function closeModal() {
	bioModal.classList.remove('open');
	document.body.style.overflow = '';
}

// ===== 🌤 Weather Radar Station =====

const FALLBACK = { lat: 41.01, lon: 28.98, city: 'istanbul' };

let currentCoords = null; // сохраняем координаты для перезапроса

// WMO Weather Code → emoji + label
const WMO_MAP = {
	0:  ['☀️', 'Clear Sky'],
	1:  ['🌤', 'Mainly Clear'],
	2:  ['⛅', 'Partly Cloudy'],
	3:  ['☁️', 'Overcast'],
	45: ['🌫', 'Foggy'],
	48: ['🌫', 'Deposit Fog'],
	51: ['🌦', 'Light Drizzle'],
	53: ['🌦', 'Moderate Drizzle'],
	55: ['🌧', 'Drizzle'],
	56: ['🌧', 'Freezing Drizzle'],
	57: ['🌧', 'Freezing Drizzle'],
	61: ['🌧', 'Light Rain'],
	63: ['🌧', 'Moderate Rain'],
	65: ['🌧', 'Heavy Rain'],
	66: ['🌧', 'Freezing Rain'],
	67: ['🌧', 'Freezing Rain'],
	71: ['❄️', 'Light Snow'],
	73: ['❄️', 'Moderate Snow'],
	75: ['❄️', 'Heavy Snow'],
	77: ['❄️', 'Snow Grains'],
	80: ['🌦', 'Light Showers'],
	81: ['🌧', 'Moderate Showers'],
	82: ['🌧', 'Heavy Showers'],
	85: ['❄️', 'Light Snow Showers'],
	86: ['❄️', 'Heavy Snow Showers'],
	95: ['⛈', 'Thunderstorm'],
	96: ['⛈', 'Thunderstorm + Hail'],
	99: ['⛈', 'Thunderstorm + Heavy Hail'],
};

function weatherKind(code) {
	if (code === 0 || code === 1) return 'clear-day';
	if (code === 2 || code === 3) return 'cloudy';
	if (code >= 45 && code <= 57) return 'cloudy';
	if (code >= 61 && code <= 67) return 'rainy';
	if (code >= 71 && code <= 86) return 'snowy';
	if (code >= 95) return 'stormy';
	return 'cloudy';
}

function tempClass(celsius) {
	if (celsius <= 5) return 'temp-cold';
	if (celsius <= 15) return 'temp-cool';
	if (celsius <= 28) return 'temp-warm';
	return 'temp-hot';
}

function formatTime() {
	const now = new Date();
	const h = String(now.getHours()).padStart(2, '0');
	const m = String(now.getMinutes()).padStart(2, '0');
	return `${h}:${m}`;
}

/** Конвертируем код страны (tr, ru, us) в эмодзи флага */
function getFlagEmoji(code) {
	if (!code || code.length !== 2) return '🌍';
	const cp = code.toUpperCase().split('').map(c => 127397 + c.charCodeAt());
	return String.fromCodePoint(...cp);
}

/** Обновляем футер — флаг + город посетителя */
function setVisitorLocation(city, countryCode) {
	const el = document.getElementById('visitorLocation');
	if (!el) return;
	const flag = getFlagEmoji(countryCode);
	const label = city
		? `${flag} ${city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()}`
		: `${flag} detected`;
	el.innerHTML = `visitor: <span>${label}</span>`;
}

/** Определяем город по координатам (обратное геокодирование) */
async function reverseGeocode(lat, lon) {
	try {
		const res = await fetch(
			`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=ru`,
			{ headers: { 'User-Agent': 'jonyck-linktree/1.0' } }
		);
		if (!res.ok) return null;
		const data = await res.json();
		return {
			city: data.address?.city || data.address?.town || data.address?.village || data.address?.county || null,
			countryCode: data.address?.country_code || null,
		};
	} catch {
		return null;
	}
}

/** Определяем координаты посетителя через браузерную геолокацию */
function detectLocation() {
	return new Promise((resolve) => {
		if (!navigator.geolocation) {
			resolve(null);
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
			() => resolve(null),
			{ timeout: 6000, enableHighAccuracy: false }
		);
	});
}

// DOM элементы (кешируем один раз)
let weatherEls = null;

function getEls() {
	if (weatherEls) return weatherEls;
	weatherEls = {
		radar: document.getElementById('weatherRadar'),
		icon: document.getElementById('weatherIcon'),
		tempDigits: document.querySelector('.temp-digits'),
		tempWrap: document.querySelector('.weather-temp'),
		cond: document.getElementById('conditionText'),
		humVal: document.getElementById('humidityVal'),
		humFill: document.getElementById('humidityFill'),
		windVal: document.getElementById('windVal'),
		windFill: document.getElementById('windFill'),
		feelsVal: document.getElementById('feelsVal'),
		feelsFill: document.getElementById('feelsFill'),
		time: document.getElementById('updateTime'),
		status: document.getElementById('updateStatus'),
		title: document.querySelector('.weather-title'),
		panel: document.getElementById('weatherPanel'),
	};
	return weatherEls;
}

async function fetchWeather(lat, lon) {
	const $ = getEls();
	const api = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;

	try {
		const res = await fetch(api);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();

		const temp = Math.round(data.current.temperature_2m);
		const feels = Math.round(data.current.apparent_temperature);
		const humidity = data.current.relative_humidity_2m;
		const wind = Math.round(data.current.wind_speed_10m);
		const code = data.current.weather_code;

		const [emoji, label] = WMO_MAP[code] || ['🌍', 'Unknown'];

		$.tempDigits.textContent = `${temp}°`;
		$.tempWrap.className = `weather-temp ${tempClass(temp)}`;

		$.icon.textContent = emoji;
		$.radar.className = `weather-radar ${weatherKind(code)}`;

		$.cond.textContent = label;

		$.humVal.textContent = `${humidity}%`;
		$.humFill.style.width = `${Math.min(humidity, 100)}%`;

		$.windVal.textContent = `${wind} km/h`;
		$.windFill.style.width = `${Math.min(Math.round(wind / 2), 100)}%`;

		$.feelsVal.textContent = `${feels}°`;
		const feelsPct = Math.min(Math.max(Math.round((feels + 10) * 2), 5), 100);
		$.feelsFill.style.width = `${feelsPct}%`;

		$.time.textContent = formatTime();
		$.status.textContent = '◉ ONLINE';
		$.status.style.color = 'rgba(0, 255, 170, 0.6)';
		$.panel.classList.remove('error');

	} catch (err) {
		console.warn('Weather fetch failed:', err);
		$.icon.textContent = '⚠️';
		$.cond.textContent = 'SIGNAL LOST';
		$.status.textContent = '◌ OFFLINE';
		$.status.style.color = 'rgba(239, 83, 80, 0.6)';
		$.panel.classList.add('error');
	}
}

/** Главная функция инициализации */
async function initWeather() {
	const $ = getEls();

	// Показываем статус определения
	$.cond.textContent = 'DETECTING LOCATION…';

	// Пробуем получить местоположение
	const coords = await detectLocation();

	if (coords) {
		currentCoords = coords;
		// Пробуем определить город + страну
		const geo = await reverseGeocode(coords.lat, coords.lon);
		const displayCity = geo?.city
			? geo.city.toLowerCase()
			: `${coords.lat.toFixed(2)}, ${coords.lon.toFixed(2)}`;
		$.title.textContent = `weather.exe — ${displayCity}`;
		setVisitorLocation(geo?.city || displayCity, geo?.countryCode);
	} else {
		currentCoords = { lat: FALLBACK.lat, lon: FALLBACK.lon };
		$.title.textContent = `weather.exe — ${FALLBACK.city}`;
		$.cond.textContent = 'LOCATION UNAVAILABLE — FALLBACK';
		setVisitorLocation('Unknown', null);
	}

	// Делаем первый запрос погоды
	await fetchWeather(currentCoords.lat, currentCoords.lon);

	// Перезапрашиваем каждые 5 минут с теми же координатами
	setInterval(() => {
		fetchWeather(currentCoords.lat, currentCoords.lon);
	}, 5 * 60 * 1000);
}

// Запускаем
initWeather();

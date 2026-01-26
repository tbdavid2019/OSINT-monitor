<script lang="ts">
	import { onMount } from 'svelte';
	import { Panel } from '$lib/components/common';
	import { THREAT_COLORS } from '$lib/config/map';
	import type { CustomMonitor } from '$lib/types';
	import { newsLocations, type NewsLocation } from '$lib/stores/newsLocations';
	import { llmSettings } from '$lib/stores/llm';
	import { allNewsItems } from '$lib/stores/news';
	import { extractLocationsFromNews } from '$lib/services/llm';

	interface Props {
		monitors?: CustomMonitor[];
		loading?: boolean;
		error?: string | null;
	}

	let { monitors = [], loading = false, error = null }: Props = $props();

	let mapContainer: HTMLDivElement;
	// D3 objects - initialized in initMap, null before initialization
	// Using 'any' for D3 objects as they're dynamically imported and have complex generic types
	/* eslint-disable @typescript-eslint/no-explicit-any */
	let d3Module: typeof import('d3') | null = null;
	let svg: any = null;
	let mapGroup: any = null;
	let projection: any = null;
	let path: any = null;
	let zoom: any = null;
	/* eslint-enable @typescript-eslint/no-explicit-any */

	const WIDTH = 800;
	const HEIGHT = 400;

	// Tooltip state
	let tooltipContent = $state<{
		title: string;
		color: string;
		lines: string[];
	} | null>(null);
	let tooltipPosition = $state({ left: 0, top: 0 });
	let tooltipVisible = $state(false);

	const WEATHER_TTL_MS = 15 * 60 * 1000;
	const dataCache: Record<string, { data: WeatherResult; timestamp: number }> = {};

	interface WeatherResult {
		temp: number | null;
		wind: number | null;
		condition: string;
	}

	function getCachedData(key: string): WeatherResult | null {
		const entry = dataCache[key];
		if (!entry) return null;
		if (Date.now() - entry.timestamp > WEATHER_TTL_MS) {
			delete dataCache[key];
			return null;
		}
		return entry.data;
	}

	function setCachedData(key: string, data: WeatherResult): void {
		dataCache[key] = { data, timestamp: Date.now() };
	}

	function getLocalTime(lon: number): string {
		const now = new Date();
		const utcHours = now.getUTCHours();
		const utcMinutes = now.getUTCMinutes();
		const offsetHours = Math.round(lon / 15);
		let localHours = (utcHours + offsetHours + 24) % 24;
		const ampm = localHours >= 12 ? 'PM' : 'AM';
		localHours = localHours % 12 || 12;
		return `${localHours}:${utcMinutes.toString().padStart(2, '0')} ${ampm}`;
	}

	async function getWeather(lat: number, lon: number): Promise<WeatherResult | null> {
		const key = `weather_${lat}_${lon}`;
		const cached = getCachedData(key);
		if (cached) return cached;

		try {
			const res = await fetch(
				`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m`
			);
			const data = await res.json();
			const temp = data.current?.temperature_2m;
			const tempC = temp !== undefined ? Math.round(temp) : null;
			const wind = data.current?.wind_speed_10m;
			const code = data.current?.weather_code;
			const result: WeatherResult = {
				temp: tempC,
				wind: wind ? Math.round(wind) : null,
				condition:
					code === 0
						? '☀️ Clear'
						: code === 1
							? '🌤️ Mostly clear'
							: code === 2
								? '⛅ Partly cloudy'
								: code === 3
									? '☁️ Overcast'
									: code === 45 || code === 48
										? '🌫️ Fog'
										: code === 51 || code === 53 || code === 55
											? '🌧️ Drizzle'
											: code === 61 || code === 63 || code === 65
												? '🌧️ Rain'
												: code === 71 || code === 73 || code === 75 || code === 77
													? '🌨️ Snow'
													: code === 80 || code === 81 || code === 82
														? '🌧️ Showers'
														: code === 95 || code === 96 || code === 99
															? '⛈️ Thunderstorm'
															: '—'
			};
			setCachedData(key, result);
			return result;
		} catch {
			return null;
		}
	}

	// Enable zoom/pan behavior on the map
	function enableZoom(): void {
		if (!svg || !zoom) return;
		svg.call(zoom);
	}

	// Calculate day/night terminator points
	function calculateTerminator(): [number, number][] {
		const now = new Date();
		const dayOfYear = Math.floor(
			(now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
		);
		const declination = -23.45 * Math.cos(((360 / 365) * (dayOfYear + 10) * Math.PI) / 180);
		const hourAngle = (now.getUTCHours() + now.getUTCMinutes() / 60) * 15 - 180;

		const terminatorPoints: [number, number][] = [];
		for (let lat = -90; lat <= 90; lat += 2) {
			const tanDec = Math.tan((declination * Math.PI) / 180);
			const tanLat = Math.tan((lat * Math.PI) / 180);
			let lon = -hourAngle + (Math.acos(-tanDec * tanLat) * 180) / Math.PI;
			if (isNaN(lon)) lon = lat * declination > 0 ? -hourAngle + 180 : -hourAngle;
			terminatorPoints.push([lon, lat]);
		}
		for (let lat = 90; lat >= -90; lat -= 2) {
			const tanDec = Math.tan((declination * Math.PI) / 180);
			const tanLat = Math.tan((lat * Math.PI) / 180);
			let lon = -hourAngle - (Math.acos(-tanDec * tanLat) * 180) / Math.PI;
			if (isNaN(lon)) lon = lat * declination > 0 ? -hourAngle - 180 : -hourAngle;
			terminatorPoints.push([lon, lat]);
		}
		return terminatorPoints;
	}

	// Show tooltip using state (safe rendering)
	function showTooltip(
		event: MouseEvent,
		title: string,
		color: string,
		lines: string[] = []
	): void {
		if (!mapContainer) return;
		const rect = mapContainer.getBoundingClientRect();
		tooltipContent = { title, color, lines };
		tooltipPosition = {
			left: event.clientX - rect.left + 15,
			top: event.clientY - rect.top - 10
		};
		tooltipVisible = true;
	}

	// Move tooltip
	function moveTooltip(event: MouseEvent): void {
		if (!mapContainer) return;
		const rect = mapContainer.getBoundingClientRect();
		tooltipPosition = {
			left: event.clientX - rect.left + 15,
			top: event.clientY - rect.top - 10
		};
	}

	// Hide tooltip
	function hideTooltip(): void {
		tooltipVisible = false;
		tooltipContent = null;
	}

	async function showNewsTooltip(
		event: MouseEvent,
		loc: NewsLocation,
		color: string
	): Promise<void> {
		const localTime = getLocalTime(loc.lon);
		const lines = [`🕐 Local: ${localTime}`, ...loc.headlines.slice(0, 3)];
		showTooltip(event, `📰 ${loc.name} (${loc.newsCount} news)`, color, lines);

		const weather = await getWeather(loc.lat, loc.lon);
		if (weather && tooltipVisible) {
			tooltipContent = {
				title: `📰 ${loc.name} (${loc.newsCount} news)`,
				color,
				lines: [
					`🕐 Local: ${localTime}`,
					`${weather.condition} ${weather.temp}°C, ${weather.wind}mph`,
					...loc.headlines.slice(0, 3)
				]
			};
		}
	}

	// Initialize map
	async function initMap(): Promise<void> {
		const d3 = await import('d3');
		d3Module = d3;
		const topojson = await import('topojson-client');

		const svgEl = mapContainer.querySelector('svg');
		if (!svgEl) return;

		svg = d3.select(svgEl);
		svg.attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);

		mapGroup = svg.append('g').attr('id', 'mapGroup');

		// Setup zoom - disable scroll wheel, allow touch pinch and buttons
		zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([1, 6])
			.filter((event) => {
				// Block scroll wheel zoom (wheel events)
				if (event.type === 'wheel') return false;
				// Allow touch events (pinch zoom on mobile)
				if (event.type.startsWith('touch')) return true;
				// Allow mouse drag for panning
				if (event.type === 'mousedown' || event.type === 'mousemove') return true;
				// Block double-click zoom
				if (event.type === 'dblclick') return false;
				// Allow other events (programmatic zoom from buttons)
				return true;
			})
			.on('zoom', (event) => {
				mapGroup.attr('transform', event.transform.toString());
			});

		enableZoom();

		// Setup projection
		projection = d3
			.geoEquirectangular()
			.scale(130)
			.center([0, 20])
			.translate([WIDTH / 2, HEIGHT / 2 - 30]);

		path = d3.geoPath().projection(projection);

		// Load world data
		try {
			const response = await fetch(
				'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
			);
			const world = await response.json();
			const countries = topojson.feature(
				world,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				world.objects.countries as any
			) as unknown as GeoJSON.FeatureCollection;

			// Draw countries
			mapGroup
				.selectAll('path.country')
				.data(countries.features)
				.enter()
				.append('path')
				.attr('class', 'country')
				.attr('d', path as unknown as string)
				.attr('fill', '#0f3028')
				.attr('stroke', '#1a5040')
				.attr('stroke-width', 0.5);

			// Draw graticule
			const graticule = d3.geoGraticule().step([30, 30]);
			mapGroup
				.append('path')
				.datum(graticule)
				.attr('d', path as unknown as string)
				.attr('fill', 'none')
				.attr('stroke', '#1a3830')
				.attr('stroke-width', 0.3)
				.attr('stroke-dasharray', '2,2');

			// Draw day/night terminator
			const terminatorPoints = calculateTerminator();
			mapGroup
				.append('path')
				.datum({ type: 'Polygon', coordinates: [terminatorPoints] } as GeoJSON.Polygon)
				.attr('d', path as unknown as string)
				.attr('fill', 'rgba(0,0,0,0.3)')
				.attr('stroke', 'none');

			// Draw custom monitors with locations
			drawMonitors();
		} catch (err) {
			console.error('Failed to load map data:', err);
		}
	}

	// Draw custom monitor locations
	function drawMonitors(): void {
		if (!mapGroup || !projection) return;

		mapGroup.selectAll('.monitor-marker').remove();

		monitors
			.filter((m) => m.enabled && m.location)
			.forEach((m) => {
				if (!m.location) return;
				const [x, y] = projection([m.location.lon, m.location.lat]) || [0, 0];
				if (x && y) {
					const color = m.color || '#00ffff';
					mapGroup
						.append('circle')
						.attr('class', 'monitor-marker')
						.attr('cx', x)
						.attr('cy', y)
						.attr('r', 5)
						.attr('fill', color)
						.attr('fill-opacity', 0.6)
						.attr('stroke', color)
						.attr('stroke-width', 2);
					mapGroup
						.append('text')
						.attr('class', 'monitor-marker')
						.attr('x', x + 8)
						.attr('y', y + 3)
						.attr('fill', color)
						.attr('font-size', '8px')
						.attr('font-family', 'monospace')
						.text(m.name);
					mapGroup
						.append('circle')
						.attr('class', 'monitor-marker')
						.attr('cx', x)
						.attr('cy', y)
						.attr('r', 10)
						.attr('fill', 'transparent')
						.on('mouseenter', (event: MouseEvent) =>
							showTooltip(event, `📡 ${m.name}`, color, [
								m.location?.name || '',
								m.keywords.join(', ')
							])
						)
						.on('mousemove', moveTooltip)
						.on('mouseleave', hideTooltip);
				}
			});
	}

	function drawNewsLocations(locations: NewsLocation[]): void {
		if (!mapGroup || !projection) return;

		mapGroup.selectAll('.news-location-marker').remove();

		locations.forEach((loc) => {
			const [x, y] = projection([loc.lon, loc.lat]) || [0, 0];
			if (x && y) {
				const color = THREAT_COLORS[loc.level] || THREAT_COLORS.elevated;

				mapGroup
					.append('circle')
					.attr('class', 'news-location-marker pulse')
					.attr('cx', x)
					.attr('cy', y)
					.attr('r', 8)
					.attr('fill', color)
					.attr('fill-opacity', 0.4);

				mapGroup
					.append('circle')
					.attr('class', 'news-location-marker')
					.attr('cx', x)
					.attr('cy', y)
					.attr('r', 4)
					.attr('fill', color);

				mapGroup
					.append('text')
					.attr('class', 'news-location-marker')
					.attr('x', x + 10)
					.attr('y', y + 3)
					.attr('fill', color)
					.attr('font-size', '7px')
					.attr('font-family', 'monospace')
					.attr('font-weight', 'bold')
					.text(`📰 ${loc.name}`);

				mapGroup
					.append('circle')
					.attr('class', 'news-location-marker')
					.attr('cx', x)
					.attr('cy', y)
					.attr('r', 12)
					.attr('fill', 'transparent')
					.attr('class', 'hotspot-hit news-location-marker')
					.on('mouseenter', (event: MouseEvent) => showNewsTooltip(event, loc, color))
					.on('mousemove', moveTooltip)
					.on('mouseleave', hideTooltip);
			}
		});
	}

	async function handleExtractLocations(): Promise<void> {
		if (!$llmSettings.apiKey) return;

		const headlines = $allNewsItems.map((n) => n.title);
		if (headlines.length === 0) return;

		newsLocations.setLoading(true);
		try {
			const locations = await extractLocationsFromNews(
				$llmSettings.baseUrl,
				$llmSettings.apiKey,
				$llmSettings.model || 'gpt-4o-mini',
				headlines
			);
			newsLocations.setLocations(locations);
		} catch (e) {
			newsLocations.setError(String(e));
		}
	}

	function zoomIn(): void {
		if (!svg || !zoom) return;
		svg.transition().duration(300).call(zoom.scaleBy, 1.5);
	}

	function zoomOut(): void {
		if (!svg || !zoom) return;
		svg
			.transition()
			.duration(300)
			.call(zoom.scaleBy, 1 / 1.5);
	}

	function resetZoom(): void {
		if (!svg || !zoom || !d3Module) return;
		svg.transition().duration(300).call(zoom.transform, d3Module.zoomIdentity);
	}

	$effect(() => {
		const _monitorsRef = monitors;
		if (_monitorsRef && mapGroup && projection) {
			drawMonitors();
		}
	});

	$effect(() => {
		const locations = $newsLocations.locations;
		if (locations && mapGroup && projection) {
			drawNewsLocations(locations);
		}
	});

	$effect(() => {
		const hasKey = !!$llmSettings.apiKey;
		const headlines = $allNewsItems;
		const { loading: extracting, lastExtracted } = $newsLocations;
		if (!hasKey || extracting) return;
		if (headlines.length === 0) return;
		if (lastExtracted && Date.now() - lastExtracted < 10 * 60 * 1000) return;
		handleExtractLocations();
	});

	onMount(() => {
		initMap();
		if ($llmSettings.apiKey && $allNewsItems.length > 0 && $newsLocations.locations.length === 0) {
			handleExtractLocations();
		}
	});
</script>

<Panel id="map" title="Global Situation" {loading} {error}>
	<div class="map-container" bind:this={mapContainer}>
		<svg class="map-svg"></svg>
		{#if tooltipVisible && tooltipContent}
			<div
				class="map-tooltip"
				style="left: {tooltipPosition.left}px; top: {tooltipPosition.top}px;"
			>
				<strong style="color: {tooltipContent.color}">{tooltipContent.title}</strong>
				{#each tooltipContent.lines as line}
					<br /><span class="tooltip-line">{line}</span>
				{/each}
			</div>
		{/if}
		<div class="zoom-controls">
			<button class="zoom-btn" onclick={zoomIn} title="Zoom in">+</button>
			<button class="zoom-btn" onclick={zoomOut} title="Zoom out">−</button>
			<button class="zoom-btn" onclick={resetZoom} title="Reset">⟲</button>
		</div>
		<div class="map-legend">
			<div class="legend-item">
				<span class="legend-dot high"></span> High
			</div>
			<div class="legend-item">
				<span class="legend-dot elevated"></span> Elevated
			</div>
			<div class="legend-item">
				<span class="legend-dot low"></span> Low
			</div>
		</div>
	</div>
</Panel>

<style>
	.map-container {
		position: relative;
		width: 100%;
		aspect-ratio: 2 / 1;
		background: #0a0f0d;
		border-radius: 4px;
		overflow: hidden;
	}

	.map-svg {
		width: 100%;
		height: 100%;
	}

	.map-tooltip {
		position: absolute;
		background: rgba(10, 10, 10, 0.95);
		border: 1px solid #333;
		border-radius: 4px;
		padding: 0.5rem;
		font-size: 0.65rem;
		color: #ddd;
		max-width: 250px;
		pointer-events: none;
		z-index: 100;
	}

	.tooltip-line {
		opacity: 0.7;
	}

	.zoom-controls {
		position: absolute;
		bottom: 0.5rem;
		right: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.zoom-btn {
		width: 2.75rem;
		height: 2.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(20, 20, 20, 0.9);
		border: 1px solid #333;
		border-radius: 4px;
		color: #aaa;
		font-size: 1rem;
		cursor: pointer;
	}

	.zoom-btn:hover {
		background: rgba(40, 40, 40, 0.9);
		color: #fff;
	}

	.map-legend {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		background: rgba(10, 10, 10, 0.8);
		padding: 0.3rem 0.5rem;
		border-radius: 4px;
		font-size: 0.55rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		color: #888;
	}

	.legend-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.legend-dot.high {
		background: #ff4444;
	}

	.legend-dot.elevated {
		background: #ffcc00;
	}

	.legend-dot.low {
		background: #00ff88;
	}

	/* Pulse animation for hotspots */
	:global(.pulse) {
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			r: 6;
			opacity: 0.3;
		}
		50% {
			r: 10;
			opacity: 0.1;
		}
	}

	:global(.hotspot-hit) {
		cursor: pointer;
	}

	/* Hide zoom controls on mobile where touch zoom is available */
	@media (max-width: 768px) {
		.zoom-controls {
			display: flex;
		}
	}
</style>

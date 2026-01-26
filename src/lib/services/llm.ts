import type { LLMModel } from '$lib/stores/llm';
import type { NewsLocation } from '$lib/stores/newsLocations';

export async function fetchModels(baseUrl: string, apiKey: string): Promise<LLMModel[]> {
	const cleanBaseUrl = baseUrl.replace(/\/$/, '');

	try {
		const response = await fetch(`${cleanBaseUrl}/models`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch models: ${response.statusText}`);
		}

		const data = await response.json();
		const models = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];

		return models
			.map((m: any) => ({
				id: m.id,
				name: m.id
			}))
			.sort((a: LLMModel, b: LLMModel) => a.id.localeCompare(b.id));
	} catch (error) {
		console.error('Error fetching models:', error);
		throw error;
	}
}

export async function generateSummary(
	baseUrl: string,
	apiKey: string,
	model: string,
	prompt: string,
	context?: string
): Promise<string> {
	const cleanBaseUrl = baseUrl.replace(/\/$/, '');

	try {
		const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model,
				messages: [
					{
						role: 'system',
						content: context || 'You are a helpful intelligence analyst assistant.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				temperature: 0.7
			})
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.error?.message || `API Error: ${response.statusText}`);
		}

		const data = await response.json();
		return data.choices?.[0]?.message?.content || '';
	} catch (error) {
		console.error('Error generating summary:', error);
		throw error;
	}
}

export async function extractLocationsFromNews(
	baseUrl: string,
	apiKey: string,
	model: string,
	headlines: string[]
): Promise<NewsLocation[]> {
	const cleanBaseUrl = baseUrl.replace(/\/$/, '');

	const prompt = `Analyze these news headlines and extract geographic locations mentioned.
For each location, provide:
- name: City or region name
- lat: Latitude (decimal)
- lon: Longitude (decimal)  
- level: Threat level based on news tone (critical/high/elevated/low)
- headlines: Array of related headline texts

Return ONLY a valid JSON array. No markdown, no explanation.
Example: [{"name":"Kyiv","lat":50.45,"lon":30.52,"level":"high","headlines":["Ukraine conflict escalates"]}]

If no clear geographic locations found, return empty array: []

NEWS HEADLINES:
${headlines
	.slice(0, 50)
	.map((h, i) => `${i + 1}. ${h}`)
	.join('\n')}`;

	try {
		const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model,
				messages: [
					{
						role: 'system',
						content: 'You are a geographic entity extraction system. Return only valid JSON arrays.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				temperature: 0.3
			})
		});

		if (!response.ok) {
			throw new Error(`API Error: ${response.statusText}`);
		}

		const data = await response.json();
		const content = data.choices?.[0]?.message?.content || '[]';

		const jsonMatch = content.match(/\[[\s\S]*\]/);
		if (!jsonMatch) {
			console.warn('No JSON array found in LLM response');
			return [];
		}

		const parsed = JSON.parse(jsonMatch[0]);

		if (!Array.isArray(parsed)) return [];

		const locations: NewsLocation[] = parsed
			.filter(
				(loc: any) =>
					loc.name &&
					typeof loc.lat === 'number' &&
					typeof loc.lon === 'number' &&
					loc.lat >= -90 &&
					loc.lat <= 90 &&
					loc.lon >= -180 &&
					loc.lon <= 180
			)
			.map((loc: any, index: number) => ({
				id: `news-loc-${index}-${Date.now()}`,
				name: String(loc.name),
				lat: Number(loc.lat),
				lon: Number(loc.lon),
				newsCount: Array.isArray(loc.headlines) ? loc.headlines.length : 1,
				headlines: Array.isArray(loc.headlines) ? loc.headlines.slice(0, 5) : [],
				level: ['critical', 'high', 'elevated', 'low'].includes(loc.level) ? loc.level : 'elevated',
				lastUpdated: Date.now()
			}));

		const merged = new Map<string, NewsLocation>();
		for (const loc of locations) {
			const key = `${loc.lat.toFixed(1)}_${loc.lon.toFixed(1)}`;
			if (merged.has(key)) {
				const existing = merged.get(key)!;
				existing.newsCount += loc.newsCount;
				existing.headlines = [...existing.headlines, ...loc.headlines].slice(0, 5);
				if (loc.level === 'critical' || existing.level !== 'critical') {
					existing.level = loc.level;
				}
			} else {
				merged.set(key, loc);
			}
		}

		return Array.from(merged.values());
	} catch (error) {
		console.error('Error extracting locations:', error);
		throw error;
	}
}

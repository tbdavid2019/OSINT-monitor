<script lang="ts">
	import { Panel } from '#lib/components/common/index.js';
	import { llmSettings } from '#lib/stores/llm.js';
	import { allNewsItems } from '#lib/stores/news.js';
	import { markets } from '#lib/stores/markets.js';
	import { generateSummary } from '#lib/services/llm.js';

	let loading = $state(false);
	let error = $state<string | null>(null);
	let summary = $state<string | null>(null);
	let lastGenerated = $state<number | null>(null);

	const recentHeadlines = $derived(
		$allNewsItems
			.sort((a, b) => b.timestamp - a.timestamp)
			.map((item) => `- ${item.title} (${item.source})`)
			.join('\n')
	);

	const marketData = $derived(() => {
		const sections: string[] = [];

		if ($markets.indices.items.length > 0) {
			const indicesStr = $markets.indices.items
				.map(
					(i) =>
						`${i.symbol}: ${i.price?.toFixed(2) ?? 'N/A'} (${i.changePercent >= 0 ? '+' : ''}${i.changePercent?.toFixed(2) ?? 'N/A'}%)`
				)
				.join(', ');
			sections.push(`Stock Indices: ${indicesStr}`);
		}

		if ($markets.commodities.items.length > 0) {
			const commoditiesStr = $markets.commodities.items
				.map(
					(i) =>
						`${i.name || i.symbol}: ${i.price?.toFixed(2) ?? 'N/A'} (${i.changePercent >= 0 ? '+' : ''}${i.changePercent?.toFixed(2) ?? 'N/A'}%)`
				)
				.join(', ');
			sections.push(`Commodities & VIX: ${commoditiesStr}`);
		}

		if ($markets.crypto.items.length > 0) {
			const cryptoStr = $markets.crypto.items
				.map(
					(i) =>
						`${i.symbol.toUpperCase()}: $${i.current_price?.toLocaleString() ?? 'N/A'} (${i.price_change_percentage_24h >= 0 ? '+' : ''}${i.price_change_percentage_24h?.toFixed(2) ?? 'N/A'}%)`
				)
				.join(', ');
			sections.push(`Crypto: ${cryptoStr}`);
		}

		if ($markets.sectors.items.length > 0) {
			const sectorsStr = $markets.sectors.items
				.map(
					(i) =>
						`${i.name}: ${i.changePercent >= 0 ? '+' : ''}${i.changePercent?.toFixed(2) ?? 'N/A'}%`
				)
				.join(', ');
			sections.push(`Sector Performance: ${sectorsStr}`);
		}

		return sections.join('\n');
	});

	async function handleGenerate() {
		if (!$llmSettings.apiKey) {
			error = 'API Key not configured. Please open Settings -> AI Intelligence.';
			return;
		}

		if (recentHeadlines.length === 0) {
			error = 'No news data available to summarize.';
			return;
		}

		loading = true;
		error = null;

		try {
			const marketContext = marketData();
			const prompt = `
Please act as a senior intelligence analyst and market strategist.
Review the following data and provide a concise "Situation Report" in Traditional Chinese (繁體中文).

=== MARKET DATA ===
${marketContext || 'No market data available'}

=== NEWS HEADLINES ===
${recentHeadlines}

Focus on:
1. Emerging threats or conflicts
2. Major economic shifts and market implications
3. Key geopolitical moves
4. Correlation between news events and market movements
5. VIX level interpretation (fear/greed sentiment)

Format the output as a bulleted list with bold key terms. Keep it under 300 words.
`;

			const result = await generateSummary(
				$llmSettings.baseUrl,
				$llmSettings.apiKey,
				$llmSettings.model || 'gpt-4o-mini',
				prompt
			);

			summary = result;
			lastGenerated = Date.now();
		} catch (e) {
			error = String(e);
		} finally {
			loading = false;
		}
	}
</script>

<Panel id="ai_summary" title="AI Summary 戰情摘要 (SitRep)">
	<div class="summary-content">
		{#if !$llmSettings.apiKey}
			<div class="empty-state">
				<p>請先設定 AI 模型以啟用摘要功能</p>
				<button class="action-btn" disabled>請至設定頁面設定</button>
			</div>
		{:else if !summary && !loading}
			<div class="empty-state">
				<p>根據目前收集到的 {$allNewsItems.length} 則情報生成摘要</p>
				<button class="action-btn" onclick={handleGenerate}> ✨ 生成戰情摘要 </button>
			</div>
		{:else}
			{#if loading}
				<div class="loading">
					<div class="spinner"></div>
					<p>正在分析 {recentHeadlines.split('\n').length} 則情報...</p>
				</div>
			{/if}

			{#if error}
				<div class="error">
					⚠️ {error}
					<button class="retry-btn" onclick={handleGenerate}>重試</button>
				</div>
			{/if}

			{#if summary}
				<div class="markdown-body">
					{@html summary.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
				</div>
				<div class="footer">
					<span class="timestamp">
						更新於: {new Date(lastGenerated!).toLocaleTimeString()}
					</span>
					<button class="refresh-btn" onclick={handleGenerate} disabled={loading}>
						🔄 重新生成
					</button>
				</div>
			{/if}
		{/if}
	</div>
</Panel>

<style>
	.summary-content {
		padding: 0.5rem;
		min-height: 100px;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		text-align: center;
		color: var(--text-secondary);
		gap: 1rem;
	}

	.action-btn {
		background: var(--accent);
		color: var(--bg);
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.action-btn:hover {
		opacity: 0.9;
	}

	.action-btn:disabled {
		background: var(--text-muted);
		cursor: not-allowed;
	}

	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem;
		gap: 1rem;
		color: var(--text-secondary);
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error {
		background: rgba(255, 68, 68, 0.1);
		color: var(--danger);
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		font-size: 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.retry-btn {
		align-self: flex-start;
		background: transparent;
		border: 1px solid var(--danger);
		color: var(--danger);
		padding: 0.2rem 0.5rem;
		border-radius: 2px;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.markdown-body {
		font-size: 0.9rem;
		line-height: 1.6;
		color: var(--text-primary);
		white-space: pre-wrap;
	}

	.markdown-body :global(strong) {
		color: var(--accent);
		font-weight: 600;
	}

	.footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 1rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border);
	}

	.timestamp {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.refresh-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 0.8rem;
	}

	.refresh-btn:hover {
		color: var(--accent);
	}
</style>

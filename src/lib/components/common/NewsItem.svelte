<script lang="ts">
	import type { NewsItem } from '$lib/types';
	import { timeAgo } from '$lib/utils';
	import { llmSettings } from '$lib/stores/llm';
	import { generateSummary } from '$lib/services/llm';

	interface Props {
		item: NewsItem;
		showSource?: boolean;
		showAlert?: boolean;
		showDescription?: boolean;
		compact?: boolean;
	}

	let {
		item,
		showSource = true,
		showAlert = true,
		showDescription = false,
		compact = false
	}: Props = $props();

	let displayTitle = $state('');
	let isTranslated = $state(false);
	let translating = $state(false);

	$effect(() => {
		displayTitle = item.title;
		isTranslated = false;
	});

	async function handleTranslate(e: MouseEvent) {
		// If no API key, let the default link behavior happen (open Google Translate)
		if (!$llmSettings.apiKey) return;

		e.preventDefault();
		if (translating) return;

		// Toggle back to original
		if (isTranslated) {
			displayTitle = item.title;
			isTranslated = false;
			return;
		}

		translating = true;
		try {
			const result = await generateSummary(
				$llmSettings.baseUrl,
				$llmSettings.apiKey,
				$llmSettings.model || 'gpt-4o-mini',
				`Translate the following news headline into Traditional Chinese (Taiwan). Only return the translated text, nothing else.\n\n"${item.title}"`
			);
			displayTitle = result.replace(/^"|"$/g, ''); // Remove quotes if present
			isTranslated = true;
		} catch (error) {
			console.error('Translation failed:', error);
			// Fallback to opening the link if LLM fails
			window.open(
				`https://translate.google.com/translate?sl=auto&tl=zh-TW&u=${encodeURIComponent(item.link)}`,
				'_blank'
			);
		} finally {
			translating = false;
		}
	}
</script>

<div class="news-item" class:alert={showAlert && item.isAlert} class:compact>
	<a
		href="https://translate.google.com/translate?sl=auto&tl=zh-TW&u={encodeURIComponent(item.link)}"
		target="_blank"
		rel="noopener noreferrer"
		class="item-translate"
		class:active={isTranslated}
		title={$llmSettings.apiKey ? 'Click to translate title' : 'Open in Google Translate'}
		onclick={handleTranslate}
	>
		{#if translating}
			⏳
		{:else}
			🇹🇼
		{/if}
	</a>

	{#if showSource}
		<div class="item-source">
			{item.source}

			{#if showAlert && item.isAlert}
				<span class="alert-tag">ALERT</span>
			{/if}
		</div>
	{/if}

	<a class="item-title" href={item.link} target="_blank" rel="noopener noreferrer">
		{displayTitle}
	</a>

	{#if showDescription && item.description}
		<p class="item-description">{item.description}</p>
	{/if}

	<div class="item-meta">
		<span class="item-time">{timeAgo(item.timestamp)}</span>
		{#if item.region}
			<span class="item-region">{item.region}</span>
		{/if}
	</div>
</div>

<style>
	.news-item {
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--border);
		position: relative;
	}

	.news-item:last-child {
		border-bottom: none;
	}

	.news-item.compact {
		padding: 0.35rem 0;
	}

	.news-item.alert {
		background: rgba(255, 68, 68, 0.08);
		margin: 0 -0.5rem;
		padding: 0.5rem;
		border-radius: 4px;
		border: 1px solid rgba(255, 68, 68, 0.2);
		border-bottom: 1px solid rgba(255, 68, 68, 0.2);
	}

	.item-source {
		font-size: 0.55rem;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		margin-bottom: 0.2rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding-right: 2rem; /* Make space for translate button */
	}

	.alert-tag {
		background: var(--danger);
		color: white;
		font-size: 0.5rem;
		padding: 0.1rem 0.3rem;
		border-radius: 2px;
		font-weight: 600;
	}

	.item-title {
		display: block;
		font-size: 0.7rem;
		line-height: 1.35;
		color: var(--text-primary);
		text-decoration: none;
	}

	.item-title:hover {
		color: var(--accent);
	}

	.compact .item-title {
		font-size: 0.65rem;
		line-height: 1.3;
	}

	.item-description {
		font-size: 0.6rem;
		color: var(--text-secondary);
		margin: 0.3rem 0 0;
		line-height: 1.4;
	}

	.item-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.item-time {
		font-size: 0.55rem;
		color: var(--text-muted);
	}

	.item-region {
		font-size: 0.5rem;
		color: var(--accent);
		background: rgba(var(--accent-rgb), 0.1);
		padding: 0.1rem 0.3rem;
		border-radius: 2px;
		text-transform: uppercase;
	}

	.item-translate {
		position: absolute;
		top: 0.5rem;
		right: 0;
		font-size: 0.5rem;
		color: var(--text-muted);
		background: transparent;
		padding: 0.1rem 0.3rem;
		border-radius: 2px;
		text-decoration: none;
		opacity: 0.6;
		transition: all 0.2s;
	}

	.news-item.alert .item-translate {
		top: 0.5rem;
		right: 0.5rem;
	}

	.item-translate:hover {
		opacity: 1;
		color: var(--accent);
		background: rgba(var(--accent-rgb), 0.1);
	}

	.item-translate.active {
		opacity: 1;
		color: var(--accent);
		border-color: var(--accent);
		background: rgba(var(--accent-rgb), 0.1);
	}
</style>

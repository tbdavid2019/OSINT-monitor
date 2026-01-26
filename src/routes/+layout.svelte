<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { llmSettings } from '$lib/stores/llm';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	onMount(() => {
		llmSettings.init();
	});
</script>

<div class="min-h-screen bg-bg text-text-primary">
	{@render children()}
</div>

<script lang="ts">
	import Modal from './Modal.svelte';
	import { settings } from '$lib/stores';
	import { llmSettings } from '$lib/stores/llm';
	import { fetchModels } from '$lib/services/llm';
	import { PANELS, type PanelId } from '$lib/config';

	interface Props {
		open: boolean;
		onClose: () => void;
		onReconfigure?: () => void;
	}

	let { open = false, onClose, onReconfigure }: Props = $props();

	let isFetchingModels = $state(false);
	let fetchError = $state('');

	function handleTogglePanel(panelId: PanelId) {
		settings.togglePanel(panelId);
	}

	function handleResetPanels() {
		settings.reset();
	}

	async function handleFetchModels() {
		if (!$llmSettings.apiKey) {
			fetchError = 'API Key is required 需要 API 金鑰';
			return;
		}

		isFetchingModels = true;
		fetchError = '';

		try {
			const models = await fetchModels($llmSettings.baseUrl, $llmSettings.apiKey);
			llmSettings.setModels(models);
		} catch (e) {
			fetchError = (e as Error).message;
		} finally {
			isFetchingModels = false;
		}
	}
</script>

<Modal {open} title="Settings 設定" {onClose}>
	<div class="settings-sections">
		<section class="settings-section">
			<h3 class="section-title">AI Intelligence AI 智能</h3>
			<p class="section-desc">Configure LLM for automated analysis 設定 LLM 進行自動分析</p>

			<div class="input-group">
				<label for="llm-base-url">Base URL 基本網址</label>
				<input
					id="llm-base-url"
					type="text"
					value={$llmSettings.baseUrl}
					onchange={(e) => llmSettings.updateSettings({ baseUrl: e.currentTarget.value })}
					placeholder="https://api.openai.com/v1"
				/>
			</div>

			<div class="input-group">
				<label for="llm-api-key">API Key API 金鑰</label>
				<input
					id="llm-api-key"
					type="password"
					value={$llmSettings.apiKey}
					onchange={(e) => llmSettings.updateSettings({ apiKey: e.currentTarget.value })}
					placeholder="sk-..."
				/>
			</div>

			<div class="input-group">
				<div class="model-header">
					<label for="llm-model">Model 模型</label>
					<button class="fetch-btn" onclick={handleFetchModels} disabled={isFetchingModels}>
						{isFetchingModels ? 'Fetching... 取得中' : 'Fetch Models 取得模型'}
					</button>
				</div>

				{#if fetchError}
					<p class="error-msg">{fetchError}</p>
				{/if}

				<select
					id="llm-model"
					value={$llmSettings.model}
					onchange={(e) => llmSettings.updateSettings({ model: e.currentTarget.value })}
				>
					{#if $llmSettings.availableModels.length === 0}
						<option value={$llmSettings.model}>{$llmSettings.model}</option>
					{/if}
					{#each $llmSettings.availableModels as model}
						<option value={model.id}>{model.id}</option>
					{/each}
				</select>
			</div>
		</section>

		<section class="settings-section">
			<h3 class="section-title">Enabled Panels 啟用面板</h3>
			<p class="section-desc">
				Toggle panels on/off to customize your dashboard 開關面板自訂儀表板
			</p>

			<div class="panels-grid">
				{#each Object.entries(PANELS) as [id, config]}
					{@const panelId = id as PanelId}
					{@const isEnabled = $settings.enabled[panelId]}
					<label class="panel-toggle" class:enabled={isEnabled}>
						<input
							type="checkbox"
							checked={isEnabled}
							onchange={() => handleTogglePanel(panelId)}
						/>
						<span class="panel-name">{config.name}</span>
						<span class="panel-priority">P{config.priority}</span>
					</label>
				{/each}
			</div>
		</section>

		<section class="settings-section">
			<h3 class="section-title">Dashboard 儀表板</h3>
			{#if onReconfigure}
				<button class="reconfigure-btn" onclick={onReconfigure}>
					Reconfigure Dashboard 重新配置儀表板
				</button>
				<p class="btn-hint">Choose a preset profile for your panels 選擇預設面板配置</p>
			{/if}
			<button class="reset-btn" onclick={handleResetPanels}>
				Reset All Settings 重設全部設定
			</button>
		</section>
	</div>
</Modal>

<style>
	.settings-sections {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.settings-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.section-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		margin: 0;
	}

	.section-desc {
		font-size: 0.65rem;
		color: var(--text-muted);
		margin: 0;
	}

	.panels-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.panel-toggle {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.6rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid var(--border);
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.panel-toggle:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.panel-toggle.enabled {
		border-color: var(--accent);
		background: rgba(var(--accent-rgb), 0.1);
	}

	.panel-toggle input {
		accent-color: var(--accent);
	}

	.panel-name {
		flex: 1;
		font-size: 0.65rem;
		color: var(--text-primary);
	}

	.panel-priority {
		font-size: 0.5rem;
		color: var(--text-muted);
		background: rgba(255, 255, 255, 0.05);
		padding: 0.1rem 0.25rem;
		border-radius: 2px;
	}

	.reconfigure-btn {
		padding: 0.5rem 1rem;
		background: rgba(0, 255, 136, 0.1);
		border: 1px solid rgba(0, 255, 136, 0.3);
		border-radius: 4px;
		color: var(--accent);
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.15s ease;
		margin-bottom: 0.25rem;
	}

	.reconfigure-btn:hover {
		background: rgba(0, 255, 136, 0.2);
	}

	.btn-hint {
		font-size: 0.6rem;
		color: var(--text-muted);
		margin: 0 0 0.75rem;
	}

	.reset-btn {
		padding: 0.5rem 1rem;
		background: rgba(255, 68, 68, 0.1);
		border: 1px solid rgba(255, 68, 68, 0.3);
		border-radius: 4px;
		color: var(--danger);
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.reset-btn:hover {
		background: rgba(255, 68, 68, 0.2);
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 0.5rem;
	}

	.input-group label {
		font-size: 0.65rem;
		color: var(--text-secondary);
	}

	.input-group input,
	.input-group select {
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 0.4rem 0.6rem;
		color: var(--text-primary);
		font-size: 0.7rem;
		width: 100%;
		box-sizing: border-box;
	}

	.input-group input:focus,
	.input-group select:focus {
		outline: none;
		border-color: var(--accent);
	}

	.model-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.fetch-btn {
		background: transparent;
		border: 1px solid var(--border);
		color: var(--text-secondary);
		font-size: 0.6rem;
		padding: 0.1rem 0.4rem;
		border-radius: 2px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.fetch-btn:hover:not(:disabled) {
		border-color: var(--accent);
		color: var(--accent);
	}

	.fetch-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error-msg {
		color: var(--danger);
		font-size: 0.6rem;
		margin: 0.2rem 0;
	}
</style>

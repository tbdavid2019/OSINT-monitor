/**
 * Panel configuration
 */

export interface PanelConfig {
	name: string;
	priority: 1 | 2 | 3;
}

export type PanelId =
	| 'map'
	| 'politics'
	| 'tech'
	| 'finance'
	| 'gov'
	| 'heatmap'
	| 'markets'
	| 'monitors'
	| 'commodities'
	| 'crypto'
	| 'polymarket'
	| 'whales'
	| 'mainchar'
	| 'printer'
	| 'contracts'
	| 'ai'
	| 'layoffs'
	| 'venezuela'
	| 'greenland'
	| 'iran'
	| 'leaders'
	| 'intel'
	| 'correlation'
	| 'narrative'
	| 'fed'
	| 'ai_summary';

export const PANELS: Record<PanelId, PanelConfig> = {
	map: { name: 'Global Map 全球地圖', priority: 1 },
	politics: { name: 'World / Geopolitical 世界 / 地緣政治', priority: 1 },
	tech: { name: 'Technology / AI 科技 / AI', priority: 1 },
	finance: { name: 'Financial 金融', priority: 1 },
	gov: { name: 'Government / Policy 政府 / 政策', priority: 2 },
	heatmap: { name: 'Sector Heatmap 產業熱力圖', priority: 1 },
	markets: { name: 'Markets 市場', priority: 1 },
	monitors: { name: 'My Monitors 我的監控', priority: 1 },
	commodities: { name: 'Commodities / VIX 大宗商品 / VIX', priority: 2 },
	crypto: { name: 'Crypto 加密貨幣', priority: 2 },
	polymarket: { name: 'Polymarket 預測市場', priority: 2 },
	whales: { name: 'Whale Watch 巨鯨追蹤', priority: 3 },
	mainchar: { name: 'Main Character 主角', priority: 2 },
	printer: { name: 'Money Printer 印鈔機', priority: 2 },
	contracts: { name: 'Gov Contracts 政府合約', priority: 3 },
	ai: { name: 'AI Arms Race AI 軍備競賽', priority: 3 },
	layoffs: { name: 'Layoffs Tracker 裁員追蹤', priority: 3 },
	venezuela: { name: 'Venezuela Situation 委內瑞拉情勢', priority: 2 },
	greenland: { name: 'Greenland Situation 格陵蘭情勢', priority: 2 },
	iran: { name: 'Iran Situation 伊朗情勢', priority: 2 },
	leaders: { name: 'World Leaders 世界領袖', priority: 1 },
	intel: { name: 'Intel Feed 情報動態', priority: 2 },
	correlation: { name: 'Correlation Engine 關聯引擎', priority: 1 },
	narrative: { name: 'Narrative Tracker 敘事追蹤', priority: 1 },
	fed: { name: 'Federal Reserve 美國聯準會', priority: 1 },
	ai_summary: { name: 'AI Summary AI 摘要', priority: 1 }
};

export const NON_DRAGGABLE_PANELS: PanelId[] = ['map'];

export const MAP_ZOOM_MIN = 1;
export const MAP_ZOOM_MAX = 4;
export const MAP_ZOOM_STEP = 0.5;

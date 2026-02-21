export type SentimentCategory = 'positive' | 'neutral' | 'negative';

export interface SentimentEntry {
  orderId: string;
  orderNumber: string;
  instructions: string;
  sentiment: SentimentCategory;
  score: number;
  keywords: string[];
  flags: SentimentFlag[];
  analyzedAt: Date;
}

export type SentimentFlag = 'complaint' | 'allergy' | 'rush' | 'compliment' | 'dietary' | 'modification';

export interface SentimentSummary {
  totalAnalyzed: number;
  positive: number;
  neutral: number;
  negative: number;
  avgScore: number;
  topKeywords: { word: string; count: number }[];
  flagCounts: Record<SentimentFlag, number>;
}

export interface SentimentTrend {
  date: string;
  avgScore: number;
  positiveCount: number;
  negativeCount: number;
  totalCount: number;
}

export type SentimentTab = 'overview' | 'entries' | 'trends';

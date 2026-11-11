export type CopyTone =
  | 'luxury-editorial'
  | 'avant-garde'
  | 'minimalist'
  | 'cybernetic'
  | 'manifesto'
  | 'cinematic-noir'
  | 'poetic-dystopian'
  | 'curator-critique'
  | 'couture-statement';

export type CopyCategory =
  | 'EDITORIAL'
  | 'COUTURE'
  | 'CINEMA'
  | 'DIGITAL FASHION'
  | 'ARTWORK'
  | 'EXPERIMENTAL'
  | 'THREAD';

export interface CopyGenerateRequest {
  topic?: string;
  tone?: CopyTone;
  category?: CopyCategory;
  visualPrompt?: string;
  artistName?: string;
  aiToolsUsed?: string[];
  targetLanguage?: 'en' | 'zh' | 'fr' | 'ja' | 'id';
  length?: 'concise' | 'standard' | 'elaborate' | 'manifesto';
  includeTags?: boolean;
}

export interface GeneratedCopyItem {
  headline: string;
  subheadline?: string;
  caption: string;
  manifestoParagraph?: string;
  curatorialStatement?: string;
  aestheticKeywords: string[];
  hashtags: string[];
  suggestedAiTools: string[];
  toneApplied: string;
}

export interface CopyGenerateResponse {
  success: boolean;
  model: string;
  copy: GeneratedCopyItem;
  rawText?: string;
  generatedAt: string;
  tokenCountEstimate?: number;
}

export interface CopyPolishRequest {
  draftText: string;
  tone?: CopyTone;
  targetLength?: 'condense' | 'keep' | 'expand';
  language?: string;
}

export interface CopyPolishResponse {
  success: boolean;
  originalText: string;
  polishedCopy: string;
  headlineSuggestion: string;
  editorialCritique: string;
  suggestedTags: string[];
}

export interface CopyCinemaRequest {
  title: string;
  genre?: string;
  visualStyle?: string;
  synopsisPrompt?: string;
  directorVision?: string;
}

export interface CopyCinemaResponse {
  success: boolean;
  logline: string;
  oneParagraphSynopsis: string;
  directorStatement: string;
  visualTreatment: string;
  soundAndScoreDirection: string;
  colorPaletteDescription: string;
  aspectRatioRecommendation: string;
}

export interface CopyTranslateRequest {
  text: string;
  targetLanguage: 'zh-CN' | 'zh-TW' | 'en' | 'fr' | 'ja' | 'id';
  preserveEditorialTone?: boolean;
}

export interface CopyTranslateResponse {
  success: boolean;
  translatedText: string;
  targetLanguage: string;
  originalText: string;
}

export interface CopyDuplicateResponse {
  success: boolean;
  message: string;
  originalId: string;
  newId: string;
  type: 'post' | 'thread' | 'cinema';
  item: any;
}

export interface CopyArchiveExportResponse {
  success: boolean;
  archiveName: string;
  exportedAt: string;
  user: {
    uid: string;
    username: string;
    displayName: string;
  };
  metrics: {
    totalPosts: number;
    totalCollections: number;
  };
  data: {
    posts: any[];
    collections: any[];
  };
}

export interface CopyShareLinkResponse {
  success: boolean;
  code: string;
  shareUrl: string;
  title: string;
  description: string;
  targetType: string;
  targetId: string;
  copyCount: number;
}

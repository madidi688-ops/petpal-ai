export type Pet = {
  id: string;
  name: string;
  species: 'cat' | 'dog' | 'other';
  breed?: string | null;
  birthday?: string | null;
  avatarUrl?: string | null;
  personalityNotes?: string | null;
  createdAt: string;
};

export type BehaviorEvent = {
  id: string;
  petId: string;
  type: string;
  occurredAt: string;
  note?: string | null;
  imageUrl?: string | null;
  moodTag?: string | null;
};

export type ChatSession = {
  id: string;
  petId: string;
  title?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  createdAt: string;
};

export type DiaryEntry = {
  id: string;
  date: string;
  content: string;
  moodScore: number;
  highlightBehaviorIds?: string;
  generatedBy?: string;
};

export type MbtiProfile = {
  id: string;
  ei: number;
  sn: number;
  tf: number;
  jp: number;
  type: string;
  summary: string;
  updatedAt?: string;
};

export type EmotionLog = {
  id: string;
  emotion: string;
  score: number;
  recordedAt: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
};

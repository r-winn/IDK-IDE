export type Provider = { name: string; baseUrl: string; model: string; apiKey: string };
export type Message = { role: 'user' | 'assistant'; content: string };
export type Settings = { provider: Provider; systemPrompt: string; temperature: number; databaseEnabled: boolean; databaseUrl: string; confirmCommands: boolean };

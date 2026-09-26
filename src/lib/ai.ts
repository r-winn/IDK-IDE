import type { Message, Settings } from '../types';

export async function streamChat(settings: Settings, messages: Message[], onToken: (value: string) => void) {
  const url = `${settings.provider.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(settings.provider.apiKey ? { Authorization: `Bearer ${settings.provider.apiKey}` } : {}) },
    body: JSON.stringify({ model: settings.provider.model, temperature: settings.temperature, stream: true, messages: [{ role: 'system', content: settings.systemPrompt }, ...messages] })
  });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  if (!response.body) throw new Error('Streaming is not available');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
    for (const line of lines) {
      const data = line.replace(/^data:\s*/, '').trim();
      if (!data || data === '[DONE]') continue;
      try { onToken(JSON.parse(data).choices?.[0]?.delta?.content ?? ''); } catch { /* partial event */ }
    }
  }
}

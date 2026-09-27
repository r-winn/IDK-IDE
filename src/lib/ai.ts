import type { Message, Settings } from '../types';

function headers(apiKey: string) {
  return { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) };
}

export async function discoverModels(settings: Settings) {
  const response = await fetch(`${settings.provider.baseUrl.replace(/\/$/, '')}/models`, { headers: headers(settings.provider.apiKey) });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  const payload = await response.json();
  return (Array.isArray(payload.data) ? payload.data : []).map((item: { id?: string }) => item.id).filter(Boolean) as string[];
}

export async function testConnection(settings: Settings) {
  if (!settings.provider.model) throw new Error('Choose a model first');
  const started = performance.now();
  const response = await fetch(`${settings.provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST', headers: headers(settings.provider.apiKey),
    body: JSON.stringify({ model: settings.provider.model, stream: false, max_tokens: 1, messages: [{ role: 'user', content: 'Reply OK' }] })
  });
  if (!response.ok) throw new Error(`Model test failed (${response.status})`);
  return Math.round(performance.now() - started);
}

export async function streamChat(settings: Settings, messages: Message[], onToken: (value: string) => void) {
  const url = `${settings.provider.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: headers(settings.provider.apiKey),
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

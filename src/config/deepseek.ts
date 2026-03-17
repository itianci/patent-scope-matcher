export interface AIProviderConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
}

export interface AISettings {
  activeProvider: string;
  providers: Record<string, AIProviderConfig>;
}

const DEFAULT_SETTINGS: AISettings = {
  activeProvider: 'deepseek',
  providers: {
    deepseek: {
      apiKey: 'your key',
      apiUrl: 'https://api.deepseek.com/chat/completions',
      model: 'deepseek-chat'
    },
    openai: {
      apiKey: '',
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o'
    },
    custom: {
      apiKey: '',
      apiUrl: '',
      model: ''
    }
  }
};

export function getAISettings(): AISettings {
  try {
    const stored = localStorage.getItem('ai_settings');
    if (stored) {
      const parsed = JSON.parse(stored) as AISettings;
      // Merge with defaults to ensure all providers exist
      return {
        activeProvider:
        parsed.activeProvider || DEFAULT_SETTINGS.activeProvider,
        providers: {
          ...DEFAULT_SETTINGS.providers,
          ...parsed.providers
        }
      };
    }
  } catch {

    // ignore parse errors
  }return DEFAULT_SETTINGS;
}

export function saveAISettings(settings: AISettings): void {
  localStorage.setItem('ai_settings', JSON.stringify(settings));
}

export function getActiveProviderConfig(): AIProviderConfig {
  const settings = getAISettings();
  return (
    settings.providers[settings.activeProvider] ||
    settings.providers.deepseek ||
    DEFAULT_SETTINGS.providers.deepseek);

}

// Backward-compatible export used by services/ai.ts
export const DEEPSEEK_CONFIG = new Proxy({} as AIProviderConfig, {
  get(_target, prop: string) {
    const config = getActiveProviderConfig();
    return config[prop as keyof AIProviderConfig];
  }
});
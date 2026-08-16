import { getAvailableModels, getDefaultModel, createLLMProvider } from '../factory';
import { VyceAIProvider } from '../providers/vyceai';
import { SwiftRouterProvider } from '../providers/swiftrouter';

const ENV_KEYS = [
  'AI_PROVIDER',
  'GEMINI_MODELS',
  'SWIFTROUTER_MODELS',
  'SWIFTROUTER_API_KEY',
  'VYCEAI_MODELS',
  'VYCEAI_API_KEY',
  'VYCEAI_BASE_URL',
] as const;

describe('LLM provider factory — vyceai', () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    ENV_KEYS.forEach((k) => {
      original[k] = process.env[k];
      delete process.env[k];
    });
  });

  afterEach(() => {
    ENV_KEYS.forEach((k) => {
      const value = original[k];
      if (value === undefined) delete process.env[k];
      else process.env[k] = value;
    });
  });

  it('reads the vyceai model list from VYCEAI_MODELS', () => {
    process.env['VYCEAI_MODELS'] = 'auto, claude-opus-5 ,grok-4.5';
    expect(getAvailableModels('vyceai')).toEqual(['auto', 'claude-opus-5', 'grok-4.5']);
  });

  it('does not fall back to the swiftrouter model list', () => {
    process.env['SWIFTROUTER_MODELS'] = 'gpt-5.4';
    expect(getAvailableModels('vyceai')).toEqual([]);
  });

  it('uses the first entry as the default model', () => {
    process.env['VYCEAI_MODELS'] = 'auto,claude-opus-5';
    expect(getDefaultModel('vyceai')).toBe('auto');
  });

  it('keeps the built-in gemini fallback but leaves vyceai empty', () => {
    expect(getAvailableModels('gemini')).toEqual(['gemini-2.5-flash']);
    expect(getAvailableModels('vyceai')).toEqual([]);
  });

  it('builds a VyceAIProvider when selected', () => {
    process.env['VYCEAI_API_KEY'] = 'sk-test';
    process.env['VYCEAI_MODELS'] = 'auto';
    expect(createLLMProvider('vyceai')).toBeInstanceOf(VyceAIProvider);
  });

  it('keeps swiftrouter and vyceai as distinct provider types', () => {
    process.env['VYCEAI_API_KEY'] = 'sk-test';
    process.env['VYCEAI_MODELS'] = 'auto';
    process.env['SWIFTROUTER_API_KEY'] = 'sk-test';
    process.env['SWIFTROUTER_MODELS'] = 'gpt-5.4';

    expect(createLLMProvider('swiftrouter')).toBeInstanceOf(SwiftRouterProvider);
    expect(createLLMProvider('vyceai')).not.toBeInstanceOf(SwiftRouterProvider);
  });

  it('throws when the api key is missing', () => {
    process.env['VYCEAI_MODELS'] = 'auto';
    expect(() => createLLMProvider('vyceai')).toThrow('VYCEAI_API_KEY is not set in environment');
  });

  it('throws when no model is configured', () => {
    process.env['VYCEAI_API_KEY'] = 'sk-test';
    expect(() => createLLMProvider('vyceai')).toThrow('Set VYCEAI_MODELS in .env');
  });

  it('names vyceai among the supported providers when the value is unknown', () => {
    expect(() => createLLMProvider('nope')).toThrow(
      'Unsupported AI_PROVIDER: "nope". Supported values: gemini, swiftrouter, vyceai'
    );
  });
});

import { config } from '../config';
import { logger } from './logger';

export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text || targetLang.toLowerCase() === 'en' || targetLang.toLowerCase() === 'english') {
    return text;
  }

  // 1. High quality translation via OpenAI if API key configured
  if (config.openai.apiKey) {
    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: config.openai.apiKey });
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Translate the following text to language code "${targetLang}". Return ONLY the translation. Do not add quotes, notes or explanations.`,
          },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
      });
      const translated = res.choices[0]?.message?.content?.trim();
      if (translated) return translated;
    } catch (e) {
      logger.warn('OpenAI translation failed, falling back to MyMemory', { error: e });
    }
  }

  // 2. Free MyMemory translation fallback
  try {
    const encodedText = encodeURIComponent(text);
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${targetLang}`);
    const data = (await response.json()) as any;
    
    if (data && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
  } catch (error) {
    logger.error('Translation error', { error });
  }
  
  return text; // Fallback to original text
}

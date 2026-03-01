import { translationService } from '../../../features/i18n/translation.service';
import { farmingTipsSeedData } from './farming-tips-seed';
import type { FarmingTip } from '../mongodb-models';

/**
 * Supported languages for translation
 */
const TARGET_LANGUAGES = ['hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'];

/**
 * Translate a single farming tip to a target language
 */
async function translateFarmingTip(
  tip: Omit<FarmingTip, 'createdAt' | 'updatedAt'>,
  targetLanguage: string
): Promise<Omit<FarmingTip, 'createdAt' | 'updatedAt'>> {
  try {
    // Translate advice
    const adviceTranslation = await translationService.translateText({
      text: tip.advice,
      sourceLanguage: 'en',
      targetLanguage,
    });

    // Translate tips array
    const translatedTips: string[] = [];
    for (const tipText of tip.tips) {
      const tipTranslation = await translationService.translateText({
        text: tipText,
        sourceLanguage: 'en',
        targetLanguage,
      });
      translatedTips.push(tipTranslation.translatedText);
    }

    // Translate references if they contain descriptive text
    const translatedReferences: string[] = [];
    for (const ref of tip.references) {
      // Only translate if reference contains descriptive text (not just codes/numbers)
      if (ref.match(/[a-zA-Z]{3,}/)) {
        const refTranslation = await translationService.translateText({
          text: ref,
          sourceLanguage: 'en',
          targetLanguage,
        });
        translatedReferences.push(refTranslation.translatedText);
      } else {
        translatedReferences.push(ref);
      }
    }

    return {
      ...tip,
      advice: adviceTranslation.translatedText,
      tips: translatedTips,
      references: translatedReferences,
      language: targetLanguage,
    };
  } catch (error) {
    console.error(`[TranslateFarmingTips] Error translating tip for ${tip.crop} (${tip.topic}) to ${targetLanguage}:`, error);
    throw error;
  }
}

/**
 * Translate all farming tips to all target languages
 */
export async function translateAllFarmingTips(): Promise<Omit<FarmingTip, 'createdAt' | 'updatedAt'>[]> {
  const allTranslatedTips: Omit<FarmingTip, 'createdAt' | 'updatedAt'>[] = [];

  // Start with English tips
  allTranslatedTips.push(...farmingTipsSeedData);

  console.log(`[TranslateFarmingTips] Starting translation of ${farmingTipsSeedData.length} tips to ${TARGET_LANGUAGES.length} languages...`);

  // Translate to each target language
  for (const language of TARGET_LANGUAGES) {
    console.log(`[TranslateFarmingTips] Translating to ${language}...`);
    
    for (let i = 0; i < farmingTipsSeedData.length; i++) {
      const tip = farmingTipsSeedData[i];
      
      try {
        const translatedTip = await translateFarmingTip(tip, language);
        allTranslatedTips.push(translatedTip);
        
        // Log progress every 10 tips
        if ((i + 1) % 10 === 0) {
          console.log(`[TranslateFarmingTips] Translated ${i + 1}/${farmingTipsSeedData.length} tips for ${language}`);
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[TranslateFarmingTips] Failed to translate tip ${i + 1} for ${language}:`, error);
        // Continue with next tip instead of failing completely
      }
    }
    
    console.log(`[TranslateFarmingTips] Completed translation to ${language}`);
  }

  console.log(`[TranslateFarmingTips] Translation complete. Total tips: ${allTranslatedTips.length}`);
  return allTranslatedTips;
}

/**
 * Get translated farming tips (returns cached if available, otherwise translates)
 */
export async function getTranslatedFarmingTips(): Promise<Omit<FarmingTip, 'createdAt' | 'updatedAt'>[]> {
  // In production, this would check if translations already exist in database
  // For now, we'll translate on demand
  return translateAllFarmingTips();
}

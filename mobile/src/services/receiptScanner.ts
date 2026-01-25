import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { IMAGE_CONFIG, GEMINI_CONFIG } from '@/constants';
import type { ParsedReceipt } from '@/types';

// Gemini API key - should be in environment variable
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

// Compress and optimize image for upload
export const optimizeImage = async (uri: string): Promise<{ uri: string; base64: string }> => {
  // Resize and compress image
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        resize: {
          width: IMAGE_CONFIG.MAX_WIDTH,
          height: IMAGE_CONFIG.MAX_HEIGHT,
        },
      },
    ],
    {
      compress: IMAGE_CONFIG.QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  return {
    uri: manipulated.uri,
    base64: manipulated.base64 || '',
  };
};

// Get file size in KB (not available on web)
export const getFileSizeKB = async (uri: string): Promise<number> => {
  if (Platform.OS === 'web') {
    // Cannot get file size on web, return 0
    return 0;
  }
  const FileSystem = await import('expo-file-system');
  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (fileInfo.exists && 'size' in fileInfo) {
    return fileInfo.size / 1024;
  }
  return 0;
};

// Parse receipt using Gemini Vision API
export const parseReceiptWithGemini = async (base64Image: string): Promise<ParsedReceipt> => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CONFIG.MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: GEMINI_CONFIG.SYSTEM_PROMPT,
          },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Extract text from response
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!generatedText) {
    throw new Error('No response from Gemini');
  }

  // Parse JSON from response (handle potential markdown code blocks)
  let jsonString = generatedText.trim();

  // Remove markdown code blocks if present
  if (jsonString.startsWith('```json')) {
    jsonString = jsonString.slice(7);
  } else if (jsonString.startsWith('```')) {
    jsonString = jsonString.slice(3);
  }
  if (jsonString.endsWith('```')) {
    jsonString = jsonString.slice(0, -3);
  }

  jsonString = jsonString.trim();

  try {
    const parsed = JSON.parse(jsonString) as ParsedReceipt;

    // Validate required fields
    if (!parsed.merchant_name || parsed.total_amount === undefined) {
      throw new Error('Invalid receipt data: missing required fields');
    }

    // Set defaults
    return {
      merchant_name: parsed.merchant_name || 'Unknown',
      total_amount: typeof parsed.total_amount === 'number' ? parsed.total_amount : 0,
      currency: parsed.currency || 'MXN',
      date: parsed.date || new Date().toISOString().split('T')[0],
      category: parsed.category || 'Other',
      line_items: Array.isArray(parsed.line_items) ? parsed.line_items : [],
    };
  } catch (parseError) {
    console.error('Failed to parse Gemini response:', jsonString);
    throw new Error('Failed to parse receipt data from AI response');
  }
};

// Full scan flow: optimize image + parse with Gemini
export const scanReceipt = async (
  imageUri: string
): Promise<{ receipt: ParsedReceipt; optimizedUri: string }> => {
  // Optimize image
  const { uri: optimizedUri, base64 } = await optimizeImage(imageUri);

  // Check file size
  const sizeKB = await getFileSizeKB(optimizedUri);
  if (sizeKB > IMAGE_CONFIG.MAX_SIZE_KB * 2) {
    console.warn(`Image size (${sizeKB.toFixed(0)}KB) exceeds recommended limit`);
  }

  // Parse with Gemini
  const receipt = await parseReceiptWithGemini(base64);

  return { receipt, optimizedUri };
};

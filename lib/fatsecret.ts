import CryptoJS from 'crypto-js';

/**
 * FatSecret API Helper (OAuth 1.0)
 * Handles signature generation and food search API calls.
 */

const CONSUMER_KEY = (process.env.EXPO_PUBLIC_FATSECRET_CLIENT_ID || '').trim();
const CONSUMER_SECRET = (process.env.EXPO_PUBLIC_FATSECRET_CLIENT_SECRET || '').trim();
const API_URL = 'https://platform.fatsecret.com/rest/server.api';

/**
 * RFC 3986 compliant encoding
 */
function rfc3986Encode(str: string): string {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * Generate OAuth 1.0 Signature
 */
function generateSignature(method: string, url: string, params: Record<string, string>): string {
  // 1. Sort parameters alphabetically
  const sortedKeys = Object.keys(params).sort();
  
  // 2. Construct parameter string
  const paramString = sortedKeys
    .map((key) => `${rfc3986Encode(key)}=${rfc3986Encode(params[key])}`)
    .join('&');

  // 3. Construct signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    rfc3986Encode(url),
    rfc3986Encode(paramString),
  ].join('&');

  // 4. Construct signing key
  const signingKey = `${rfc3986Encode(CONSUMER_SECRET)}&`;
  
  // DEBUG: Log base string and key for verification
  console.log('[FatSecret] Base String:', signatureBaseString);
  console.log('[FatSecret] Signing Key:', signingKey);

  // 5. Calculate HMAC-SHA1
  const hash = CryptoJS.HmacSHA1(signatureBaseString, signingKey);
  return CryptoJS.enc.Base64.stringify(hash);
}

export type FoodSearchResult = {
  food_id: string;
  food_name: string;
  brand_name?: string;
  food_description: string;
  serving: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
};

/**
 * Parse the food_description string into serving, calories, and macros.
 * Format: "Per 1 serving - Calories: 300kcal | Fat: 13.00g | Carbs: 32.00g | Protein: 15.00g"
 */
function parseFoodDescription(desc: string): { 
  serving: string; 
  calories: string; 
  protein: string; 
  carbs: string; 
  fat: string; 
} {
  const servingMatch = desc.match(/^(Per .+?) -/);
  const serving = servingMatch ? servingMatch[1] : 'Per serving';

  const caloriesMatch = desc.match(/Calories:\s*([\d.]+)kcal/);
  const calories = caloriesMatch ? caloriesMatch[1] : '0';

  const fatMatch = desc.match(/Fat:\s*([\d.]+)g/);
  const fat = fatMatch ? fatMatch[1] : '0';

  const carbsMatch = desc.match(/Carbs:\s*([\d.]+)g/);
  const carbs = carbsMatch ? carbsMatch[1] : '0';

  const proteinMatch = desc.match(/Protein:\s*([\d.]+)g/);
  const protein = proteinMatch ? proteinMatch[1] : '0';

  return { serving, calories, fat, carbs, protein };
}

/**
 * Search the FatSecret food database using OAuth 1.0.
 */
export async function searchFoods(query: string, maxResults: number = 5): Promise<FoodSearchResult[]> {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error('Missing FatSecret API credentials in .env');
  }

  const oauthParams: Record<string, string> = {
    method: 'foods.search',
    search_expression: query,
    format: 'json',
    max_results: String(maxResults),
    oauth_consumer_key: CONSUMER_KEY,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: Math.random().toString(36).substring(2, 12),
    oauth_version: '1.0',
  };

  // Generate signature
  const signature = generateSignature('POST', API_URL, oauthParams);
  oauthParams.oauth_signature = signature;

  // Build request body
  const body = Object.keys(oauthParams)
    .map((key) => `${rfc3986Encode(key)}=${rfc3986Encode(oauthParams[key])}`)
    .join('&');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FatSecret API Error:', response.status, errorText);
      throw new Error(`FatSecret API failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Check for FatSecret internal errors
    if (data.error) {
      console.error('FatSecret Error Response:', data.error);
      throw new Error(`FatSecret Error: ${data.error.message}`);
    }

    const foods = data?.foods?.food;
    if (!foods) return [];

    const foodArray = Array.isArray(foods) ? foods : [foods];

    return foodArray.map((food: any) => {
      const { serving, calories, protein, carbs, fat } = parseFoodDescription(food.food_description || '');
      return {
        food_id: food.food_id,
        food_name: food.food_name,
        brand_name: food.brand_name,
        food_description: food.food_description,
        serving,
        calories,
        protein,
        carbs,
        fat,
      };
    });
  } catch (error) {
    console.error('Search request failed:', error);
    throw error;
  }
}

const API_KEY_STORAGE_KEY = 'ai_textbook_generator_api_key';
const BASE_URL_STORAGE_KEY = 'ai_textbook_generator_base_url';
const MODEL_NAME_STORAGE_KEY = 'ai_textbook_generator_model_name';

export const saveConfig = (key: string, url: string, model: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
    localStorage.setItem(BASE_URL_STORAGE_KEY, url);
    localStorage.setItem(MODEL_NAME_STORAGE_KEY, model);
  }
};

export const loadConfig = (): { key: string | null, url: string | null, model: string | null } => {
  if (typeof window !== 'undefined') {
    return {
      key: localStorage.getItem(API_KEY_STORAGE_KEY),
      url: localStorage.getItem(BASE_URL_STORAGE_KEY),
      model: localStorage.getItem(MODEL_NAME_STORAGE_KEY)
    };
  }
  return { key: null, url: null, model: null };
};

export const clearConfig = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    localStorage.removeItem(BASE_URL_STORAGE_KEY);
    localStorage.removeItem(MODEL_NAME_STORAGE_KEY);
  }
};

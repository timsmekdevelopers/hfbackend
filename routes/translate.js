const express = require('express');

const router = express.Router();
const translationCache = new Map();
const languageListCache = {
  expiresAt: 0,
  data: null
};
const LANGUAGE_REGISTRY_URL = 'https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry';
const LANGUAGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function translateText(text, targetLanguage) {
  if (!text || !targetLanguage || targetLanguage === 'en') {
    return text;
  }

  const cacheKey = `${targetLanguage}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${encodeURIComponent(targetLanguage)}`;
    const response = await fetch(url);
    const data = await response.json();
    const translated = data?.responseData?.translatedText || text;
    translationCache.set(cacheKey, translated);
    return translated;
  } catch (err) {
    return text;
  }
}

function parseLanguageRegistry(registryText) {
  const records = registryText.split('%%').map((record) => record.trim()).filter(Boolean);
  const seen = new Set();
  const languages = [];

  for (const record of records) {
    const entry = {};
    let currentKey = null;

    for (const rawLine of record.split(/\r?\n/)) {
      const line = rawLine.trimEnd();
      if (!line) {
        continue;
      }
      if (line.startsWith(' ') && currentKey) {
        entry[currentKey][entry[currentKey].length - 1] += ` ${line.trim()}`;
        continue;
      }

      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex);
      const value = line.slice(separatorIndex + 1).trim();
      currentKey = key;
      if (!entry[key]) {
        entry[key] = [];
      }
      entry[key].push(value);
    }

    if (entry.Type?.[0] !== 'language') {
      continue;
    }

    const subtag = entry.Subtag?.[0];
    const description = entry.Description?.[0];
    if (!subtag || !description || entry.Deprecated?.[0]) {
      continue;
    }
    if (subtag.length > 3) {
      continue;
    }
    if (seen.has(subtag)) {
      continue;
    }

    seen.add(subtag);
    languages.push({
      value: subtag,
      label: `${description} (${subtag})`
    });
  }

  languages.sort((a, b) => a.label.localeCompare(b.label));
  return [
    { value: 'en-US', label: 'English (United States)' },
    ...languages
  ];
}

async function getLanguageList() {
  const now = Date.now();
  if (languageListCache.data && languageListCache.expiresAt > now) {
    return languageListCache.data;
  }

  const response = await fetch(LANGUAGE_REGISTRY_URL);
  const text = await response.text();
  const languages = parseLanguageRegistry(text);
  languageListCache.data = languages;
  languageListCache.expiresAt = now + LANGUAGE_CACHE_TTL_MS;
  return languages;
}

router.get('/languages', async (req, res) => {
  try {
    const languages = await getLanguageList();
    res.json({ languages });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { locale, messages } = req.body;
    const targetLanguage = (locale || 'en-US').split('-')[0].toLowerCase();

    if (!messages || typeof messages !== 'object') {
      return res.status(400).json({ msg: 'messages payload is required.' });
    }

    if (targetLanguage === 'en') {
      return res.json({ messages });
    }

    const entries = await Promise.all(
      Object.entries(messages).map(async ([key, value]) => [key, await translateText(value, targetLanguage)])
    );

    res.json({ messages: Object.fromEntries(entries) });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/list', async (req, res) => {
  try {
    const { locale, items } = req.body;
    const targetLanguage = (locale || 'en-US').split('-')[0].toLowerCase();

    if (!Array.isArray(items)) {
      return res.status(400).json({ msg: 'items must be an array.' });
    }

    if (targetLanguage === 'en') {
      return res.json({ items });
    }

    const translatedItems = await Promise.all(items.map((item) => translateText(item, targetLanguage)));
    res.json({ items: translatedItems });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;

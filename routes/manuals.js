const express = require('express');
const PDFDocument = require('pdfkit');
const router = express.Router();
const HFDocument = require('../models/HFDocument');

const MAX_DOWNLOADS_PER_USER = 3;
const translationCache = new Map();

function decodeHtmlEntities(text = '') {
  return String(text)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function htmlToTextBlocks(html = '') {
  const normalized = String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|h1|h2|h3|h4|h5|h6|blockquote|section|article)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<[^>]+>/g, '');

  return decodeHtmlEntities(normalized)
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

async function translateText(text, locale = 'en-US') {
  const targetLanguage = String(locale).split('-')[0].toLowerCase();
  if (!text || targetLanguage === 'en') return text;

  const key = `${targetLanguage}:${text}`;
  if (translationCache.has(key)) return translationCache.get(key);

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${encodeURIComponent(targetLanguage)}`;
    const response = await fetch(url);
    const data = await response.json();
    const translated = data?.responseData?.translatedText || text;
    translationCache.set(key, translated);
    return translated;
  } catch {
    return text;
  }
}

async function translateBlocks(blocks = [], locale = 'en-US') {
  if (!Array.isArray(blocks) || blocks.length === 0) return [];
  const translatedBlocks = await Promise.all(blocks.map((block) => translateText(block, locale)));
  return translatedBlocks;
}

function sanitizeFileName(value = 'hf-document') {
  return String(value).replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 80) || 'hf-document';
}

function getTotalDownloads(downloads = []) {
  return downloads.reduce((sum, row) => sum + (row.count || 0), 0);
}

router.get('/', async (req, res) => {
  try {
    const type = req.query.type === 'guide' ? 'guide' : 'manual';
    const items = await HFDocument.find({ type }).sort({ createdAt: -1 });

    res.json(items.map((item) => ({
      _id: item._id,
      type: item.type,
      topic: item.topic,
      date: item.date,
      contentHtml: item.contentHtml,
      createdByName: item.createdByName,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      totalDownloads: getTotalDownloads(item.downloads)
    })));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const type = req.query.type === 'guide' ? 'guide' : 'manual';
    const items = await HFDocument.find({ type }).sort({ createdAt: -1 });
    const stats = items.map((item) => {
      const totalDownloads = getTotalDownloads(item.downloads);
      return {
        _id: item._id,
        topic: item.topic,
        date: item.date,
        createdByName: item.createdByName,
        createdAt: item.createdAt,
        totalDownloads,
        uniqueDownloaders: item.downloads.length
      };
    });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/user-downloads', async (req, res) => {
  try {
    const { userId } = req.query;
    const type = req.query.type === 'guide' ? 'guide' : 'manual';
    if (!userId) {
      return res.status(400).json({ msg: 'userId is required.' });
    }

    const items = await HFDocument.find({ type }).select('_id downloads');
    const counts = {};

    for (const item of items) {
      const row = item.downloads.find((d) => d.userId === String(userId));
      counts[item._id] = row ? row.count || 0 : 0;
    }

    res.json({ counts, max: MAX_DOWNLOADS_PER_USER });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { type = 'manual', topic, date, contentHtml, createdByName, createdById } = req.body;
    if (!topic || !date || !contentHtml || !createdByName) {
      return res.status(400).json({ msg: 'type, topic, date, contentHtml and createdByName are required.' });
    }

    const doc = new HFDocument({
      type: type === 'guide' ? 'guide' : 'manual',
      topic: String(topic).trim(),
      date: String(date).trim(),
      contentHtml: String(contentHtml),
      createdByName: String(createdByName).trim(),
      createdById: createdById ? String(createdById) : undefined,
      updatedAt: new Date()
    });

    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const item = await HFDocument.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Document not found' });
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const { userId, userName, userRole, locale = 'en-US' } = req.query;
    const item = await HFDocument.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Document not found' });

    const isAdmin = String(userRole || '').toLowerCase() === 'admin';

    if (!isAdmin) {
      if (!userId) {
        return res.status(400).json({ msg: 'userId is required for download tracking.' });
      }

      const index = item.downloads.findIndex((row) => row.userId === String(userId));
      const existing = index >= 0 ? item.downloads[index] : null;
      const currentCount = existing ? existing.count || 0 : 0;

      if (currentCount >= MAX_DOWNLOADS_PER_USER) {
        return res.status(403).json({ msg: `Download limit reached. Maximum is ${MAX_DOWNLOADS_PER_USER} per user.` });
      }

      if (index >= 0) {
        item.downloads[index].count = currentCount + 1;
        item.downloads[index].lastDownloadedAt = new Date();
        if (userName) item.downloads[index].userName = String(userName);
      } else {
        item.downloads.push({
          userId: String(userId),
          userName: userName ? String(userName) : undefined,
          count: 1,
          lastDownloadedAt: new Date()
        });
      }

      item.updatedAt = new Date();
      await item.save();
    }

    const translatedTopic = await translateText(item.topic, locale);
    const translatedDateLabel = await translateText('Date', locale);
    const contentBlocks = htmlToTextBlocks(item.contentHtml);
    const translatedBlocks = await translateBlocks(contentBlocks, locale);
    const translatedText = translatedBlocks.join('\n\n');

    const pdf = new PDFDocument({ margin: 50, size: 'A4' });
    const fileName = `${sanitizeFileName(item.type)}_${sanitizeFileName(item.topic)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    pdf.pipe(res);

    pdf.fontSize(18).text(item.type === 'guide' ? 'HF Guide' : 'HF Manual', { align: 'center' });
    pdf.moveDown(0.8);
    pdf.fontSize(14).text(translatedTopic, { align: 'left' });
    pdf.moveDown(0.2);
    pdf.fontSize(10).fillColor('#555').text(`${translatedDateLabel}: ${item.date}`);
    pdf.moveDown(0.8);
    pdf.fillColor('#000').fontSize(11).text(translatedText, {
      align: 'left',
      lineGap: 2
    });

    pdf.end();
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;

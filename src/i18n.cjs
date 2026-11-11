const { labels, messages } = require('../ui/messages.json');

const languageOf = value => value === 'sr' ? 'sr' : 'en';
const text = (language, key, values = {}) =>
  (language === 'sr' ? key : (labels[key] ?? key))
    .replace(/\{(\w+)\}/g, (token, name) => Object.hasOwn(values, name) ? values[name] : token);

// Translate StageDeck's own messages at the UI boundary. Keep raw Office and
// OS details for diagnostics and preserve their original text where included.
const messagePattern = new RegExp(Object.keys(messages).sort((a,b) => b.length-a.length)
  .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
const localMessage = (language, value) =>
  language === 'sr' || !value ? value : value.replace(messagePattern, match => messages[match]);

function localResult(language, result) {
  if (!result?.error && !result?.message) return result;
  return { ...result,
    ...(result.error && { error: localMessage(language, result.error) }),
    ...(result.message && { message: localMessage(language, result.message) }) };
}

module.exports = { languageOf, text, localMessage, localResult };

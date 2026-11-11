import catalog from './messages.json' with {type:'json'};

export function text(language, key, values = {}) {
  const message = language === 'sr' ? key : (catalog.labels[key] ?? key);
  return message.replace(/\{(\w+)\}/g, (token, name) => Object.hasOwn(values, name) ? values[name] : token);
}

export function translateDocument(language) {
  document.documentElement.lang = language === 'sr' ? 'sr-Latn' : 'en';
  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = text(language, node.dataset.i18n);
  });
  for (const attribute of ['title', 'aria-label', 'placeholder', 'alt']) {
    const data = 'data-i18n-' + attribute;
    document.querySelectorAll('[' + data + ']').forEach(node => {
      node.setAttribute(attribute, text(language, node.getAttribute(data)));
    });
  }
}

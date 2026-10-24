/**
 * Sanitize user input to prevent HTML injection
 * Strips HTML tags and encodes special characters
 */
export function sanitizeHtml(value: any): string {
  if (value === null || value === undefined) return '';
  
  const str = String(value);
  
  // First, remove script and style tags entirely (including their content)
  let sanitized = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove all HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove on* event handlers (onclick, onerror, onload, etc)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Encode special HTML characters
  return sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate if input contains HTML tags
 * Returns true if HTML is detected
 */
export function containsHtml(value: any): boolean {
  if (value === null || value === undefined) return false;
  const str = String(value);
  return /<[^>]*>/g.test(str);
}

/**
 * Strip HTML tags but keep text content
 * More aggressive - removes script/style content entirely
 */
export function stripHtmlTags(value: any): string {
  if (value === null || value === undefined) return '';
  
  let str = String(value);
  
  // Remove script tags and their content entirely
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove style tags and their content entirely
  str = str.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove all other HTML tags but keep text content
  str = str.replace(/<[^>]*>/g, '');
  
  // Remove javascript: protocol
  str = str.replace(/javascript:/gi, '');
  
  // Remove on* event handlers
  str = str.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  str = str.replace(/on\w+\s*=\s*[^\s>]*/gi, '');
  
  return str.trim();
}

/**
 * Sanitize rich-text HTML while preserving safe formatting tags (e.g. <p>, <b>, <i>, <table>, etc.).
 * Strips <script> tags and contents, event handler attributes (on*), and javascript: URLs.
 */
export function sanitizeRichText(value: any): string {
  if (value === null || value === undefined) return '';
  let str = String(value);

  // 1. Strip script tags and their content
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // 2. Strip style tags and their content
  str = str.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // 3. Strip object, embed, iframe, applet, meta, link, base
  str = str.replace(/<\/?(?:iframe|object|embed|applet|meta|link|base)\b[^>]*>/gi, '');

  // 4. Strip javascript: / vbscript: URLs in attributes
  str = str.replace(/(href|src|action|data|poster)\s*=\s*"(?:javascript|vbscript):[^"]*"/gi, '$1=""');
  str = str.replace(/(href|src|action|data|poster)\s*=\s*'(?:javascript|vbscript):[^']*'/gi, '$1=""');
  str = str.replace(/(href|src|action|data|poster)\s*=\s*(?:javascript|vbscript):[^\s>]*/gi, '$1=""');
  str = str.replace(/javascript\s*:/gi, 'blocked:');
  str = str.replace(/vbscript\s*:/gi, 'blocked:');

  // 5. Strip event handler attributes (onclick, onerror, onload, onmouseover, etc.)
  str = str.replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  str = str.replace(/\s+on[a-zA-Z]+(?=[\s>])/gi, '');

  return str.trim();
}


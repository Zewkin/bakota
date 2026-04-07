import fs from 'fs';
import path from 'path';

export const loadTemplate = (serviceId: number | null, templateHtml: string | null) => {
  if (templateHtml) {
    return templateHtml;
  }

  const templatesDir = path.resolve(__dirname, '..', '..', 'templates');
  const candidates = [] as string[];
  if (serviceId !== null) {
    candidates.push(path.join(templatesDir, `service-${serviceId}.html`));
  }
  candidates.push(path.join(templatesDir, 'default.html'));

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      return fs.readFileSync(file, 'utf-8');
    }
  }

  return '$Name,\nВаше бронювання: $Product,\nЗагальна сума: $Sum';
};

export const renderTemplate = (template: string, data: Record<string, string>) => {
  let output = template;
  for (const [key, value] of Object.entries(data)) {
    output = output.replaceAll(`$${key}`, value);
  }
  return output;
};

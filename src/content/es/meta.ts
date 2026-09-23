import type { CourseMeta } from '../types';

export const meta: CourseMeta = {
  id: 'es',
  name: 'Spanisch',
  nativeName: 'Español',
  flag: '🇪🇸',
  variants: [
    { id: 'es-ES', label: 'Spanien', description: 'Kastilisches Spanisch mit vosotros und „th“-Laut bei c/z.', ttsLang: 'es-ES' },
    { id: 'es-LA', label: 'Lateinamerika', description: 'Lateinamerikanisches Spanisch mit ustedes und seseo (c/z wie s).', ttsLang: 'es-MX' },
  ],
};

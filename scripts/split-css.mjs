import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const globalsPath = 'app/globals.css';
const stylesDir = 'app/styles';
const content = readFileSync(globalsPath, 'utf8');
const lines = content.split(/\r?\n/);

// 1-based line numbers; array is 0-based
const themeLight = lines.slice(158, 938).join('\n');   // 159-938
const components = lines.slice(1014, 5749).join('\n'); // 1015-5749
const responsive = lines.slice(5749).join('\n');       // 5750-end

mkdirSync(stylesDir, { recursive: true });
writeFileSync(`${stylesDir}/_theme-light.css`, themeLight, 'utf8');
writeFileSync(`${stylesDir}/_components.css`, components, 'utf8');
writeFileSync(`${stylesDir}/_responsive.css`, responsive, 'utf8');

console.log('Created _theme-light.css, _components.css, _responsive.css');

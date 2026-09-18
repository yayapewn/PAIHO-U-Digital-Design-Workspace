const fs = require('fs');
let content = fs.readFileSync('components/ModelViewer.tsx', 'utf8');

const target1 = `                if (material.emissiveMap !== null) { material.emissiveMap = null; changed = true; }
                if (changed) {`;

const replacement1 = `                if (material.emissiveMap !== null) { material.emissiveMap = null; changed = true; }
                if (material.vertexColors) { material.vertexColors = false; changed = true; }
                if (changed) {`;
content = content.replace(target1, replacement1);

const target2 = `                if (material.emissiveMap !== null) { material.emissiveMap = null; changed = true; }
                if (changed) material.needsUpdate = true;`;

const replacement2 = `                if (material.emissiveMap !== null) { material.emissiveMap = null; changed = true; }
                if (material.vertexColors) { material.vertexColors = false; changed = true; }
                if (changed) material.needsUpdate = true;`;
content = content.replace(target2, replacement2);

fs.writeFileSync('components/ModelViewer.tsx', content);
console.log('Fixed vertexColors issue');

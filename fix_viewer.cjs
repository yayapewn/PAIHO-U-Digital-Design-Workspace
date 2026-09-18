const fs = require('fs');
let code = fs.readFileSync('components/ModelViewer.tsx', 'utf-8');

// Replace the material.map disposal missing in category B or else branch
const target1 = `if (material.map !== null) { material.map = null; changed = true; }`;
const replacement1 = `if (material.map !== null) { 
                    if (material.map !== origMat.map) material.map.dispose(); 
                    material.map = null; 
                    changed = true; 
                }`;

const target2 = `if (material.normalMap !== null) { material.normalMap = null; changed = true; }`;
const replacement2 = `if (material.normalMap !== null) { 
                    if (material.normalMap !== origMat.normalMap) material.normalMap.dispose(); 
                    material.normalMap = null; 
                    changed = true; 
                }`;

code = code.replace(target1, replacement1);
code = code.replace(target2, replacement2);

fs.writeFileSync('components/ModelViewer.tsx', code);
console.log("ModelViewer fixed.");

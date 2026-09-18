const fs = require('fs');
let content = fs.readFileSync('components/ModelViewer.tsx', 'utf8');

const target = `            if (isCategoryB) {
                if (material.map !== null) {
                    material.map = null;
                    mesh.userData.currentTextureUrl = null;
                    material.needsUpdate = true;
                }`;

const replacement = `            if (isCategoryB) {
                let changed = false;
                if (material.map !== null) { material.map = null; changed = true; }
                if (material.aoMap !== null) { material.aoMap = null; changed = true; }
                if (material.lightMap !== null) { material.lightMap = null; changed = true; }
                if (material.emissiveMap !== null) { material.emissiveMap = null; changed = true; }
                if (changed) {
                    mesh.userData.currentTextureUrl = null;
                    material.needsUpdate = true;
                }`;

content = content.replace(target, replacement);

const targetPreview = `            if (['TONGUE', 'MIDSOLE', 'OUTSOLE'].includes(upperName)) {
                if (material.map) {
                    material.map = null;
                    material.needsUpdate = true;
                }
            }`;

const replacementPreview = `            if (['TONGUE', 'MIDSOLE', 'OUTSOLE'].includes(upperName)) {
                let changed = false;
                if (material.map !== null) { material.map = null; changed = true; }
                if (material.aoMap !== null) { material.aoMap = null; changed = true; }
                if (material.lightMap !== null) { material.lightMap = null; changed = true; }
                if (material.emissiveMap !== null) { material.emissiveMap = null; changed = true; }
                if (changed) material.needsUpdate = true;
            }`;

content = content.replace(targetPreview, replacementPreview);

fs.writeFileSync('components/ModelViewer.tsx', content);
console.log('Fixed aoMap issue');

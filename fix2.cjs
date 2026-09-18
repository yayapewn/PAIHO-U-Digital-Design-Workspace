const fs = require('fs');
let content = fs.readFileSync('components/ModelViewer.tsx', 'utf8');

// 1. Remove the Category B logic from useMemo
const useMemoStart = `                // 針對類別 B 部位 (不需花紋貼圖的部位)：卸除底色貼圖，保留 Normal Map
                const upperName = getNormalizedPartName(mesh.name).toUpperCase();
                if (['TONGUE', 'MIDSOLE', 'OUTSOLE'].includes(upperName)) {
                    if (newMat.map) {
                        newMat.map = null;
                        newMat.needsUpdate = true;
                    }
                    newMat.color.setHex(0xffffff); // 預設白底，確保染色無色差
                    mesh.userData.originalMaterial = newMat; // 更新原始材質參照，確保重置時依然無花紋
                }`;
content = content.replace(useMemoStart, "");

// 2. Update the useEffect logic for textureMap
const useEffectMapElse = `        } else {
            if (material.map !== origMat.map) {
                if (material.map) material.map.dispose();
                material.map = origMat.map;
                mesh.userData.currentTextureUrl = null;
                material.needsUpdate = true;
            }
        }`;

const newUseEffectMapElse = `        } else {
            const upperName = getNormalizedPartName(mesh.name).toUpperCase();
            const isCategoryB = ['TONGUE', 'MIDSOLE', 'OUTSOLE'].includes(upperName);
            if (isCategoryB) {
                if (material.map !== null) {
                    material.map = null;
                    mesh.userData.currentTextureUrl = null;
                    material.needsUpdate = true;
                }
            } else {
                if (material.map !== origMat.map) {
                    if (material.map && material.map !== origMat.map) material.map.dispose();
                    material.map = origMat.map;
                    mesh.userData.currentTextureUrl = null;
                    material.needsUpdate = true;
                }
            }
        }`;
content = content.replace(useEffectMapElse, newUseEffectMapElse);

// 3. Update the handlePreviewColor to handle live preview
const previewStart = `      if (mesh) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (material && material.color) {
            material.color.set(color);
        }`;

const newPreviewStart = `      if (mesh) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (material && material.color) {
            material.color.set(color);
            
            const upperName = getNormalizedPartName(mesh.name).toUpperCase();
            if (['TONGUE', 'MIDSOLE', 'OUTSOLE'].includes(upperName)) {
                if (material.map) {
                    material.map = null;
                    material.needsUpdate = true;
                }
            }
        }`;
content = content.replace(previewStart, newPreviewStart);

fs.writeFileSync('components/ModelViewer.tsx', content);
console.log('Fixed successfully');

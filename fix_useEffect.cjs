const fs = require('fs');
let content = fs.readFileSync('components/ModelViewer.tsx', 'utf8');

const startMarker = '  useEffect(() => {\n    cachedMeshes.forEach(mesh => {\n      const config = textureMap[mesh.uuid];';
const endMarker = '  }, [cachedMeshes, textureMap]);';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker) + endMarker.length;

if (startIndex !== -1 && endIndex !== -1) {
    const newContent = `  useEffect(() => {
    cachedMeshes.forEach(mesh => {
      const config = textureMap[mesh.uuid];
      if (config) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (config.color) material.color.set(config.color);
        else material.color.setHex(0xffffff);
        material.roughness = config.roughness;
        material.metalness = config.metalness;
        material.opacity = config.opacity;
        material.alphaTest = 0.05;

        const origMat = Array.isArray(mesh.userData.originalMaterial) ? mesh.userData.originalMaterial[0] : mesh.userData.originalMaterial;

        if (config.url && isUrlSafe(config.url)) {
            if (mesh.userData.currentTextureUrl !== config.url) {
                mesh.userData.currentTextureUrl = config.url; // 立即更新 URL，防止重複觸發載入
                textureLoader.load(config.url, (texture) => {
                    // 確保載入完成時，使用者沒有切換到其他貼圖
                    if (mesh.userData.currentTextureUrl !== config.url) {
                        texture.dispose();
                        return;
                    }
                    
                    texture.flipY = false;
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(config.scale, config.scale);
                    texture.offset.set(config.offsetX, config.offsetY);
                    texture.rotation = (config.rotation * Math.PI) / 180;
                    texture.center.set(0.5, 0.5);
                    
                    if (material.map && material.map !== origMat.map) {
                        material.map.dispose();
                    }
                    material.map = texture;
                    material.needsUpdate = true;
                }, undefined, (err) => {
                    console.error("Texture failed:", config.url, err);
                    if (mesh.userData.currentTextureUrl === config.url) {
                        mesh.userData.currentTextureUrl = null;
                    }
                });
            } else if (material.map && material.map !== origMat.map) {
                material.map.repeat.set(config.scale, config.scale);
                material.map.rotation = (config.rotation * Math.PI) / 180;
                material.map.offset.set(config.offsetX, config.offsetY);
            }
        } else {
            if (material.map !== origMat.map) {
                if (material.map) material.map.dispose();
                material.map = origMat.map;
                mesh.userData.currentTextureUrl = null;
                material.needsUpdate = true;
            }
        }

        if (config.normalUrl && isUrlSafe(config.normalUrl)) {
            if (mesh.userData.currentNormalUrl !== config.normalUrl) {
                mesh.userData.currentNormalUrl = config.normalUrl; // 立即更新 URL
                textureLoader.load(config.normalUrl, (normalTexture) => {
                    // 確保載入完成時，使用者沒有切換到其他貼圖
                    if (mesh.userData.currentNormalUrl !== config.normalUrl) {
                        normalTexture.dispose();
                        return;
                    }
                    normalTexture.flipY = false;
                    normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
                    normalTexture.repeat.set(config.scale, config.scale);
                    normalTexture.offset.set(config.offsetX, config.offsetY);
                    normalTexture.rotation = (config.rotation * Math.PI) / 180;
                    normalTexture.center.set(0.5, 0.5);
                    
                    if (material.normalMap && material.normalMap !== origMat.normalMap) {
                        material.normalMap.dispose();
                    }
                    material.normalMap = normalTexture;
                    material.needsUpdate = true;
                }, undefined, (err) => {
                    console.error("Normal map failed:", config.normalUrl, err);
                    if (mesh.userData.currentNormalUrl === config.normalUrl) {
                        mesh.userData.currentNormalUrl = null;
                    }
                });
            } else if (material.normalMap && material.normalMap !== origMat.normalMap) {
                material.normalMap.repeat.set(config.scale, config.scale);
                material.normalMap.rotation = (config.rotation * Math.PI) / 180;
                material.normalMap.offset.set(config.offsetX, config.offsetY);
            }
        } else {
            if (material.normalMap !== origMat.normalMap) {
                if (material.normalMap) material.normalMap.dispose();
                material.normalMap = origMat.normalMap;
                mesh.userData.currentNormalUrl = null;
                material.needsUpdate = true;
            }
        }
      }
    });
  }, [cachedMeshes, textureMap]);`;

    content = content.slice(0, startIndex) + newContent + content.slice(endIndex);
    fs.writeFileSync('components/ModelViewer.tsx', content);
    console.log('Fixed successfully');
} else {
    console.log('Markers not found');
}

const fs = require('fs');
let content = fs.readFileSync('components/ModelViewer.tsx', 'utf8');

const target = `                if (isPickingColor && onColorPicked) {
                    let pickedHex = null;
                    const standardMat = mat as THREE.MeshStandardMaterial;

                    // 1. 如果有貼圖，嘗試讀取貼圖的該像素顏色 (未受光影影響的原始色)
                    if (standardMat.map && standardMat.map.image && e.uv) {`;

const replacement = `                if (isPickingColor && onColorPicked) {
                    let pickedHex = null;
                    const standardMat = mat as THREE.MeshStandardMaterial;
                    const baseHex = '#' + standardMat.color.getHexString();

                    if (baseHex.toLowerCase() !== '#ffffff') {
                        pickedHex = baseHex;
                    } else if (standardMat.map && standardMat.map.image && e.uv) {
                        // 1. 如果有貼圖且未染色，嘗試讀取貼圖的該像素顏色 (未受光影影響的原始色)`;

content = content.replace(target, replacement);

const target2 = `                            }
                        } catch(err) {
                            console.warn("Texture pixel read failed, falling back to material color", err);
                        }
                    }

                    // 2. 如果沒有貼圖或讀取失敗，回退讀取材質的 Base Color`;

const replacement2 = `                            }
                        } catch(err) {
                            console.warn("Texture pixel read failed, falling back to material color", err);
                        }
                    }

                    // 2. 如果沒有貼圖或讀取失敗，回退讀取材質的 Base Color`;

fs.writeFileSync('components/ModelViewer.tsx', content);
console.log('Fixed color picking logic');

import fs from 'fs';
fetch('https://huggingface.co/yayapewn/huggingface/resolve/main/lace-shoe.glb')
  .then(res => res.arrayBuffer())
  .then(buffer => {
    // just looking for strings that look like node names in the binary (very hacky, but usually works for glTF JSON chunk)
    const view = new Uint8Array(buffer);
    const jsonLength = new DataView(buffer).getUint32(12, true);
    const jsonString = new TextDecoder('utf-8').decode(view.slice(20, 20 + jsonLength));
    const gltf = JSON.parse(jsonString);
    const names = gltf.meshes.map(m => m.name);
    console.log(names);
  });

const { NodeIO } = require('@gltf-transform/core');

async function getMeshes(url) {
    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const io = new NodeIO();
        const document = await io.readBinary(new Uint8Array(buffer));
        const root = document.getRoot();
        const meshes = root.listMeshes();
        return meshes.map(m => m.getName());
    } catch (e) {
        return ["Error: " + e.message];
    }
}

(async () => {
    const fetch = (await import('node-fetch')).default;
    global.fetch = fetch;
    console.log("--- Traveler ---");
    const t = await getMeshes('https://huggingface.co/yayapewn/huggingface/resolve/main/Traveler-shoe.glb');
    console.log(t.join('\n'));
    console.log("--- Lace ---");
    const l = await getMeshes('https://huggingface.co/yayapewn/huggingface/resolve/main/lace-shoe.glb');
    console.log(l.join('\n'));
})();

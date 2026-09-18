
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

/**
 * 根據文字描述生成無縫紋理模式。
 * 使用 Gemini 2.5 Flash Image 模型。
 */
export const generateAiTexture = async (prompt: string): Promise<string> => {
  // 安全性檢查：限制提示詞長度，防止資源濫用
  const maxLength = 200;
  let sanitizedPrompt = prompt.trim();
  
  if (sanitizedPrompt.length > maxLength) {
    sanitizedPrompt = sanitizedPrompt.substring(0, maxLength);
  }

  // 移除可能嘗試進行指令注入的特殊字元
  sanitizedPrompt = sanitizedPrompt.replace(/[<>{}\[\]\\\/]/g, '');

  if (!sanitizedPrompt) {
    throw new Error("提示詞不能為空。");
  }

  // 每次調用時初始化新的實例以確保使用最新配置
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // 優化提示詞，確保生成的圖像是平面、無縫且適合 3D 貼圖的
  const refinedPrompt = `IMAGE_GENERATION: A high-quality, perfectly seamless, flat 2D texture pattern of: ${sanitizedPrompt}. Top-down view, centered, filling the entire square frame. No shadows, no perspective, minimal lighting gradients. Suitable for professional 3D material mapping.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: refinedPrompt,
          },
        ],
      },
    });

    // 遍歷所有 candidate 和 part 以尋找 inlineData (圖像數據)
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            return `data:${mimeType};base64,${base64Data}`;
          }
        }
      }
    }
    
    let reason = "模型未返回圖像數據。";
    if (response.text) {
        reason += " 模型反饋: " + response.text;
    }
    
    throw new Error(reason);

  } catch (error: any) {
    console.error("Gemini 紋理生成錯誤:", error);
    throw new Error(error.message || "生成紋理失敗，請稍後再試。");
  }
};

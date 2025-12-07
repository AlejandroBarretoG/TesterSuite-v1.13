
import { GoogleGenAI, Type } from "@google/genai";

// 1x1 Red Pixel Base64 for Vision Test
const SAMPLE_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export interface TestResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const getAIClient = (apiKey: string) => {
  if (!apiKey) {
    throw new Error("API Key es requerida.");
  }
  // Robust check to ensure GoogleGenAI is constructible
  if (typeof GoogleGenAI !== 'function') {
      throw new Error("GoogleGenAI SDK not loaded correctly. Expected a constructor.");
  }
  try {
    return new GoogleGenAI({ apiKey });
  } catch(e: any) {
    throw new Error("Failed to instantiate GoogleGenAI: " + e.message);
  }
};

/**
 * Generates a musical composition based on style and duration.
 */
export const composeMusic = async (apiKey: string, style: string, duration: 'short' | 'medium' | 'long'): Promise<TestResult> => {
  try {
    const ai = getAIClient(apiKey);
    
    // Define parameters based on duration
    const durationBars = duration === 'short' ? 4 : duration === 'medium' ? 8 : 16;

    const prompt = `
      Act as a music composer. Create a melody in the style: "${style}".
      Length: Approximately ${durationBars} bars.
      
      Return a JSON object with this EXACT structure:
      {
        "tempo": number (BPM, e.g. 120),
        "notes": [
          { "note": "C4", "duration": "4n" },
          { "note": "E4", "duration": "8n" }
        ]
      }

      Rules:
      1. "note": Use scientific pitch notation (C4, F#5, Bb3).
      2. "duration": Use Tone.js notation: "1n" (whole), "2n" (half), "4n" (quarter), "8n" (eighth), "16n" (sixteenth).
      3. Make sure the melody is coherent and pleasant.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tempo: { type: Type.INTEGER, description: "Tempo in BPM" },
            notes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  note: { type: Type.STRING, description: "Scientific pitch notation (e.g. C4)" },
                  duration: { type: Type.STRING, description: "Duration in Tone.js notation (e.g. 4n)" }
                },
                required: ["note", "duration"]
              }
            }
          },
          required: ["tempo", "notes"]
        }
      }
    });

    const text = response.text || "{}";
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error("Invalid JSON from Gemini");
    }

    if (!json.notes || !Array.isArray(json.notes)) {
      throw new Error("Response missing 'notes' array");
    }

    return { 
      success: true, 
      message: "Composition generated successfully.", 
      data: json 
    };

  } catch (error: any) {
    return { success: false, message: error.message || "Error creating music" };
  }
};

export const runGeminiTests = {
  /**
   * 1. Auth & Connection Test
   * Verifies if the client can be instantiated and checks connectivity.
   */
  connect: async (apiKey: string, modelId: string = 'gemini-2.5-flash'): Promise<TestResult> => {
    try {
      const ai = getAIClient(apiKey);
      // We perform a very cheap call to verify the key.
      const response = await ai.models.generateContent({
        model: modelId,
        contents: 'ping',
      });
      
      if (response && response.text) {
        return { success: true, message: `Conexión exitosa con ${modelId}.`, data: { reply: response.text } };
      } else {
        throw new Error("Respuesta vacía del servidor.");
      }
    } catch (error: any) {
      return { success: false, message: error.message || "Error de conexión" };
    }
  },

  /**
   * 2. Text Generation Test
   * Tests standard text generation capabilities.
   */
  generateText: async (apiKey: string, modelId: string = 'gemini-2.5-flash'): Promise<TestResult> => {
    try {
      const ai = getAIClient(apiKey);
      const prompt = "Responde con una sola palabra: 'Funciona'";
      
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
      });

      const text = response.text;
      return { success: true, message: "Generación de texto correcta.", data: { model: modelId, prompt, output: text } };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  /**
   * 3. Streaming Test
   * Tests the streaming capability of the API.
   */
  streamText: async (apiKey: string, modelId: string = 'gemini-2.5-flash'): Promise<TestResult> => {
    try {
      const ai = getAIClient(apiKey);
      const prompt = "Escribe los números del 1 al 5 separados por comas.";
      
      const responseStream = await ai.models.generateContentStream({
        model: modelId,
        contents: prompt,
      });

      let fullText = "";
      let chunkCount = 0;
      
      for await (const chunk of responseStream) {
        fullText += chunk.text;
        chunkCount++;
      }

      return { 
        success: true, 
        message: `Streaming completado en ${chunkCount} fragmentos.`, 
        data: { model: modelId, fullText, chunkCount } 
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  /**
   * 4. Token Count Test
   * Verifies the token counting endpoint.
   */
  countTokens: async (apiKey: string, modelId: string = 'gemini-2.5-flash'): Promise<TestResult> => {
    try {
      const ai = getAIClient(apiKey);
      const prompt = "Why is the sky blue?";
      
      const response = await ai.models.countTokens({
        model: modelId,
        contents: prompt,
      });

      return { 
        success: true, 
        message: "Conteo de tokens exitoso.", 
        data: { model: modelId, prompt, totalTokens: response.totalTokens } 
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  /**
   * 5. Vision (Multimodal) Test
   * Tests sending an image along with text.
   */
  vision: async (apiKey: string, modelId: string = 'gemini-2.5-flash'): Promise<TestResult> => {
    try {
      const ai = getAIClient(apiKey);
      
      // Note: Some models like Flash Lite might have limitations on vision, 
      // but generally standard Flash and Pro support it.
      const response = await ai.models.generateContent({
        model: modelId,
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: SAMPLE_IMAGE_BASE64 } },
            { text: "Describe esta imagen en 5 palabras o menos. (Es un pixel rojo)" }
          ]
        }
      });

      return { 
        success: true, 
        message: "Análisis de visión completado.", 
        data: { model: modelId, output: response.text } 
      };
    } catch (error: any) {
      return { success: false, message: `Error en visión (${modelId}): ${error.message}` };
    }
  },
  
  /**
   * 5.1 Dynamic Image Analysis
   * Updated to detect MIME type correctly from base64 string.
   */
  analyzeImage: async (apiKey: string, modelId: string, base64Image: string, prompt: string, jsonMode: boolean = false): Promise<TestResult> => {
    try {
      const ai = getAIClient(apiKey);
      
      // Detect MIME type from the data URL header
      const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

      // Remove the prefix to get raw base64 data
      const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

      const response = await ai.models.generateContent({
        model: modelId,
        contents: {
          parts: [
            { inlineData: { mimeType: mimeType, data: cleanBase64 } },
            { text: prompt }
          ]
        },
        config: jsonMode ? { responseMimeType: 'application/json' } : undefined
      });

      // Extracción segura de tokens
      const usage = response.usageMetadata || {};

      return { 
        success: true, 
        message: "Análisis completado.", 
        data: { 
          output: response.text || "", // Guard against undefined text
          usage: {
            promptTokens: usage.promptTokenCount || 0,
            responseTokens: usage.candidatesTokenCount || 0,
            totalTokens: usage.totalTokenCount || 0
          }
        } 
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  /**
   * 6. System Instruction Test
   * Tests if the model respects system instructions.
   */
  systemInstruction: async (apiKey: string, modelId: string = 'gemini-2.5-flash'): Promise<TestResult> => {
    try {
      const ai = getAIClient(apiKey);
      const instruction = "Eres un gato. Responde solo con 'Miau'.";
      const prompt = "Hola, ¿cómo estás?";
      
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          systemInstruction: instruction
        }
      });
      
      const text = response.text || "";
      const isCorrect = text.toLowerCase().includes("miau");
      
      return {
        success: isCorrect,
        message: isCorrect ? "Instrucción del sistema respetada." : "El modelo no siguió la instrucción del sistema estrictamente.",
        data: { model: modelId, instruction, prompt, output: text }
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  /**
   * 7. Embedding Test
   * Tests generating embeddings for text.
   */
  embedding: async (apiKey: string): Promise<TestResult> => {
    try {
      const ai = getAIClient(apiKey);
      const text = "Prueba de embedding";
      const model = "text-embedding-004"; 
      
      const response = await ai.models.embedContent({
        model: model,
        contents: [{ parts: [{ text: text }] }]
      });

      const values = response.embeddings?.[0]?.values;

      if (values) {
        return {
          success: true,
          message: `Vector generado correctamente.\nDimensiones: ${values.length}\nMuestra: [${values.slice(0, 3).join(', ')}...]`,
          data: { model, vectorLength: values.length }
        };
      } else {
        return {
            success: false,
            message: `Fallo: Respuesta vacía o malformada.` 
        };
      }
      
    } catch (error: any) {
        return {
            success: false,
            message: `Excepción en Embeddings: ${error.message}`
        };
    }
  },

  /**
   * 8. Generate Chat Response (Legacy One-Shot)
   */
  generateChatResponse: async (
    apiKey: string, 
    modelId: string, 
    systemInstruction: string, 
    history: ChatMessage[], 
    newMessage: string
  ): Promise<string> => {
    try {
      const ai = getAIClient(apiKey);

      const contents = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      contents.push({
        role: 'user',
        parts: [{ text: newMessage }]
      });

      const response = await ai.models.generateContent({
        model: modelId,
        contents: contents,
        config: {
          systemInstruction: systemInstruction
        }
      });

      return response.text || "(Sin respuesta)";
    } catch (error: any) {
      console.error("Chat Error:", error);
      throw new Error(`Error en IA: ${error.message}`);
    }
  },

  /**
   * 9. Generate Chat Response (Streaming)
   * This generator yields text chunks as they arrive.
   */
  generateChatStream: async function* (
    apiKey: string, 
    modelId: string, 
    systemInstruction: string, 
    history: ChatMessage[], 
    newMessage: string
  ): AsyncGenerator<string, void, unknown> {
    try {
      const ai = getAIClient(apiKey);

      // Create a Chat session properly using the client
      const chat = ai.chats.create({
        model: modelId,
        history: history.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        })),
        config: {
          systemInstruction: systemInstruction
        }
      });

      // Send message and get stream
      const resultStream = await chat.sendMessageStream(newMessage);

      for await (const chunk of resultStream) {
        yield chunk.text;
      }

    } catch (error: any) {
      console.error("Chat Stream Error:", error);
      throw new Error(`Error en Stream: ${error.message}`);
    }
  },

  /**
   * 10. Real Image Generation
   * Uses SDK with fallback to REST for Imagen models.
   */
  generateImage: async (apiKey: string, prompt: string, modelId: string = 'imagen-3.0-generate-001'): Promise<TestResult> => {
    const ai = getAIClient(apiKey);
    
    try {
      // STRATEGY A: Imagen Models (SDK first, REST fallback)
      if (modelId.toLowerCase().includes('imagen')) {
         try {
           // 1. Try SDK
           const response = await ai.models.generateImages({
             model: modelId,
             prompt: prompt,
             config: {
               numberOfImages: 1,
               aspectRatio: '1:1',
               outputMimeType: 'image/jpeg'
             }
           });
           
           const base64 = response.generatedImages?.[0]?.image?.imageBytes;
           if (base64) {
             return {
               success: true,
               message: "Imagen generada con éxito (SDK).",
               data: { url: `data:image/jpeg;base64,${base64}` }
             };
           }
         } catch (sdkError: any) {
           console.warn("SDK Image Gen failed, trying REST fallback...", sdkError);
           // If SDK fails (e.g. 404 on model ID), try direct REST which sometimes works for early access models
         }

         // 2. REST Fallback
         const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predict?key=${apiKey}`;
         const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instances: [{ prompt: prompt }],
              parameters: { sampleCount: 1, aspectRatio: "1:1" }
            })
         });

         if (!response.ok) {
           const errData = await response.json().catch(() => ({}));
           throw new Error(errData.error?.message || `Error ${response.status}: Fallo en la API de Imagen`);
         }
         
         const data = await response.json();
         const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
         
         if (base64Image) {
           const mime = data.predictions[0].mimeType || 'image/png';
           return {
             success: true,
             message: "Imagen generada con éxito (REST).",
             data: { url: `data:${mime};base64,${base64Image}` }
           };
         }
         
         throw new Error("No se pudo generar la imagen ni por SDK ni por REST.");
      } 
      
      // STRATEGY B: Gemini Models (e.g. gemini-2.5-flash-image)
      const response = await ai.models.generateContent({
        model: modelId,
        contents: {
            parts: [{ text: prompt }]
        }
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(p => p.inlineData && p.inlineData.data);

      if (imagePart && imagePart.inlineData) {
         const mime = imagePart.inlineData.mimeType || 'image/png';
         const b64 = imagePart.inlineData.data;
         return {
           success: true,
           message: "Imagen generada con éxito (Modelo Gemini).",
           data: { url: `data:${mime};base64,${b64}` }
         };
      }

      // If text is returned, it means the model refused or chatted instead
      const textPart = parts.find(p => p.text);
      if (textPart && textPart.text) {
          throw new Error(`El modelo respondió con texto. Intenta usar un modelo específico de 'Imagen' o simplifica el prompt.`);
      }

      throw new Error("Respuesta vacía o formato desconocido.");

    } catch (error: any) {
      console.error("Image Gen Error:", error);
      let msg = error.message || "Error desconocido";
      
      if (msg.includes("404") || msg.includes("not found")) {
          msg = `El modelo '${modelId}' no fue encontrado. Verifica tu acceso a Imagen 3.`;
      } else if (msg.includes("403") || msg.includes("permission")) {
          msg = `Permiso denegado. Verifica que tu API Key tenga acceso a Vertex AI/Imagen.`;
      }

      return { success: false, message: msg };
    }
  }
};

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import {
  GenerationOptions,
  GenerationResult,
  PromptAnalysisResult,
  GoogleAIConfig,
  GenerationStep
} from '../types/google-ai';

/**
 * Servicio para integración con Google Generative AI
 * Implementa un flujo de dos pasos:
 * 1. Análisis de imágenes para generar prompt optimizado
 * 2. Generación de imagen final usando el prompt optimizado
 */
export class GoogleAIService {
  private genAI: GoogleGenerativeAI;
  private textModel: any;
  private visionModel: any;
  private config: GoogleAIConfig;

  constructor(config: GoogleAIConfig) {
    this.config = {
      textModel: process.env.GOOGLE_AI_MODEL_TEXT || 'gemini-1.0-pro',
      visionModel: process.env.GOOGLE_AI_MODEL_VISION || 'gemini-2.5-flash-image-preview',
      timeout: parseInt(process.env.GOOGLE_AI_TIMEOUT || '30000'), // 30 segundos
      maxRetries: parseInt(process.env.GOOGLE_AI_MAX_RETRIES || '3'),
      ...config
    };

    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    this.textModel = this.genAI.getGenerativeModel({ model: this.config.textModel! });
    this.visionModel = this.genAI.getGenerativeModel({
      model: this.config.visionModel!,
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
  }

  /**
   * Método principal para generar imagen con flujo de dos pasos
   */
  async generateImage(
    userImage: Buffer,
    productImage: Buffer,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const steps: GenerationStep[] = [];

    try {
      // PASO 1: Generar prompt optimizado analizando las imágenes
      const promptStep: GenerationStep = {
        step: 'prompt_analysis',
        startTime: Date.now()
      };

      const promptAnalysis = await this.generateOptimizedPrompt(userImage, productImage, options);

      promptStep.endTime = Date.now();
      promptStep.success = true;
      steps.push(promptStep);

      // PASO 2: Generar imagen usando el prompt optimizado
      const imageStep: GenerationStep = {
        step: 'image_generation',
        startTime: Date.now()
      };

      const finalResult = await this.generateFinalImage(
        userImage,
        productImage,
        promptAnalysis.optimizedPrompt,
        options
      );

      imageStep.endTime = Date.now();
      imageStep.success = true;
      steps.push(imageStep);

      // PASO 3: Guardar la imagen como archivo PNG si hay datos base64
      let savedImagePath: string | undefined;
      if (finalResult.imageBase64) {
        savedImagePath = await this.saveBase64AsFile(finalResult.imageBase64, finalResult.fileName);
      }

      const totalTime = Date.now() - startTime;

      return {
        success: true,
        imageUrl: finalResult.imageUrl,
        imagePath: savedImagePath, // Añadimos la ruta del archivo guardado
        processingTime: totalTime,
        usedPrompt: promptAnalysis.optimizedPrompt,
        metadata: {
          model: this.config.visionModel!,
          twoStepProcess: true,
          promptGenerationTime: promptAnalysis.analysisTime,
          imageGenerationTime: imageStep.endTime! - imageStep.startTime,
          optimizedPrompt: promptAnalysis.optimizedPrompt,
          savedToFile: !!savedImagePath // Indicamos si se guardó en archivo
        }
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;

      return {
        success: false,
        error: `Google AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processingTime: totalTime,
        metadata: {
          model: this.config.visionModel!,
          twoStepProcess: true
        }
      };
    }
  }

  /**
   * PASO 1: Generar prompt optimizado analizando las imágenes
   */
  private async generateOptimizedPrompt(
    userImage: Buffer,
    productImage: Buffer,
    options: GenerationOptions
  ): Promise<PromptAnalysisResult> {
    const startTime = Date.now();

    const analysisPrompt = this.buildAnalysisPrompt(options);

    const imageParts = [
      {
        inlineData: {
          data: userImage.toString('base64'),
          mimeType: 'image/jpeg'
        }
      },
      {
        inlineData: {
          data: productImage.toString('base64'),
          mimeType: 'image/jpeg'
        }
      }
    ];

    try {
      const result = await this.executeWithRetry(async () => {
        return await this.visionModel.generateContent([analysisPrompt, ...imageParts]);
      });

      const response = await result.response;
      const optimizedPrompt = response.text().trim();

      const analysisTime = Date.now() - startTime;

      return {
        optimizedPrompt,
        detectedProductType: this.extractProductType(optimizedPrompt, options.productType),
        confidence: 0.85, // Placeholder - en producción se podría calcular basado en la respuesta
        analysisTime
      };

    } catch (error) {
      throw new Error(`Prompt analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * PASO 2: Generar imagen final usando el prompt optimizado
   */
  private async generateFinalImage(
    userImage: Buffer,
    productImage: Buffer,
    optimizedPrompt: string,
    options: GenerationOptions
  ): Promise<{ imageUrl: string, imageBase64?: string, fileName: string }> {
    const imageParts = [
      {
        inlineData: {
          data: userImage.toString('base64'),
          mimeType: 'image/jpeg'
        }
      },
      {
        inlineData: {
          data: productImage.toString('base64'),
          mimeType: 'image/jpeg'
        }
      }
    ];

    const finalPrompt = this.buildFinalPrompt(optimizedPrompt, options);

    try {
      const response = await this.executeWithRetry(async () => {
        return await this.visionModel.generateContent([finalPrompt, ...imageParts]);
      });

      const result = await response.response;
      const imageBase64 = result.candidates?.[0]?.content?.parts?.[1]?.inlineData?.data;

      if (!imageBase64) {
        throw new Error('No image data received from Google AI');
      }

      // Generamos un nombre de archivo único para la imagen
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substr(2, 9);
      const fileName = `${timestamp}-${randomString}.jpg`;
      
      // Generamos una URL para acceder a la imagen guardada
      const imageUrl = `https://generated-images.mirrorly.com/${fileName}`;

      return {
        imageUrl,
        imageBase64,
        fileName
      };

    } catch (error) {
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Construye el prompt para el análisis inicial de imágenes
   */
  private buildAnalysisPrompt(options: GenerationOptions): string {
    return `
Analiza estas dos imágenes:
1. Primera imagen: Una persona
2. Segunda imagen: Un producto de e-commerce

Basándote en el análisis de ambas imágenes, genera un prompt detallado y específico para crear una imagen compuesta que:
- Muestre a la persona usando/portando el producto de manera natural y atractiva
- Sea perfecta para aumentar las ventas en e-commerce
- Tenga iluminación profesional y composición atractiva
- Mantenga la identidad de la persona y las características del producto
- Sea realista y creíble para el consumidor

Tipo de producto detectado: ${options.productType || 'automático'}
Estilo deseado: ${options.style || 'profesional'}
Calidad requerida: ${options.quality || 'high'}

IMPORTANTE: Devuelve SOLO el prompt optimizado, sin explicaciones adicionales.
El prompt debe ser específico, detallado y orientado a generar una imagen de alta calidad para e-commerce.
    `.trim();
  }

  /**
   * Construye el prompt final para la generación de imagen
   */
  private buildFinalPrompt(optimizedPrompt: string, options: GenerationOptions): string {
    return `${optimizedPrompt}

INSTRUCCIONES TÉCNICAS ADICIONALES:
- Mantén la calidad profesional de e-commerce
- Asegúrate de que la composición sea atractiva para ventas
- La imagen debe verse natural y creíble
- Mantén la resolución alta para uso web
- Estilo: ${options.style || 'profesional'}
- Calidad: ${options.quality || 'high'}
- Iluminación: profesional y uniforme
- Fondo: apropiado para e-commerce

La imagen final debe ser perfecta para mostrar en una tienda online y ayudar al cliente a visualizarse usando el producto.
    `.trim();
  }

  /**
   * Extrae el tipo de producto del prompt optimizado
   */
  private extractProductType(prompt: string, originalType?: string): string {
    if (originalType && originalType !== 'automático') {
      return originalType;
    }

    // Lógica simple para detectar tipo de producto basado en palabras clave
    const productKeywords = {
      clothing: ['ropa', 'camisa', 'pantalón', 'vestido', 'blusa', 'camiseta'],
      jewelry: ['joya', 'collar', 'anillo', 'pulsera', 'pendientes', 'aretes'],
      accessories: ['accesorio', 'bolso', 'cartera', 'cinturón', 'gorra', 'sombrero'],
      shoes: ['zapato', 'calzado', 'sandalia', 'bota', 'tenis', 'zapatilla'],
      bags: ['bolsa', 'mochila', 'maleta', 'cartera', 'bolso']
    };

    const lowerPrompt = prompt.toLowerCase();

    for (const [type, keywords] of Object.entries(productKeywords)) {
      if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
        return type;
      }
    }

    return 'automático';
  }

  /**
   * Ejecuta una operación con reintentos en caso de fallo
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxRetries!; attempt++) {
      try {
        return await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout)
          )
        ]);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt === this.config.maxRetries) {
          break;
        }

        // Espera exponencial entre reintentos
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Guarda una imagen base64 como archivo PNG
   * @param base64Data Datos de la imagen en formato base64
   * @param fileName Nombre del archivo a guardar
   * @returns Ruta del archivo guardado
   */
  private async saveBase64AsFile(base64Data: string, fileName: string): Promise<string> {
    const fs = require('fs');
    const path = require('path');

    // Crear directorio de imágenes si no existe
    const uploadsDir = path.join(__dirname, '../../uploads/generated');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Eliminar el prefijo de datos base64 si existe
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');

    // Crear buffer desde los datos base64
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // Generar nombre de archivo único si no se proporciona
    const finalFileName = fileName || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.png`;
    const filePath = path.join(uploadsDir, finalFileName);

    // Escribir el archivo
    await fs.promises.writeFile(filePath, imageBuffer);

    return filePath;
  }

  /**
   * Valida la configuración del servicio
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.apiKey) {
      errors.push('API key is required');
    }

    if (this.config.timeout && this.config.timeout < 5000) {
      errors.push('Timeout should be at least 5000ms');
    }

    if (this.config.maxRetries && (this.config.maxRetries < 1 || this.config.maxRetries > 5)) {
      errors.push('Max retries should be between 1 and 5');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtiene información sobre los modelos disponibles
   */
  public getModelInfo(): { textModel: string; visionModel: string } {
    return {
      textModel: this.config.textModel!,
      visionModel: this.config.visionModel!
    };
  }
}
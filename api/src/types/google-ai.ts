/**
 * Interfaces para el servicio de Google Generative AI
 */

export interface GenerationOptions {
  style?: 'realistic' | 'artistic' | 'professional';
  quality?: 'standard' | 'high' | 'premium';
  productType?: 'clothing' | 'jewelry' | 'accessories' | 'shoes' | 'bags' | 'automático';
}

export interface GenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  error?: string;
  processingTime?: number;
  usedPrompt?: string;
  metadata?: GenerationMetadata;
}

export interface GenerationMetadata {
  model: string;
  twoStepProcess: boolean;
  promptGenerationTime?: number;
  imageGenerationTime?: number;
  optimizedPrompt?: string;
}

export interface PromptAnalysisResult {
  optimizedPrompt: string;
  detectedProductType: string;
  confidence: number;
  analysisTime: number;
}

export interface ImageAnalysisInput {
  userImage: Buffer;
  productImage: Buffer;
  options: GenerationOptions;
}

export interface GoogleAIConfig {
  apiKey: string;
  textModel?: string;
  visionModel?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface AIModelResponse {
  text(): Promise<string>;
  response: any;
}

export interface GenerationStep {
  step: 'prompt_analysis' | 'image_generation';
  startTime: number;
  endTime?: number;
  success?: boolean;
  error?: string;
}
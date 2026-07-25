import type {  AIMessage, AIContext, AIToolCall, GoujjiAIConfig  }   from '../../types/ai';
import { generateLocalResponse } from './promptService';
// Ensure promptService exists or will be created to export generateLocalResponse
// export const generateLocalResponse = (messages: AIMessage[], context: AIContext) => Promise<string>

export class GoujjiAIEngine {
  private config?: GoujjiAIConfig;
  private useLocalEngine: boolean;

  constructor(config?: GoujjiAIConfig) {
    this.config = config;
    this.useLocalEngine = !config?.apiKey;
  }

  /**
   * Main chat method. Calls local engine or mock OpenAI based on config.
   */
  async chat(messages: AIMessage[], context: AIContext): Promise<string> {
    if (this.useLocalEngine) {
      const lastMsg = messages.length > 0 ? messages[messages.length - 1].content : '';
      return generateLocalResponse(lastMsg, context);
    } else {
      // Mock OpenAI implementation
      return this.mockOpenAICall(messages, context);
    }
  }

  /**
   * Simulates streaming by revealing the response word-by-word with slight delays.
   */
  async streamChat(messages: AIMessage[], context: AIContext, onChunk: (text: string) => void): Promise<string> {
    const fullResponse = await this.chat(messages, context);
    await this.simulateStreaming(fullResponse, onChunk);
    return fullResponse;
  }

  /**
   * Detects if the user's message requires a tool call based on primitive intent matching.
   */
  detectToolCalls(message: string): AIToolCall[] {
    const lowerMsg = message.toLowerCase();
    const calls: AIToolCall[] = [];

    if (lowerMsg.includes('book') && (lowerMsg.includes('grooming') || lowerMsg.includes('boarding') || lowerMsg.includes('training'))) {
      let type = 'boarding';
      if (lowerMsg.includes('grooming')) type = 'grooming';
      else if (lowerMsg.includes('training')) type = 'training';
      
      calls.push({
        id: `call_${Date.now()}`,
        name: 'searchFacilities',
        arguments: { type }
      });
    }

    if (lowerMsg.includes('my pets') || lowerMsg.includes('pets info')) {
      calls.push({
        id: `call_${Date.now()}`,
        name: 'getPetInfo',
        arguments: {}
      });
    }

    if (lowerMsg.includes('vet') && lowerMsg.includes('near')) {
      calls.push({
        id: `call_${Date.now()}`,
        name: 'getNearbyVets',
        arguments: {}
      });
    }

    if (lowerMsg.includes('vaccination') || lowerMsg.includes('shots')) {
      calls.push({
        id: `call_${Date.now()}`,
        name: 'getVaccinationSchedule',
        arguments: {}
      });
    }

    return calls;
  }

  /**
   * Simulates natural streaming delay (25-50ms random), longer on commas/periods.
   */
  private async simulateStreaming(text: string, onChunk: (text: string) => void): Promise<void> {
    const words = text.split(/(\s+)/); // Split by whitespace keeping the whitespace
    let currentText = '';

    for (const word of words) {
      currentText += word;
      onChunk(currentText);

      // Vary delay slightly between 25-50ms
      let delay = Math.floor(Math.random() * 26) + 25;

      // Pause longer on periods and commas
      if (word.includes('.') || word.includes('!') || word.includes('?')) {
        delay += 150;
      } else if (word.includes(',')) {
        delay += 75;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Mock OpenAI call structure
   */
  private async mockOpenAICall(messages: AIMessage[], context: AIContext): Promise<string> {
    // In reality this would be an actual fetch to api.openai.com/v1/chat/completions
    console.log('Mocking OpenAI call with config:', this.config);
    return "This is a response from the mock OpenAI implementation. Set useLocalEngine to true for local behavior.";
  }
}

export const goujjiAI = new GoujjiAIEngine();

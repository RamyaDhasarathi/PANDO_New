type LiveClientOptions = {
  apiKey: string;
  onAudioData: (base64Pcm: string) => void;
  onToolCall: (call: any) => Promise<any>;
  onSetupComplete: () => void;
  onTurnComplete: () => void;
  systemInstruction?: string;
};

export class LiveAPIClient {
  private ws: WebSocket | null = null;
  private options: LiveClientOptions;

  constructor(options: LiveClientOptions) {
    this.options = options;
  }

  connect() {
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.options.apiKey}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.sendSetup();
    };

    this.ws.onmessage = async (event) => {
      let data;
      if (event.data instanceof Blob) {
        const text = await event.data.text();
        data = JSON.parse(text);
      } else {
        data = JSON.parse(event.data);
      }
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      console.log("[LiveAPI] Disconnected");
    };
  }

  private sendSetup() {
    this.ws?.send(JSON.stringify({
      setup: {
        model: "models/gemini-2.0-flash-exp",
        systemInstruction: this.options.systemInstruction ? {
          parts: [{ text: this.options.systemInstruction }]
        } : undefined,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede" // Warm, natural voice
              }
            }
          }
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: "searchProperties",
                description: "Search for properties based on user preferences",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    location: { type: "STRING" },
                    budget: { type: "NUMBER" },
                    propertyType: { type: "STRING" },
                    bedrooms: { type: "NUMBER" }
                  }
                }
              },
              {
                name: "openProperty",
                description: "Open the full details view for a specific property",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    propertyId: { type: "STRING" }
                  }
                }
              },
              {
                name: "describeProperty",
                description: "Give a brief overview of a property (do NOT use this if they ask for full details)",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    propertyId: { type: "STRING" }
                  }
                }
              },
              {
                name: "whyProperty",
                description: "Explain why this property was recommended / its differentiating advantages",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    propertyId: { type: "STRING" }
                  }
                }
              },
              {
                name: "collectAuthDetails",
                description: "Collect user authentication details incrementally. Call this when you learn their name, email, or phone.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    email: { type: "STRING" },
                    phone: { type: "STRING" },
                    isComplete: { type: "BOOLEAN", description: "Set to true when all three (name, email, phone) are provided." }
                  }
                }
              }
            ]
          }
        ]
      }
    }));
  }

  private async handleMessage(data: any) {
    if (data.setupComplete) {
      this.options.onSetupComplete();
    }
    
    if (data.serverContent?.modelTurn?.parts) {
      for (const part of data.serverContent.modelTurn.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith("audio/pcm")) {
          this.options.onAudioData(part.inlineData.data);
        }
        if (part.functionCall) {
          const result = await this.options.onToolCall(part.functionCall);
          this.sendToolResponse(part.functionCall.id, part.functionCall.name, result);
        }
      }
    }
    
    if (data.serverContent?.turnComplete) {
      this.options.onTurnComplete();
    }
  }

  public sendAudioChunk(base64Pcm: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: "audio/pcm;rate=16000",
              data: base64Pcm
            }
          ]
        }
      }));
    }
  }

  public sendTextMessage(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ text }]
            }
          ],
          turnComplete: true
        }
      }));
    }
  }

  public sendToolResponse(id: string, name: string, response: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        toolResponse: {
          functionResponses: [
            {
              id,
              name,
              response
            }
          ]
        }
      }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

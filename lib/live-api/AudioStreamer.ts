import { speechMotion } from "../speechMotion";

export class AudioStreamer {
  private audioContext: AudioContext;
  /** Everything Pando plays passes through here on its way out, for lip-sync. */
  private analyser: AnalyserNode;
  private nextPlayTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  
  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 24000 }); // Gemini live API output is typically 24kHz
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.connect(this.audioContext.destination);
    speechMotion.attachAnalyser(this.analyser);
  }
  
  public get context() {
    return this.audioContext;
  }

  public async playPcm(base64Data: string) {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Decode base64 to Int16Array
    const binary = window.atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16Data = new Int16Array(bytes.buffer);
    
    // Convert Int16 to Float32
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32768.0;
    }
    
    // Create AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, 24000);
    audioBuffer.getChannelData(0).set(float32Data);
    
    // Play it
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.analyser);
    
    // Schedule seamless playback
    if (this.nextPlayTime < this.audioContext.currentTime) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
    
    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
    };
  }
  
  public stopAndClear() {
    this.activeSources.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    this.activeSources.clear();
    this.nextPlayTime = this.audioContext.currentTime;
  }
}

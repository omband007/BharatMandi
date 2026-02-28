/**
 * VoiceInputButton Component
 * 
 * A reusable voice input component that can be attached to any text input field.
 * Provides microphone recording, real-time transcription, and visual feedback.
 * 
 * Requirements: 6.4, 6.7, 6.9, 6.10, 6.11
 * 
 * Usage:
 * ```html
 * <input type="text" id="myInput">
 * <button onclick="VoiceInput.attachToInput('myInput')">🎤</button>
 * ```
 */

class VoiceInputButton {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordingStartTime = null;
    this.recordingTimer = null;
    this.currentInputId = null;
    this.onTranscriptionCallback = null;
    this.maxRecordingTime = 60000; // 60 seconds
    this.apiBase = 'http://localhost:3000/api';
  }

  /**
   * Attach voice input to a text input field
   * 
   * @param {string} inputId - ID of the input element
   * @param {object} options - Configuration options
   * @param {string} options.language - Language code for transcription (optional, auto-detect if not provided)
   * @param {function} options.onTranscription - Callback when transcription completes
   * @param {function} options.onError - Callback when error occurs
   */
  async attachToInput(inputId, options = {}) {
    this.currentInputId = inputId;
    this.onTranscriptionCallback = options.onTranscription;
    this.language = options.language;
    this.onErrorCallback = options.onError;

    const inputElement = document.getElementById(inputId);
    if (!inputElement) {
      console.error(`[VoiceInput] Input element with id "${inputId}" not found`);
      return;
    }

    // Create voice input UI if it doesn't exist
    if (!document.getElementById(`voice-ui-${inputId}`)) {
      this.createVoiceUI(inputId);
    }

    // Start recording
    await this.startRecording();
  }

  /**
   * Create voice input UI elements
   */
  createVoiceUI(inputId) {
    const inputElement = document.getElementById(inputId);
    const container = document.createElement('div');
    container.id = `voice-ui-${inputId}`;
    container.style.cssText = `
      position: relative;
      margin-top: 10px;
      padding: 15px;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      display: none;
    `;

    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <div class="recording-dot" style="
          width: 12px;
          height: 12px;
          background: #dc3545;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        "></div>
        <span id="voice-status-${inputId}" style="font-weight: 600; color: #856404;">Recording...</span>
        <span id="voice-timer-${inputId}" style="color: #856404;">00:00</span>
      </div>
      <div style="height: 4px; background: #e0e0e0; border-radius: 2px; overflow: hidden; margin-bottom: 10px;">
        <div id="voice-progress-${inputId}" style="
          height: 100%;
          background: #dc3545;
          width: 0%;
          transition: width 0.1s;
        "></div>
      </div>
      <div style="display: flex; gap: 10px;">
        <button id="voice-stop-${inputId}" style="
          flex: 1;
          padding: 8px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        ">⏹️ Stop Recording</button>
        <button id="voice-cancel-${inputId}" style="
          padding: 8px 16px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        ">❌ Cancel</button>
      </div>
    `;

    // Add CSS animation
    if (!document.getElementById('voice-input-styles')) {
      const style = document.createElement('style');
      style.id = 'voice-input-styles';
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `;
      document.head.appendChild(style);
    }

    // Insert after input element
    inputElement.parentNode.insertBefore(container, inputElement.nextSibling);

    // Add event listeners
    document.getElementById(`voice-stop-${inputId}`).addEventListener('click', () => {
      this.stopRecording();
    });

    document.getElementById(`voice-cancel-${inputId}`).addEventListener('click', () => {
      this.cancelRecording();
    });
  }

  /**
   * Start recording audio from microphone
   */
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };
      
      this.mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Clear timer
        if (this.recordingTimer) {
          clearInterval(this.recordingTimer);
          this.recordingTimer = null;
        }
        
        // Process recording
        await this.processRecording();
      };
      
      this.mediaRecorder.start();
      this.recordingStartTime = Date.now();
      
      // Show UI
      const uiElement = document.getElementById(`voice-ui-${this.currentInputId}`);
      if (uiElement) {
        uiElement.style.display = 'block';
      }
      
      // Start timer
      this.recordingTimer = setInterval(() => this.updateRecordingTime(), 100);
      
      // Auto-stop at max time
      setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          this.stopRecording();
        }
      }, this.maxRecordingTime);
      
    } catch (error) {
      console.error('[VoiceInput] Microphone access error:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      this.hideUI();
    }
  }

  /**
   * Stop recording
   */
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  /**
   * Cancel recording
   */
  cancelRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.audioChunks = []; // Clear chunks to prevent processing
    }
    this.hideUI();
  }

  /**
   * Update recording time display
   */
  updateRecordingTime() {
    if (!this.recordingStartTime) return;
    
    const elapsed = Date.now() - this.recordingStartTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    const timeString = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    const timerElement = document.getElementById(`voice-timer-${this.currentInputId}`);
    if (timerElement) {
      timerElement.textContent = timeString;
    }
    
    // Update progress bar
    const progress = Math.min((elapsed / this.maxRecordingTime) * 100, 100);
    const progressElement = document.getElementById(`voice-progress-${this.currentInputId}`);
    if (progressElement) {
      progressElement.style.width = `${progress}%`;
    }
  }

  /**
   * Process recorded audio and transcribe
   */
  async processRecording() {
    if (this.audioChunks.length === 0) {
      this.hideUI();
      return;
    }

    const statusElement = document.getElementById(`voice-status-${this.currentInputId}`);
    if (statusElement) {
      statusElement.textContent = 'Processing...';
    }

    try {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
      const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });

      // Transcribe audio
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('format', 'wav');
      if (this.language) {
        formData.append('language', this.language);
      }

      const response = await fetch(`${this.apiBase}/voice/transcribe`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success && data.text) {
        // Update input field
        const inputElement = document.getElementById(this.currentInputId);
        if (inputElement) {
          inputElement.value = data.text;
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Call callback if provided
        if (this.onTranscriptionCallback) {
          this.onTranscriptionCallback(data);
        }

        // Show success briefly
        if (statusElement) {
          statusElement.textContent = '✅ Transcription complete!';
          statusElement.style.color = '#155724';
        }

        setTimeout(() => this.hideUI(), 2000);
      } else {
        throw new Error(data.error || 'Transcription failed');
      }
    } catch (error) {
      console.error('[VoiceInput] Transcription error:', error);
      
      if (statusElement) {
        statusElement.textContent = `❌ Error: ${error.message}`;
        statusElement.style.color = '#721c24';
      }

      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }

      setTimeout(() => this.hideUI(), 3000);
    }
  }

  /**
   * Hide voice input UI
   */
  hideUI() {
    const uiElement = document.getElementById(`voice-ui-${this.currentInputId}`);
    if (uiElement) {
      uiElement.style.display = 'none';
    }
  }
}

// Create singleton instance
const VoiceInput = new VoiceInputButton();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoiceInput;
}

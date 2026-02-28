/**
 * AudioPlayer Component
 * 
 * A reusable audio player component for text-to-speech playback.
 * Provides play/pause controls, speed adjustment, and text highlighting.
 * 
 * Requirements: 7.6, 7.7, 7.8, 7.9, 7.11, 7.15
 * 
 * Usage:
 * ```javascript
 * AudioPlayer.readAloud('Hello world', 'en', { speed: 1.0 });
 * ```
 */

class AudioPlayerComponent {
  constructor() {
    this.currentAudio = null;
    this.currentText = null;
    this.currentLanguage = null;
    this.currentSpeed = 1.0;
    this.isPlaying = false;
    this.apiBase = 'http://localhost:3000/api';
    this.playerId = 'audio-player-widget';
  }

  /**
   * Read text aloud using text-to-speech
   * 
   * @param {string} text - Text to read aloud
   * @param {string} language - Language code (en, hi, ta, etc.)
   * @param {object} options - Configuration options
   * @param {number} options.speed - Speech speed (0.5 to 2.0)
   * @param {function} options.onStart - Callback when playback starts
   * @param {function} options.onEnd - Callback when playback ends
   * @param {function} options.onError - Callback when error occurs
   */
  async readAloud(text, language = 'en', options = {}) {
    this.currentText = text;
    this.currentLanguage = language;
    this.currentSpeed = options.speed || 1.0;
    this.onStartCallback = options.onStart;
    this.onEndCallback = options.onEnd;
    this.onErrorCallback = options.onError;

    try {
      // Show loading state
      this.showPlayer('Loading...');

      // Synthesize speech
      const response = await fetch(`${this.apiBase}/voice/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language,
          speed: this.currentSpeed
        })
      });

      const data = await response.json();

      if (!data.success || !data.audioUrl) {
        throw new Error(data.error || 'Speech synthesis failed');
      }

      // Create audio element
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }

      this.currentAudio = new Audio(data.audioUrl);
      
      // Add event listeners
      this.currentAudio.addEventListener('play', () => {
        this.isPlaying = true;
        this.updatePlayerUI();
        if (this.onStartCallback) {
          this.onStartCallback();
        }
      });

      this.currentAudio.addEventListener('pause', () => {
        this.isPlaying = false;
        this.updatePlayerUI();
      });

      this.currentAudio.addEventListener('ended', () => {
        this.isPlaying = false;
        this.updatePlayerUI();
        if (this.onEndCallback) {
          this.onEndCallback();
        }
      });

      this.currentAudio.addEventListener('error', (error) => {
        console.error('[AudioPlayer] Playback error:', error);
        this.showError('Playback failed');
        if (this.onErrorCallback) {
          this.onErrorCallback(error);
        }
      });

      // Show player and start playback
      this.showPlayer();
      this.currentAudio.play();

    } catch (error) {
      console.error('[AudioPlayer] Error:', error);
      this.showError(error.message);
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    }
  }

  /**
   * Show audio player widget
   */
  showPlayer(statusText = null) {
    let player = document.getElementById(this.playerId);
    
    if (!player) {
      player = document.createElement('div');
      player.id = this.playerId;
      player.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        border-radius: 12px;
        padding: 15px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        min-width: 300px;
        max-width: 400px;
      `;
      document.body.appendChild(player);
    }

    if (statusText) {
      player.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="loading-spinner" style="
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          <span style="color: #666;">${statusText}</span>
        </div>
      `;

      // Add spinner animation
      if (!document.getElementById('audio-player-styles')) {
        const style = document.createElement('style');
        style.id = 'audio-player-styles';
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      this.updatePlayerUI();
    }

    player.style.display = 'block';
  }

  /**
   * Update player UI
   */
  updatePlayerUI() {
    const player = document.getElementById(this.playerId);
    if (!player) return;

    const playPauseIcon = this.isPlaying ? '⏸️' : '▶️';
    const playPauseText = this.isPlaying ? 'Pause' : 'Play';

    player.innerHTML = `
      <div style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
          <strong style="color: #667eea;">🔊 Audio Player</strong>
          <button onclick="AudioPlayer.close()" style="
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            color: #999;
          ">×</button>
        </div>
        <div style="
          font-size: 13px;
          color: #666;
          max-height: 60px;
          overflow-y: auto;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 10px;
        ">${this.currentText}</div>
      </div>
      
      <div style="display: flex; gap: 8px; margin-bottom: 10px;">
        <button onclick="AudioPlayer.togglePlayPause()" style="
          flex: 1;
          padding: 8px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        ">${playPauseIcon} ${playPauseText}</button>
        
        <button onclick="AudioPlayer.stop()" style="
          padding: 8px 16px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        ">⏹️ Stop</button>
      </div>

      <div style="margin-bottom: 8px;">
        <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">
          Speed: <span id="speed-value">${this.currentSpeed}x</span>
        </label>
        <input type="range" 
               min="0.5" 
               max="2.0" 
               step="0.1" 
               value="${this.currentSpeed}"
               onchange="AudioPlayer.changeSpeed(this.value)"
               style="width: 100%;">
      </div>

      <div style="font-size: 11px; color: #999; text-align: center;">
        Language: ${this.getLanguageName(this.currentLanguage)}
      </div>
    `;
  }

  /**
   * Toggle play/pause
   */
  togglePlayPause() {
    if (!this.currentAudio) return;

    if (this.isPlaying) {
      this.currentAudio.pause();
    } else {
      this.currentAudio.play();
    }
  }

  /**
   * Stop playback
   */
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
    this.close();
  }

  /**
   * Change playback speed
   */
  async changeSpeed(speed) {
    this.currentSpeed = parseFloat(speed);
    
    // Update speed display
    const speedValue = document.getElementById('speed-value');
    if (speedValue) {
      speedValue.textContent = `${this.currentSpeed}x`;
    }

    // Re-synthesize with new speed
    if (this.currentText && this.currentLanguage) {
      const wasPlaying = this.isPlaying;
      await this.readAloud(this.currentText, this.currentLanguage, {
        speed: this.currentSpeed,
        onStart: this.onStartCallback,
        onEnd: this.onEndCallback,
        onError: this.onErrorCallback
      });
      
      if (!wasPlaying) {
        this.currentAudio.pause();
      }
    }
  }

  /**
   * Close player
   */
  close() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    const player = document.getElementById(this.playerId);
    if (player) {
      player.style.display = 'none';
    }

    this.isPlaying = false;
  }

  /**
   * Show error message
   */
  showError(message) {
    const player = document.getElementById(this.playerId);
    if (!player) return;

    player.innerHTML = `
      <div style="color: #721c24; background: #f8d7da; padding: 10px; border-radius: 6px;">
        <strong>❌ Error</strong><br>
        ${message}
      </div>
      <button onclick="AudioPlayer.close()" style="
        width: 100%;
        margin-top: 10px;
        padding: 8px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
      ">Close</button>
    `;
  }

  /**
   * Get language name from code
   */
  getLanguageName(code) {
    const languages = {
      'en': 'English',
      'hi': 'Hindi',
      'pa': 'Punjabi',
      'mr': 'Marathi',
      'ta': 'Tamil',
      'te': 'Telugu',
      'bn': 'Bengali',
      'gu': 'Gujarati',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'or': 'Odia'
    };
    return languages[code] || code;
  }

  /**
   * Add "Read Aloud" button to an element
   * 
   * @param {string} elementId - ID of element containing text
   * @param {string} language - Language code
   * @param {object} options - Configuration options
   */
  addReadAloudButton(elementId, language = 'en', options = {}) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`[AudioPlayer] Element with id "${elementId}" not found`);
      return;
    }

    // Check if button already exists
    if (document.getElementById(`read-aloud-${elementId}`)) {
      return;
    }

    const button = document.createElement('button');
    button.id = `read-aloud-${elementId}`;
    button.innerHTML = '🔊 Read Aloud';
    button.style.cssText = `
      padding: 6px 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      margin-left: 10px;
    `;

    button.addEventListener('click', () => {
      const text = options.getText ? options.getText() : element.textContent;
      this.readAloud(text, language, options);
    });

    // Insert button
    if (options.insertBefore) {
      element.parentNode.insertBefore(button, element);
    } else {
      element.parentNode.insertBefore(button, element.nextSibling);
    }
  }
}

// Create singleton instance
const AudioPlayer = new AudioPlayerComponent();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioPlayer;
}

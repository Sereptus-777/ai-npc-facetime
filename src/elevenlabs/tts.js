export class TTSEngine {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this._unlockAudio();
    }

    // ── Unlock AudioContext on first user interaction ──────────────────────
    _unlockAudio() {
        const unlock = () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log("TTS | AudioContext created and unlocked.");
            }
            if (this.audioContext.state === "suspended") {
                this.audioContext.resume();
            }
            document.removeEventListener("click", unlock);
            document.removeEventListener("keydown", unlock);
        };
        document.addEventListener("click", unlock);
        document.addEventListener("keydown", unlock);
    }

    // ── Main speak function ────────────────────────────────────────────────
    async speak(text, voiceId) {
        if (!text || !text.trim()) {
            console.warn("TTS | No text to speak.");
            return;
        }

        const apiKey = game.settings.get("ai-npc-facetime", "elevenLabsKey");

        if (!apiKey) {
            console.warn("TTS | No ElevenLabs API Key set. Skipping voice.");
            return;
        }

        if (!voiceId) {
            console.warn("TTS | No Voice ID provided. Skipping voice.");
            return;
        }

        // Ensure AudioContext is alive
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }

        console.log(`TTS | Speaking with voice: ${voiceId}`);
        console.log(`TTS | Text: "${text}"`);

        try {
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
                {
                    method: "POST",
                    headers: {
                        "xi-api-key": apiKey,
                        "Content-Type": "application/json",
                        "Accept": "audio/mpeg"
                    },
                    body: JSON.stringify({
                        text: text,
                        model_id: "eleven_monolingual_v1",
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.8
                        }
                    })
                }
            );

            if (!response.ok) {
                const errText = await response.text();
                console.error("TTS | ElevenLabs API Error:", response.status, errText);
                return;
            }

            const arrayBuffer = await response.arrayBuffer();
            const decodedBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            const source = this.audioContext.createBufferSource();
            source.buffer = decodedBuffer;
            source.connect(this.audioContext.destination);
            source.start(0);

            this.isPlaying = true;
            source.onended = () => {
                this.isPlaying = false;
                console.log("TTS | Audio finished.");
            };

            console.log("TTS | Audio playing!");

        } catch (err) {
            console.error("TTS | Playback Error:", err);
        }
    }
}
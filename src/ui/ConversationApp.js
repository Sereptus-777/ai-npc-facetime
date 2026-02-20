import { AIHandler } from "../ai/conversation.js";
import { TTSEngine } from "../elevenlabs/tts.js";

export class ConversationApp extends Application {
    constructor(actor) {
        super();
        this.actor = actor;
        this.history = [];
        this.isThinking = false;

        this.tts = new TTSEngine();

        // ── YOUR actual ElevenLabs voice IDs ──────────────────────────────
        this.maleVoices = [
            "CwhRBWXzGAHq8TQ4Fs17", // Roger - Laid-Back, Casual
            "IKne3meq5aSn9XLyUdCD", // Charlie - Deep, Confident
            "JBFqnCBsd6RMkjVDRZzb", // George - Warm Storyteller
            "N2lVS1w4EtoT3dr4eOWO", // Callum - Husky Trickster
            "SOYHLrjzK2X1ezoPC6cr", // Harry - Fierce Warrior
            "TX3LPaxmHKxFdv7VOQHJ", // Liam - Energetic
            "bIHbv24MWmeRgasZH58o", // Will - Relaxed Optimist
            "cjVigY5qzO86Huf0OWal", // Eric - Smooth, Trustworthy
            "iP95p4xoKVk53GoZ742B", // Chris - Charming
            "nPczCjzI2devNBz1zQrb", // Brian - Deep, Resonant
            "onwK4e9ZLuTAKqWW03F9", // Daniel - Steady Broadcaster
            "pNInz6obpgDQGcFmaJgB", // Adam - Dominant, Firm
            "pqHfZKP75CvOlQylNhV4", // Bill - Wise, Mature
            "NOpBlnGInO9m6vDvFkFC", // Grandpa Spuds Oxley
            "Tj9l48J9AJbry5yCP5eW", // Matthew - Nosferatu Vampire Lord
            "b1A9OAVD1Yu0SjoFdv4A", // Percival - Gothic Storyteller
            "jumP4YgL6qcL2qz3jaSF", // Christopher - Calm Narrator
        ];

        this.femaleVoices = [
            "EXAVITQu4vr4xnSDxMaL", // Sarah - Mature, Confident
            "FGY2WhTYpPnrIDTdsKH5", // Laura - Quirky
            "Xb7hH8MSUJpSbSDYk0k2", // Alice - Clear, Engaging
            "XrExE9yKIg1WjnnlVkGX", // Matilda - Professional
            "cgSgspJ2msm6clMCkdW9", // Jessica - Playful, Warm
            "hpp4J3VqNfWAUOO0d1Us", // Bella - Professional, Bright
            "pFZP5JQG7iQjIQuC4Bku", // Lily - Velvety Actress
            "SAz9YHcvj6GT2YYXdXww", // River - Relaxed, Neutral
        ];
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `facetime-${foundry.utils.randomID()}`,
            title: "FaceTime",
            template: "modules/ai-npc-facetime/templates/conversation-app.html",
            width: 400,
            height: 600,
            resizable: true,
            classes: ["ai-npc-facetime"]
        });
    }

    getData() {
        return {
            actorName: this.actor.name,
            actorImg: this.actor.img || "icons/svg/mystery-man.svg"
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        this.logContainer = html.find("#facetime-log");
        this.inputField = html.find("#facetime-input");
        this.sendBtn = html.find("#facetime-send");
        this.micBtn = html.find("#facetime-voice");
        this.thinkingIndicator = html.find("#facetime-thinking");

        this.thinkingIndicator.hide();

        this.sendBtn.on("click", () => this.handleSend());

        this.inputField.on("keypress", (ev) => {
            if (ev.which === 13) this.handleSend();
        });

        this.micBtn.on("click", () => this.handleMic());

        console.log(`AI FaceTime | UI Listeners activated for ${this.actor.name}`);
    }

    async handleMic() {
        if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
            ui.notifications.warn("Your browser does not support voice input.");
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        this.micBtn.addClass("active");

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.inputField.val(transcript);
            this.micBtn.removeClass("active");
            this.handleSend();
        };

        recognition.onerror = (event) => {
            console.error("AI FaceTime | Mic error:", event.error);
            this.micBtn.removeClass("active");
        };

        recognition.onend = () => {
            this.micBtn.removeClass("active");
        };

        recognition.start();
    }

    async handleSend() {
        const text = this.inputField.val().trim();
        if (!text || this.isThinking) return;

        this.inputField.val("");
        this.renderMessage("user", text);
        this.setThinking(true);

        try {
            const response = await AIHandler.getResponse(this.actor, text, this.history);
            console.log("AI FaceTime | Response:", response);

            this.history.push({ role: "user", content: text });
            this.history.push({ role: "assistant", content: response });

            this.renderMessage("assistant", response);

            // ── Assign voice once, save permanently to actor ──────────────
            let voiceId = this.actor.getFlag("ai-npc-facetime", "voiceId");
            if (!voiceId) {
                const roll = Math.random();
                voiceId = roll < 0.8
                    ? this.maleVoices[Math.floor(Math.random() * this.maleVoices.length)]
                    : this.femaleVoices[Math.floor(Math.random() * this.femaleVoices.length)];
                console.log("AI FaceTime | Assigned voice:", voiceId);
                await this.actor.setFlag("ai-npc-facetime", "voiceId", voiceId);
            }

            // ── Strip *narration* before sending to TTS ───────────────────
            const dialogueOnly = response.replace(/\*(.*?)\*/g, "").trim();
            console.log("AI FaceTime | Dialogue for TTS:", dialogueOnly);
            if (dialogueOnly) {
                this.tts.speak(dialogueOnly, voiceId);
            }

        } catch (err) {
            console.error("AI FaceTime | Error:", err);
            this.renderMessage("assistant", "My thoughts are scattered... (Check Console)");
        } finally {
            this.setThinking(false);
        }
    }

    renderMessage(role, content) {
        if (!this.logContainer) return;

        const formattedContent = content.replace(/\*(.*?)\*/g, '<span class="facetime-narration">$1</span>');

        const messageHtml = `
            <div class="facetime-message facetime-${role}">
                <div class="facetime-bubble">${formattedContent}</div>
            </div>
        `;

        this.logContainer.append(messageHtml);
        this.logContainer.scrollTop(this.logContainer[0].scrollHeight);
    }

    setThinking(isThinking) {
        this.isThinking = isThinking;
        if (isThinking) {
            this.thinkingIndicator.fadeIn(200);
            this.sendBtn.prop("disabled", true);
        } else {
            this.thinkingIndicator.fadeOut(200);
            this.sendBtn.prop("disabled", false);
        }
    }
}
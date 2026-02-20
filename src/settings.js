export function registerSettings() {
    game.settings.register("ai-npc-facetime", "aiProvider", {
        name: "AI Provider",
        hint: "Choose which AI backend to use.",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "ollama": "Ollama (Local)",
            "openai": "OpenAI GPT"
        },
        default: "ollama"
    });

    game.settings.register("ai-npc-facetime", "openAiKey", {
        name: "OpenAI API Key",
        hint: "Your OpenAI API key (only needed if using OpenAI provider).",
        scope: "world",
        config: true,
        type: String,
        default: ""
    });

    game.settings.register("ai-npc-facetime", "elevenLabsKey", {
        name: "ElevenLabs API Key",
        hint: "Your ElevenLabs API key for voice synthesis.",
        scope: "world",
        config: true,
        type: String,
        default: ""
    });

    game.settings.register("ai-npc-facetime", "voiceProvider", {
        name: "Voice Provider",
        hint: "Choose which voice engine to use.",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "elevenlabs": "ElevenLabs (Recommended)",
            "browser": "Browser TTS (Free)"
        },
        default: "browser"
    });
}
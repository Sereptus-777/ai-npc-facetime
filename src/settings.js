export const registerSettings = function() {
    game.settings.register("ai-npc-facetime", "elevenLabsKey", {
        name: "ElevenLabs API Key",
        scope: "world",
        config: true,
        type: String,
        default: ""
    });
    game.settings.register("ai-npc-facetime", "openaiKey", {
        name: "OpenAI API Key",
        scope: "world",
        config: true,
        type: String,
        default: ""
    });
};
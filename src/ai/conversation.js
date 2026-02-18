export class AIHandler {
    static async getResponse(actor, input, history) {
        const apiKey = game.settings.get("ai-npc-facetime", "openaiKey");
        const personality = actor.getFlag("ai-npc-facetime", "personality") || "A helpful NPC.";
        
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    {role: "system", content: `You are ${actor.name}. ${personality}`},
                    ...history,
                    {role: "user", content: input}
                ]
            })
        });
        const data = await response.json();
        return data.choices[0].message.content;
    }
}
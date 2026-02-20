export class AIHandler {
<<<<<<< HEAD

    // ─── MAIN ENTRY POINT ────────────────────────────────────────────────────
    static async getResponse(actor, input, history) {
        const provider  = game.settings.get("ai-npc-facetime", "aiProvider");
        const apiKey    = game.settings.get("ai-npc-facetime", "openAiKey");
        const scene     = canvas.scene;
        const sceneName = scene?.name || "an unknown location";
        const token     = actor.getActiveTokens()[0];

        // ── NPC Stats ──────────────────────────────────────────────────────
        const intScore     = actor.system?.abilities?.int?.value  ?? 10;
        const wisScore     = actor.system?.abilities?.wis?.value  ?? 10;
        const chaScore     = actor.system?.abilities?.cha?.value  ?? 10;
        const hpCurrent    = actor.system?.attributes?.hp?.value  ?? 1;
        const hpMax        = actor.system?.attributes?.hp?.max    ?? 1;
        const creatureType = (actor.system?.details?.type?.value  || "").toLowerCase();

        // ── NPC State Checks ───────────────────────────────────────────────
        const isUnconscious = this.hasCondition(actor, ["unconscious", "incapacitated", "stunned"]);
        const isDead        = this.hasCondition(actor, ["dead"]) || (hpCurrent <= 0 && !isUnconscious);
        const isUndead      = creatureType.includes("undead");
        const isAnimal      = (intScore < 6) || creatureType.includes("beast");
        const isWounded     = hpCurrent < hpMax * 0.5;
        const npcConditions = this.getConditions(actor);

        // ── Player/Questioner State ────────────────────────────────────────
        const playerActor      = game.user.character;
        const playerConditions = playerActor ? this.getConditions(playerActor) : [];
        const playerHp         = playerActor?.system?.attributes?.hp?.value ?? 1;
        const playerHpMax      = playerActor?.system?.attributes?.hp?.max   ?? 1;
        const playerWounded    = playerHp < playerHpMax * 0.5;

        // ── Special Spells ─────────────────────────────────────────────────
        const hasSpeakWithAnimals = playerActor?.effects.some(e =>
            (e.label || e.name || "").toLowerCase().includes("speak with animals")
        );
        const hasSpeakWithDead = playerActor?.effects.some(e =>
            (e.label || e.name || "").toLowerCase().includes("speak with dead")
        );

        // ─── GATE: UNCONSCIOUS ─────────────────────────────────────────────
        if (isUnconscious && !isDead) {
            return `${actor.name} is unconscious and does not respond.`;
        }

        // ─── GATE: DEAD (no magic) ─────────────────────────────────────────
        if (isDead && !isUndead && !hasSpeakWithDead) {
            return this.getDeadResponse(actor);
        }

        // ─── GATE: ANIMAL (no magic) ───────────────────────────────────────
        if (isAnimal && !hasSpeakWithAnimals) {
            const animalPrompt = `
                You are a ${creatureType || "animal"} named ${actor.name}.
                You cannot speak any humanoid language.
                Respond ONLY with animal sounds. No human words. 1-2 sounds only.
            `.trim();
            return await this.callAI(animalPrompt, [], input, provider, apiKey);
        }

        // ─── NORMAL CONVERSATION ───────────────────────────────────────────
        const alignment   = actor.system?.details?.alignment || "Neutral";
        const personality = actor.getFlag("ai-npc-facetime", "personality") || "A mysterious inhabitant of this world.";
        const secretLore  = actor.getFlag("ai-npc-facetime", "secretLore")  || "";
        const bio         = (actor.system?.details?.biography?.value || "").replace(/<[^>]*>/g, "");
        const journalLore = this.getJournalLore(actor);
        const speechStyle = this.buildSpeechProfile(intScore, wisScore, chaScore);
        const npcState    = this.buildNPCStateNote(isDead, isUndead, isWounded, isAnimal, hasSpeakWithAnimals, npcConditions, hpCurrent, hpMax, creatureType);
        const playerNote  = this.buildPlayerStateNote(playerConditions, playerWounded, playerActor);
        const nearbyNote  = this.buildNearbyActorsSummary(token);
        const sceneNote   = this.buildSceneNote(scene);

        const systemPrompt = `
You are ${actor.name}.

ALIGNMENT: ${alignment}
SCENE: ${sceneName}
${sceneNote}
PERSONALITY: ${personality}
BIOGRAPHY: ${bio}
PAST CONVERSATIONS: ${journalLore}
SECRET KNOWLEDGE: ${secretLore}

YOUR CURRENT STATE:
${npcState}

NEARBY CREATURES:
${nearbyNote}

THE PERSON SPEAKING TO YOU:
${playerNote}

MENTAL STATS:
- Intelligence: ${intScore}
- Wisdom: ${wisScore}
- Charisma: ${chaScore}

SPEECH STYLE:
${speechStyle}

RULES:
- Speak ONLY as ${actor.name} in first person.
- Use *asterisks* for physical actions or narration only.
- Keep responses to 2-3 sentences.
- Do NOT mention you are an AI.
- React naturally to your current state and the state of the person speaking to you.
- Stay consistent with all provided lore.
- You may invent new lore but must remain consistent with what the GM has provided.
        `.trim();

        return await this.callAI(systemPrompt, history, input, provider, apiKey);
    }

    // ─── CALL AI PROVIDER ─────────────────────────────────────────────────────
    static async callAI(systemPrompt, history, input, provider, apiKey) {
        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: input }
        ];

        // ── OpenAI ────────────────────────────────────────────────────────
        if (provider === "openai" && apiKey) {
            try {
                const response = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({ model: "gpt-4o", messages, temperature: 0.7 })
                });
                const data = await response.json();
                if (data.error) {
                    console.error("AI Handler | OpenAI Error:", data.error.message);
                    return `*${data.error.message}*`;
                }
                const text = data.choices[0].message.content;
                console.log("AI Handler | OpenAI Response:", text);
                return text;
            } catch (err) {
                console.error("AI Handler | OpenAI Fetch Error:", err);
                return "My thoughts are scattered...";
            }
        }

        // ── Ollama (local fallback) ────────────────────────────────────────
        try {
            const response = await fetch("http://localhost:11434/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: "llama3.2", messages, temperature: 0.7 })
            });
            const data = await response.json();
            const text = data.choices[0].message.content;
            console.log("AI Handler | Ollama Response:", text);
            return text;
        } catch (err) {
            console.error("AI Handler | Ollama Fetch Error:", err);
            return "My mind is foggy...";
        }
    }

    // ─── SCENE CONTEXT ────────────────────────────────────────────────────────
    static buildSceneNote(scene) {
        if (!scene) return "";
        const weather  = scene.getFlag("ai-npc-facetime", "weather")              || "";
        const location = scene.getFlag("ai-npc-facetime", "locationDescription")  || "";
        const lines = [];
        if (weather)  lines.push(`WEATHER: ${weather}`);
        if (location) lines.push(`ENVIRONMENT: ${location}`);
        return lines.join("\n");
    }

    // ─── NEARBY TOKENS ────────────────────────────────────────────────────────
    static buildNearbyActorsSummary(originToken) {
        if (!originToken || !canvas?.tokens) return "No nearby tokens detected.";

        const others = canvas.tokens.placeables.filter(t =>
            t.id !== originToken.id && !t.document.hidden
        );

        if (!others.length) return "No nearby tokens detected.";

        return others.map(t => {
            const distPixels = Math.hypot(t.x - originToken.x, t.y - originToken.y);
            const distFeet   = Math.round(distPixels / canvas.grid.size) * (canvas.grid.distance || 5);
            const relation   = t.actor?.getFlag("ai-npc-facetime", "relationship") || "unknown";
            const type       = t.actor?.type || "creature";
            return `- ${t.name} (${type}), ~${distFeet}ft away, relationship: ${relation}`;
        }).join("\n");
    }

    // ─── NPC STATE ────────────────────────────────────────────────────────────
    static buildNPCStateNote(isDead, isUndead, isWounded, isAnimal, hasSpeakWithAnimals, conditions, hpCurrent, hpMax, creatureType) {
        const lines = [];
        if (isDead && isUndead) {
            lines.push("- You are undead. You exist beyond life and feel no pain or warmth.");
        } else if (isDead) {
            lines.push("- You are dead but magically compelled to speak. You feel nothing.");
        } else if (isWounded) {
            const pct = Math.round((hpCurrent / hpMax) * 100);
            lines.push(`- You are badly wounded (${pct}% health). You are in pain.`);
        }
        if (isAnimal && hasSpeakWithAnimals) {
            lines.push(`- You are a ${creatureType}. You think like an animal: food, safety, smells.`);
        }
        if (conditions.length > 0) {
            lines.push(`- Current conditions: ${conditions.join(", ")}.`);
        }
        return lines.join("\n") || "- You are healthy and alert.";
    }

    // ─── PLAYER STATE ─────────────────────────────────────────────────────────
    static buildPlayerStateNote(conditions, isWounded, playerActor) {
        if (!playerActor) return "- An unknown figure speaks to you.";
        const lines = [`- Their name is ${playerActor.name}.`];
        if (isWounded)          lines.push("- They appear badly wounded.");
        if (conditions.length)  lines.push(`- They are currently: ${conditions.join(", ")}.`);
        return lines.join("\n");
    }

    // ─── SPEECH PROFILE ───────────────────────────────────────────────────────
    static buildSpeechProfile(intScore, wisScore, chaScore) {
        const intStyle = intScore <= 7  ? "Simple vocabulary, short sentences."
                       : intScore >= 15 ? "Eloquent, precise, analytical."
                       : "Average vocabulary.";
        const wisStyle = wisScore <= 7  ? "Impulsive, emotional."
                       : wisScore >= 15 ? "Calm, insightful, perceptive."
                       : "Average common sense.";
        const chaStyle = chaScore >= 15 ? "Magnetic and charming."
                       : chaScore <= 7  ? "Blunt or awkward."
                       : "Average presence.";
        return `INT: ${intStyle}\nWIS: ${wisStyle}\nCHA: ${chaStyle}`;
    }

    // ─── CONDITIONS ───────────────────────────────────────────────────────────
    static getConditions(actor) {
        if (!actor?.effects) return [];
        const known = ["frightened","charmed","poisoned","exhaustion","prone","unconscious",
                       "incapacitated","stunned","blinded","deafened","paralyzed","invisible","dead"];
        return actor.effects
            .filter(e => !e.disabled && !e.isSuppressed)
            .map(e => (e.label || e.name || "").toLowerCase())
            .filter(name => known.includes(name));
    }

    static hasCondition(actor, conditions) {
        return conditions.some(c => this.getConditions(actor).includes(c));
    }

    // ─── JOURNAL LORE ─────────────────────────────────────────────────────────
    static getJournalLore(actor) {
        const journal = game.journal.find(j => j.name === `[AI Memory] ${actor.name}`);
        return (journal?.pages.contents[0]?.text?.content || "").replace(/<[^>]*>/g, "");
    }

    // ─── DEAD RESPONSE ────────────────────────────────────────────────────────
    static getDeadResponse(actor) {
        const responses = [
            `${actor.name} does not respond. They are dead.`,
            `The body of ${actor.name} lies still. No words come.`,
            `${actor.name} is beyond conversation. Only silence answers you.`,
            `The dead do not speak without magic to compel them.`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
=======
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
>>>>>>> 35fbc7f5ef68cfc435acf2825a912b8d57bdb7ac
    }
}
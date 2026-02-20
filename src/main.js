import { registerSettings } from "./settings.js";
import { ConversationApp } from "./ui/ConversationApp.js";
import { AIHandler } from "./ai/conversation.js";

Hooks.once("init", () => {
    console.log("AI NPC FaceTime | Initializing");
    registerSettings();
});

// ─── PLAYER TRIGGER: TARGETING ──────────────────────────────────────────────
// When a player targets an NPC, open the FaceTime window.
Hooks.on("targetToken", (user, token, targeted) => {
    // Only trigger for the person doing the targeting
    if (user.id !== game.user.id) return;
    
    // Only trigger when targeting (not untargeting)
    if (!targeted) return;

    // Only trigger for NPCs
    if (!token?.actor || token.actor.type !== "npc") return;

    // GMs usually target for combat, so we can skip this for GMs if you prefer
    // but for players, this is their "Talk To" button.
    if (!game.user.isGM) {
        console.log(`AI NPC FaceTime | Player targeted ${token.name}, opening FaceTime.`);
        new ConversationApp(token.actor).render(true);
    }
});

// ─── GM TRIGGER: TOKEN HUD ──────────────────────────────────────────────────
Hooks.on("renderTokenHUD", (app, html, data) => {
    if (!game.user.isGM) return;

    const token = canvas.tokens.get(data._id);
    if (!token?.actor || token.actor.type !== "npc") return;

    const jHtml = $(html);
    jHtml.find(".ai-token-controls").remove();

    let controlsHtml = `
    <div class="ai-token-controls" 
         style="position:absolute; top:-65px; left:50%; transform:translateX(-50%); 
                display:flex; gap:16px; pointer-events:all; z-index:10000; width:max-content;">
        <img class="facetime-trigger" 
             src="modules/ai-npc-facetime/assets/chat-icon.png" 
             title="Start FaceTime" 
             style="width:46px; height:46px; cursor:pointer; filter:drop-shadow(0 0 6px black);" />
        <img class="setup-trigger" 
             src="modules/ai-npc-facetime/assets/robot-icon.png" 
             title="AI Setup" 
             style="width:46px; height:46px; cursor:pointer; filter:drop-shadow(0 0 6px black);" />
    </div>`;

    const controls = $(controlsHtml);

    controls.find(".facetime-trigger").on("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        new ConversationApp(token.actor).render(true);
    });

    controls.find(".setup-trigger").on("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        new AIConfigDialog(token.actor).render(true);
    });

    jHtml.append(controls);
});

// ─── GM CONFIG DIALOG ─────────────────────────────────────────────────────────
class AIConfigDialog extends FormApplication {
    constructor(actor) {
        super();
        this.actor = actor;
    }

    get title() {
        return `AI Setup: ${this.actor?.name ?? "NPC"}`;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "ai-npc-config",
            template: "modules/ai-npc-facetime/templates/npc-config.html",
            width: 500,
            height: "auto",
            closeOnSubmit: true
        });
    }

    getData() {
        const memory = this.actor.getFlag("ai-npc-facetime", "memoryLog") || [];
        return {
            personality: this.actor.getFlag("ai-npc-facetime", "personality") || "",
            secretLore: this.actor.getFlag("ai-npc-facetime", "secretLore") || "",
            voiceId: this.actor.getFlag("ai-npc-facetime", "voiceId") || "",
            memoryText: memory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n")
        };
    }

    async _updateObject(event, formData) {
        await this.actor.setFlag("ai-npc-facetime", "personality", formData.personality);
        await this.actor.setFlag("ai-npc-facetime", "secretLore", formData.secretLore);
        await this.actor.setFlag("ai-npc-facetime", "voiceId", formData.voiceId);

        if (formData.clearMemory) {
            await this.actor.setFlag("ai-npc-facetime", "memoryLog", []);
            ui.notifications.info(`Memory wiped for ${this.actor.name}`);
        } else {
            ui.notifications.info(`AI Profile updated for ${this.actor.name}`);
        }
    }
}
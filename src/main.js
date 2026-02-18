import { registerSettings } from "./settings.js";
import { ConversationApp } from "./ui/ConversationApp.js";

Hooks.once("init", () => {
    registerSettings();
});

Hooks.on("renderTokenHUD", (app, html, data) => {
    const actor = canvas.tokens.get(data._id)?.actor;
    if (!actor) return;
    const btn = $(`<div class="control-icon ai-btn" title="AI FaceTime"><i class="fas fa-video"></i></div>`);
    btn.click(() => new ConversationApp(actor).render(true));
    html.find(".col.left").append(btn);
});
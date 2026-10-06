import { TodoStore } from "./store.js";
import { TodoUI } from "./ui.js";

const store = new TodoStore();
const ui = new TodoUI(store);
ui.init();

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("./sw.js", { updateViaCache: "none" })
            .then((registration) => registration.update())
            .catch(() => {
                // The app remains usable online if service-worker registration fails.
            });
    });
}

let installPrompt = null;
const installButton = document.querySelector("#install-button");

window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
    if (!installPrompt) {
        return;
    }

    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
    installPrompt = null;
    installButton.hidden = true;
});

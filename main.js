import {
    addLog,
    advanceDay,
    buyItem,
    currentCity,
    hireRecruit,
    resolvePendingSpectacle,
    queueSpectacle,
    refreshMarkets,
    setActiveView,
    toggleSelection,
    trainFighter,
    travelToNextCity,
    upgradeFacility
} from "./game.js";

import { render } from "./ui.js";

const app = document.getElementById("app");

app.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }

    const { action, id, stat } = button.dataset;

    if (action === "hire") {
        hireRecruit(id);
        render();
    } else if (action === "buy-item") {
        const fighterId = button.dataset.fighterId || "";
        if (fighterId) {
            buyItem(id, fighterId);
        } else {
            const card = button.closest(".market-card");
            const target = card ? card.querySelector(`select[data-item-target="${id}"]`) : null;
            buyItem(id, target ? target.value : "");
        }
        render();
    } else if (action === "upgrade") {
        upgradeFacility(id);
        render();
    } else if (action === "travel") {
        travelToNextCity();
        render();
    } else if (action === "spectacle-book") {
        queueSpectacle(id);
        render();
    } else if (action === "spectacle-send") {
        resolvePendingSpectacle();
        render();
    } else if (action === "spectacle-wait") {
        render();
    } else if (action === "train") {
        const card = button.closest(".fighter-card");
        const daysSelect = card ? card.querySelector(`select[data-training-days="${id}"]`) : null;
        const days = daysSelect ? Number(daysSelect.value) : 1;
        trainFighter(id, stat, days);
        render();
    } else if (action === "view") {
        setActiveView(button.dataset.view);
        render();
    } else if (action === "next-day") {
        advanceDay();
        render();
    }
});

app.addEventListener("change", (event) => {
    const spectacleCheckbox = event.target.closest("input.spectacle-fighter-select");
    if (spectacleCheckbox) {
        toggleSelection(spectacleCheckbox.dataset.fighterId, spectacleCheckbox.checked);
        render();
        return;
    }
});

function init() {
    refreshMarkets(true);
    addLog(`You begin in ${currentCity().name}, a provincial stable with one novice fighter and a promoter's market to conquer.`);
    addLog(`Book spectacles, train your roster, and build the sort of stable that can survive Rome.`);
    render();
}

init();

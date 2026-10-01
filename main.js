import {
    addLog,
    advanceDay,
    buyItem,
    currentCity,
    hireRecruit,
    resolvePendingSpectacle,
    queueSpectacle,
    openSpectacleBooking,
    closeSpectacleBooking,
    openArmoryShop,
    closeArmoryShop,
    closeSpectacleResult,
    refreshMarkets,
    state,
    setActiveView,
    setLanistaName,
    openLanistaRename,
    cancelLanistaRename,
    confirmLanistaRename,
    updateLanistaRenameDraft,
    setTrainingBudget,
    toggleSelection,
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
    } else if (action === "spectacle-open") {
        openSpectacleBooking(id);
        render();
    } else if (action === "spectacle-book-confirm") {
        if (queueSpectacle(id)) {
            render();
        }
    } else if (action === "spectacle-book-cancel") {
        closeSpectacleBooking();
        render();
    } else if (action === "spectacle-result-close") {
        closeSpectacleResult();
        render();
    } else if (action === "armory-shop-open") {
        openArmoryShop();
        render();
    } else if (action === "armory-shop-close") {
        closeArmoryShop();
        render();
    } else if (action === "spectacle-send") {
        resolvePendingSpectacle();
        render();
    } else if (action === "spectacle-wait") {
        render();
    } else if (action === "view") {
        setActiveView(button.dataset.view);
        if (button.dataset.view === "promoters") {
            const nextSpectacle = state.spectacleBoard[0];
            if (nextSpectacle) {
                openSpectacleBooking(nextSpectacle.id);
            }
        } else {
            closeSpectacleBooking();
        }
        render();
    } else if (action === "next-day") {
        advanceDay();
        render();
    } else if (action === "rename-lanista") {
        openLanistaRename();
        render();
    } else if (action === "rename-lanista-save") {
        if (confirmLanistaRename()) {
            render();
        }
    } else if (action === "rename-lanista-cancel") {
        cancelLanistaRename();
        render();
    } else if (action === "set-training-budget") {
        setTrainingBudget(button.dataset.budget);
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

app.addEventListener("input", (event) => {
    const renameInput = event.target.closest("input[data-action='rename-lanista-input']");
    if (renameInput) {
        updateLanistaRenameDraft(renameInput.value);
    }
});

function init() {
    refreshMarkets(true);
    addLog(`You begin in ${currentCity().name}, a provincial stable with one novice fighter and a promoter's market to conquer.`);
    addLog(`Book spectacles, train your roster, and build the sort of stable that can survive Rome.`);
    render();
}

init();

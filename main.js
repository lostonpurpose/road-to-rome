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
    openSpectacleAttendance,
    closeSpectacleAttendance,
    openArmoryShop,
    closeArmoryShop,
    closeSpectacleResult,
    refreshMarkets,
    state,
    setActiveView,
    setLanistaName,
    openLanistaRename,
    cancelLanistaRename,
    openEmpireMap,
    closeEmpireMap,
    setEmpireMapZoom,
    confirmLanistaRename,
    updateLanistaRenameDraft,
    setTrainingBudget,
    toggleSelection,
    travelToNextCity,
    upgradeFacility
    , specializeFighter
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
        buyItem(id);
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
            if (state.pendingSpectacle?.resolveTurn <= state.day) {
                openSpectacleAttendance();
            }
            render();
        }
    } else if (action === "spectacle-book-cancel") {
        closeSpectacleBooking();
        render();
    } else if (action === "spectacle-attendance-confirm") {
        closeSpectacleAttendance();
        resolvePendingSpectacle();
        render();
    } else if (action === "spectacle-attendance-cancel") {
        closeSpectacleAttendance();
        render();
    } else if (action === "spectacle-result-close") {
        closeSpectacleResult();
        render();
    } else if (action === "armory-shop-open") {
        openArmoryShop(button.dataset.fighterId || null);
        render();
    } else if (action === "armory-shop-close") {
        closeArmoryShop();
        render();
    } else if (action === "spectacle-send") {
        openSpectacleAttendance();
        render();
    } else if (action === "spectacle-wait") {
        render();
    } else if (action === "view") {
        setActiveView(button.dataset.view);
        if (button.dataset.view === "promoters") {
            if (state.pendingSpectacle && state.pendingSpectacle.resolveTurn <= state.day) {
                openSpectacleAttendance();
            } else {
                const nextSpectacle = state.spectacleBoard[0];
                if (nextSpectacle) {
                    openSpectacleBooking(nextSpectacle.id);
                }
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
    } else if (action === "empire-map-open") {
        cancelLanistaRename();
        openEmpireMap();
        render();
    } else if (action === "empire-map-close") {
        closeEmpireMap();
        render();
    } else if (action === "empire-map-zoom-in") {
        setEmpireMapZoom(state.empireMapZoom + 0.25);
        render();
    } else if (action === "empire-map-zoom-out") {
        setEmpireMapZoom(state.empireMapZoom - 0.25);
        render();
    } else if (action === "empire-map-zoom-reset") {
        setEmpireMapZoom(1);
        render();
    } else if (action === "set-training-budget") {
        setTrainingBudget(button.dataset.budget);
        render();
    } else if (action === "specialize-fighter") {
        specializeFighter(button.dataset.fighterId, button.dataset.path);
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

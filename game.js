import {
    buildArmoryStock,
    buildRecruitMarket,
    buildStartRoster,
    cityChain,
    clamp,
    equipmentCatalog,
    facilityCatalog,
    fighterPower,
    fighterTotalDefense,
    fighterTotalMaxHp,
    fighterTotalStrength,
    makeFighter,
    makeItem,
    makeOpponent,
    nextId,
    randomBetween,
    randomFrom,
    styles,
    viewLabels
} from "./game-data.js";

import {
    buildFestivalBoard,
    calendarFromTurn,
    formatCalendarDate,
    nextFestival,
    turnFromDate
} from "./calendar.js";

const state = {
    cityIndex: 0,
    day: turnFromDate(1, 1, 9),
    gold: 80,
    fame: 12,
    roster: buildStartRoster(),
    recruitMarket: [],
    armoryStock: [],
    spectacleBoard: [],
    trainingQueue: [],
    pendingSpectacle: null,
    lastSpectacleResult: null,
    activeView: "hub",
    facilities: {
        barracks: 1,
        trainingYard: 0,
        armory: 0,
        medicus: 0
    },
    selectedFighterIds: new Set(),
    log: []
};

function currentCity() {
    return cityChain[state.cityIndex];
}

function currentCalendarDate() {
    return calendarFromTurn(state.day);
}

function stableCap() {
    return clamp(3 + state.facilities.barracks * 2, 3, 15);
}

function nextCity() {
    return cityChain[Math.min(cityChain.length - 1, state.cityIndex + 1)];
}

function nextCityProgress() {
    if (state.cityIndex >= cityChain.length - 1) {
        return 1;
    }
    const target = nextCity().fameRequired;
    return clamp(state.fame / target, 0, 1);
}

function fameProgress() {
    if (state.cityIndex >= cityChain.length - 1) {
        return 1;
    }
    const target = nextCity().fameRequired;
    return clamp(state.fame / target, 0, 1);
}

function addLog(message) {
    state.log.unshift(message);
    state.log = state.log.slice(0, 7);
}

function refreshMarkets(refreshSpectacles = false) {
    state.recruitMarket = buildRecruitMarket(state.cityIndex);
    state.armoryStock = buildArmoryStock(state.cityIndex, state.facilities.armory);
    if (refreshSpectacles) {
        state.spectacleBoard = buildFestivalBoard(state.day, state.cityIndex, state.roster);
    }
}

function setActiveView(view) {
    if (!viewLabels[view]) {
        return;
    }

    state.activeView = view;

}

function bookedSpectacle() {
    if (!state.pendingSpectacle) {
        return null;
    }

    return state.spectacleBoard.find((entry) => entry.id === state.pendingSpectacle.spectacleId) || null;
}

function spectacleResultMarkup() {
    if (state.pendingSpectacle) {
        const spectacle = bookedSpectacle();
        const dueDay = state.pendingSpectacle.resolveTurn;

        if (!spectacle) {
            return `
                <div class="status-callout pending">
                    <strong>A spectacle is booked for ${formatCalendarDate(dueDay)}.</strong>
                    <span>The sponsor is waiting for your troupe to show up.</span>
                </div>
            `;
        }

        return `
            <div class="status-callout pending">
                <strong>${spectacle.title} is booked for ${formatCalendarDate(dueDay)}.</strong>
                <span>Train, shop, or upgrade while you wait for the festival day.</span>
            </div>
        `;
    }

    if (!state.lastSpectacleResult) {
        return `
            <div class="status-callout">
                <strong>No spectacle is currently booked.</strong>
                <span>Select fighters in the barracks, then book a show from Promoters.</span>
            </div>
        `;
    }

    const result = state.lastSpectacleResult;
    return `
        <div class="status-callout ${result.win ? "win" : "loss"}">
            <strong>${result.title} resolved on ${result.dayLabel || formatCalendarDate(result.day)}.</strong>
            <span>${result.summary}</span>
        </div>
    `;
}

function advanceDay() {
    state.day += 1;

    const trainingCompleted = processTrainingQueue();
    const spectacleResolved = state.pendingSpectacle && state.pendingSpectacle.resolveTurn <= state.day ? resolvePendingSpectacle() : false;

    if (!trainingCompleted && !spectacleResolved) {
        addLog(`The calendar turns to ${formatCalendarDate(currentCalendarDate())} in ${currentCity().name}.`);
    }

    refreshMarkets(true);
}

function moneyFormat(value) {
    return `${value.toLocaleString()} sesterces`;
}

function gainExperience(fighter, amount) {
    fighter.exp += amount;
    let leveled = false;

    while (fighter.exp >= fighter.level * 24) {
        fighter.exp -= fighter.level * 24;
        fighter.level += 1;
        fighter.maxHp += 2;
        fighter.strength += 1;
        fighter.defense += 1;
        fighter.hp = fighter.maxHp;
        leveled = true;
    }

    return leveled;
}

function itemBonusSummary(item) {
    const parts = [];
    if (item.bonus.strength) {
        parts.push(`+${item.bonus.strength} STR`);
    }
    if (item.bonus.defense) {
        parts.push(`+${item.bonus.defense} DEF`);
    }
    if (item.bonus.hp) {
        parts.push(`+${item.bonus.hp} HP`);
    }
    if (item.bonus.fame) {
        parts.push(`+${item.bonus.fame} FAME`);
    }
    return parts.join(" · ");
}

function trainingCost(fighter) {
    return 10 + fighter.level * 6 + state.facilities.trainingYard * 3;
}

function trainFighter(fighterId, stat) {
    const fighter = state.roster.find((entry) => entry.id === fighterId);
    if (!fighter) {
        return;
    }

    if (state.trainingQueue.some((task) => task.fighterId === fighterId)) {
        addLog(`${fighter.name} is already training.`);
        return;
    }

    const cost = trainingCost(fighter);
    if (state.gold < cost) {
        addLog(`You need ${moneyFormat(cost)} to train ${fighter.name}.`);
        return;
    }

    state.gold -= cost;
    const duration = Math.max(1, 3 - Math.floor(state.facilities.trainingYard / 2));
    const label = stat === "hp" ? "HP" : stat === "strength" ? "STR" : "DEF";

    state.trainingQueue.push({
        id: nextId("training"),
        fighterId,
        stat,
        label,
        startedTurn: state.day,
        completeTurn: state.day + duration,
        cost
    });

    addLog(`${fighter.name} starts ${label} training. It will take ${duration} days.`);
    refreshMarkets(false);

}

function hireRecruit(fighterId) {
    const index = state.recruitMarket.findIndex((entry) => entry.id === fighterId);
    if (index === -1) {
        return;
    }

    if (state.roster.length >= stableCap()) {
        addLog(`The stable is full. You need more barracks space.`);
        return;
    }

    const recruit = state.recruitMarket[index];
    if (state.gold < recruit.cost) {
        addLog(`You cannot afford ${recruit.name} right now.`);
        return;
    }

    state.gold -= recruit.cost;
    state.roster.push(recruit);
    state.selectedFighterIds.clear();
    refreshMarkets(false);
    addLog(`You hire ${recruit.name}, ${recruit.title}.`);

}

function buyItem(itemId, fighterId) {
    const itemIndex = state.armoryStock.findIndex((entry) => entry.id === itemId);
    if (itemIndex === -1) {
        return;
    }

    const item = state.armoryStock[itemIndex];
    if (state.gold < item.cost) {
        addLog(`You do not have enough money for ${item.name}.`);
        return;
    }

    state.gold -= item.cost;
    state.armoryStock.splice(itemIndex, 1);
    const fighter = state.roster.find((entry) => entry.id === fighterId && entry.alive);
    if (!fighter) {
        addLog(`You purchase ${item.name}, but no fighter was selected to receive it.`);
        refreshMarkets(false);
        return;
    }

    fighter.gear = fighter.gear || {};
    fighter.gear[item.slot] = item;
    fighter.hp = Math.min(fighter.hp + (item.bonus.hp || 0), fighterTotalMaxHp(fighter));
    addLog(`${fighter.name} receives ${item.name}.`);
    refreshMarkets(false);
}

function upgradeFacility(key) {
    const facility = state.facilities[key];
    if (facility == null) {
        return;
    }

    const catalog = facilityCatalog[key];
    const cost = catalog.baseCost + facility * 26 + state.cityIndex * 14;
    if (state.gold < cost) {
        addLog(`The ${catalog.title.toLowerCase()} costs ${moneyFormat(cost)}.`);
        return;
    }

    state.gold -= cost;
    state.facilities[key] += 1;
    addLog(`${catalog.title} upgraded to level ${state.facilities[key]}.`);
    refreshMarkets(false);
}

function travelToNextCity() {
    if (state.cityIndex >= cityChain.length - 1) {
        addLog("You are already in Rome.");
        return;
    }

    if (state.pendingSpectacle) {
        addLog("You need to resolve the booked spectacle before moving the stable.");
        return;
    }

    const target = nextCity();
    const travelCost = 18 + target.prestige * 12;
    if (state.fame < target.fameRequired) {
        addLog(`You need more fame before the city will book your troupe.`);
        return;
    }
    if (state.gold < travelCost) {
        addLog(`Travel to ${target.name} costs ${moneyFormat(travelCost)}.`);
        return;
    }

    state.gold -= travelCost;
    state.cityIndex += 1;
    state.day += 1;
    const trainingCompleted = processTrainingQueue();
    const spectacleResolved = state.pendingSpectacle && state.pendingSpectacle.resolveTurn <= state.day ? resolvePendingSpectacle() : false;

    if (!trainingCompleted && !spectacleResolved) {
        addLog(`The calendar turns to ${formatCalendarDate(currentCalendarDate())} in ${currentCity().name}.`);
    }

    refreshMarkets(true);
    addLog(`You relocate the stable to ${currentCity().name}. Bigger city, bigger stakes.`);
}

function processTrainingQueue() {
    const completedTasks = state.trainingQueue.filter((task) => task.completeTurn <= state.day);
    if (completedTasks.length === 0) {
        return false;
    }

    state.trainingQueue = state.trainingQueue.filter((task) => task.completeTurn > state.day);
    completedTasks.forEach((task) => {
        const fighter = state.roster.find((entry) => entry.id === task.fighterId && entry.alive);
        if (!fighter) {
            addLog("A training session ends, but the fighter is no longer available.");
            return;
        }

        if (task.stat === "hp") {
            fighter.maxHp += 2 + Math.floor(state.facilities.trainingYard / 2);
            fighter.hp = fighter.maxHp;
        } else if (task.stat === "strength") {
            fighter.strength += 1 + Math.floor(state.facilities.trainingYard / 3);
        } else if (task.stat === "defense") {
            fighter.defense += 1 + Math.floor(state.facilities.trainingYard / 3);
        }

        gainExperience(fighter, 4 + state.facilities.trainingYard * 2);
        addLog(`${fighter.name} finishes ${task.label} training.`);
    });

    return true;
}

function listSelectedFighters() {
    return state.roster.filter((fighter) => fighter.alive && state.selectedFighterIds.has(fighter.id));
}

function spectaclePower(fighter) {
    return fighterPower(fighter);
}

function resolveSpectacleOutcome(spectacle, selected) {
    const ourPower = selected.reduce((sum, fighter) => sum + spectaclePower(fighter), 0);
    const rivalPower = spectacle.opponents.reduce((sum, fighter) => sum + spectaclePower(fighter), 0);
    const ourShow = ourPower + randomBetween(0, Math.max(6, Math.floor(ourPower * 0.32))) + currentCity().prestige * 3;
    const rivalShow = rivalPower + randomBetween(0, Math.max(6, Math.floor(rivalPower * 0.32))) + spectacle.cityPrestige * 2;
    const win = ourShow >= rivalShow;
    const margin = Math.abs(ourShow - rivalShow);
    const requestBonus = spectacle.requestedName && selected.some((fighter) => fighter.name === spectacle.requestedName) ? spectacle.requestBonus : 0;

    let goldGain = Math.round(spectacle.baseGold + ourPower * 1.2 + rivalPower * 0.9 + requestBonus);
    if (win) {
        goldGain = Math.round(goldGain * 1.18);
    } else {
        goldGain = Math.round(goldGain * 0.72);
    }

    let fameGain = spectacle.baseFame + Math.floor(rivalPower / 8) + Math.floor(margin / 4);
    if (win) {
        fameGain += 4;
    } else {
        fameGain = Math.max(1, Math.floor(fameGain / 2));
        state.fame = Math.max(0, state.fame - Math.max(1, Math.floor(spectacle.baseFame / 3)));
    }

    state.gold += goldGain;
    state.fame += fameGain;

    const xpGain = Math.max(4, Math.round((spectacle.baseFame + rivalPower) / Math.max(1, selected.length)) + (win ? 4 : 2));
    const medicusBonus = state.facilities.medicus;
    let casualtyMessage = null;

    selected.forEach((fighter) => {
        gainExperience(fighter, xpGain + state.facilities.trainingYard * 2);
        fighter.fame += Math.max(1, Math.floor(fameGain / Math.max(1, selected.length)));

        if (win) {
            const renownGain = 1 + Math.floor(margin / 120);
            fighter.renown += renownGain;
            if (spectacle.toTheDeath) {
                fighter.renown += 2;
            }
        }

        const wound = win ? randomBetween(1, 2 + spectacle.risk * 6) : randomBetween(2, 5 + spectacle.risk * 8);
        const reducedWound = Math.max(0, wound - medicusBonus);
        fighter.hp = Math.max(1, fighter.hp - reducedWound);
    });

    if (spectacle.toTheDeath) {
        const deathChance = clamp(0.1 + spectacle.risk + (win ? 0.02 : 0.18) + margin / 220 - medicusBonus * 0.03, 0.04, 0.72);
        if (Math.random() < deathChance) {
            const casualty = selected.slice().sort((left, right) => left.hp - right.hp)[0];
            casualty.alive = false;
            casualtyMessage = `${casualty.name} does not survive the fight to the death.`;
            state.roster = state.roster.filter((fighter) => fighter.alive);
            state.selectedFighterIds.delete(casualty.id);
        }
    }

    const leader = spectacle.opponents.slice().sort((left, right) => spectaclePower(right) - spectaclePower(left))[0];
    const leaderName = leader ? `${leader.name}, the ${leader.title}` : "the rival troupe";
    const messages = [];

    if (win) {
        messages.push(`You've defeated ${leaderName}.`);
        messages.push(`The sponsor pays ${moneyFormat(goldGain)} and your fame rises.`);
        selected.forEach((fighter) => {
            messages.push(`${fighter.name} gains renown (now at ${fighter.renown}).`);
        });
    } else {
        messages.push(`The crowd enjoys the struggle, but the sponsor pays only ${moneyFormat(goldGain)}.`);
    }

    if (spectacle.requestedName && selected.some((fighter) => fighter.name === spectacle.requestedName)) {
        messages.push(`${spectacle.requestedName} was specifically requested and drew a richer purse.`);
    }

    if (casualtyMessage) {
        messages.push(casualtyMessage);
    }

    if (state.fame >= nextCity().fameRequired && state.cityIndex < cityChain.length - 1) {
        messages.push(`Your fame is now high enough to attract promoters in ${nextCity().name}.`);
    }

    return {
        win,
        goldGain,
        fameGain,
        summary: messages.join(" "),
        messages
    };
}

function resolvePendingSpectacle() {
    const pending = state.pendingSpectacle;
    if (!pending) {
        return false;
    }

    const spectacle = state.spectacleBoard.find((entry) => entry.id === pending.spectacleId);
    if (!spectacle) {
        addLog("The booked spectacle cannot be found, so the sponsor cancels the show.");
        state.pendingSpectacle = null;
        return false;
    }

    const selected = pending.fighterIds
        .map((fighterId) => state.roster.find((fighter) => fighter.id === fighterId && fighter.alive))
        .filter(Boolean);

    if (selected.length < spectacle.minFighters || selected.length > spectacle.maxFighters) {
        addLog(`${spectacle.title} could not start because the booked team is no longer valid.`);
        state.pendingSpectacle = null;
        return false;
    }

    const outcome = resolveSpectacleOutcome(spectacle, selected);
    state.pendingSpectacle = null;
    state.lastSpectacleResult = {
        title: spectacle.title,
        day: state.day,
        dayLabel: formatCalendarDate(currentCalendarDate()),
        win: outcome.win,
        summary: outcome.summary,
        messages: outcome.messages,
        goldGain: outcome.goldGain,
        fameGain: outcome.fameGain
    };
    outcome.messages.forEach((message) => addLog(message));
    state.selectedFighterIds.clear();
    return true;
}

function queueSpectacle(spectacleId) {
    if (state.pendingSpectacle) {
        addLog(`A spectacle is already booked for ${formatCalendarDate(state.pendingSpectacle.resolveTurn)}.`);
        return;
    }

    const spectacle = state.spectacleBoard.find((entry) => entry.id === spectacleId);
    if (!spectacle) {
        return;
    }

    const selected = listSelectedFighters();
    if (selected.length < spectacle.minFighters || selected.length > spectacle.maxFighters) {
        addLog(`${spectacle.title} needs between ${spectacle.minFighters} and ${spectacle.maxFighters} fighters.`);
        return;
    }

    state.pendingSpectacle = {
        spectacleId,
        fighterIds: selected.map((fighter) => fighter.id),
        resolveTurn: spectacle.eventTurn
    };
    state.lastSpectacleResult = null;
    state.selectedFighterIds.clear();
    addLog(`${spectacle.title} is booked for ${formatCalendarDate(state.pendingSpectacle.resolveTurn)}.`);
}

function toggleSelection(fighterId, checked) {
    if (checked) {
        state.selectedFighterIds.add(fighterId);
    } else {
        state.selectedFighterIds.delete(fighterId);
    }
}

function cityIndexToNextLabel() {
    return cityChain[Math.min(cityChain.length - 1, state.cityIndex + 1)];
}

export {
    state,
    currentCity,
    currentCalendarDate,
    stableCap,
    nextCity,
    nextCityProgress,
    fameProgress,
    addLog,
    refreshMarkets,
    setActiveView,
    bookedSpectacle,
    spectacleResultMarkup,
    advanceDay,
    moneyFormat,
    gainExperience,
    itemBonusSummary,
    trainingCost,
    trainFighter,
    hireRecruit,
    buyItem,
    upgradeFacility,
    travelToNextCity,
    listSelectedFighters,
    spectaclePower,
    resolveSpectacleOutcome,
    resolvePendingSpectacle,
    queueSpectacle,
    toggleSelection,
    cityIndexToNextLabel
};

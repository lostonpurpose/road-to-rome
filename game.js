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
    trainingBudgetCatalog,
    staffCatalog,
    gladiatorPaths,
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

const lanistaNameStorageKey = "munus-glory-lanista-name";

function loadLanistaName() {
    try {
        const stored = window.localStorage.getItem(lanistaNameStorageKey);
        if (!stored || !stored.trim() || stored.trim() === "The Lanista") {
            return "Munus & Glory";
        }
        return stored.trim();
    } catch {
        return "Munus & Glory";
    }
}

function saveLanistaName(name) {
    try {
        window.localStorage.setItem(lanistaNameStorageKey, name);
    } catch {
        // Ignore storage failures.
    }
}

const state = {
    cityIndex: 0,
    day: turnFromDate(1, 1, 9),
    gold: 80,
    fame: 0,
    lanistaName: loadLanistaName(),
    lanistaRenameOpen: false,
    lanistaRenameDraft: "",
    empireMapOpen: false,
    empireMapZoom: 1,
    trainingBudget: "med",
    roster: buildStartRoster(),
    recruitMarket: [],
    armoryStock: [],
    armoryOwned: [],
    armoryShopOpen: false,
    armoryShopFighterId: null,
    spectacleBoard: [],
    spectacleBookingOpen: false,
    spectacleBookingSpectacleId: null,
    spectacleAttendanceOpen: false,
    trainingQueue: [],
    facilityUpgradeQueue: null,
    pendingSpectacle: null,
    lastSpectacleResult: null,
    spectacleResultOpen: false,
    staff: [],
    staffAssignments: [],
    activeView: "hub",
    selectedFighterId: null,
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
    if (refreshSpectacles || state.armoryStock.length === 0) {
        state.armoryStock = buildArmoryStock(state.cityIndex, state.facilities.armory);
    }
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

function selectFighter(fighterId) {
    if (state.roster.some((fighter) => fighter.id === fighterId && fighter.alive)) {
        state.selectedFighterId = fighterId;
    }
}

function setLanistaName(name) {
    const nextName = name.trim();
    if (!nextName) {
        return false;
    }

    state.lanistaName = nextName;
    saveLanistaName(nextName);
    state.lanistaRenameOpen = false;
    state.lanistaRenameDraft = "";
    return true;
}

function openLanistaRename() {
    state.lanistaRenameDraft = state.lanistaName;
    state.lanistaRenameOpen = true;
}

function cancelLanistaRename() {
    state.lanistaRenameOpen = false;
    state.lanistaRenameDraft = "";
}

function openEmpireMap() {
    state.empireMapOpen = true;
}

function closeEmpireMap() {
    state.empireMapOpen = false;
}

function setEmpireMapZoom(zoom) {
    state.empireMapZoom = Math.max(1, Math.min(2.5, zoom));
}

function updateLanistaRenameDraft(value) {
    state.lanistaRenameDraft = value;
}

function confirmLanistaRename() {
    return setLanistaName(state.lanistaRenameDraft);
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
        const ready = dueDay <= state.day;

        if (!spectacle) {
            return `
                <div class="status-callout pending">
                    <strong>A spectacle is booked for ${formatCalendarDate(dueDay)}.</strong>
                    <span>${ready ? "The day has arrived. Send gladiators from Promoters." : "The sponsor is waiting for your troupe to show up."}</span>
                </div>
            `;
        }

        if (ready) {
            return `
                <div class="status-callout pending">
                    <strong>${spectacle.title} is ready for today.</strong>
                    <span>${state.pendingSpectacle.sent ? "The gladiators have been sent. Advance to the next day for the result." : "Choose gladiators in Promoters, then send them to the show."}</span>
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

    const upgradesCompleted = processFacilityUpgradeQueue();
    const trainingCompleted = processTrainingQueue();
    const assignmentsCompleted = processStaffAssignments();
    const spectacleReady = markPendingSpectacleReady();
    if (state.pendingSpectacle && state.pendingSpectacle.resolveTurn <= state.day) {
        state.spectacleAttendanceOpen = true;
        if (state.pendingSpectacle.sent) {
            state.spectacleAttendanceOpen = false;
            resolvePendingSpectacle();
        }
    }

    if (!upgradesCompleted && !trainingCompleted && !assignmentsCompleted && !spectacleReady) {
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

    while (fighter.exp >= fighter.level * 40) {
        fighter.exp -= fighter.level * 40;
        fighter.level += 1;
        fighter.maxHp += 2;
        fighter.strength += 1;
        fighter.defense += 1;
        fighter.hp = fighter.maxHp;
        leveled = true;
    }

    return leveled;
}

function specializeFighter(fighterId, pathKey) {
    const fighter = state.roster.find((entry) => entry.id === fighterId && entry.alive);
    const path = gladiatorPaths[pathKey];
    if (!fighter || !path || fighter.level < 3 || fighter.path) {
        return false;
    }

    fighter.path = pathKey;
    fighter.style = pathKey;
    fighter.title = path.name;
    fighter.maxHp = Math.max(1, fighter.maxHp + (path.bonuses.maxHp || 0));
    fighter.hp = Math.min(fighter.maxHp, fighter.hp + Math.max(0, path.bonuses.maxHp || 0));
    fighter.strength += path.bonuses.strength || 0;
    fighter.defense += path.bonuses.defense || 0;
    fighter.renown += path.bonuses.renown || 0;
    addLog(`${fighter.name} takes the path of the ${path.name}.`);
    refreshMarkets(false);
    return true;
}

function itemBonusSummary(item) {
    const parts = [];
    if (item.bonus.strength) {
        parts.push(`+${item.bonus.strength} ATHLETICISM`);
    }
    if (item.bonus.defense) {
        parts.push(`+${item.bonus.defense} THEATRICS`);
    }
    if (item.bonus.hp) {
        parts.push(`+${item.bonus.hp} CONSTITUTION`);
    }
    if (item.bonus.fame) {
        parts.push(`+${item.bonus.fame} FAME`);
    }
    return parts.join(" · ");
}

function trainingCost(fighter) {
    return 10 + fighter.level * 6 + state.facilities.trainingYard * 3;
}

function setTrainingBudget(key) {
    if (!trainingBudgetCatalog[key]) {
        return;
    }

    const budget = trainingBudgetCatalog[key];
    const dailyCost = state.roster.filter((fighter) => fighter.alive).length * budget.goldPerFighter;
    if (state.gold < dailyCost) {
        addLog(`${budget.label} training requires ${moneyFormat(dailyCost)} per day.`);
        return;
    }

    state.trainingBudget = key;
    addLog(`Training budget set to ${trainingBudgetCatalog[key].label}.`);
}

function trainFighter() {
    addLog("Training is managed by the stable-wide budget now.");
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

function hireStaff(roleKey) {
    const catalog = staffCatalog[roleKey];
    if (!catalog) {
        return false;
    }
    if (state.gold < catalog.cost) {
        addLog(`You cannot afford to hire a ${catalog.role.toLowerCase()}.`);
        return false;
    }

    state.gold -= catalog.cost;
    state.staff.push({ id: nextId("staff"), roleKey, role: catalog.role, name: randomFrom(["Gaius", "Marcia", "Publius", "Naevius", "Sura"]), skill: randomBetween(1, 3), assignmentId: null });
    addLog(`A ${catalog.role.toLowerCase()} joins your stable.`);
    return true;
}

function assignStaff(staffId, taskKey, fighterId = null) {
    const staffMember = state.staff.find((entry) => entry.id === staffId && !entry.assignmentId);
    const catalog = staffMember && staffCatalog[staffMember.roleKey];
    const task = catalog?.tasks.find((entry) => entry.key === taskKey);
    const fighter = fighterId ? state.roster.find((entry) => entry.id === fighterId && entry.alive && !entry.assignmentId) : null;
    if (!staffMember || !task || (taskKey === "excursion" && !fighter)) {
        return false;
    }

    const assignment = { id: nextId("assignment"), staffId, taskKey, fighterId, completeDay: state.day + Math.max(2, task.days - staffMember.skill + 1) };
    staffMember.assignmentId = assignment.id;
    if (fighter) {
        fighter.assignmentId = assignment.id;
        fighter.assignmentLabel = `${staffMember.role} training excursion`;
    }
    state.staffAssignments.push(assignment);
    addLog(`${staffMember.role} ${staffMember.name} leaves to ${task.label.toLowerCase()}.`);
    return true;
}

function processStaffAssignments() {
    const completed = state.staffAssignments.filter((assignment) => assignment.completeDay <= state.day);
    if (!completed.length) {
        return false;
    }

    completed.forEach((assignment) => {
        const staffMember = state.staff.find((entry) => entry.id === assignment.staffId);
        const fighter = assignment.fighterId && state.roster.find((entry) => entry.id === assignment.fighterId);
        if (staffMember) {
            staffMember.assignmentId = null;
        }
        if (fighter) {
            fighter.assignmentId = null;
            fighter.assignmentLabel = null;
            if (assignment.taskKey === "excursion") {
                fighter.strength += 1;
                fighter.exp += 8;
                addLog(`${fighter.name} returns from training with a sharper athleticism.`);
            }
        }
        if (assignment.taskKey === "gladiators") {
            state.recruitMarket = buildRecruitMarket(state.cityIndex);
            addLog(`${staffMember?.name || "The scout"} finds new gladiators looking for work.`);
        } else if (assignment.taskKey === "contracts") {
            state.spectacleBoard = buildFestivalBoard(state.day, state.cityIndex, state.roster);
            addLog(`${staffMember?.name || "The negotiator"} returns with fresh contracts.`);
        } else if (assignment.taskKey === "sponsors") {
            const payment = 12 + (staffMember?.skill || 1) * 6;
            state.gold += payment;
            addLog(`${staffMember?.name || "The negotiator"} secures a sponsor gift of ${moneyFormat(payment)}.`);
        }
    });
    state.staffAssignments = state.staffAssignments.filter((assignment) => assignment.completeDay > state.day);
    return true;
}

function buyItem(itemId) {
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
    state.armoryOwned.push(item);
    addLog(`${item.name} is added to the armory inventory.`);
    refreshMarkets(false);
}

function equipItem(fighterId, itemId) {
    const fighter = state.roster.find((entry) => entry.id === fighterId && entry.alive);
    const itemIndex = state.armoryOwned.findIndex((entry) => entry.id === itemId);
    if (!fighter || itemIndex === -1) {
        return;
    }

    const item = state.armoryOwned[itemIndex];
    const previousItem = fighter.gear?.[item.slot];
    fighter.gear = { ...(fighter.gear || {}), [item.slot]: item };
    state.armoryOwned.splice(itemIndex, 1);
    if (previousItem) {
        state.armoryOwned.push(previousItem);
    }
    addLog(`${item.name} equipped by ${fighter.name}.`);
}

function openArmoryShop(fighterId = null) {
    state.armoryShopOpen = true;
    state.armoryShopFighterId = fighterId;
}

function closeArmoryShop() {
    state.armoryShopOpen = false;
    state.armoryShopFighterId = null;
}

function closeSpectacleResult() {
    state.spectacleResultOpen = false;
}

function upgradeFacility(key) {
    const facility = state.facilities[key];
    if (facility == null) {
        return;
    }

    if (state.facilityUpgradeQueue) {
        addLog(`You already have a building upgrade underway.`);
        return;
    }

    const catalog = facilityCatalog[key];
    const cost = catalog.baseCost + facility * 26 + state.cityIndex * 14;
    if (state.gold < cost) {
        addLog(`The ${catalog.title.toLowerCase()} costs ${moneyFormat(cost)}.`);
        return;
    }

    state.gold -= cost;
    state.facilityUpgradeQueue = {
        id: nextId("upgrade"),
        key,
        title: catalog.title,
        startedTurn: state.day,
        completeTurn: state.day + 14,
        cost
    };
    addLog(`${catalog.title} upgrade queued. It will take 2 weeks.`);
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
    const budget = trainingBudgetCatalog[state.trainingBudget] || trainingBudgetCatalog.med;
    const aliveFighters = state.roster.filter((fighter) => fighter.alive && !fighter.assignmentId);

    if (aliveFighters.length === 0) {
        return false;
    }

    const totalCost = aliveFighters.length * budget.goldPerFighter;
    if (state.gold < totalCost) {
        addLog(`Training is paused. The ${budget.label.toLowerCase()} budget costs ${moneyFormat(totalCost)} per day.`);
        return false;
    }
    state.gold -= totalCost;

    let anyProgress = false;
    aliveFighters.forEach((fighter) => {
        const training = fighter.training || { focus: "hp", progress: 0 };
        training.progress += budget.pointsPerDay;

        if (fighter.injury && fighter.injury.recoveryDays > 0) {
            fighter.injury.recoveryDays -= 1;
            if (fighter.injury.recoveryDays === 0) {
                fighter.injury = null;
                addLog(`${fighter.name} has recovered from their injury.`);
            }
        }

        while (training.progress >= budget.daysPerStat) {
            training.progress -= budget.daysPerStat;

            if (training.focus === "hp") {
                fighter.maxHp += 1;
                fighter.hp = fighter.maxHp;
            } else if (training.focus === "strength") {
                fighter.strength += 1;
            } else {
                fighter.defense += 1;
            }

            training.focus = training.focus === "hp" ? "strength" : training.focus === "strength" ? "defense" : "hp";
            gainExperience(fighter, 1);
            anyProgress = true;
        }

        fighter.training = training;
    });

    if (anyProgress) {
        addLog(`The ${budget.label.toLowerCase()} training budget pays off.`);
    }

    return anyProgress;
}

function listSelectedFighters(fighterIds = state.selectedFighterIds) {
    const ids = fighterIds instanceof Set ? fighterIds : new Set(fighterIds || []);
    return state.roster.filter((fighter) => fighter.alive && ids.has(fighter.id));
}

function processFacilityUpgradeQueue() {
    const pending = state.facilityUpgradeQueue;
    if (!pending || pending.completeTurn > state.day) {
        return false;
    }

    state.facilities[pending.key] += 1;
    addLog(`${pending.title} upgraded to level ${state.facilities[pending.key]}.`);
    state.facilityUpgradeQueue = null;
    return true;
}

function markPendingSpectacleReady() {
    if (!state.pendingSpectacle || state.pendingSpectacle.ready || state.pendingSpectacle.resolveTurn > state.day) {
        return false;
    }

    state.pendingSpectacle.ready = true;
    const spectacle = bookedSpectacle();
    if (spectacle) {
        addLog(`${spectacle.title} is ready. Send gladiators from Promoters.`);
    }
    return true;
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
    const namedRequestBonus = spectacle.requestedName && selected.some((fighter) => fighter.name === spectacle.requestedName) ? spectacle.requestBonus : 0;
    const pathRequestBonus = spectacle.requestPath && selected.some((fighter) => fighter.path === spectacle.requestPath) ? 12 : 0;
    const requestBonus = namedRequestBonus + pathRequestBonus;

    const averageTheatrics = selected.reduce((sum, fighter) => sum + fighterTotalDefense(fighter), 0) / Math.max(1, selected.length);
    const averageStats = selected.reduce((sum, fighter) => sum + fighterTotalStrength(fighter) + fighterTotalDefense(fighter), 0) / Math.max(1, selected.length);
    const averageExperience = selected.reduce((sum, fighter) => sum + fighter.exp + fighter.level * 8, 0) / Math.max(1, selected.length);
    const famePaymentBonus = Math.floor(selected.reduce((sum, fighter) => sum + fighter.fame, 0) / Math.max(1, selected.length) / 4);
    const bonusChance = clamp(0.2 + averageTheatrics * 0.025 + averageStats * 0.012 + averageExperience * 0.004, 0.2, 0.8);
    const bonusPossible = win && Math.random() < bonusChance;
    const performanceBonus = bonusPossible
        ? Math.round(ourPower * 0.45 + averageTheatrics * 2 + averageExperience * 0.35 + famePaymentBonus + requestBonus)
        : 0;
    const goldGain = spectacle.baseGold + performanceBonus;

    let fameGain = spectacle.baseFame + Math.floor(rivalPower / 8) + Math.floor(margin / 4);
    if (win) {
        fameGain += 4;
    } else {
        fameGain = Math.max(1, Math.floor(fameGain / 2));
        state.fame = Math.max(0, state.fame - Math.max(1, Math.floor(spectacle.baseFame / 3)));
    }

    state.gold += goldGain;
    state.fame += fameGain;

    const xpGain = Math.max(3, Math.round((spectacle.baseFame + rivalPower) / Math.max(1, selected.length) * 0.55) + (win ? 2 : 1));
    const medicusBonus = state.facilities.medicus;
    let casualtyMessage = null;
    const injuries = [];

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
        if (reducedWound > 0) {
            const recoveryDays = Math.max(1, Math.ceil(reducedWound / 2));
            fighter.injury = {
                description: reducedWound >= 4 ? "a serious wound" : "bruising and cuts",
                recoveryDays,
                permanent: false
            };
            injuries.push({ fighter: fighter.name, description: fighter.injury.description, recoveryDays, permanent: false });
        }
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
        messages.push(`The crowd enjoys the struggle, and the sponsor pays the agreed ${moneyFormat(goldGain)}.`);
    }

    if (bonusPossible) {
        messages.push(`The crowd's response earns a performance bonus.`);
    }

    if (spectacle.requestedName && selected.some((fighter) => fighter.name === spectacle.requestedName)) {
        messages.push(`${spectacle.requestedName} was specifically requested and drew a richer purse.`);
    }

    if (spectacle.requestPath && selected.some((fighter) => fighter.path === spectacle.requestPath)) {
        messages.push(`The promoter's ${spectacle.requestPath} request was fulfilled.`);
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
        messages,
        injuries,
        opponents: spectacle.opponents.map((opponent) => ({ name: opponent.name, title: opponent.title })),
        battleDescription: win
            ? "Your gladiators controlled the pace, broke the opposing line, and carried the crowd with them."
            : "The rival troupe seized the rhythm early, forcing your gladiators into a hard and costly retreat.",
    };
}

function resolvePendingSpectacle() {
    const pending = state.pendingSpectacle;
    if (!pending || pending.resolveTurn > state.day) {
        return false;
    }

    const spectacle = state.spectacleBoard.find((entry) => entry.id === pending.spectacleId);
    if (!spectacle) {
        addLog("The booked spectacle cannot be found, so the sponsor cancels the show.");
        state.pendingSpectacle = null;
        return false;
    }

    const selected = listSelectedFighters(pending.fighterIds);

    if (selected.length < spectacle.minFighters || selected.length > spectacle.maxFighters) {
        addLog(`${spectacle.title} needs between ${spectacle.minFighters} and ${spectacle.maxFighters} fighters before it can begin.`);
        return false;
    }

    if (!pending.sent) {
        addLog(`${spectacle.title} is waiting for the gladiators to be sent.`);
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
        fameGain: outcome.fameGain,
        opponents: outcome.opponents,
        battleDescription: outcome.battleDescription,
        injuries: outcome.injuries
    };
    state.spectacleResultOpen = true;
    outcome.messages.forEach((message) => addLog(message));
    state.selectedFighterIds.clear();
    return true;
}

function openSpectacleBooking(spectacleId) {
    if (state.pendingSpectacle) {
        addLog(`A spectacle is already booked for ${formatCalendarDate(state.pendingSpectacle.resolveTurn)}.`);
        return false;
    }

    const spectacle = state.spectacleBoard.find((entry) => entry.id === spectacleId);
    if (!spectacle) {
        return false;
    }

    state.spectacleBookingSpectacleId = spectacleId;
    state.spectacleBookingOpen = true;
    return true;
}

function closeSpectacleBooking() {
    state.spectacleBookingOpen = false;
    state.spectacleBookingSpectacleId = null;
}

function openSpectacleAttendance() {
    if (!state.pendingSpectacle || state.pendingSpectacle.sent || state.pendingSpectacle.resolveTurn > state.day) {
        return false;
    }

    state.spectacleAttendanceOpen = true;
    return true;
}

function closeSpectacleAttendance() {
    state.spectacleAttendanceOpen = false;
}

function sendSpectacle() {
    if (!state.pendingSpectacle || state.pendingSpectacle.resolveTurn > state.day) {
        return false;
    }

    state.pendingSpectacle.sent = true;
    state.spectacleAttendanceOpen = false;
    addLog("The gladiators enter the arena. Advance to the next day to see the result.");
    return true;
}

function queueSpectacle(spectacleId) {
    if (state.pendingSpectacle) {
        addLog(`A spectacle is already booked for ${formatCalendarDate(state.pendingSpectacle.resolveTurn)}.`);
        return false;
    }

    const spectacle = state.spectacleBoard.find((entry) => entry.id === spectacleId);
    if (!spectacle) {
        return false;
    }

    const selected = listSelectedFighters();
    if (selected.length < spectacle.minFighters || selected.length > spectacle.maxFighters) {
        addLog(`${spectacle.title} needs between ${spectacle.minFighters} and ${spectacle.maxFighters} fighters.`);
        return false;
    }

    state.pendingSpectacle = {
        spectacleId,
        resolveTurn: spectacle.eventTurn,
        fighterIds: [...state.selectedFighterIds],
        sent: false
    };
    state.lastSpectacleResult = null;
    closeSpectacleBooking();
    state.selectedFighterIds.clear();
    addLog(`${spectacle.title} is booked for ${formatCalendarDate(state.pendingSpectacle.resolveTurn)}.`);
    return true;
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
    setLanistaName,
    openLanistaRename,
    cancelLanistaRename,
    openEmpireMap,
    closeEmpireMap,
    setEmpireMapZoom,
    updateLanistaRenameDraft,
    confirmLanistaRename,
    bookedSpectacle,
    spectacleResultMarkup,
    advanceDay,
    moneyFormat,
    gainExperience,
    itemBonusSummary,
    trainingCost,
    trainFighter,
    setTrainingBudget,
    hireRecruit,
    hireStaff,
    assignStaff,
    selectFighter,
    buyItem,
    openArmoryShop,
    closeArmoryShop,
    closeSpectacleResult,
    upgradeFacility,
    specializeFighter,
    travelToNextCity,
    listSelectedFighters,
    processFacilityUpgradeQueue,
    spectaclePower,
    resolveSpectacleOutcome,
    resolvePendingSpectacle,
    openSpectacleBooking,
    closeSpectacleBooking,
    openSpectacleAttendance,
    closeSpectacleAttendance,
    sendSpectacle,
    queueSpectacle,
    equipItem,
    markPendingSpectacleReady,
    toggleSelection,
    cityIndexToNextLabel
};

import {
    formatCalendarDate,
    nextFestival
} from "./calendar.js";

import {
    cityChain,
    facilityCatalog,
    fighterPower,
    fighterTotalDefense,
    fighterTotalMaxHp,
    fighterTotalStrength,
    itemBonusSummary,
    moneyFormat,
    gladiatorPaths,
    trainingBudgetCatalog,
    viewLabels
} from "./game-data.js";

import {
    bookedSpectacle,
    cityIndexToNextLabel,
    currentCalendarDate,
    currentCity,
    fameProgress,
    listSelectedFighters,
    nextCity,
    nextCityProgress,
    stableCap,
    state,
    spectacleResultMarkup,
} from "./game.js";

const app = document.getElementById("app");

function escapeAttribute(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("\"", "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("'", "&#39;");
}

function gearTags(fighter) {
    const tags = [];
    const slots = ["weapon", "armor", "trinket"];

    slots.forEach((slot) => {
        const item = fighter.gear?.[slot];
        if (item) {
            tags.push(`<span class="badge">${item.name}</span>`);
        }
    });
    return tags.join("");
}

function trainingBudgetMarkup() {
    const budget = trainingBudgetCatalog[state.trainingBudget] || trainingBudgetCatalog.med;
    return `
        <div class="status-callout pending">
            <strong>${budget.label} training budget active.</strong>
            <span>${moneyFormat(budget.goldPerFighter)} per gladiator per day.</span>
        </div>
        <div class="budget-row">
            ${Object.entries(trainingBudgetCatalog).map(([key, entry]) => `
                <button class="secondary ${state.trainingBudget === key ? "active" : ""}" data-action="set-training-budget" data-budget="${key}">${entry.label}</button>
            `).join("")}
        </div>
    `;
}

function calendarSummaryMarkup() {
    const today = currentCalendarDate();
    const nextEvent = nextFestival(state.day);
    const countdownText = nextEvent
        ? (nextEvent.daysAway === 0 ? `Today: ${nextEvent.definition.title}.` : `Next spectacle in ${nextEvent.daysAway} days: ${nextEvent.definition.title}.`)
        : "No festival dates found.";

    return `
        <div class="status-callout pending">
            <strong>Today: ${formatCalendarDate(today)}</strong>
            <span>${countdownText}</span>
        </div>
    `;
}

function fighterCard(fighter) {
    const training = fighter.training || { focus: "hp", progress: 0 };
    const budget = trainingBudgetCatalog[state.trainingBudget] || trainingBudgetCatalog.med;
    const focusLabel = training.focus === "hp" ? "Constitution" : training.focus === "strength" ? "Athleticism" : "Theatrics";
    const assignedToPendingSpectacle = state.pendingSpectacle?.fighterIds?.includes(fighter.id) || false;
    const selectedForSpectacle = assignedToPendingSpectacle || state.selectedFighterIds.has(fighter.id);
    const path = fighter.path ? gladiatorPaths[fighter.path] : null;
    const pathChoices = fighter.level >= 3 && !path ? `
        <div class="fighter-path-panel">
            <strong>Choose a gladiator path</strong>
            <span class="muted small">This is a permanent specialization. It helps satisfy promoter requests and changes how this gladiator fights.</span>
            <div class="fighter-path-list">
                ${Object.entries(gladiatorPaths).map(([key, option]) => `
                    <button class="secondary path-choice" data-action="specialize-fighter" data-fighter-id="${fighter.id}" data-path="${key}" title="${option.description}">
                        <strong>${option.name}</strong>
                        <span>${option.tradeoffs}</span>
                    </button>
                `).join("")}
            </div>
        </div>
    ` : path ? `<div class="status-callout path-callout"><strong>${path.name}</strong><span>${path.description}</span></div>` : "";
    return `
        <article class="fighter-card">
            <div class="fighter-top">
                <div>
                    <h3 class="fighter-name">${fighter.name}</h3>
                    <div class="muted">${fighter.title} · ${fighter.style} · ${fighter.origin}</div>
                    <div class="badges fighter-summary-badges">
                        <span class="badge info">XP ${fighter.exp}</span>
                        <span class="badge">Renown ${fighter.renown}</span>
                        <span class="badge">Power ${fighterPower(fighter)}</span>
                    </div>
                </div>
                <span class="badge gold">Lv ${fighter.level}</span>
            </div>
            <div class="stats-grid">
                <div class="stat-box"><span class="label">Constitution</span><span class="value">${fighter.hp}/${fighterTotalMaxHp(fighter)}</span></div>
                <div class="stat-box"><span class="label">Athleticism</span><span class="value">${fighterTotalStrength(fighter)}</span></div>
                <div class="stat-box"><span class="label">Theatrics</span><span class="value">${fighterTotalDefense(fighter)}</span></div>
            </div>
            <div class="muted small">Power is derived from attributes, level, and gear. Fame is stable reputation; Renown is this gladiator's personal standing.</div>
            <div class="gear-line">
                ${gearTags(fighter)}
            </div>
            <button class="equipment-button" data-action="armory-shop-open" data-fighter-id="${fighter.id}">Equipment</button>
            <label class="checkbox-line spectacle-select-line">
                <input type="checkbox" class="spectacle-fighter-select" data-fighter-id="${fighter.id}" ${selectedForSpectacle ? "checked" : ""} ${assignedToPendingSpectacle ? "disabled" : ""}>
                ${assignedToPendingSpectacle ? "Assigned to booked spectacle" : "Select for next spectacle"}
            </label>
            <div class="status-callout pending">
                <strong>Training ${focusLabel} automatically.</strong>
                <span>${training.progress}/${budget.daysPerStat} training points toward the next ${focusLabel} gain.</span>
            </div>
            ${pathChoices}
        </article>
    `;
}

function spectacleBookingMarkup() {
    const attendance = state.spectacleAttendanceOpen;
    const spectacleId = attendance ? state.pendingSpectacle?.spectacleId : state.spectacleBookingSpectacleId;
    if ((!state.spectacleBookingOpen && !attendance) || !spectacleId) {
        return "";
    }

    const spectacle = state.spectacleBoard.find((entry) => entry.id === spectacleId);
    if (!spectacle) {
        return "";
    }

    const selected = attendance ? listSelectedFighters(state.pendingSpectacle.fighterIds) : listSelectedFighters();
    const validSelection = selected.length >= spectacle.minFighters && selected.length <= spectacle.maxFighters;
    const eligibleFighters = state.roster.filter((fighter) => fighter.alive);
    const requestText = spectacle.minFighters === spectacle.maxFighters
        ? `${spectacle.minFighters} fighter${spectacle.minFighters === 1 ? "" : "s"}`
        : `${spectacle.minFighters}-${spectacle.maxFighters} fighters`;

    return `
        <div class="rename-overlay spectacle-overlay">
            <div class="panel spectacle-panel">
                <div class="rename-panel-head">
                    <div>
                        <h3>${spectacle.title}</h3>
                        <p class="small muted">${spectacle.sponsor} · ${spectacle.venue}</p>
                    </div>
                    <button class="secondary tiny" data-action="${attendance ? "spectacle-attendance-cancel" : "spectacle-book-cancel"}">Close</button>
                </div>
                <div class="spectacle-panel-grid">
                    <section class="spectacle-details">
                        <h4>Show details</h4>
                        <div class="spectacle-meta">
                            <span class="badge gold">${moneyFormat(spectacle.baseGold)} payment</span>
                            <span class="badge">+${spectacle.baseFame} fame</span>
                            <span class="badge">Requests ${requestText}</span>
                            <span class="badge ${spectacle.toTheDeath ? "danger" : "info"}">${spectacle.toTheDeath ? "To the death" : "Standard exhibition"}</span>
                            ${spectacle.toTheDeath ? '<span class="badge danger">High risk · high reward</span>' : ""}
                        </div>
                        <p class="small">${spectacle.flavor}</p>
                        <div class="status-callout ${attendance ? "pending" : ""}">
                            <strong>Promoter request</strong>
                            <span>${spectacle.request}</span>
                            ${spectacle.requestPath ? `<span>Preferred path: ${gladiatorPaths[spectacle.requestPath]?.name || spectacle.requestPath}.</span>` : ""}
                        </div>
                        <p class="small muted">${attendance ? "The spectacle is ready. Review the requested show and send the booked gladiators." : "The show starts simple at game start: no to-the-death booking yet. Pick the fighters here, then confirm the booking."}</p>
                        <div class="status-callout pending">
                            <strong>${attendance ? `${selected.length} fighter${selected.length === 1 ? "" : "s"} ready to enter.` : (validSelection ? `${selected.length} fighter${selected.length === 1 ? "" : "s"} selected.` : `Pick ${requestText} to book this show.`)}</strong>
                            <span>${attendance ? "The crowd is waiting." : (spectacle.daysAway === 0 ? "This spectacle is for today." : `${spectacle.daysAway} day${spectacle.daysAway === 1 ? "" : "s"} away.`)}</span>
                        </div>
                    </section>
                    <section class="spectacle-selection">
                        <h4>${attendance ? "Booked gladiators" : "Choose fighters"}</h4>
                        <div class="spectacle-fighter-list">
                            ${(attendance ? selected : eligibleFighters).map((fighter) => `<label class="checkbox-line"><input type="checkbox" class="spectacle-fighter-select" data-fighter-id="${fighter.id}" ${selected.some((entry) => entry.id === fighter.id) ? "checked" : ""} ${attendance ? "disabled" : ""}> ${fighter.name} (Power: ${fighterPower(fighter)}, Renown: ${fighter.renown})</label>`).join("") || `<p class="small muted">No living fighters available.</p>`}
                        </div>
                        <div class="card-actions">
                            ${attendance
                                ? `<button class="danger-button" data-action="spectacle-attendance-confirm">Send gladiators</button>`
                                : `<button data-action="spectacle-book-confirm" data-id="${spectacle.id}" ${validSelection ? "" : "disabled"}>Confirm booking</button>`}
                            <button class="secondary" data-action="${attendance ? "spectacle-attendance-cancel" : "spectacle-book-cancel"}">${attendance ? "Wait" : "Cancel"}</button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    `;
}

function spectacleResultMarkupOverlay() {
    const result = state.lastSpectacleResult;
    if (!state.spectacleResultOpen || !result) {
        return "";
    }

    return `
        <div class="rename-overlay result-overlay">
            <div class="panel spectacle-panel result-panel">
                <div class="rename-panel-head">
                    <div>
                        <h3>${result.win ? "A Triumphant Spectacle" : "A Costly Spectacle"}</h3>
                        <p class="small muted">${result.title} · ${result.dayLabel}</p>
                    </div>
                    <button class="secondary tiny" data-action="spectacle-result-close">Close</button>
                </div>
                <div class="result-hero ${result.win ? "win" : "loss"}">
                    <strong>${result.win ? "VICTORY" : "DEFEAT"}</strong>
                    <span>${result.battleDescription}</span>
                </div>
                <section class="result-section">
                    <h4>Opposing troupe</h4>
                    <div class="badges">${result.opponents.map((opponent) => `<span class="badge">${opponent.name}, ${opponent.title}</span>`).join("")}</div>
                </section>
                <section class="result-section">
                    <h4>Aftermath</h4>
                    <p>${result.summary}</p>
                    <div class="injury-list">
                        ${result.injuries.length
                            ? result.injuries.map((injury) => `<div class="status-callout pending"><strong>${injury.fighter}: ${injury.description}</strong><span>${injury.permanent ? "Permanent injury." : `Expected recovery: ${injury.recoveryDays} day${injury.recoveryDays === 1 ? "" : "s"}.`}</span></div>`).join("")
                            : `<div class="status-callout"><strong>No injuries recorded.</strong><span>The gladiators leave the arena shaken but sound.</span></div>`}
                    </div>
                </section>
            </div>
        </div>
    `;
}

function ownedItemMarkup(items) {
    const counts = new Map();
    items.forEach((item) => {
        const key = `${item.name}-${item.slot}`;
        const entry = counts.get(key) || { item, count: 0 };
        entry.count += 1;
        counts.set(key, entry);
    });

    return [...counts.values()]
        .map(({ item, count }) => `<span class="badge gold">${item.name} · ${item.slot} · x${count}</span>`)
        .join("");
}

function empireMapMarkup() {
    if (!state.empireMapOpen) {
        return "";
    }

    const mapPositions = [
        { left: 28, top: 65 },
        { left: 31, top: 62 },
        { left: 35, top: 57 },
        { left: 40, top: 51 },
        { left: 47, top: 42 },
        { left: 54, top: 47 }
    ];
    const nextCity = cityIndexToNextLabel();
    const travelCost = nextCity ? 18 + nextCity.prestige * 12 : 0;

    return `
        <div class="rename-overlay empire-overlay">
            <div class="panel empire-panel">
                <div class="rename-panel-head">
                    <div>
                        <h3>View Empire</h3>
                        <p class="small muted">The road from provincial bloodsport to the capital.</p>
                    </div>
                    <button class="secondary tiny" data-action="empire-map-close">Close</button>
                </div>
                <div class="empire-map-controls">
                    <button class="secondary tiny" data-action="empire-map-zoom-out" ${state.empireMapZoom <= 1 ? "disabled" : ""} aria-label="Zoom out">−</button>
                    <span class="muted small">${Math.round(state.empireMapZoom * 100)}%</span>
                    <button class="secondary tiny" data-action="empire-map-zoom-in" ${state.empireMapZoom >= 2.5 ? "disabled" : ""} aria-label="Zoom in">+</button>
                    <button class="secondary tiny" data-action="empire-map-zoom-reset">Reset</button>
                </div>
                <div class="empire-map-wrap">
                    <div class="empire-map-canvas" style="width: ${state.empireMapZoom * 100}%;">
                        <img class="empire-map-image" src="images/Maps-roman-empire-peak-150AD.jpg" alt="Map of the Roman Empire around 150 AD">
                        <div class="empire-markers">
                        ${cityChain.map((city, index) => ({ city, index })).filter(({ index }) => index === state.cityIndex).map(({ city, index }) => {
                            const isCurrent = index === state.cityIndex;
                            const isNext = index === state.cityIndex + 1;
                            const unlocked = state.fame >= city.fameRequired;
                            const canMove = isNext && unlocked && !state.pendingSpectacle && state.gold >= travelCost;
                            const status = isCurrent ? "current" : canMove ? "available" : unlocked ? "unlocked" : "locked";
                            const markerLabel = isCurrent ? "Current" : canMove ? "Travel" : unlocked ? "Reached" : `Need ${city.fameRequired} fame`;
                            return `<div class="empire-marker ${status}" style="left: ${mapPositions[index].left}%; top: ${mapPositions[index].top}%">
                                <button class="empire-marker-button" ${canMove ? `data-action="travel" title="Travel to ${city.name}"` : "disabled"}>${city.name}</button>
                                <span>${markerLabel}</span>
                            </div>`;
                        }).join("")}
                        </div>
                    </div>
                </div>
                <div class="status-callout pending empire-map-legend">
                    <strong>${currentCity().name}</strong>
                    <span>Gold: ${moneyFormat(state.gold)} · Fame: ${state.fame}${nextCity ? ` · Next market: ${nextCity.name} at ${nextCity.fameRequired} fame` : ""}</span>
                </div>
            </div>
        </div>
    `;
}

function recruitCard(recruit) {
    const affordable = state.gold >= recruit.cost;
    const full = state.roster.length >= stableCap();
    return `
        <article class="market-card">
            <div class="card-head">
                <div>
                    <h4 class="market-title">${recruit.name}</h4>
                    <div class="muted">${recruit.title} · ${recruit.style} · ${recruit.origin}</div>
                </div>
                <span class="badge gold">${moneyFormat(recruit.cost)}</span>
            </div>
            <div class="badges">
                <span class="badge">Constitution ${recruit.maxHp}</span>
                <span class="badge">Athleticism ${recruit.strength}</span>
                <span class="badge">Theatrics ${recruit.defense}</span>
                <span class="badge info">Power ${fighterPower(recruit)}</span>
            </div>
            <div class="market-actions">
                <button data-action="hire" data-id="${recruit.id}" ${affordable && !full ? "" : "disabled"}>Hire recruit</button>
            </div>
        </article>
    `;
}

function itemCard(item) {
    const affordable = state.gold >= item.cost;
    return `
        <article class="market-card">
            <div class="card-head">
                <div>
                    <h4 class="market-title">${item.name}</h4>
                    <div class="muted">${item.slot} · quality ${item.quality}</div>
                </div>
                <span class="badge gold">${moneyFormat(item.cost)}</span>
            </div>
            <div class="badges">
                ${itemBonusSummary(item)
                    .split(" · ")
                    .filter(Boolean)
                    .map((entry) => `<span class="badge">${entry}</span>`)
                    .join("")}
            </div>
            <div class="market-actions">
                <button data-action="buy-item" data-id="${item.id}" ${affordable ? "" : "disabled"}>Buy for inventory</button>
            </div>
        </article>
    `;
}

function facilityCard(key) {
    const facility = state.facilities[key];
    const spec = facilityCatalog[key];
    const cost = spec.baseCost + facility * 26 + state.cityIndex * 14;
    const queued = state.facilityUpgradeQueue?.key === key;
    return `
        <article class="facility-card">
            <div class="facility-head">
                <div>
                    <h4 class="facility-title">${spec.title}</h4>
                    <div class="muted">Level ${facility}</div>
                </div>
                <span class="badge gold">${moneyFormat(cost)}</span>
            </div>
            <p class="small">${spec.description}</p>
            ${queued ? `<div class="status-callout pending"><strong>Upgrade queued.</strong><span>It completes on ${formatCalendarDate(state.facilityUpgradeQueue.completeTurn)}.</span></div>` : ""}
            <div class="facility-actions">
                <button data-action="upgrade" data-id="${key}" ${state.gold >= cost && !state.facilityUpgradeQueue ? "" : "disabled"}>Queue upgrade (2 weeks)</button>
            </div>
        </article>
    `;
}

function spectacleCard(spectacle) {
    const booked = state.pendingSpectacle?.spectacleId === spectacle.id;
    const ready = booked && state.pendingSpectacle.resolveTurn <= state.day;
    const blocked = Boolean(state.pendingSpectacle) && !booked;
    const eventDate = formatCalendarDate(spectacle.eventTurn);
    const actionLabel = booked ? (ready ? "Send gladiators" : `Booked for ${eventDate}`) : "Book spectacle";
    const actionAction = booked ? (ready ? "spectacle-send" : "spectacle-wait") : "spectacle-open";
    const typeLabel = spectacle.toTheDeath ? "Sine missione" : "Missio possible";
    
    return `
        <article class="spectacle-card">
            <div class="card-head">
                <div>
                    <h4 class="spectacle-title">${spectacle.title}</h4>
                    <div class="muted">Sponsor: ${spectacle.sponsor} · ${spectacle.venue}</div>
                </div>
                <span class="badge ${spectacle.toTheDeath ? "danger" : "info"}">${spectacle.toTheDeath ? "Sine missione" : "Missio possible"}</span>
            </div>
            <p class="small">${spectacle.flavor}</p>
            <div class="badges">
                <span class="badge gold">${moneyFormat(spectacle.baseGold)} base purse</span>
                <span class="badge">+${spectacle.baseFame} fame</span>
                <span class="badge">${eventDate}</span>
                <span class="badge">${spectacle.daysAway === 0 ? "Today" : `${spectacle.daysAway} day${spectacle.daysAway === 1 ? "" : "s"} away`}</span>
                <span class="badge ${spectacle.toTheDeath ? "danger" : "info"}">${typeLabel}</span>
                <span class="badge">Risk ${Math.round(spectacle.risk * 100)}%</span>
            </div>
            <div class="opponents-line">
                <span class="badge">${spectacle.reason}</span>
                ${spectacle.requestedName ? `<span class="badge gold">${spectacle.requestedName} requested</span>` : ""}
                ${spectacle.opponents.map((opponent) => `<span class="badge">${opponent.name}, ${opponent.title}</span>`).join("")}
            </div>
            <div class="status-callout pending">
                <strong>${booked ? `Booked for ${eventDate}.` : `This show is available on ${eventDate}.`}</strong>
                <span>${booked ? "When the day arrives, you can send gladiators from here." : `Book it now and pick ${spectacle.minFighters === spectacle.maxFighters ? `${spectacle.minFighters} fighter` : `${spectacle.minFighters}-${spectacle.maxFighters} fighters`} in the modal.`}</span>
            </div>
            <div class="market-actions">
                <button data-action="${actionAction}" data-id="${spectacle.id}" ${!blocked ? "" : "disabled"}>${actionLabel}</button>
            </div>
        </article>
    `;
}

function cityCard(city, index) {
    const isCurrent = index === state.cityIndex;
    const isLocked = state.fame < city.fameRequired && !isCurrent;
    return `
        <article class="city-card ${isCurrent ? "current" : ""} ${isLocked ? "locked" : ""}">
            <div class="city-head">
                <div>
                    <h4 class="city-title">${city.name}</h4>
                    <div class="muted">${city.region}</div>
                </div>
                <span class="badge ${isCurrent ? "gold" : ""}">${isCurrent ? "Current" : `Need ${city.fameRequired} fame`}</span>
            </div>
            <p class="small">${city.note}</p>
        </article>
    `;
}

function logMarkup() {
    return state.log.map((entry) => `<li class="log-item">${entry}</li>`).join("");
}

function render() {
    const city = currentCity();
    const next = cityIndexToNextLabel();
    const fameTarget = state.cityIndex >= cityChain.length - 1 ? state.fame : next.fameRequired;
    const fameBarWidth = Math.round(fameProgress() * 100);
    const cityBarWidth = Math.round(nextCityProgress() * 100);
    const selected = state.pendingSpectacle?.fighterIds ? listSelectedFighters(state.pendingSpectacle.fighterIds) : listSelectedFighters();
    const navigation = Object.keys(viewLabels)
        .map((view) => `<button class="${state.activeView === view ? "secondary active" : "secondary"}" data-action="view" data-view="${view}">${viewLabels[view]}</button>`)
        .join("");
    const spectacleStatusText = nextFestival(state.day)
        ? (nextFestival(state.day).daysAway === 0 ? `Spectacle today: ${nextFestival(state.day).definition.title}` : `Next spectacle in ${nextFestival(state.day).daysAway} days`)
        : "No spectacle scheduled.";
    const todaysSpectacle = state.spectacleBoard.find((spectacle) => spectacle.eventTurn === state.day);
    const spectacleActionMarkup = !state.spectacleAttendanceOpen && state.pendingSpectacle && state.pendingSpectacle.resolveTurn <= state.day
        ? `<button class="danger-button spectacle-send-button" data-action="spectacle-send" data-id="${state.pendingSpectacle.spectacleId}">Send gladiators</button>`
        : !state.spectacleAttendanceOpen && todaysSpectacle
            ? `<button class="danger-button spectacle-send-button" data-action="spectacle-open" data-id="${todaysSpectacle.id}">Send gladiators</button>`
            : "";

    let screenMarkup = "";
    if (state.activeView === "hub") {
        screenMarkup = `
            <div class="screen-grid two-up">
                <section class="panel">
                    <div class="panel-section compact">
                        <h3>Stable Overview</h3>
                        <p>Use the tabs to focus on one part of the stable at a time. Book a spectacle, make your changes, then press Next Day to resolve it.</p>
                        <div class="card-actions">
                            <button class="secondary" data-action="view" data-view="barracks">Open Barracks</button>
                            <button class="secondary" data-action="view" data-view="training">Open Facilities</button>
                            <button class="secondary" data-action="view" data-view="promoters">Open Promoters</button>
                        </div>
                    </div>
                </section>

                <section class="panel">
                    <div class="panel-section compact">
                        <h3>Active Status</h3>
                        ${spectacleResultMarkup()}
                    </div>
                    <div class="panel-section compact">
                        <h3>Notes</h3>
                        <p>City: ${city.name}.</p>
                        <p>Next city: ${next.name}.</p>
                        <p>Stable capacity is driven by the barracks.</p>
                    </div>
                </section>
            </div>
        `;
    } else if (state.activeView === "barracks") {
        screenMarkup = `
            <div class="screen-grid two-up">
                <section class="panel">
                    <div class="panel-section">
                        <h3>Training Budget</h3>
                        <div class="panel-section compact">
                            ${trainingBudgetMarkup()}
                        </div>
                    </div>
                    <div class="panel-section">
                        <h3>Roster</h3>
                        <div class="roster-list">
                            ${state.roster.map(fighterCard).join("")}
                        </div>
                    </div>
                </section>

                <section class="panel">
                    <div class="panel-section">
                        <h3>Recruit Market</h3>
                        <div class="card-grid recruits">
                            ${state.recruitMarket.map(recruitCard).join("")}
                        </div>
                    </div>
                </section>
            </div>
        `;
    } else if (state.activeView === "training") {
        screenMarkup = `
            <div class="screen-grid two-up">
                <section class="panel">
                    <div class="panel-section">
                        <h3>Facilities</h3>
                        <div class="facility-list">
                            ${Object.keys(facilityCatalog).map(facilityCard).join("")}
                        </div>
                    </div>
                </section>

                <section class="panel">
                    <div class="panel-section compact">
                        <h3>Upgrade Queue</h3>
                        ${state.facilityUpgradeQueue ? `<div class="status-callout pending"><strong>${state.facilityUpgradeQueue.title} is being upgraded.</strong><span>It finishes on ${formatCalendarDate(state.facilityUpgradeQueue.completeTurn)}.</span></div>` : `<p>No building upgrade is queued.</p>`}
                    </div>
                </section>
            </div>
        `;
    } else if (state.activeView === "armory") {
        screenMarkup = `
            <div class="armory-screen">
                <section class="panel armory-stock-panel">
                    <div class="panel-section">
                        <h3>Current Stock</h3>
                        <p class="small muted">Gear currently owned by the stable.</p>
                        <div class="badges armory-owned-list">${state.armoryOwned.length ? ownedItemMarkup(state.armoryOwned) : '<span class="muted">No gear owned yet.</span>'}</div>
                    </div>
                </section>

                <section class="panel armory-shopping-panel">
                    <div class="panel-section">
                        <h3>Shopping Options</h3>
                        <p class="small muted">Purchase gear for the stable inventory. Equipping it will be a separate action.</p>
                        <div class="card-grid items">
                            ${state.armoryStock.map(itemCard).join("") || '<p class="muted">The armory has no stock available.</p>'}
                        </div>
                    </div>
                </section>
            </div>
        `;
    } else if (state.activeView === "promoters") {
        screenMarkup = `
            <div class="screen-grid two-up">
                <section class="panel">
                    <div class="panel-section">
                        <h3>Promoters and Spectacles</h3>
                        <div class="spectacle-list">
                            ${state.spectacleBoard.map(spectacleCard).join("")}
                        </div>
                    </div>
                </section>

                <section class="panel">
                    <div class="panel-section">
                        <h3>Current City</h3>
                        <p>${city.note}</p>
                        <div class="card-actions">
                            <button data-action="travel" ${state.pendingSpectacle ? "disabled" : state.cityIndex < cityChain.length - 1 && state.fame >= next.fameRequired && state.gold >= (18 + next.prestige * 12) ? "" : "disabled"}>Travel to ${next.name}</button>
                        </div>
                    </div>

                    <div class="panel-section">
                        <h3>City Road</h3>
                        <div class="city-list">
                            ${cityChain.map(cityCard).join("")}
                        </div>
                    </div>
                </section>
            </div>
        `;
    }

    const statusSidebarMarkup = `
        <aside class="status-sidebar">
            <section class="panel status-panel">
                <h2>Battle Log</h2>
                <ul class="log-list">${logMarkup()}</ul>
                <div class="muted" style="margin-top: 10px;">Selected fighters for the next spectacle: ${selected.length ? selected.map((fighter) => fighter.name).join(", ") : "none"}</div>
            </section>
        </aside>
    `;

    const renameOverlayMarkup = state.lanistaRenameOpen ? `
        <div class="rename-overlay">
            <div class="panel rename-panel">
                <div class="rename-panel-head">
                    <div>
                        <h3>Lanista Quarters</h3>
                        <p class="small muted">Manage your stable identity from here. More options can live in this box later.</p>
                    </div>
                    <button class="secondary tiny" data-action="rename-lanista-cancel">Close</button>
                </div>
                <div class="rename-panel-grid">
                    <section class="rename-options">
                        <h4>Options</h4>
                        <button class="secondary active" type="button">Rename lanista</button>
                        <button class="secondary" data-action="empire-map-open">View Empire</button>
                        <button class="secondary" type="button" disabled>Future option</button>
                    </section>
                    <section class="rename-editor">
                        <h4>Rename Lanista</h4>
                        <p class="small muted">This name appears in the banner and is saved between sessions.</p>
                        <input data-action="rename-lanista-input" type="text" value="${escapeAttribute(state.lanistaRenameDraft)}" maxlength="40" />
                        <div class="card-actions">
                            <button data-action="rename-lanista-save">Save changes</button>
                            <button class="secondary" data-action="rename-lanista-cancel">Cancel</button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    ` : "";

    const spectacleOverlayMarkup = spectacleBookingMarkup();
    const spectacleResultOverlayMarkup = spectacleResultMarkupOverlay();
    const armoryShopOverlayMarkup = state.armoryShopOpen ? `
        <div class="rename-overlay">
            <div class="panel spectacle-panel armory-shop-panel">
                <div class="rename-panel-head">
                    <div><h3>Armory Shop</h3><p class="small muted">Available gear for the stable inventory.</p></div>
                    <button class="secondary tiny" data-action="armory-shop-close">Close</button>
                </div>
                <div class="card-grid items">${state.armoryStock.map(itemCard).join("") || '<p class="muted">The armory has no stock available.</p>'}</div>
            </div>
        </div>
    ` : "";
    const empireMapOverlayMarkup = empireMapMarkup();

    app.innerHTML = `
        <div class="shell">
            <header class="hero-banner">
                <div class="hero-banner-inner">
                    <div class="hero-copy">
                        <h1>${state.lanistaName}</h1>
                        <p class="subtitle">You are the lanista of a gladiator stable in a backwater Spanish city. Book spectacles for promoters, manage your roster, equip your fighters, and climb from provincial bloodsport to the arena of Rome.</p>
                        <div class="hero-bottom-row">
                            <div class="hero-options">
                                <div class="view-tabs">${navigation}</div>
                            </div>
                            <div class="time-box status-callout pending">
                                <div class="time-summary">
                                    <strong>Today: ${formatCalendarDate(currentCalendarDate())}</strong>
                                    <span>${nextFestival(state.day)
                                        ? (nextFestival(state.day).daysAway === 0 ? `Next spectacle today: ${nextFestival(state.day).definition.title}.` : `Next spectacle in ${nextFestival(state.day).daysAway} days: ${nextFestival(state.day).definition.title}.`)
                                        : "No festival dates found."}</span>
                                </div>
                                <div class="time-controls">
                                    ${spectacleActionMarkup}
                                    <button data-action="next-day">Next Day</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <section class="top-stats hero-stats">
                        <div class="stat-chip"><span class="label">City</span><span class="value">${city.name}</span></div>
                        <div class="stat-chip"><span class="label">Date</span><span class="value">${formatCalendarDate(currentCalendarDate())}</span></div>
                        <div class="stat-chip"><span class="label">Sesterces</span><span class="value">${moneyFormat(state.gold)}</span></div>
                        <div class="stat-chip"><span class="label">Stable</span><span class="value">${state.roster.length}/${stableCap()} fighters</span></div>
                        <div class="stat-chip fame-chip">
                            <span class="label">Fame</span>
                            <div class="fame-inline">
                                <div class="meter-track fame-inline-track"><div class="meter-fill fame" style="width: ${fameBarWidth}%"></div></div>
                            </div>
                        </div>
                    </section>
                    <button class="icon-button settings-button hero-settings-button" data-action="rename-lanista" aria-label="Rename lanista" title="Rename lanista">⚙</button>
                </div>
            </header>

            <div class="main-layout">
                <section class="panel main-panel">
                    ${screenMarkup}
                </section>

                ${statusSidebarMarkup}
            </div>
            ${renameOverlayMarkup}
            ${spectacleOverlayMarkup}
            ${spectacleResultOverlayMarkup}
            ${armoryShopOverlayMarkup}
            ${empireMapOverlayMarkup}
        </div>
    `;
}

export { render };

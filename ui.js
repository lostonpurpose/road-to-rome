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
    if (tags.length === 0) {
        tags.push('<span class="badge">No gear equipped</span>');
    }
    return tags.join("");
}

function trainingBudgetMarkup() {
    const budget = trainingBudgetCatalog[state.trainingBudget] || trainingBudgetCatalog.med;
    return `
        <div class="status-callout pending">
            <strong>${budget.label} training budget active.</strong>
            <span>All living gladiators train automatically every day. Low = ${trainingBudgetCatalog.low.daysPerStat} days per stat, Med = ${trainingBudgetCatalog.med.daysPerStat}, High = ${trainingBudgetCatalog.high.daysPerStat}.</span>
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
    const focusLabel = training.focus === "hp" ? "HP" : training.focus === "strength" ? "STR" : "DEF";
    const selectedForSpectacle = state.selectedFighterIds.has(fighter.id);
    const weaponGear = state.armoryStock.filter((item) => item.slot === "weapon" && state.gold >= item.cost);
    const armorGear = state.armoryStock.filter((item) => item.slot === "armor" && state.gold >= item.cost);
    const trinketGear = state.armoryStock.filter((item) => item.slot === "trinket" && state.gold >= item.cost);
    
    const gearSection = weaponGear.length > 0 || armorGear.length > 0 || trinketGear.length > 0 ? `
        <div class="gear-section">
            <div class="muted small" style="margin-bottom: 8px;">Equip gear:</div>
            ${weaponGear.length > 0 ? `
                <div class="gear-slot">
                    <span class="label small">Weapon:</span>
                    ${weaponGear.map((item) => `<button class="secondary tiny" data-action="buy-item" data-id="${item.id}" data-fighter-id="${fighter.id}">${item.name} (${moneyFormat(item.cost)})</button>`).join(" ")}
                </div>
            ` : ""}
            ${armorGear.length > 0 ? `
                <div class="gear-slot">
                    <span class="label small">Armor:</span>
                    ${armorGear.map((item) => `<button class="secondary tiny" data-action="buy-item" data-id="${item.id}" data-fighter-id="${fighter.id}">${item.name} (${moneyFormat(item.cost)})</button>`).join(" ")}
                </div>
            ` : ""}
            ${trinketGear.length > 0 ? `
                <div class="gear-slot">
                    <span class="label small">Trinket:</span>
                    ${trinketGear.map((item) => `<button class="secondary tiny" data-action="buy-item" data-id="${item.id}" data-fighter-id="${fighter.id}">${item.name} (${moneyFormat(item.cost)})</button>`).join(" ")}
                </div>
            ` : ""}
        </div>
    ` : "";

    return `
        <article class="fighter-card">
            <div class="fighter-top">
                <div>
                    <h3 class="fighter-name">${fighter.name}</h3>
                    <div class="muted">${fighter.title} · ${fighter.style} · ${fighter.origin}</div>
                </div>
                <span class="badge gold">Lv ${fighter.level}</span>
            </div>
            <div class="stats-grid">
                <div class="stat-box"><span class="label">HP</span><span class="value">${fighter.hp}/${fighterTotalMaxHp(fighter)}</span></div>
                <div class="stat-box"><span class="label">STR</span><span class="value">${fighterTotalStrength(fighter)}</span></div>
                <div class="stat-box"><span class="label">DEF</span><span class="value">${fighterTotalDefense(fighter)}</span></div>
            </div>
            <div class="badges">
                <span class="badge info">XP ${fighter.exp}</span>
                <span class="badge gold">Fame ${fighter.fame}</span>
                <span class="badge">Renown ${fighter.renown}</span>
                <span class="badge">Power ${fighterPower(fighter)}</span>
            </div>
            <div class="gear-line">
                ${gearTags(fighter)}
            </div>
            <label class="checkbox-line spectacle-select-line">
                <input type="checkbox" class="spectacle-fighter-select" data-fighter-id="${fighter.id}" ${selectedForSpectacle ? "checked" : ""}>
                Select for next spectacle
            </label>
            <div class="status-callout pending">
                <strong>Training ${focusLabel} automatically.</strong>
                <span>${training.progress}/${budget.daysPerStat} training points toward the next ${focusLabel} gain.</span>
            </div>
            ${gearSection}
        </article>
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
                <span class="badge">HP ${recruit.maxHp}</span>
                <span class="badge">STR ${recruit.strength}</span>
                <span class="badge">DEF ${recruit.defense}</span>
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
    const targetOptions = state.roster
        .filter((fighter) => fighter.alive)
        .map((fighter) => `<option value="${fighter.id}">${fighter.name}</option>`)
        .join("");
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
            <label class="market-target">
                <span class="muted small">Give to</span>
                <select data-item-target="${item.id}">
                    ${targetOptions || '<option value="">No fighters available</option>'}
                </select>
            </label>
            <div class="market-actions">
                <button data-action="buy-item" data-id="${item.id}" ${affordable && targetOptions ? "" : "disabled"}>Buy & equip</button>
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
    const selected = listSelectedFighters();
    const validSelection = selected.length >= spectacle.minFighters && selected.length <= spectacle.maxFighters;

    const fighterOptions = ready
        ? state.roster
            .filter((fighter) => fighter.alive)
            .map((fighter) => `<label class="checkbox-line"><input type="checkbox" class="spectacle-fighter-select" data-spectacle-id="${spectacle.id}" data-fighter-id="${fighter.id}" ${selected.some((f) => f.id === fighter.id) ? "checked" : ""}> ${fighter.name} (Power: ${fighterPower(fighter)}, Renown: ${fighter.renown})</label>`)
            .join("")
        : "";

    const actionLabel = booked ? (ready ? "Send gladiators" : `Booked for ${eventDate}`) : "Book spectacle";
    const actionAction = booked ? (ready ? "spectacle-send" : "spectacle-wait") : "spectacle-book";
    
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
                <span class="badge">Risk ${Math.round(spectacle.risk * 100)}%</span>
            </div>
            <div class="opponents-line">
                <span class="badge">${spectacle.reason}</span>
                ${spectacle.requestedName ? `<span class="badge gold">${spectacle.requestedName} requested</span>` : ""}
                ${spectacle.opponents.map((opponent) => `<span class="badge">${opponent.name}, ${opponent.title}</span>`).join("")}
            </div>
            ${ready ? `
                <div class="fighter-selection">
                    <div class="muted small" style="margin-bottom: 8px;">Select fighters for this show:</div>
                    ${fighterOptions}
                </div>
            ` : `
                <div class="status-callout pending">
                    <strong>${booked ? `Booked for ${eventDate}.` : `This show is available on ${eventDate}.`}</strong>
                    <span>${booked ? "When the day arrives, you can send gladiators from here." : "Book it now, then wait for the day to send fighters."}</span>
                </div>
            `}
            <div class="market-actions">
                <button data-action="${actionAction}" data-id="${spectacle.id}" ${!blocked && (!booked || (ready && validSelection)) ? "" : "disabled"}>${actionLabel}</button>
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
    const selected = listSelectedFighters();
    const navigation = Object.keys(viewLabels)
        .map((view) => `<button class="${state.activeView === view ? "secondary active" : "secondary"}" data-action="view" data-view="${view}">${viewLabels[view]}</button>`)
        .join("");
    const spectacleStatusText = nextFestival(state.day)
        ? (nextFestival(state.day).daysAway === 0 ? `Spectacle today: ${nextFestival(state.day).definition.title}` : `Next spectacle in ${nextFestival(state.day).daysAway} days`)
        : "No spectacle scheduled.";
    const spectacleActionMarkup = state.pendingSpectacle && state.pendingSpectacle.resolveTurn <= state.day
        ? `<button class="secondary spectacle-send-button" data-action="spectacle-send" data-id="${state.pendingSpectacle.spectacleId}">Send gladiators</button>`
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
            <div class="screen-grid two-up">
                <section class="panel">
                    <div class="panel-section">
                        <h3>Armory Stock</h3>
                        <div class="card-grid items">
                            ${state.armoryStock.map(itemCard).join("")}
                        </div>
                    </div>
                </section>

                <section class="panel">
                    <div class="panel-section compact">
                        <h3>Loadout</h3>
                        <p>Pick a target fighter from each item card to equip new gear. The armory screen is intentionally narrow so it is easier to read at a glance.</p>
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
                <h3>Rename Lanista</h3>
                <input data-action="rename-lanista-input" type="text" value="${escapeAttribute(state.lanistaRenameDraft)}" maxlength="40" />
                <div class="card-actions">
                    <button data-action="rename-lanista-save">Save</button>
                    <button class="secondary" data-action="rename-lanista-cancel">Cancel</button>
                </div>
            </div>
        </div>
    ` : "";

    app.innerHTML = `
        <div class="shell">
            <header class="hero-banner">
                <div class="hero-banner-inner">
                    <div class="hero-copy">
                        <h1>${state.lanistaName}</h1>
                        <p class="subtitle">You are the lanista of a growing gladiator stable in a backwater Spanish city. Book spectacles for promoters, manage your roster, equip your fighters, and climb from provincial bloodsport to the arena of Rome.</p>
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
                                    <button data-action="next-day">Next Day</button>
                                    ${spectacleActionMarkup}
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
        </div>
    `;
}

export { render };

const app = document.getElementById("app");

const romanNames = [
    "Asterius",
    "Cato",
    "Flamma",
    "Doris",
    "Livia",
    "Maro",
    "Sextus",
    "Tiberius",
    "Arcteus",
    "Sabinus",
    "Rufus",
    "Nerva",
    "Vindex",
    "Tullius",
    "Cassia",
    "Valens",
    "Drusus",
    "Paula",
    "Maximus",
    "Severa"
];

const styles = [
    "murmillo",
    "thraex",
    "retiarius",
    "hoplomachus",
    "bestiarius",
    "secutor",
    "provocator"
];

const cityChain = [
    {
        name: "Emerita Augusta",
        region: "Lusitania",
        fameRequired: 0,
        prestige: 1,
        note: "A dusty provincial city where the promoters count every coin twice."
    },
    {
        name: "Corduba",
        region: "Baetica",
        fameRequired: 45,
        prestige: 2,
        note: "Richer crowds, better sponsors, and sharper expectations."
    },
    {
        name: "Tarraco",
        region: "Hispania Citerior",
        fameRequired: 95,
        prestige: 3,
        note: "Bigger amphitheatres and the first real rival troupes."
    },
    {
        name: "Narbo Martius",
        region: "Gallia Narbonensis",
        fameRequired: 155,
        prestige: 4,
        note: "A trade city where crowd-pleasing fighters start to matter."
    },
    {
        name: "Mediolanum",
        region: "Italia",
        fameRequired: 235,
        prestige: 5,
        note: "The road to the capital is expensive, but the money is better."
    },
    {
        name: "Roma",
        region: "Caput Mundi",
        fameRequired: 330,
        prestige: 6,
        note: "The city where the best troupes are requested by name."
    }
];

const equipmentCatalog = {
    weapon: [
        { name: "Bronze gladius", strength: 1, defense: 0, hp: 0, fame: 0, baseCost: 22 },
        { name: "Iron gladius", strength: 2, defense: 0, hp: 0, fame: 0, baseCost: 38 },
        { name: "Veteran spear", strength: 3, defense: 0, hp: 0, fame: 1, baseCost: 56 }
    ],
    armor: [
        { name: "Padded tunic", strength: 0, defense: 1, hp: 0, fame: 0, baseCost: 18 },
        { name: "Reinforced mail", strength: 0, defense: 2, hp: 0, fame: 0, baseCost: 34 },
        { name: "Champion harness", strength: 0, defense: 3, hp: 1, fame: 0, baseCost: 58 }
    ],
    trinket: [
        { name: "Fortuna charm", strength: 0, defense: 1, hp: 0, fame: 1, baseCost: 24 },
        { name: "Amber talisman", strength: 1, defense: 1, hp: 0, fame: 0, baseCost: 42 },
        { name: "Laurel medal", strength: 0, defense: 2, hp: 1, fame: 2, baseCost: 62 }
    ]
};

const facilityCatalog = {
    barracks: {
        title: "Barracks",
        description: "Raises your stable size and reduces turnover.",
        baseCost: 35
    },
    trainingYard: {
        title: "Training Yard",
        description: "Improves experience gains and unlocks deeper drills.",
        baseCost: 42
    },
    armory: {
        title: "Armory",
        description: "Improves the quality of weapons and armor available.",
        baseCost: 48
    },
    medicus: {
        title: "Medicus Ward",
        description: "Reduces injuries and restores fighters after spectacles.",
        baseCost: 40
    }
};

let uid = 1;

function nextId(prefix) {
    const id = `${prefix}-${uid}`;
    uid += 1;
    return id;
}

function randomFrom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function fighterGearBonus(fighter) {
    const gear = fighter.gear || {};
    return Object.values(gear).reduce(
        (total, item) => {
            if (!item) {
                return total;
            }

            total.strength += item.bonus.strength || 0;
            total.defense += item.bonus.defense || 0;
            total.hp += item.bonus.hp || 0;
            total.fame += item.bonus.fame || 0;
            return total;
        },
        { strength: 0, defense: 0, hp: 0, fame: 0 }
    );
}

function fighterTotalMaxHp(fighter) {
    return fighter.maxHp + fighterGearBonus(fighter).hp;
}

function fighterTotalStrength(fighter) {
    return fighter.strength + fighterGearBonus(fighter).strength;
}

function fighterTotalDefense(fighter) {
    return fighter.defense + fighterGearBonus(fighter).defense;
}

function fighterPower(fighter) {
    const gear = fighterGearBonus(fighter);
    const strength = fighter.strength + gear.strength;
    const defense = fighter.defense + gear.defense;
    const health = fighter.maxHp + gear.hp;
    const fame = fighter.fame + gear.fame;

    return Math.round(strength * 2.2 + defense * 1.7 + health * 0.8 + fighter.level * 3 + fame * 0.4);
}

function makeFighter({ name, style, title, level, exp, fame, maxHp, strength, defense, origin, cost }) {
    return {
        id: nextId("fighter"),
        name,
        style,
        title,
        level,
        exp,
        fame,
        maxHp,
        hp: maxHp,
        strength,
        defense,
        origin,
        cost,
        gear: {},
        alive: true
    };
}

function makeItem(slot, name, bonus, cost, quality) {
    return {
        id: nextId("item"),
        slot,
        name,
        bonus,
        cost,
        quality
    };
}

function makeOpponent(cityIndex, tier, styleHint) {
    const city = cityChain[cityIndex];
    const name = randomFrom(romanNames);
    const style = styleHint || randomFrom(styles);
    const title = [
        "expert javeliner",
        "helmet-cracking veteran",
        "net-man",
        "shield-broken bruiser",
        "arena bruiser",
        "left-handed specialist",
        "crowd favorite"
    ][Math.min(6, tier + randomBetween(0, 2))];

    const baseLevel = Math.max(1, city.prestige + tier - 1);

    return makeFighter({
        name,
        style,
        title,
        level: baseLevel,
        exp: 0,
        fame: city.prestige * 4 + randomBetween(0, 6),
        maxHp: 8 + baseLevel * 2 + randomBetween(0, 3),
        strength: 2 + baseLevel + randomBetween(0, 2),
        defense: 1 + Math.floor(baseLevel / 2) + randomBetween(0, 1),
        origin: city.name,
        cost: 0
    });
}

function buildRecruitMarket(cityIndex) {
    const city = cityChain[cityIndex];
    const candidates = [];
    for (let index = 0; index < 3; index += 1) {
        const quality = city.prestige + index;
        const style = randomFrom(styles);
        const name = randomFrom(romanNames);
        const title = ["novice", "knife-hand", "sand runner", "pit veteran", "promising hire"][Math.min(4, index + Math.floor(city.prestige / 2))];
        const level = 1 + Math.max(0, Math.floor(city.prestige / 2) - (index === 0 ? 1 : 0));
        const fighter = makeFighter({
            name,
            style,
            title,
            level,
            exp: 0,
            fame: randomBetween(0, city.prestige * 2),
            maxHp: 7 + quality * 2 + randomBetween(0, 3),
            strength: 2 + quality + randomBetween(0, 2),
            defense: 1 + Math.floor(quality / 2) + randomBetween(0, 1),
            origin: city.name,
            cost: 24 + quality * 14 + randomBetween(0, 8)
        });
        candidates.push(fighter);
    }
    return candidates;
}

function buildArmoryStock(cityIndex, armoryLevel) {
    const city = cityChain[cityIndex];
    const scale = city.prestige + armoryLevel;
    const stock = [];

    equipmentCatalog.weapon.forEach((item, index) => {
        if (index === 0 || scale >= index) {
            stock.push(makeItem(
                "weapon",
                item.name,
                { strength: item.strength + Math.max(0, armoryLevel - 1), defense: item.defense, hp: item.hp, fame: item.fame },
                item.baseCost + scale * 6,
                scale + index
            ));
        }
    });

    equipmentCatalog.armor.forEach((item, index) => {
        if (index === 0 || scale >= index) {
            stock.push(makeItem(
                "armor",
                item.name,
                { strength: item.strength, defense: item.defense + Math.max(0, armoryLevel - 1), hp: item.hp, fame: item.fame },
                item.baseCost + scale * 6,
                scale + index
            ));
        }
    });

    equipmentCatalog.trinket.forEach((item, index) => {
        if (index === 0 || scale >= index) {
            stock.push(makeItem(
                "trinket",
                item.name,
                { strength: item.strength, defense: item.defense, hp: item.hp, fame: item.fame + Math.floor(armoryLevel / 2) },
                item.baseCost + scale * 7,
                scale + index
            ));
        }
    });

    return stock;
}

function buildSpectacleBoard(cityIndex, roster) {
    const city = cityChain[cityIndex];
    const board = [];
    const roomForMultiple = cityIndex >= 1 ? 2 + Math.floor(cityIndex / 2) : 1;
    const requestedFighter = roster
        .filter((fighter) => fighter.alive)
        .slice()
        .sort((left, right) => right.fame - left.fame)[0];

    const templates = [
        {
            title: "Market-Day Munus",
            sponsor: "Lucius the editor",
            venue: `Forum at ${city.name}`,
            minFighters: 1,
            maxFighters: 1,
            toTheDeath: false,
            baseGold: 26,
            baseFame: 8,
            risk: 0.14,
            opponents: 1,
            flavor: "A cheap public show. Good for rookies and noisy crowds."
        },
        {
            title: "Festival of Mars",
            sponsor: "Faustus the promoter",
            venue: `Amphitheatre at ${city.name}`,
            minFighters: 1,
            maxFighters: Math.min(2, roomForMultiple),
            toTheDeath: cityIndex >= 2,
            baseGold: 52,
            baseFame: 16,
            risk: 0.24,
            opponents: 2,
            flavor: "Better fighters, better pay, and the crowd starts to care who survives."
        },
        {
            title: "Memorial Munus",
            sponsor: "Aelius the patron",
            venue: `Stone arena outside ${city.name}`,
            minFighters: 1,
            maxFighters: Math.min(3, Math.max(2, roomForMultiple)),
            toTheDeath: true,
            baseGold: 88,
            baseFame: 26,
            risk: 0.36,
            opponents: 3,
            flavor: "A wealthy sponsor wants blood, spectacle, and a name worth remembering."
        }
    ];

    templates.forEach((template, index) => {
        const opponentTier = city.prestige + index;
        const opponentCount = Math.min(template.opponents, template.maxFighters);
        const opponents = [];

        for (let count = 0; count < opponentCount; count += 1) {
            opponents.push(makeOpponent(cityIndex, opponentTier + count, randomFrom(styles)));
        }

        const requestedName = requestedFighter && requestedFighter.fame >= 12 && index > 0 ? requestedFighter.name : null;

        board.push({
            id: nextId("spectacle"),
            ...template,
            cityName: city.name,
            cityPrestige: city.prestige,
            opponents,
            requestedName,
            requestBonus: requestedName ? 18 + city.prestige * 2 : 0
        });
    });

    return board;
}

function buildStartRoster() {
    return [
        makeFighter({
            name: "Asterius",
            style: "thraex",
            title: "provincial novice",
            level: 1,
            exp: 0,
            fame: 3,
            maxHp: 10,
            strength: 3,
            defense: 2,
            origin: "Emerita Augusta",
            cost: 0
        })
    ];
}

const state = {
    cityIndex: 0,
    season: 1,
    gold: 80,
    fame: 12,
    roster: buildStartRoster(),
    recruitMarket: [],
    armoryStock: [],
    spectacleBoard: [],
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
        state.spectacleBoard = buildSpectacleBoard(state.cityIndex, state.roster);
    }
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

    const cost = trainingCost(fighter);
    if (state.gold < cost) {
        addLog(`You need ${moneyFormat(cost)} to train ${fighter.name}.`);
        return;
    }

    state.gold -= cost;
    if (stat === "hp") {
        fighter.maxHp += 2 + Math.floor(state.facilities.trainingYard / 2);
        fighter.hp = fighter.maxHp;
    } else if (stat === "strength") {
        fighter.strength += 1 + Math.floor(state.facilities.trainingYard / 3);
    } else if (stat === "defense") {
        fighter.defense += 1 + Math.floor(state.facilities.trainingYard / 3);
    }

    gainExperience(fighter, 4 + state.facilities.trainingYard * 2);
    addLog(`${fighter.name} completes hard training and grows stronger.`);
    refreshMarkets(true);
    render();
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
    refreshMarkets(true);
    addLog(`You hire ${recruit.name}, ${recruit.title}.`);
    render();
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
        refreshMarkets(true);
        render();
        return;
    }

    fighter.gear = fighter.gear || {};
    fighter.gear[item.slot] = item;
    fighter.hp = Math.min(fighter.hp + (item.bonus.hp || 0), fighterTotalMaxHp(fighter));
    addLog(`${fighter.name} receives ${item.name}.`);
        refreshMarkets(true);
        render();
    render();
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
    refreshMarkets(true);
    render();
}

function travelToNextCity() {
    if (state.cityIndex >= cityChain.length - 1) {
        addLog("You are already in Rome.");
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
    state.season += 1;
    state.selectedFighterIds.clear();
    refreshMarkets(true);
    addLog(`You relocate the stable to ${currentCity().name}. Bigger city, bigger stakes.`);
    render();
}

function listSelectedFighters() {
    return state.roster.filter((fighter) => fighter.alive && state.selectedFighterIds.has(fighter.id));
}

function spectaclePower(fighter) {
    return fighterPower(fighter);
}

function resolveSpectacle(spectacleId) {
    const spectacle = state.spectacleBoard.find((entry) => entry.id === spectacleId);
    if (!spectacle) {
        return;
    }

    const selected = listSelectedFighters();
    if (selected.length < spectacle.minFighters || selected.length > spectacle.maxFighters) {
        addLog(`${spectacle.title} needs between ${spectacle.minFighters} and ${spectacle.maxFighters} fighters.`);
        return;
    }

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

    if (win) {
        addLog(`You've defeated ${leaderName}! The sponsor pays ${moneyFormat(goldGain)} and your fame rises.`);
    } else {
        addLog(`The crowd enjoys the struggle, but the sponsor pays only a reduced purse of ${moneyFormat(goldGain)}.`);
    }

    if (spectacle.requestedName && selected.some((fighter) => fighter.name === spectacle.requestedName)) {
        addLog(`${spectacle.requestedName} was specifically requested and drew a richer purse.`);
    }

    if (casualtyMessage) {
        addLog(casualtyMessage);
    }

    if (state.fame >= nextCity().fameRequired && state.cityIndex < cityChain.length - 1) {
        addLog(`Your fame is now high enough to attract promoters in ${nextCity().name}.`);
    }

    state.season += 1;
    state.selectedFighterIds.clear();
    refreshMarkets(true);
    render();
}

function toggleSelection(fighterId, checked) {
    if (checked) {
        state.selectedFighterIds.add(fighterId);
    } else {
        state.selectedFighterIds.delete(fighterId);
    }
    render();
}

function gearTags(fighter) {
    const slots = ["weapon", "armor", "trinket"];
    const tags = [];
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

function fighterCard(fighter) {
    const selected = state.selectedFighterIds.has(fighter.id);
    return `
        <article class="fighter-card ${selected ? "selected" : ""}">
            <div class="fighter-top">
                <div>
                    <h3 class="fighter-name">${fighter.name}</h3>
                    <div class="muted">${fighter.title} · ${fighter.style} · ${fighter.origin}</div>
                </div>
                <span class="badge gold">Lv ${fighter.level}</span>
            </div>
            <div class="checkbox-line">
                <input type="checkbox" data-fighter-id="${fighter.id}" ${selected ? "checked" : ""}>
                <span>Send to spectacle</span>
            </div>
            <div class="stats-grid">
                <div class="stat-box"><span class="label">HP</span><span class="value">${fighter.hp}/${fighterTotalMaxHp(fighter)}</span></div>
                <div class="stat-box"><span class="label">STR</span><span class="value">${fighterTotalStrength(fighter)}</span></div>
                <div class="stat-box"><span class="label">DEF</span><span class="value">${fighterTotalDefense(fighter)}</span></div>
            </div>
            <div class="badges">
                <span class="badge info">XP ${fighter.exp}</span>
                <span class="badge gold">Fame ${fighter.fame}</span>
                <span class="badge">Power ${fighterPower(fighter)}</span>
            </div>
            <div class="gear-line">
                ${gearTags(fighter)}
            </div>
            <div class="fighter-actions">
                <button class="secondary" data-action="train" data-id="${fighter.id}" data-stat="hp">Train HP (${moneyFormat(trainingCost(fighter))})</button>
                <button class="secondary" data-action="train" data-id="${fighter.id}" data-stat="strength">Train STR (${moneyFormat(trainingCost(fighter))})</button>
                <button class="secondary" data-action="train" data-id="${fighter.id}" data-stat="defense">Train DEF (${moneyFormat(trainingCost(fighter))})</button>
            </div>
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
            <div class="facility-actions">
                <button data-action="upgrade" data-id="${key}" ${state.gold >= cost ? "" : "disabled"}>Upgrade</button>
            </div>
        </article>
    `;
}

function spectacleCard(spectacle) {
    const selected = listSelectedFighters();
    const validSelection = selected.length >= spectacle.minFighters && selected.length <= spectacle.maxFighters;
    const projected = `Send ${spectacle.minFighters}-${spectacle.maxFighters} fighters`;
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
                <span class="badge">${projected}</span>
                <span class="badge">Risk ${Math.round(spectacle.risk * 100)}%</span>
            </div>
            <div class="gear-line">
                ${spectacle.requestedName ? `<span class="badge gold">${spectacle.requestedName} requested</span>` : ""}
                ${spectacle.opponents.map((opponent) => `<span class="badge">${opponent.name}, ${opponent.title}</span>`).join("")}
            </div>
            <div class="market-actions">
                <button data-action="spectacle" data-id="${spectacle.id}" ${validSelection ? "" : "disabled"}>Book selected fighters</button>
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

    app.innerHTML = `
        <div class="shell">
            <header class="hero-banner">
                <h1>Munus & Glory</h1>
                <p class="subtitle">You are the lanista of a growing gladiator stable in a backwater Spanish city. Book spectacles for promoters, manage your roster, equip your fighters, and climb from provincial bloodsport to the arena of Rome.</p>
            </header>

            <section class="top-stats">
                <div class="stat-chip"><span class="label">City</span><span class="value">${city.name}</span></div>
                <div class="stat-chip"><span class="label">Sesterces</span><span class="value">${moneyFormat(state.gold)}</span></div>
                <div class="stat-chip"><span class="label">Fame</span><span class="value">${state.fame}</span></div>
                <div class="stat-chip"><span class="label">Stable</span><span class="value">${state.roster.length}/${stableCap()} fighters</span></div>
            </section>

            <section class="panel">
                <h2>Renown</h2>
                <div class="meter">
                    <div class="meter-head">
                        <span>Fame bar</span>
                        <span>${state.cityIndex >= cityChain.length - 1 ? "Rome unlocked" : `${state.fame} / ${fameTarget}`}</span>
                    </div>
                    <div class="meter-track"><div class="meter-fill fame" style="width: ${fameBarWidth}%"></div></div>
                </div>
                <div class="meter">
                    <div class="meter-head">
                        <span>Road to ${next.name}</span>
                        <span>${state.cityIndex >= cityChain.length - 1 ? "No further cities" : `${cityChain[state.cityIndex + 1].fameRequired} fame needed`}</span>
                    </div>
                    <div class="meter-track"><div class="meter-fill city" style="width: ${cityBarWidth}%"></div></div>
                </div>
                <div class="muted" style="margin-top: 10px;">Selected fighters for the next spectacle: ${selected.length ? selected.map((fighter) => fighter.name).join(", ") : "none"}</div>
            </section>

            <div class="dashboard">
                <section class="panel">
                    <div class="panel-section">
                        <h3>Roster</h3>
                        <div class="roster-list">
                            ${state.roster.map(fighterCard).join("")}
                        </div>
                    </div>

                    <div class="panel-section">
                        <h3>Recruit Market</h3>
                        <div class="card-grid recruits">
                            ${state.recruitMarket.map(recruitCard).join("")}
                        </div>
                    </div>

                    <div class="panel-section">
                        <h3>Armory</h3>
                        <div class="card-grid items">
                            ${state.armoryStock.map(itemCard).join("")}
                        </div>
                    </div>
                </section>

                <section class="panel">
                    <div class="panel-section">
                        <h3>Promoters and Spectacles</h3>
                        <div class="spectacle-list">
                            ${state.spectacleBoard.map(spectacleCard).join("")}
                        </div>
                    </div>

                    <div class="panel-section">
                        <h3>Current City</h3>
                        <p>${city.note}</p>
                        <div class="card-actions">
                            <button data-action="travel" ${state.cityIndex < cityChain.length - 1 && state.fame >= next.fameRequired && state.gold >= (18 + next.prestige * 12) ? "" : "disabled"}>Travel to ${next.name}</button>
                        </div>
                    </div>
                </section>

                <section class="panel">
                    <div class="panel-section">
                        <h3>Facilities</h3>
                        <div class="facility-list">
                            ${Object.keys(facilityCatalog).map(facilityCard).join("")}
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

            <section class="footer-panels">
                <section class="panel">
                    <h3>Battle Log</h3>
                    <ul class="log-list">${logMarkup()}</ul>
                </section>

                <section class="panel">
                    <h3>Stable Notes</h3>
                    <p>City: ${city.name}.</p>
                    <p>Next city: ${next.name}.</p>
                    <p>Stable capacity is driven by the barracks.</p>
                    <p>Better city prestige unlocks richer promoters, stronger opponents, and better equipment.</p>
                </section>
            </section>
        </div>
    `;
}

function cityIndexToNextLabel() {
    return cityChain[Math.min(cityChain.length - 1, state.cityIndex + 1)];
}

app.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }

    const { action, id, stat } = button.dataset;

    if (action === "hire") {
        hireRecruit(id);
    } else if (action === "buy-item") {
        const card = button.closest(".market-card");
        const target = card ? card.querySelector(`select[data-item-target="${id}"]`) : null;
        buyItem(id, target ? target.value : "");
    } else if (action === "upgrade") {
        upgradeFacility(id);
    } else if (action === "travel") {
        travelToNextCity();
    } else if (action === "spectacle") {
        resolveSpectacle(id);
    } else if (action === "train") {
        trainFighter(id, stat);
    }
});

app.addEventListener("change", (event) => {
    const checkbox = event.target.closest("input[data-fighter-id]");
    if (!checkbox) {
        return;
    }

    toggleSelection(checkbox.dataset.fighterId, checkbox.checked);
});

function init() {
    refreshMarkets(true);
    addLog(`You begin in ${currentCity().name}, a provincial stable with one novice fighter and a promoter's market to conquer.`);
    addLog(`Book spectacles, train your roster, and build the sort of stable that can survive Rome.`);
    render();
}

init();
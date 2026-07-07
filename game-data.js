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

const viewLabels = {
    hub: "Hub",
    barracks: "Barracks",
    training: "Training Hall",
    armory: "Armory",
    promoters: "Promoters"
};

function moneyFormat(value) {
    return `${value.toLocaleString()} sesterces`;
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
        renown: 0,
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

export {
    romanNames,
    styles,
    cityChain,
    equipmentCatalog,
    facilityCatalog,
    viewLabels,
    nextId,
    randomFrom,
    randomBetween,
    clamp,
    fighterGearBonus,
    fighterTotalMaxHp,
    fighterTotalStrength,
    fighterTotalDefense,
    fighterPower,
    makeFighter,
    makeItem,
    makeOpponent,
    buildRecruitMarket,
    buildArmoryStock,
    buildSpectacleBoard,
    buildStartRoster,
    moneyFormat,
    itemBonusSummary
};

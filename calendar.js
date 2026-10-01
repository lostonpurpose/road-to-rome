import {
    cityChain,
    makeOpponent,
    randomFrom,
    styles
} from "./game-data.js";

export const romanMonths = [
    "Ianuarius",
    "Februarius",
    "Martius",
    "Aprilis",
    "Maius",
    "Iunius",
    "Quintilis",
    "Sextilis",
    "September",
    "October",
    "November",
    "December"
];

export const monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const daysInYear = monthLengths.reduce((total, days) => total + days, 0);

export const festivalDefinitions = [
    {
        key: "parentalia",
        monthIndex: 1,
        dayOfMonth: 13,
        title: "Parentalia Munus",
        sponsor: "the family tomb guardians",
        venueKind: "tomb rites",
        reason: "ancestral rites",
        baseGold: 30,
        baseFame: 10,
        risk: 0.12,
        opponents: 1,
        minFighters: 1,
        maxFighters: 1,
        toTheDeath: false,
        signUpWindow: 365,
        flavor: "A solemn rite for the dead. Wealthy families still pay to be remembered well."
    },
    {
        key: "lemuria",
        monthIndex: 1,
        dayOfMonth: 20,
        title: "Lemuria Games",
        sponsor: "the wardens of the household dead",
        venueKind: "night rite",
        reason: "appeasing restless spirits",
        baseGold: 42,
        baseFame: 13,
        risk: 0.24,
        opponents: 1,
        minFighters: 1,
        maxFighters: 2,
        toTheDeath: true,
        signUpWindow: 365,
        flavor: "A superstitious night rite. The crowd wants a cleaner house and a louder bloodletting."
    },
    {
        key: "augustalia",
        monthIndex: 2,
        dayOfMonth: 5,
        title: "Augustalia",
        sponsor: "the local magistrates",
        venueKind: "public procession",
        reason: "political goodwill",
        baseGold: 58,
        baseFame: 18,
        risk: 0.2,
        opponents: 2,
        minFighters: 1,
        maxFighters: 2,
        toTheDeath: false,
        signUpWindow: 365,
        flavor: "A civic celebration meant to flatter officeholders and keep the city loyal."
    },
    {
        key: "ludi-romani",
        monthIndex: 2,
        dayOfMonth: 12,
        title: "Ludi Romani",
        sponsor: "the aediles",
        venueKind: "public games",
        reason: "political display",
        baseGold: 74,
        baseFame: 22,
        risk: 0.28,
        opponents: 2,
        minFighters: 1,
        maxFighters: 3,
        toTheDeath: false,
        signUpWindow: 365,
        flavor: "The great public games. The city watches, and the politicians remember who impressed them."
    },
    {
        key: "saturnalia",
        monthIndex: 2,
        dayOfMonth: 19,
        title: "Saturnalia Games",
        sponsor: "a merchant guild",
        venueKind: "holiday feast",
        reason: "good fortune and public cheer",
        baseGold: 92,
        baseFame: 28,
        risk: 0.34,
        opponents: 3,
        minFighters: 1,
        maxFighters: 3,
        toTheDeath: true,
        signUpWindow: 365,
        flavor: "A feast-day show where luck, gifts, and a little death are all on the table."
    }
];

export function turnFromDate(year, monthIndex, dayOfMonth) {
    let turn = (year - 1) * daysInYear + dayOfMonth;

    for (let index = 0; index < monthIndex; index += 1) {
        turn += monthLengths[index];
    }

    return turn;
}

export function calendarFromTurn(turn) {
    const zeroBased = Math.max(0, turn - 1);
    const year = Math.floor(zeroBased / daysInYear) + 1;
    let dayOfYear = zeroBased % daysInYear;
    let monthIndex = 0;

    while (dayOfYear >= monthLengths[monthIndex]) {
        dayOfYear -= monthLengths[monthIndex];
        monthIndex += 1;
    }

    return {
        year,
        monthIndex,
        monthName: romanMonths[monthIndex],
        dayOfMonth: dayOfYear + 1,
        dayOfYear: zeroBased + 1
    };
}

export function formatCalendarDate(turn) {
    const date = typeof turn === "number" ? calendarFromTurn(turn) : turn;
    return `${date.monthName} ${date.dayOfMonth}, AUC ${date.year}`;
}

export function nextOccurrenceTurn(turn, monthIndex, dayOfMonth) {
    const current = calendarFromTurn(turn);
    const thisYearTurn = turnFromDate(current.year, monthIndex, dayOfMonth);
    if (thisYearTurn >= turn) {
        return thisYearTurn;
    }
    return turnFromDate(current.year + 1, monthIndex, dayOfMonth);
}

export function nextFestival(turn) {
    return festivalDefinitions
        .map((definition) => {
            const eventTurn = nextOccurrenceTurn(turn, definition.monthIndex, definition.dayOfMonth);
            return {
                definition,
                eventTurn,
                daysAway: eventTurn - turn,
                eventDate: calendarFromTurn(eventTurn)
            };
        })
        .sort((left, right) => left.eventTurn - right.eventTurn)[0] || null;
}

export function buildFestivalBoard(turn, cityIndex, roster) {
    const city = cityChain[cityIndex];
    const board = [];
    const requestedFighter = roster
        .filter((fighter) => fighter.alive)
        .slice()
        .sort((left, right) => right.fame - left.fame)[0];

    festivalDefinitions.forEach((definition, index) => {
        const eventTurn = nextOccurrenceTurn(turn, definition.monthIndex, definition.dayOfMonth);
        const daysAway = eventTurn - turn;
        const eventDate = calendarFromTurn(eventTurn);
        const opponentCount = Math.min(definition.opponents + Math.floor(city.prestige / 3), definition.maxFighters);
        const opponents = [];

        for (let count = 0; count < opponentCount; count += 1) {
            opponents.push(makeOpponent(cityIndex, city.prestige + index + count, randomFrom(styles)));
        }

        const requestedName = requestedFighter && requestedFighter.fame >= 12 && definition.maxFighters > 1 && index > 0 ? requestedFighter.name : null;

        board.push({
            id: `${definition.key}-${eventTurn}-${cityIndex}`,
            ...definition,
            cityName: city.name,
            cityPrestige: city.prestige,
            eventTurn,
            eventDate,
            daysAway,
            venue: `${definition.venueKind} at ${city.name}`,
            opponents,
            requestedName,
            requestBonus: requestedName ? 18 + city.prestige * 2 : 0
        });
    });

    return board.sort((left, right) => left.eventTurn - right.eventTurn);
}
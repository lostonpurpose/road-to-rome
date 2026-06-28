class Hero {
    constructor(name, weapon, armor, hp, strength, defense) {
        this.name = name;
        this.weapon = weapon;
        this.armor = armor;
        this.hp = hp;
        this.strength = strength;
        this.defense = defense;
    }
}

export const hero1 = new Hero("Ted", "sword", "chain mail", 15, 6, 8);
export const hero2 = new Hero("Bob", "axe", "leather", 12, 7, 5);
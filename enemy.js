class Enemy {
    constructor(name, weapon, armor, hp, strength, defense) {
        this.name = name;
        this.weapon = weapon;
        this.armor = armor;
        this.hp = hp;
        this.strength = strength;
        this.defense = defense;
    }
}

export const enemy1 = new Enemy("goblin", "club", "none", 5, 3, 2);
export const enemy2 = new Enemy("orc", "mace", "iron", 10, 5, 4);
export const enemy3 = new Enemy("turtle", "shell", "shell", 20, 2, 8);

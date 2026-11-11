// Base values from app/GameObjects/{Building,Station,Defense,MilitaryShip,CivilShip,Research}Objects.php.
export const economyRules = {
    metal: {
        cost: {
            metal: 60,
            crystal: 15,
            deuterium: 0,
            energy: 0,
        },
        factor: 1.5,
        requirements: {},
    },
    crystal: {
        cost: {
            metal: 48,
            crystal: 24,
            deuterium: 0,
            energy: 0,
        },
        factor: 1.6,
        requirements: {},
    },
    deuterium: {
        cost: {
            metal: 225,
            crystal: 75,
            deuterium: 0,
            energy: 0,
        },
        factor: 1.5,
        requirements: {},
    },
    solar: {
        cost: {
            metal: 75,
            crystal: 30,
            deuterium: 0,
            energy: 0,
        },
        factor: 1.5,
        requirements: {},
    },
    fusion: {
        cost: {
            metal: 900,
            crystal: 360,
            deuterium: 180,
            energy: 0,
        },
        factor: 1.8,
        requirements: {
            deuterium: 5,
            energyTech: 3,
        },
    },
    metalStorage: {
        cost: {
            metal: 1000,
            crystal: 0,
            deuterium: 0,
            energy: 0,
        },
        factor: 2.0,
        requirements: {},
    },
    crystalStorage: {
        cost: {
            metal: 1000,
            crystal: 500,
            deuterium: 0,
            energy: 0,
        },
        factor: 2.0,
        requirements: {},
    },
    deuteriumStorage: {
        cost: {
            metal: 1000,
            crystal: 1000,
            deuterium: 0,
            energy: 0,
        },
        factor: 2.0,
        requirements: {},
    },
    robotics: {
        cost: {
            metal: 400,
            crystal: 120,
            deuterium: 200,
            energy: 0,
        },
        factor: 2.0,
        requirements: {},
    },
    shipyard: {
        cost: {
            metal: 400,
            crystal: 200,
            deuterium: 100,
            energy: 0,
        },
        factor: 2.0,
        requirements: {
            robotics: 2,
        },
    },
    research: {
        cost: {
            metal: 200,
            crystal: 400,
            deuterium: 200,
            energy: 0,
        },
        factor: 2.0,
        requirements: {},
    },
    nanite: {
        cost: {
            metal: 1000000,
            crystal: 500000,
            deuterium: 100000,
            energy: 0,
        },
        factor: 2.0,
        requirements: {
            computer: 10,
            robotics: 10,
        },
    },
    terraformer: {
        cost: {
            metal: 0,
            crystal: 50000,
            deuterium: 100000,
            energy: 1000,
        },
        factor: 2.0,
        requirements: {
            nanite: 1,
            energyTech: 12,
        },
    },
    rocket: {
        cost: {
            metal: 2000,
            crystal: 0,
            deuterium: 0,
            energy: 0,
        },
        factor: 1,
        requirements: {
            shipyard: 1,
        },
    },
    laser: {
        cost: {
            metal: 1500,
            crystal: 500,
            deuterium: 0,
            energy: 0,
        },
        factor: 1,
        requirements: {
            shipyard: 2,
            laserTech: 3,
        },
    },
    lightFighter: {
        cost: {
            metal: 3000,
            crystal: 1000,
            deuterium: 0,
            energy: 0,
        },
        factor: 1,
        requirements: {
            shipyard: 1,
            combustion: 1,
        },
    },
    smallCargo: {
        cost: {
            metal: 2000,
            crystal: 2000,
            deuterium: 0,
            energy: 0,
        },
        factor: 1,
        requirements: {
            shipyard: 2,
            combustion: 2,
        },
    },
    probe: {
        cost: {
            metal: 0,
            crystal: 1000,
            deuterium: 0,
            energy: 0,
        },
        factor: 1,
        requirements: {
            shipyard: 3,
            combustion: 3,
            espionage: 2,
        },
    },
    energyTech: {
        cost: {
            metal: 0,
            crystal: 800,
            deuterium: 400,
            energy: 0,
        },
        factor: 2.0,
        requirements: {
            research: 1,
        },
    },
    laserTech: {
        cost: {
            metal: 200,
            crystal: 100,
            deuterium: 0,
            energy: 0,
        },
        factor: 2.0,
        requirements: {
            energyTech: 2,
            research: 1,
        },
    },
    combustion: {
        cost: {
            metal: 400,
            crystal: 0,
            deuterium: 600,
            energy: 0,
        },
        factor: 2.0,
        requirements: {
            energyTech: 1,
            research: 1,
        },
    },
    impulse: {
        cost: {
            metal: 2000,
            crystal: 4000,
            deuterium: 600,
            energy: 0,
        },
        factor: 2.0,
        requirements: {
            energyTech: 1,
            research: 2,
        },
    },
    espionage: {
        cost: {
            metal: 200,
            crystal: 1000,
            deuterium: 200,
            energy: 0,
        },
        factor: 2.0,
        requirements: {
            research: 3,
        },
    },
    computer: {
        cost: {
            metal: 0,
            crystal: 400,
            deuterium: 600,
            energy: 0,
        },
        factor: 2.0,
        requirements: {
            research: 1,
        },
    },
}

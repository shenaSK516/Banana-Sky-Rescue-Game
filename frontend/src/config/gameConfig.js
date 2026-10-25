import Phaser from 'phaser';

import BootScene from '../scenes/BootScene.js';
import OpeningScene from '../scenes/OpeningScene.js';
import MainMenuScene from '../scenes/MainMenuScene.js';

const gameConfig = {
    type: Phaser.AUTO,

    parent: 'game-container',

   

    backgroundColor: '#87CEEB',

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%'
    },

    scene: [
        BootScene,
        OpeningScene,
        MainMenuScene
    ]
};

export default gameConfig;
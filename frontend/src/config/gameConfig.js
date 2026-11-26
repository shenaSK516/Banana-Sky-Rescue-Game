
import Phaser, { DOM } from 'phaser';

import BootScene from '../scenes/BootScene.js';
import OpeningScene from '../scenes/OpeningScene.js';
import MainMenuScene from '../scenes/MainMenuScene.js';
import LoginScene from '../scenes/LoginScene.js';
import RegisterScene from '../scenes/RegisterScene.js';
import EmailRecoveryScene from '../scenes/EmailRecoveryScene.js';
import OTPVerificationScene from '../scenes/OTPVerificationScene.js';
import EmailVerifiedScene from '../scenes/EmailVerifiedScene.js';

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

    dom: {
        createContainer: true
    },

    scene: [
        BootScene,
        OpeningScene,
        MainMenuScene,
        LoginScene,
        RegisterScene,
        EmailRecoveryScene,
        OTPVerificationScene,
        EmailVerifiedScene
    ]
};

export default gameConfig;

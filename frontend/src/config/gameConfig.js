
import Phaser from 'phaser';

import BootScene from '../scenes/BootScene.js';
import OpeningScene from '../scenes/OpeningScene.js';
import MainMenuScene from '../scenes/MainMenuScene.js';
import LoginScene from '../scenes/LoginScene.js';
import RegisterScene from '../scenes/RegisterScene.js';
import EmailRecoveryScene from '../scenes/EmailRecoveryScene.js';
import OTPVerificationScene from '../scenes/OTPVerificationScene.js';
import EmailVerifiedScene from '../scenes/EmailVerifiedScene.js';
import AuthenticatedMainMenuScene from '../scenes/AuthenticatedMainMenuScene.js';
import LevelSelectionScene from '../scenes/LevelSelectionScene.js';
import SublevelSelectionScene from '../scenes/SublevelSelectionScene.js';
import GameplayScene from '../scenes/GameplayScene.js';
import LeaderboardScene from '../scenes/LeaderboardScene.js';

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
        EmailVerifiedScene,
        AuthenticatedMainMenuScene,
        LevelSelectionScene,
        SublevelSelectionScene,
        GameplayScene,
        LeaderboardScene
    ]
};

export default gameConfig;


import Phaser from 'phaser';
import ImageButton from '../components/ImageButton.js';
import AudioManager from '../components/AudioManager.js';
import BackButton from '../components/BackButton.js';

export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        const { width, height } = this.scale;

        // Background
        const background = this.add.image(
            width / 2,
            height / 2,
            'mainMenuBackground'
        );

        background.setScale(Math.max(
            width / background.width,
            height / background.height
        ));

        // Game logo
        const logo = this.add.image(
            width / 2,
            height * 0.19,
            'gameLogo'
        );

        logo.setScale(Math.min(
            (width * 0.38) / logo.width,
            (height * 0.28) / logo.height
        ));

        // Guest menu buttons
        const buttonWidth = Math.min(width * 0.46, 480);

        new ImageButton(
            this,
            width / 2,
            height * 0.43,
            'menuLogin',
            buttonWidth,
            () => this.handleLogin()
);

        new ImageButton(
            this,
            width / 2,
            height * 0.63,
            'menuRegister',
            buttonWidth,
            () => this.handleRegister()
        );

        new ImageButton(
            this,
            width / 2,
            height * 0.82,
            'menuHowToPlay',
            buttonWidth,
            () => this.handleHowToPlay()
            
        );

        // Back button
        // Back to Opening Screen
        new BackButton(this, 'OpeningScene');
        /*new ImageButton(
            this,
            70,
            70,
            'backButton',
            75,
            () => this.scene.start('OpeningScene')
        );*/

        // Settings button
        new ImageButton(
            this,
            width - 70,
            height - 70,
            'settingsButton',
            75,
            () => this.handleSettings()
        );

        this.createAudioControls(height);
    }

    createAudioControls(height) {
        const musicButton = this.add.image(
            70,
            height - 145,
            'musicButton'
        ).setDisplaySize(65, 65)
         .setInteractive({ useHandCursor: true });

        const soundButton = this.add.image(
            70,
            height - 70,
            'volumeButton'
        ).setDisplaySize(65, 65)
         .setInteractive({ useHandCursor: true });

        const musicStrike = this.add.graphics();
        const soundStrike = this.add.graphics();

        const drawStrike = (graphics, button, enabled) => {
            graphics.clear();

            if (!enabled) {
                graphics.lineStyle(6, 0xff2020, 1);
                graphics.beginPath();
                graphics.moveTo(button.x - 20, button.y - 20);
                graphics.lineTo(button.x + 20, button.y + 20);
                graphics.strokePath();
            }
        };

        const updateIcons = () => {
            drawStrike(
                musicStrike,
                musicButton,
                AudioManager.musicEnabled
            );

            drawStrike(
                soundStrike,
                soundButton,
                AudioManager.soundEnabled
            );
        };

        musicButton.on('pointerdown', () => {
            AudioManager.playButtonClick(this);
            AudioManager.toggleMusic(this);
            updateIcons();
        });

        soundButton.on('pointerdown', () => {
            AudioManager.toggleSound(this);
            updateIcons();
        });

        updateIcons();
    }

    handleLogin() {
        console.log('Login selected');
        this.scene.start('LoginScene');
    }

    handleRegister() {
        console.log('Register selected');
        this.scene.start('RegisterScene');

        
    }

    handleHowToPlay() {
        console.log('How to Play selected');
    }

    handleSettings() {
        console.log('Settings selected');
    }
}

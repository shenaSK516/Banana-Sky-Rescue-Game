
import Phaser from 'phaser';
import ImageButton from '../components/ImageButton.js';
import AudioManager from '../components/AudioManager.js';

export default class OpeningScene extends Phaser.Scene {
    constructor() {
        super('OpeningScene');
    }

    create() {
        const { width, height } = this.scale;

        // Background image fills the screen without stretching
        const background = this.add.image(
            width / 2,
            height / 2,
            'openingBackground'
        );

        const bgScale = Math.max(
            width / background.width,
            height / background.height
        );

        // logo
        const logo = this.add.image(
            width / 2,
            height * 0.28,
            'gameLogo'
        );

        logo.setDisplaySize(
        Math.min(width * 0.40, 650),
        Math.min(height * 0.39, 270)
        );

        logo.setDepth(10);

        background.setScale(bgScale);

        // Initialize and attempt to play background music
        AudioManager.initialize(this);
        AudioManager.startMusic(this);

        
        this.input.on('pointerdown', () => {
            if (AudioManager.musicEnabled && AudioManager.soundEnabled) {
                AudioManager.startMusic(this);
             }
        });

        // Play button
        new ImageButton(
            this,
            width / 2,
            height * 0.82,
            'playButton',
            360,
            () => {
                this.scene.start('MainMenuScene');
            }
        );

        // Music button (upper button)
        const musicButton = this.add.image(
            65,
            height - 145,
            'musicButton'
        );

        musicButton.setDisplaySize(65, 65);
        musicButton.setInteractive({ useHandCursor: true });
        musicButton.setDepth(100);

        // Sound effects button (lower button)
        const effectsButton = this.add.image(
            65,
            height - 65,
            'volumeButton'
        );

        effectsButton.setDisplaySize(65, 65);
        effectsButton.setInteractive({ useHandCursor: true });
        effectsButton.setDepth(100);

        // Red strike lines
        const musicStrike = this.add.graphics();
        musicStrike.setDepth(101);

        const effectsStrike = this.add.graphics();
        effectsStrike.setDepth(101);

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
                effectsStrike,
                effectsButton,
                AudioManager.soundEnabled
            );
        };

        updateIcons();

       // Music button — background music only
        musicButton.on('pointerdown', () => {
            AudioManager.playButtonClick(this);
            AudioManager.toggleMusic(this);
        updateIcons();
        });

      // Sound button — all game audio
        effectsButton.on('pointerdown', () => {
            AudioManager.toggleSound(this);
        updateIcons();
        });
    }
}


 
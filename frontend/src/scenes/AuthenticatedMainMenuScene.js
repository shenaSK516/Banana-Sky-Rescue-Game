
import Phaser from 'phaser';
import ImageButton from '../components/ImageButton.js';
import AudioManager from '../components/AudioManager.js';
import authenticationService from '../components/AuthenticationService.js';

export default class AuthenticatedMainMenuScene extends Phaser.Scene {
    constructor() {
        super('AuthenticatedMainMenuScene');
    }

    create() {
        const { width, height } = this.scale;

        this.menuBusy = false;


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
            height * 0.16,
            'gameLogo'
        );

        logo.setScale(Math.min(
            (width * 0.34) / logo.width,
            (height * 0.27) / logo.height
        ));

        // PLAYER WELCOME MESSAGE
        const username = this.registry.get('authenticatedPlayer');

        this.welcomeText = this.add.text(
        35,
        35,
        username ? `Welcome, ${username}!` : 'Welcome, Player!',
        {
            fontFamily: 'Arial, sans-serif',
            fontSize: '26px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#033771',
            strokeThickness: 5
        }
        );

        this.welcomeText.setOrigin(0, 0.5);
        this.welcomeText.setDepth(10);

        // Authenticated menu buttons
        const buttonWidth = Math.min(width * 0.24, 500);
        const buttons = [
            {
                texture: 'authPlay',
                y: 0.37,
                action: () => this.openFeature('LevelSelectionScene')
            },
            {
                texture: 'authProfile',
                y: 0.495,
                action: () => this.openFeature('ProfileScene')
            },
            {
                texture: 'authHowToPlay',
                y: 0.62,
                action: () => this.openFeature('HowToPlayScene')
            },
            {
                texture: 'authLeaderboard',
                y: 0.74,
                action: () => this.openFeature('LeaderboardScene')
            },
            {
                texture: 'authLogout',
                y: 0.87,
                action: () => this.handleLogout()
            }
        ];

        buttons.forEach(({ texture, y, action }) => {
            new ImageButton(
                this,
                width / 2,
                height * y,
                texture,
                buttonWidth,
                () => {
                    if (!this.menuBusy) {
                        action();
                    }
                }
            );
        });


        // Settings
    new ImageButton(
        this,
        width - 70,
        height - 70,
        'settingsButton',
        75,
            () => {
                if (!this.menuBusy) {
                this.openFeature('SettingsScene');
            }
            }
    );

        this.createAudioControls(height);

        // Feedback message for features not implemented yet
        this.feedback = this.add.text(
            width / 2,
            height * 0.95,
            '',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '18px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#053469',
                strokeThickness: 4,
                align: 'center'
            }
        ).setOrigin(0.5);

        // Verify the server session before showing player controls.
        this.verifyPlayerSession();
    }

    async verifyPlayerSession() {
        try {
            const player =
                await authenticationService.getCurrentPlayer();

            if (!this.sys.isActive()) return;

            this.registry.set(
                'authenticatedPlayer',
                player.username
            );

            this.welcomeText.setText(
                `Welcome, ${player.username}!`
            );

            this.menuBusy = false;

        } catch {
            if (!this.sys.isActive()) return;

            this.registry.remove('authenticatedPlayer');
            this.scene.start('LoginScene');
        }
    }

    openFeature(sceneKey) {
        if (this.scene.manager.keys[sceneKey]) {
            this.scene.start(sceneKey);
            return;
        }

        this.feedback.setText(
            'This feature is coming soon!'
        );

        if (this.feedbackTimer) {
            this.feedbackTimer.remove();
        }

        this.feedbackTimer = this.time.delayedCall(
            2000,
            () => {
                if (this.sys.isActive()) {
                    this.feedback.setText('');
                }
            }
        );
    }

    async handleLogout() {
        if (this.menuBusy) return;

        this.menuBusy = true;
        this.feedback.setText('Logging out...');

        try {
            await authenticationService.logout();

            if (!this.sys.isActive()) return;

            this.registry.remove('authenticatedPlayer');
            this.scene.start('MainMenuScene');
        } catch (error) {
            if (!this.sys.isActive()) return;

            this.menuBusy = false;
            this.feedback.setText(
                error.message || 'Logout failed. Please try again.'
            );
        }
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
}


import Phaser from 'phaser';
import ImageButton from '../components/ImageButton.js';
import AudioManager from '../components/AudioManager.js';
import { fetchPlayerProgress } from '../services/playerProgressApi.js';

export default class LevelSelectionScene extends Phaser.Scene {
    constructor() {
        super('LevelSelectionScene');
    }

    // LOAD PLAYER PROGRESS FROM BACKEND

    async loadPlayerProgress() {
        this.levelSelectionBusy = true;

        try {
            const progress = await fetchPlayerProgress();

            // Ignore responses after leaving this scene.
            if (!this.sys.isActive()) return;

            if (
                !Array.isArray(progress) ||
                progress.length !== 4 ||
                ![1, 2, 3, 4].every(id =>
                    progress.some(item =>
                        item.mainLevelId === id &&
                        typeof item.unlocked === 'boolean' &&
                        Array.isArray(item.sublevels) &&
                        item.sublevels.length === 3 &&
                        [1, 2, 3].every(sublevelId =>
                            item.sublevels.some(sublevel =>
                                sublevel.sublevelId === sublevelId &&
                                typeof sublevel.completed === 'boolean'
                            )
                        )
                    )
                )
            ) {
                throw new Error('Invalid player progress response.');
            }

            this.playerProgress = progress;

            console.log('Main level progress loaded:', progress);

            // Only render level cards after receiving progress.
            this.renderLevelCards();

            this.levelSelectionBusy = false;

        } catch (error) {
            if (!this.sys.isActive()) return;

            console.error('Unable to load level progress:', error);

            // Keep level selection disabled on failure.
            this.levelSelectionBusy = true;

            if (this.loadingText) {
                this.loadingText.destroy();
                this.loadingText = null;
            }

            this.add.text(
                this.scale.width / 2,
                this.scale.height * 0.55,
                'Unable to load levels.\nPlease check your connection and try again.',
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '24px',
                    fontStyle: 'bold',
                    color: '#ffffff',
                    stroke: '#164b9c',
                    strokeThickness: 4,
                    align: 'center'
                }
            ).setOrigin(0.5).setDepth(20);
        }
    }

    // CREATE SCENE

    create() {
        const { width, height } = this.scale;

        this.levelSelectionBusy = true;
        this.playerProgress = [];

        // Background
        const background = this.add.image(
            width / 2,
            height / 2,
            'levelSelectionBackground'
        );

        background.setScale(
            Math.max(
                width / background.width,
                height / background.height
            )
        );

        // Player nameplate
        this.createPlayerNameplate(width, height);

        // Points counter
        this.createStarCounter(width, height);

        // Back button
        new ImageButton(
            this,
            65,
            65,
            'backButton',
            65,
            () => {
                this.scene.start('AuthenticatedMainMenuScene');
            }
        );

        // Settings button
        new ImageButton(
            this,
            width - 65,
            height - 65,
            'settingsButton',
            65,
            () => {
                if (this.scene.manager.keys['SettingsScene']) {
                    this.scene.start('SettingsScene');
                } else {
                    console.log('Settings Scene coming soon!');
                }
            }
        );

        // Music and sound controls
        this.createAudioControls(height);

        // Loading message while waiting for backend
        this.loadingText = this.add.text(
            width / 2,
            height * 0.55,
            'Loading levels...',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '26px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#164b9c',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setDepth(20);

        // Fetch progress from Spring Boot / MySQL.
        this.loadPlayerProgress();
    }

    // RENDER FOUR MAIN LEVEL CARDS

    renderLevelCards() {
        const { width, height } = this.scale;

        if (this.loadingText) {
            this.loadingText.destroy();
            this.loadingText = null;
        }

        const levels = [
            {
                id: 1,
                name: 'Sunny Skies',
                texture: 'levelSunnySkies'
            },
            {
                id: 2,
                name: 'Windy Heights',
                texture: 'levelWindyHeights'
            },
            {
                id: 3,
                name: 'Storm Rescue',
                texture: 'levelStormRescue'
            },
            {
                id: 4,
                name: 'Rainbow Valley',
                texture: 'levelRainbowValley'
            }
        ];

        // Keep the original card layout.
        const cardWidth = width * 0.205;
        const cardSpacing = width * 0.225;
        const startX = width / 2 - cardSpacing * 1.5;
        const cardY = height * 0.55;
        const maxCardHeight = height * 0.57;

        levels.forEach((level, index) => {

            // Find this main level in the backend response.
            const mainLevelProgress = this.playerProgress.find(
                item => item.mainLevelId === level.id
            );

            // The backend determines unlocking status.
            const unlocked =
                mainLevelProgress?.unlocked === true;

            // Determine the completion state of all 3 sublevels.
            const completedStages = [1, 2, 3].map(
                sublevelId =>
                    mainLevelProgress?.sublevels.some(
                        sublevel =>
                            sublevel.sublevelId === sublevelId &&
                            sublevel.completed === true
                    ) === true
            );

            console.log(
                `${level.name}: ${unlocked ? 'UNLOCKED' : 'LOCKED'}`,
                completedStages
            );

            const x = startX + index * cardSpacing;

            // Group the card, padlock and stars.
            const levelContainer = this.add.container(
                x,
                cardY
            );

            // Main-level artwork
            const card = this.add.image(
                0,
                0,
                level.texture
            );

            const normalScale = Math.min(
                cardWidth / card.width,
                maxCardHeight / card.height
            );

            card.setScale(normalScale);
            levelContainer.add(card);

            // LOCKED CARD APPEARANCE

            if (!unlocked) {
                card.setTint(0x888888);

                const padlock = this.add.image(
                    0,
                    -card.displayHeight * 0.02,
                    'levelPadlock'
                );

                const padlockWidth =
                    card.displayWidth * 0.27;

                padlock.setScale(
                    padlockWidth / padlock.width
                );

                levelContainer.add(padlock);
            }

            // COMPLETION STARS

            const starSize =
                card.displayWidth * 0.16;

            const starSpacing =
                card.displayWidth * 0.22;

            const starYOffset = {
                1: 0.37,
                2: 0.385,
                3: 0.385,
                4: 0.37
            };

            const starY =
                card.displayHeight *
                starYOffset[level.id];

            completedStages.forEach(
                (completed, stageIndex) => {

                    const starX =
                        (stageIndex - 1) * starSpacing;

                    const star = this.add.image(
                        starX,
                        starY,
                        completed
                            ? 'levelGoldStar'
                            : 'levelGreyStar'
                    );

                    star.setDisplaySize(
                        starSize,
                        starSize
                    );

                    if (!completed) {
                        if (star.preFX) {
                            star.preFX
                                .addColorMatrix()
                                .grayscale();
                        } else {
                            star.setTint(0x888888);
                        }

                        star.setAlpha(0.85);
                    } else {
                        star.clearTint();
                        star.setAlpha(1);
                    }

                    levelContainer.add(star);
                }
            );

            // INTERACTIVE CARD

            levelContainer.setSize(
                card.displayWidth,
                card.displayHeight
            );

            levelContainer.setInteractive({
                useHandCursor: true
            });

            // HOVER ANIMATION

            levelContainer.on('pointerover', () => {
                if (this.levelSelectionBusy) return;

                this.tweens.killTweensOf(levelContainer);

                this.tweens.add({
                    targets: levelContainer,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 150,
                    ease: 'Sine.easeOut'
                });
            });

            levelContainer.on('pointerout', () => {
                if (this.levelSelectionBusy) return;

                this.tweens.killTweensOf(levelContainer);

                this.tweens.add({
                    targets: levelContainer,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 150,
                    ease: 'Sine.easeOut'
                });
            });

            // CLICK INTERACTION

            levelContainer.on('pointerdown', () => {
                if (this.levelSelectionBusy) return;

                AudioManager.playButtonClick(this);

                this.tweens.killTweensOf(levelContainer);

                // Locked main level
                if (!unlocked) {
                    console.log(
                        `${level.name} is locked. ` +
                        'Complete all three sublevels ' +
                        'of the previous main level first.'
                    );

                    this.levelSelectionBusy = true;

                    const originalX = levelContainer.x;

                    this.tweens.add({
                        targets: levelContainer,
                        x: originalX + 6,
                        duration: 55,
                        yoyo: true,
                        repeat: 2,
                        ease: 'Sine.easeInOut',
                        onComplete: () => {
                            levelContainer.x = originalX;
                            this.levelSelectionBusy = false;
                        }
                    });

                    return;
                }

                // Unlocked main level
                this.levelSelectionBusy = true;

                this.tweens.add({
                    targets: levelContainer,
                    scaleX: 0.97,
                    scaleY: 0.97,
                    duration: 80,
                    yoyo: true,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        this.levelSelectionBusy = false;

                        console.log(
                            `Selected unlocked level ${level.id}: ${level.name}`
                        );

                        this.scene.start(
                            'SublevelSelectionScene',
                            {
                                levelId: level.id
                            }
                        );
                    }
                });
            });
        });
    }

    // PLAYER NAMEPLATE

    createPlayerNameplate(width, height) {
        const x = width * 0.18;
        const y = height * 0.11;

        const nameplate = this.add.image(
            x,
            y,
            'levelPlayerNameplate'
        );

        const plateWidth = Math.min(
            width * 0.20,
            290
        );

        nameplate.setScale(
            plateWidth / nameplate.width
        );

        nameplate.setDepth(10);

        const username =
            this.registry.get('authenticatedPlayer') || 'Player';

        const usernameText = this.add.text(
            x + plateWidth * 0.10,
            y,
            username,
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '18px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#164b9c',
                strokeThickness: 3
            }
        );

        usernameText
            .setOrigin(0.5)
            .setDepth(11);

        usernameText.setScale(
            Math.min(
                1,
                (plateWidth * 0.58) /
                    Math.max(usernameText.width, 1)
            )
        );
    }

    // POINTS COUNTER


    createStarCounter(width, height) {
        const x = width * 0.88;
        const y = height * 0.11;

        const counter = this.add.image(
            x,
            y,
            'levelStarCounter'
        );

        const counterWidth = Math.min(
            width * 0.15,
            220
        );

        counter.setScale(
            counterWidth / counter.width
        );

        counter.setDepth(10);

        // Points are separate from completion stars.
        // This remains temporary until points API integration.
        const totalPoints = 0;

        this.add.text(
            x + counterWidth * 0.13,
            y,
            `${totalPoints}`,
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#164b9c',
                strokeThickness: 3
            }
        )
        .setOrigin(0.5)
        .setDepth(11);
    }

    // MUSIC AND SOUND CONTROLS

    createAudioControls(height) {

        // Music button
        const musicButton = this.add.image(
            65,
            height - 145,
            'musicButton'
        );

        musicButton.setDisplaySize(65, 65);

        musicButton.setInteractive({
            useHandCursor: true
        });

        musicButton.setDepth(100);

        // Sound effects button
        const effectsButton = this.add.image(
            65,
            height - 65,
            'volumeButton'
        );

        effectsButton.setDisplaySize(65, 65);

        effectsButton.setInteractive({
            useHandCursor: true
        });

        effectsButton.setDepth(100);

        // Red strike lines
        const musicStrike = this.add.graphics();
        musicStrike.setDepth(101);

        const effectsStrike = this.add.graphics();
        effectsStrike.setDepth(101);

        const drawStrike = (
            graphics,
            button,
            enabled
        ) => {
            graphics.clear();

            if (!enabled) {
                graphics.lineStyle(
                    6,
                    0xff2020,
                    1
                );

                graphics.beginPath();

                graphics.moveTo(
                    button.x - 20,
                    button.y - 20
                );

                graphics.lineTo(
                    button.x + 20,
                    button.y + 20
                );

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

        // Toggle background music
        musicButton.on('pointerdown', () => {
            AudioManager.playButtonClick(this);
            AudioManager.toggleMusic(this);
            updateIcons();
        });

        // Toggle sound effects
        effectsButton.on('pointerdown', () => {
            AudioManager.toggleSound(this);
            updateIcons();
        });
    }
}


import Phaser from 'phaser';
import ImageButton from '../components/ImageButton.js';
import AudioManager from '../components/AudioManager.js';

export default class LevelSelectionScene extends Phaser.Scene {
    constructor() {
        super('LevelSelectionScene');
    }

    create() {
        const { width, height } = this.scale;

        // Prevent repeated level selections
        this.levelSelectionBusy = false;

        // 1. Level Selection background
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

        // 2. Four main levels
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

        // 3. Temporary frontend completion data
        // Each boolean represents one sublevel.
        // false = incomplete
        // true = successfully completed
        const levelProgress = {
            1: [false, false, false],
            2: [false, false, false],
            3: [false, false, false],
            4: [false, false, false]
        };

        // 4. Check whether a main level is unlocked
        const isLevelUnlocked = (levelId) => {
            // First main level is always unlocked
            if (levelId === 1) {
                return true;
            }

            // Check the previous main level
            const previousLevelProgress =
                levelProgress[levelId - 1];

            return previousLevelProgress.every(
                (completed) => completed === true
            );
        };

        // Display unlocking status in console
        levels.forEach((level) => {
            console.log(
                `${level.name}: ${
                    isLevelUnlocked(level.id)
                        ? 'UNLOCKED'
                        : 'LOCKED'
                }`
            );
        });

        // 5. Card layout
        const cardWidth = width * 0.205;
        const cardSpacing = width * 0.225;
        const startX = width / 2 - cardSpacing * 1.5;
        const cardY = height * 0.55;
        const maxCardHeight = height * 0.57;

        // 6. Create interactive level containers
        levels.forEach((level, index) => {
            const x = startX + index * cardSpacing;

            // Group card, stars, and padlock together
            const levelContainer = this.add.container(
                x,
                cardY
            );

            // Create main-level card
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

            // 7. Check unlocking status
            const unlocked = isLevelUnlocked(level.id);

            // Apply a muted tint only to locked cards.
            // The separate padlock remains golden.
            if (!unlocked) {
                card.setTint(0x888888);
            }

            // 8. Add padlock to locked levels
            if (!unlocked) {
                const padlock = this.add.image(
                    0,
                    -card.displayHeight * 0.02,
                    'levelPadlock'
                );

                // Padlock size relative to card width
                const padlockWidth =
                    card.displayWidth * 0.27;

                padlock.setScale(
                    padlockWidth / padlock.width
                );

                // Add to same container
                levelContainer.add(padlock);
            }

            // 9. Add three completion stars
            const completedStages =
                levelProgress[level.id];

            const starSize =
                card.displayWidth * 0.16;

            const starSpacing =
                card.displayWidth * 0.22;

            // Individual star alignment
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
                        completed ? 'levelGoldStar' : 'levelGreyStar'
                    );

                    star.setDisplaySize(
                        starSize,
                        starSize
                    );

                    // UPDATED: Completion star appearance
                    // Grey = incomplete
                    // Gold = successfully completed
                    if (!completed) {
                        // Remove the original golden color
                        // while preserving the star's details.
                        if (star.preFX) {
                            star.preFX
                                .addColorMatrix()
                                .grayscale();
                        } else {
                            // Fallback if preFX is unavailable
                            star.setTint(0x888888);
                        }

                        // Slightly soften incomplete stars
                        star.setAlpha(0.85);
                    } else {
                        // Keep completed stars bright gold
                        star.clearTint();
                        star.setAlpha(1);
                    }

                    // Stars belong to the same container
                    // so they hover together with the card.
                    levelContainer.add(star);
                }
            );

            // 10. Make entire container interactive
            levelContainer.setSize(
                card.displayWidth,
                card.displayHeight
            );

            levelContainer.setInteractive({
                useHandCursor: true
            });

            // 11. Hover animation
            levelContainer.on('pointerover', () => {
                if (this.levelSelectionBusy) return;

                this.tweens.killTweensOf(
                    levelContainer
                );

                this.tweens.add({
                    targets: levelContainer,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 150,
                    ease: 'Sine.easeOut'
                });
            });

            // 12. Restore normal size
            levelContainer.on('pointerout', () => {
                if (this.levelSelectionBusy) return;

                this.tweens.killTweensOf(
                    levelContainer
                );

                this.tweens.add({
                    targets: levelContainer,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 150,
                    ease: 'Sine.easeOut'
                });
            });

            // 13. Click interaction
            levelContainer.on('pointerdown', () => {
                if (this.levelSelectionBusy) return;

                AudioManager.playButtonClick(this);

                this.tweens.killTweensOf(
                    levelContainer
                );

                // Locked level interaction
                if (!unlocked) {
                    console.log(
                        `${level.name} is locked. ` +
                        'Complete all three stages ' +
                        'of the previous level first.'
                    );

                    // Shake locked card
                    this.levelSelectionBusy = true;

                    const originalX =
                        levelContainer.x;

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

                // Unlocked level interaction
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

                        console.log(`Selected unlocked level ${level.id}: ${level.name}`);

                        this.scene.start('SublevelSelectionScene', {
                            levelId: level.id
                        });

                        // Future navigation:
                        // this.scene.start(
                        //     'SublevelSelectionScene',
                        //     {
                        //         levelId: level.id
                        //     }
                        // );
                    }
                });
            });
        });

        // 14. Player nameplate
        this.createPlayerNameplate(width, height);

        // 15. Total points counter
        this.createStarCounter(width, height);

        // 16. Back button
        new ImageButton(
            this,
            65,
            65,
            'backButton',
            65,
            () => {
                this.scene.start(
                    'AuthenticatedMainMenuScene'
                );
            }
        );

        // 17. Settings button
        new ImageButton(
            this,
            width - 65,
            height - 65,
            'settingsButton',
            65,
            () => {
                if (
                    this.scene.manager.keys[
                        'SettingsScene'
                    ]
                ) {
                    this.scene.start(
                        'SettingsScene'
                    );
                } else {
                    console.log(
                        'Settings Scene coming soon!'
                    );
                }
            }
        );

        // 18. Music and sound controls
        this.createAudioControls(height);
    }

    // Display authenticated username
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
            this.registry.get(
                'authenticatedPlayer'
            ) || 'Player';

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

        // Fit longer usernames inside nameplate
        usernameText.setScale(
            Math.min(
                1,
                (plateWidth * 0.58) /
                    Math.max(
                        usernameText.width,
                        1
                    )
            )
        );
    }

    // Display total earned points
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

        // Temporary value until backend integration
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

    // Music and sound controls
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
        const musicStrike =
            this.add.graphics();

        musicStrike.setDepth(101);

        const effectsStrike =
            this.add.graphics();

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
        musicButton.on(
            'pointerdown',
            () => {
                AudioManager.playButtonClick(
                    this
                );

                AudioManager.toggleMusic(
                    this
                );

                updateIcons();
            }
        );

        // Toggle sound effects
        effectsButton.on(
            'pointerdown',
            () => {
                AudioManager.toggleSound(
                    this
                );

                updateIcons();
            }
        );
    }
}

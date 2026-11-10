
import Phaser from 'phaser';
import ImageButton from '../components/ImageButton.js';
import AudioManager from '../components/AudioManager.js';
import { fetchPlayerProgress } from '../services/playerProgressApi.js';

export default class SublevelSelectionScene extends Phaser.Scene {

    constructor() {
        super('SublevelSelectionScene');
    }

    init(data) {
        this.levelId = data?.levelId ?? 1;

        this.mainLevelProgress = null;
        this.sublevelSelectionBusy = true;
        this.progressLoaded = false;
    }

    // LOAD AUTHENTICATED PLAYER PROGRESS

    async loadSublevelProgress() {
        this.sublevelSelectionBusy = true;

        try {
            const progress = await fetchPlayerProgress();

            // Ignore responses if the scene was closed.
            if (!this.sys.isActive()) {
                return;
            }

            const mainLevelProgress = progress.find(
                item => item.mainLevelId === this.levelId
            );

            // Prevent access to locked main levels.
            if (
                !mainLevelProgress ||
                mainLevelProgress.unlocked !== true
            ) {
                console.warn(
                    'Main level is locked or unavailable.'
                );

                this.scene.start('LevelSelectionScene');
                return;
            }

            this.mainLevelProgress = mainLevelProgress;

            console.log(
                `Sublevel progress loaded for main level ${this.levelId}:`,
                mainLevelProgress
            );

            // Remove loading message.
            if (this.loadingText) {
                this.loadingText.destroy();
                this.loadingText = null;
            }

            // Create islands using backend progress.
            this.renderSublevelIslands();

            this.progressLoaded = true;
            this.sublevelSelectionBusy = false;

        } catch (error) {
            if (!this.sys.isActive()) {
                return;
            }

            console.error(
                'Unable to load sublevel progress:',
                error
            );

            this.sublevelSelectionBusy = true;

            if (this.loadingText) {
                this.loadingText.setText(
                    'Unable to load levels.\nPlease try again.'
                );
            }
        }
    }

    // CREATE SCENE

    create() {
        const { width, height } = this.scale;

        const levelConfigs = {
            1: {
                name: 'Sunny Skies',
                background: 'sublevelSunnyBackground',
                banner: 'sublevelSunnyBanner'
            },
            2: {
                name: 'Windy Heights',
                background: 'sublevelWindyBackground',
                banner: 'sublevelWindyBanner'
            },
            3: {
                name: 'Storm Rescue',
                background: 'sublevelStormBackground',
                banner: 'sublevelStormBanner'
            },
            4: {
                name: 'Rainbow Valley',
                background: 'sublevelRainbowBackground',
                banner: 'sublevelRainbowBanner'
            }
        };

        this.currentLevel =
            levelConfigs[this.levelId] ?? levelConfigs[1];

        const level = this.currentLevel;

        // ========================================
        // BACKGROUND
        // ========================================

        const background = this.add.image(
            width / 2,
            height / 2,
            level.background
        );

        background.setScale(
            Math.max(
                width / background.width,
                height / background.height
            )
        );

        // ========================================
        // LEVEL BANNER
        // ========================================

        const banner = this.add.image(
            width / 2,
            height * 0.15,
            level.banner
        );

        const maxBannerWidth = width * 0.37;
        const maxBannerHeight = height * 0.25;

        const bannerScale = Math.min(
            maxBannerWidth / banner.width,
            maxBannerHeight / banner.height
        );

        banner.setScale(bannerScale);
        banner.setDepth(5);

        // Text on the wooden board.
        this.add.text(
            width / 2,
            banner.y + banner.displayHeight * 0.32,
            'CHOOSE LEVEL',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${Math.round(height * 0.023)}px`,
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#754019',
                strokeThickness: 4,
                align: 'center'
            }
        )
        .setOrigin(0.5)
        .setDepth(6);

        // LOADING MESSAGE

        this.loadingText = this.add.text(
            width / 2,
            height * 0.57,
            'Loading levels...',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '24px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#164b9c',
                strokeThickness: 4,
                align: 'center'
            }
        )
        .setOrigin(0.5)
        .setDepth(20);

        // PLAYER NAMEPLATE AND POINTS

        this.createPlayerNameplate(width, height);
        this.createStarCounter(width, height);

        // BACK BUTTON

        new ImageButton(
            this,
            65,
            65,
            'backButton',
            65,
            () => {
                this.scene.start('LevelSelectionScene');
            }
        );

        // SETTINGS BUTTON

        new ImageButton(
            this,
            width - 65,
            height - 65,
            'settingsButton',
            65,
            () => {
                if (
                    this.scene.manager.keys['SettingsScene']
                ) {
                    this.scene.start('SettingsScene');
                } else {
                    console.log(
                        'Settings Scene coming soon!'
                    );
                }
            }
        );

        // AUDIO CONTROLS

        this.createAudioControls(height);

        // FETCH REAL BACKEND PROGRESS

        this.loadSublevelProgress();
    }

    // RENDER SUBLEVEL ISLANDS

    renderSublevelIslands() {
        const { width, height } = this.scale;

        if (
            !this.mainLevelProgress ||
            !Array.isArray(
                this.mainLevelProgress.sublevels
            )
        ) {
            console.error(
                'Invalid sublevel progress data.'
            );
            return;
        }

        const levelName = this.currentLevel.name;

        const islandWidth = width * 0.215;

        const positions = [
            width * 0.25,
            width * 0.50,
            width * 0.75
        ];

        for (let index = 0; index < 3; index++) {

            const stageNumber = index + 1;

            // READ BACKEND UNLOCKING STATUS

            const sublevelProgress =
                this.mainLevelProgress.sublevels.find(
                    item =>
                        item.sublevelId === stageNumber
                );

            const unlocked =
                sublevelProgress?.unlocked === true;

            const completed =
                sublevelProgress?.completed === true;

            console.log(
                `${levelName}, Level ${stageNumber}:`,
                {
                    unlocked,
                    completed
                }
            );

            // SELECT ISLAND TEXTURE

            const texture = unlocked
                ? 'sublevelUnlockedIsland'
                : 'sublevelLockedIsland';

            const container = this.add.container(
                positions[index],
                height * 0.57
            );

            const island = this.add.image(
                0,
                0,
                texture
            );

            const scale = Math.min(
                islandWidth / island.width,
                (height * 0.58) / island.height
            );

            island.setScale(scale);
            container.add(island);

            // DYNAMIC LEVEL LABEL

            const label = this.add.text(
                0,
                island.displayHeight * 0.0020,
                `Level ${stageNumber}`,
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize:
                        `${Math.round(height * 0.039)}px`,
                    fontStyle: 'bold',
                    color: '#ffffff',
                    stroke: '#254075',
                    strokeThickness: 5,
                    align: 'center'
                }
            )
            .setOrigin(0.5, 0.5);

            container.add(label);

            // INTERACTIVE CONTAINER

            container.setSize(
                island.displayWidth,
                island.displayHeight
            );

            container.setInteractive({
                useHandCursor: true
            });

            // HOVER ANIMATION

            container.on('pointerover', () => {

                if (this.sublevelSelectionBusy) {
                    return;
                }

                this.tweens.killTweensOf(container);

                this.tweens.add({
                    targets: container,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 150,
                    ease: 'Sine.easeOut'
                });
            });

            container.on('pointerout', () => {

                if (this.sublevelSelectionBusy) {
                    return;
                }

                this.tweens.killTweensOf(container);

                this.tweens.add({
                    targets: container,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 150,
                    ease: 'Sine.easeOut'
                });
            });

            // LEVEL CLICK HANDLING

            container.on('pointerdown', () => {

                if (this.sublevelSelectionBusy) {
                    return;
                }

                AudioManager.playButtonClick(this);

                this.tweens.killTweensOf(container);

                // LOCKED LEVEL

                if (!unlocked) {

                    console.log(
                        `${levelName}, Level ${stageNumber} is locked.`
                    );

                    this.sublevelSelectionBusy = true;

                    const originalX = container.x;

                    this.tweens.add({
                        targets: container,
                        x: originalX + 6,
                        duration: 55,
                        yoyo: true,
                        repeat: 2,
                        ease: 'Sine.easeInOut',
                        onComplete: () => {
                            container.x = originalX;

                            this.sublevelSelectionBusy =
                                false;
                        }
                    });

                    return;
                }

                // UNLOCKED LEVEL

                console.log(
                    `Selected ${levelName}, Level ${stageNumber}`,
                    {
                        mainLevelId: this.levelId,
                        sublevelId: stageNumber,
                        completed
                    }
                );

                // Future gameplay navigation:
                //
                // this.scene.start(
                //     'GameplayScene',
                //     {
                //         mainLevelId: this.levelId,
                //         sublevelId: stageNumber
                //     }
                // );
                //
                // IMPORTANT:
                // Selecting a level does not complete it.
                // Completion must be validated by the backend.
            });
        }
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

        nameplate
            .setScale(plateWidth / nameplate.width)
            .setDepth(10);

        const username =
            this.registry.get('authenticatedPlayer') ||
            'Player';

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
                    Math.max(
                        usernameText.width,
                        1
                    )
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

        counter
            .setScale(counterWidth / counter.width)
            .setDepth(10);

        // Points system will be integrated later.
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

        // MUSIC BUTTON

        const musicButton = this.add.image(
            65,
            height - 145,
            'musicButton'
        );

        musicButton
            .setDisplaySize(65, 65)
            .setInteractive({
                useHandCursor: true
            })
            .setDepth(100);

        // SOUND EFFECTS BUTTON

        const effectsButton = this.add.image(
            65,
            height - 65,
            'volumeButton'
        );

        effectsButton
            .setDisplaySize(65, 65)
            .setInteractive({
                useHandCursor: true
            })
            .setDepth(100);

        // RED STRIKE LINES

        const musicStrike =
            this.add.graphics().setDepth(101);

        const effectsStrike =
            this.add.graphics().setDepth(101);

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

        // TOGGLE MUSIC

        musicButton.on(
            'pointerdown',
            () => {

                AudioManager.playButtonClick(this);

                AudioManager.toggleMusic(this);

                updateIcons();
            }
        );

        // TOGGLE SOUND

        effectsButton.on(
            'pointerdown',
            () => {

                AudioManager.toggleSound(this);

                updateIcons();
            }
        );
    }
}

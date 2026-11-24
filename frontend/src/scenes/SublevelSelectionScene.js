
import Phaser from 'phaser';
import ImageButton from '../components/ImageButton.js';
import AudioManager from '../components/AudioManager.js';
import { fetchPlayerProgress } from '../services/playerProgressApi.js';
import { fetchPlayerProfile } from '../services/playerProfileApi.js';

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

        // BACKGROUND

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

        // LEVEL BANNER

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

        // Load display name, avatar and overall points.
        this.loadPlayerProfile();

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

                this.sublevelSelectionBusy = true;

                this.scene.start('GameplayScene', {
                    mainLevelId: this.levelId,
                    sublevelId: stageNumber
                });

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

    // Initial name from the Phaser registry.
    const initialName =
        this.registry.get('playerDisplayName') ||
        this.registry.get('authenticatedPlayer') ||
        'Player';

    // PLAYER AVATAR POSITION

    const avatarSize = Math.min(
        70,
        plateWidth * 0.3
    );

    const avatarX = x - plateWidth * 0.29;

    // Default avatar background.
    this.playerAvatarFallback = this.add.circle(
        avatarX,
        y,
        avatarSize / 2,
        0x6d9bd3
    );

    this.playerAvatarFallback
        .setStrokeStyle(3, 0xffffff)
        .setDepth(11);

    // Default avatar initial.
    this.playerAvatarInitial = this.add.text(
        avatarX,
        y,
        initialName.charAt(0).toUpperCase(),
        {
            fontFamily: 'Arial, sans-serif',
            fontSize: '21px',
            fontStyle: 'bold',
            color: '#ffffff'
        }
    );

    this.playerAvatarInitial
        .setOrigin(0.5)
        .setDepth(12);

    // DOM IMAGE FOR AUTHENTICATED PLAYER AVATAR

    this.playerAvatarElement = this.add.dom(
        avatarX,
        y
    ).createFromHTML(`
        <div style="
            width: ${avatarSize}px;
            height: ${avatarSize}px;
            overflow: hidden;
            border-radius: 50%;
            border: 3px solid white;
            box-sizing: border-box;
            pointer-events: none;
        ">
            <img
                alt="Player avatar"
                style="
                   width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transform: scale(1.10);
                    border-radius: 50%;
                    display: block;
                "
            >
        </div>
    `);

    this.playerAvatarElement
        .setOrigin(0.5)
        .setDepth(13);

    this.playerAvatarElement.setVisible(false);

    // PLAYER DISPLAY NAME

    this.playerNameText = this.add.text(
        x + plateWidth * 0.12,
        y,
        initialName,
        {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#164b9c',
            strokeThickness: 3,
            align: 'center'
        }
    );

    this.playerNameText
        .setOrigin(0.5)
        .setDepth(11);

    this.playerNameText.setScale(
        Math.min(
            1,
            (plateWidth * 0.53) /
                Math.max(this.playerNameText.width, 1)
        )
    );
}


    // POINTS COUNTER


    // PLAYER TOTAL POINTS COUNTER

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

        // Keep a reference so the text can update
        // when the backend sends the player's score.
        this.totalPointsText = this.add.text(
            x + counterWidth * 0.13,
            y,
            '...',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#164b9c',
                strokeThickness: 3
            }
        );

        this.totalPointsText
            .setOrigin(0.5)
            .setDepth(11);
    }

    // LOAD TOTAL SCORE FROM BACKEND

async loadPlayerProfile() {

    try {

        const profile = await fetchPlayerProfile();

        // Ignore responses after leaving the scene.
        if (!this.sys.isActive()) {
            return;
        }

        // GET EDITABLE DISPLAY NAME

        const displayName =
            typeof profile.displayName === 'string' &&
            profile.displayName.trim().length > 0
                ? profile.displayName.trim()
                : profile.username || 'Player';

        this.playerNameText.setText(displayName);

        this.playerNameText.setScale(
            Math.min(
                1,
                153 / Math.max(this.playerNameText.width, 1)
            )
        );

        // Keep the latest display name in the registry.
        // Do not overwrite authenticatedPlayer because
        // other parts of the game may use the login username.
        this.registry.set(
            'playerDisplayName',
            displayName
        );

        // UPDATE DEFAULT AVATAR INITIAL

        this.playerAvatarInitial.setText(
            displayName.charAt(0).toUpperCase()
        );

        // LOAD UPLOADED PROFILE AVATAR

        const avatarImage =
            this.playerAvatarElement.node.querySelector('img');

        if (avatarImage) {

            avatarImage.addEventListener('load', () => {

                if (!this.sys.isActive()) {
                    return;
                }

                this.playerAvatarFallback.setVisible(false);
                this.playerAvatarInitial.setVisible(false);
                this.playerAvatarElement.setVisible(true);

            }, { once: true });

            avatarImage.addEventListener('error', () => {

                if (!this.sys.isActive()) {
                    return;
                }

                // Keep the default initial avatar visible.
                this.playerAvatarElement.setVisible(false);

            }, { once: true });

            avatarImage.src =
                `/api/profile/avatar?v=${Date.now()}`;
        }

        // GET OVERALL POINTS

        const totalPoints = Number(profile.overallScore);

        if (
            !Number.isFinite(totalPoints) ||
            totalPoints < 0
        ) {
            throw new Error('Invalid total score received.');
        }

        this.totalPointsText.setText(
            totalPoints.toLocaleString('en-US')
        );

        console.log('Player profile loaded:', {
            displayName,
            totalPoints
        });

    } catch (error) {

        console.error(
            'Unable to load player profile:',
            error
        );

        if (
            this.sys.isActive() &&
            this.totalPointsText?.active
        ) {
            this.totalPointsText.setText('--');
        }
    }
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

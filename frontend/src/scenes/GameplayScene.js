import Phaser from 'phaser';
import ImageButton from '../components/ImageButton.js';
import AudioManager from '../components/AudioManager.js';
import { fetchPlayerProgress } from '../services/playerProgressApi.js';
import {startBananaPuzzle,submitBananaPuzzleAnswer} from '../services/bananaPuzzleApi.js';
import { saveCompletedLevelScore } from '../services/playerScoreApi.js';

export default class GameplayScene extends Phaser.Scene {


    preload() {
        // Game Over assets
        if (!this.textures.exists('gameOverPanel')) {
            this.load.image(
                'gameOverPanel',
                '/assets/gameplay/ui/game-over-panel.png'
            );
        }

        if (!this.textures.exists('pandaExhausted')) {
            this.load.image(
                'pandaExhausted',
                '/assets/gameplay/player/panda-exhausted.png'
            );
        }

        // Report loading errors
        this.load.once('loaderror', (file) => {
            console.error(
                'Gameplay asset failed to load:',
                file.key,
                file.src
            );
        });


        const puzzleAssets = {
            bananaPuzzlePanel: '/assets/gameplay/puzzles/puzzle-panel.png',
            bananaCorrectPopup: '/assets/gameplay/puzzles/correct-answer.png',
            bananaWrongPopup: '/assets/gameplay/puzzles/wrong-answer.png',
            bananaContinueButton: '/assets/gameplay/puzzles/continue-rescue.png'
        };

        Object.entries(puzzleAssets).forEach(([key, path]) => {
            if (!this.textures.exists(key)) {
            this.load.image(key, path);
            }
        });


    }


    constructor() {
        super('GameplayScene');
    }


    init(data) {
        this.mainLevelId = data?.mainLevelId ?? 1;
        this.sublevelId = data?.sublevelId ?? 1;

        // Gameplay state
        this.gameplayStarted = false;
        this.isGamePaused = false;
        this.floatOffset = 0;

        // Pause menu state
        this.pauseOverlay = null;
        this.musicWasPlayingBeforePause = false;

        // Energy state
        this.energyElapsedMs = 0;
        this.activePlayMs = 0;
        this.isPuzzleOpen = false;
        // Prevent duplicate score submissions.
        this.scoreSaveRequested = false;

        // Animal rescue state
        this.rescueAnimals = [];
        this.rescuedCount = 0;
        this.requiredRescues = 1;
        this.carriedAnimalFaces = [];

        // Safe Island landing state
        this.isLandingSequencePlaying = false;
        this.levelCompleted = false;
        this.hasReachedLandingZone = false;

        // Reset scene-specific popup references
        this.successPopup = null;
        // Game Over state
        this.isGameOver = false;
        this.gameOverPopup = null;
        this.deliveredMonkey = null;
        this.safeIsland = null;
        this.safeIslandSign = null;

        // Collision state
        this.gameplayIslands = [];
        this.blockingIslands = [];
        this.movingIslands = [];
        this.birdObstacles = [];
        // Windy Heights obstacle state
        this.windGustObstacles = [];

        this.hitFeedbackUntil = 0;

        // energy loss from one obstacle hit
        this.lastEnergyHitTime = -Infinity;
        this.energyHitCooldown = 1500;


        // Reset HUD references on every scene start.
        this.energyHUD = null;
        this.energyFill = null;
        this.energyTrack = null;
        this.energyText = null;

        this.animalRescueHUD = null;
        this.rescueCounterText = null;

        this.scoreHUD = null;
        this.scoreText = null;

    }



    create() {
        const { width, height } = this.scale;

        // Ensure timers are running after scene restart.
        this.time.paused = false;

        // Ensure tweens are running after scene restart.
        this.tweens.resumeAll();

        this.isGamePaused = false;

            console.log('Gameplay scene initialized successfully');

        // Side-scrolling world

        const isSunnySkiesLevel2 =
            Number(this.mainLevelId) === 1 && Number(this.sublevelId) === 2;

        const currentSublevel = Number(this.sublevelId);

        const isStormRescue = Number(this.mainLevelId) === 3;

        const isRainbowValley = Number(this.mainLevelId) === 4;

        this.worldWidth = width * (
            isRainbowValley
                ? (
                    currentSublevel === 3 ? 8.5 :
                    currentSublevel === 2 ? 7.0 : 5.5
                )
                : isStormRescue
                    ? (
                        currentSublevel === 3 ? 9.0 :
                        currentSublevel === 2 ? 7.0 : 5.5
                    )
                    : (
                        currentSublevel === 3 ? 6.0 :
                        currentSublevel === 2 ? 4.8 : 4
                    )
        );

       this.worldHeight = height;

        this.cameras.main.setBackgroundColor('#87CEEB');

        this.cameras.main.setBounds(
            0,
            0,
            this.worldWidth,
            this.worldHeight
        );


        // CREATE GAMEPLAY WORLD

        this.createGameplayIslands();



        const currentMainLevel = Number(this.mainLevelId);




        // RAINBOW VALLEY 3/3

        if (
            currentMainLevel === 4 &&
            currentSublevel === 3
        ) {
            this.requiredRescues = 4;
            this.createMultiRescueAnimals();

        } else if

        // RAINBOW VALLEY 1/3 AND 2/3

        (
            currentMainLevel === 4 &&
            [1, 2].includes(currentSublevel)
        ) {

            this.requiredRescues = 3;
            this.createMultiRescueAnimals();


        // STORM RESCUE

        } else if (currentMainLevel === 3) {

            this.requiredRescues =
                currentSublevel === 3 ? 4 :
                currentSublevel === 2 ? 3 : 2;

            this.createMultiRescueAnimals();

        // WINDY HEIGHTS 1/3

        } else if (
            currentMainLevel === 2 &&
            currentSublevel === 1
        ) {

            this.requiredRescues = 1;
            this.createWindyGiraffe();

        // WINDY HEIGHTS 2/3 AND 3/3
        } else if (
            currentMainLevel === 2 &&
            [2, 3].includes(currentSublevel)
        ) {

            this.requiredRescues = currentSublevel;
            this.createMultiRescueAnimals();

        // SUNNY SKIES 2/3 AND 3/3

        } else if (
            currentMainLevel === 1 &&
            [2, 3].includes(currentSublevel)
        ) {

            this.requiredRescues = currentSublevel;
            this.createMultiRescueAnimals();

        // SUNNY SKIES 1/3
        } else if (
            currentMainLevel === 1 &&
            currentSublevel === 1
        ) {

            this.requiredRescues = 1;
            this.createRescueMonkey();
        }



        // Create each system only ONCE.
        this.createRescueHUD();
        this.createBirdObstacles();
        this.createStormBatObstacles();
        this.createStormCloudObstacles();
        this.createWindGustObstacles();
        this.createRainbowObstacles();
        this.createGoldenBanana();

        // GAMEPLAY BACKGROUND BASED ON MAIN LEVEL

        const currentRegion = Number(this.mainLevelId);

        const backgroundKey =
            currentRegion === 4
                ? 'rainbowValleySeamlessV1'
                : currentRegion === 3
                    ? 'stormGameplayBackground'
                    : currentRegion === 2
                        ? 'windyGameplayBackground'
                        : 'sunnyGameplayBackground';


        const backgroundTexture =
            this.textures.get(backgroundKey);

        const sourceImage =
            backgroundTexture.getSourceImage();

        const backgroundScale = Math.max(
            width / sourceImage.width,
            height / sourceImage.height
        );

        this.skyBackground = this.add.tileSprite(
            0,
            0,
            width,
            height,
            backgroundKey
        );

        this.skyBackground.setOrigin(0, 0);

        this.skyBackground.setTileScale(
            backgroundScale,
            backgroundScale
        );

        this.skyBackground.setScrollFactor(0);
        this.backgroundParallaxFactor = 0.35;
        this.skyBackground.setDepth(-100);

        //Gameplay music

        AudioManager.startMusic(
            this,
            'gameplayMusic'
        );

        // Level Banner

        const levelBanners = {
            1: 'sublevelSunnyBanner',
            2: 'sublevelWindyBanner',
            3: 'sublevelStormBanner',
            4: 'sublevelRainbowBanner'
        };

        const levelNames = {
            1: 'Sunny Skies',
            2: 'Windy Heights',
            3: 'Storm Rescue',
            4: 'Rainbow Valley'
        };

        const banner = this.add.image(
            width / 2,
            height * 0.095,
            levelBanners[this.mainLevelId] ||
                'sublevelSunnyBanner'
        );

        banner.setScale(Math.min(
            (width * 0.23) / banner.width,
            (height * 0.17) / banner.height
        ));

        banner.setScrollFactor(0);
        banner.setDepth(100);

        const sublevelText = this.add.text(
            width / 2,
            banner.y + banner.displayHeight * 0.36,
            `${this.sublevelId}/3`,
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${Math.round(height * 0.028)}px`,
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#784015',
                strokeThickness: 4
            }
        );

        sublevelText.setOrigin(0.5);
        sublevelText.setScrollFactor(0);
        sublevelText.setDepth(110);

        // Panda player

        const pandaStartX = width * 0.16;
        const pandaStartY = height * 0.53;

        this.panda = this.add.image(
            pandaStartX,
            pandaStartY,
            'pandaIdle'
        );

        const pandaScale = Math.min(
            (width * 0.12) / this.panda.width,
            (height * 0.43) / this.panda.height
        );

        this.pandaWidth =
            this.panda.width * pandaScale;

        this.pandaHeight =
            this.panda.height * pandaScale;

        this.panda.setDisplaySize(
            this.pandaWidth,
            this.pandaHeight
        );

        this.panda.setDepth(20);
        this.pandaSpeed = 280;

        this.pandaPosition = {
            x: pandaStartX,
            y: pandaStartY
        };

        this.cursors =
            this.input.keyboard.createCursorKeys();

        // E key for manual animal rescue
        this.rescueKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.E
        );

        //Camera follow effect

        this.cameras.main.startFollow(
            this.panda,
            false,
            0.08,
            0
        );

        this.cameras.main.setFollowOffset(
            -width * 0.35,
            0
        );

        // floating panda animation

        this.floatTween = this.tweens.add({
            targets: this,
            floatOffset: -8,
            duration: 1100,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // music btn and sound btn

        const audioButtonSize = Math.min(
            65,
            width * 0.055
        );

        const buttonX = width - 65;

        const musicButton = new ImageButton(
            this,
            buttonX,
            height * 0.79,
            'musicButton',
            audioButtonSize,
            () => {
                if (this.isGamePaused) return;

                AudioManager.toggleMusic(this);
                updateAudioIcons();
            }
        );

        const volumeButton = new ImageButton(
            this,
            buttonX,
            height * 0.89,
            'volumeButton',
            audioButtonSize,
            () => {
                if (this.isGamePaused) return;

                AudioManager.toggleSound(this);
                updateAudioIcons();
            }
        );

        musicButton.button.setScrollFactor(0);
        volumeButton.button.setScrollFactor(0);

        musicButton.button.setDepth(120);
        volumeButton.button.setDepth(120);

        // Auido mute line

        const musicMuteLine = this.add.graphics();
        const soundMuteLine = this.add.graphics();

        musicMuteLine.setScrollFactor(0);
        soundMuteLine.setScrollFactor(0);

        const drawMuteLine = (graphics, imageButton) => {
            const image = imageButton.button;
            const half = image.displayWidth * 0.36;

            graphics.clear();
            graphics.lineStyle(5, 0xff3030, 1);
            graphics.beginPath();

            graphics.moveTo(
                image.x - half,
                image.y + half
            );

            graphics.lineTo(
                image.x + half,
                image.y - half
            );

            graphics.strokePath();
            graphics.setDepth(130);
        };

        const updateAudioIcons = () => {
            drawMuteLine(musicMuteLine, musicButton);
            drawMuteLine(soundMuteLine, volumeButton);

            musicMuteLine.setVisible(
                !AudioManager.musicEnabled
            );

            soundMuteLine.setVisible(
                !AudioManager.soundEnabled
            );
        };

        updateAudioIcons();

        //Pause btn

        const pauseButton = new ImageButton(
            this,
            width - 65,
            height * 0.085,
            'gameplayPauseButton',
            audioButtonSize * 1.05,
            () => this.openPauseMenu()
        );

        pauseButton.button.setScrollFactor(0);
        pauseButton.button.setDepth(120);

        //Start Countdown

        this.startCountdown();

        this.createEnergyHUD();

        this.createScoreHUD();

        console.log('Gameplay scene started:', {
            mainLevelId: this.mainLevelId,
            mainLevelName: levelNames[this.mainLevelId],
            sublevelId: this.sublevelId,
            worldWidth: this.worldWidth
        });
    }




    createGoldenBanana() {


        if (
            (
                Number(this.mainLevelId) === 3 &&
                Number(this.sublevelId) === 3
            ) ||

            (
                Number(this.mainLevelId) === 4 &&
                [1, 2,3].includes(Number(this.sublevelId))
            )

        ) {
            this.createStormLevel3GoldenBananas();
            return;
        }

        const mainLevel = Number(this.mainLevelId);
        const sublevel = Number(this.sublevelId);



        // ENABLE FOR SUNNY SKIES AND WINDY HEIGHTS 1/3

        const isSunnySkies =
            mainLevel === 1 &&
            [1, 2, 3].includes(sublevel);

        // WINDY HEIGHTS 1/3 AND 2/3

        const isWindyLevel1 =
            mainLevel === 2 &&
            sublevel === 1;

        const isWindyLevel2 =
            mainLevel === 2 &&
            sublevel === 2;


        const isWindyLevel3 =
            mainLevel === 2 &&
            sublevel === 3;

        // STORM RESCUE 1/3


        const isStormLevel1 =
            mainLevel === 3 &&
            sublevel === 1;


        const isStormLevel2 =
            mainLevel === 3 &&
            sublevel === 2;



        // GOLDEN BANANA LEVEL AVAILABILITY

        if (
            !isSunnySkies &&
            !isWindyLevel1 &&
            !isWindyLevel2 &&
            !isWindyLevel3 &&
            !isStormLevel1 &&
            !isStormLevel2

        ) {
            return;
        }


        // GOLDEN BANANA POSITION BY REGION

        const { width, height } = this.scale;


        // ==========================================
        // GOLDEN BANANA POSITION BY LEVEL
        // ==========================================

             const bananaX = isStormLevel2
                    ? width * 4.10
                    : isStormLevel1
                        ? width * 2.65
                        : isWindyLevel3
                            ? width * 3.40
                            : isWindyLevel2
                                ? width * 2.55
                                : isWindyLevel1
                                    ? width * 2.15
                                    : width * (
                                        sublevel === 3 ? 3.45 :
                                        sublevel === 2 ? 2.20 : 1.83
                                    );

            const bananaY = isStormLevel2
            ? height * 0.57
            : isStormLevel1
                ? height * 0.58
                : isWindyLevel3
                    ? height * 0.57
                    : isWindyLevel2
                        ? height * 0.53
                        : isWindyLevel1
                            ? height * 0.60
                            : height * (
                                sublevel === 3 ? 0.57 :
                                sublevel === 2 ? 0.62 : 0.63
                            );




        // container to hold banana + glow dots
        this.goldenBananaContainer = this.add.container(bananaX, bananaY);

        // Banana image
        this.goldenBanana = this.add.image(0, 0, 'goldenBanana');

        const bananaWidth = width * 0.10;
        this.goldenBanana.setScale(bananaWidth / this.goldenBanana.width);

        this.goldenBananaContainer.add(this.goldenBanana);

        // Put above islands
        this.goldenBananaContainer.setDepth(25);

        // Floating animation
        this.tweens.add({
            targets: this.goldenBananaContainer,
            y: bananaY - 12,
            duration: 1100,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this.goldenBananaCollected = false;
        // Glowing circles around banana
        this.bananaGlowDots = [];


        const dotOffsets = [];

        //  dotted trail
        const maxDistance = width * 0.24;
        const startDistance = width * 0.07;
        const dotsPerSide = 11;

        for (const side of [-1, 1]) {

            for (let i = 0; i < dotsPerSide; i++) {

                const distance =
                    startDistance +
                    (i / (dotsPerSide - 1)) *
                    (maxDistance - startDistance);

                const curveProgress = distance / maxDistance;


                const curveY =
                    height * (
                        -0.035 + 0.13 * curveProgress * curveProgress
                    );

                dotOffsets.push({
                    x: side * distance, y: curveY
                });
            }
        }


            dotOffsets.forEach((pos, index) => {
                const dot = this.add.circle(pos.x, pos.y, 5, 0xffe066, 0.9);
                dot.setStrokeStyle(2, 0xfff7b3, 1);
                dot.setBlendMode(Phaser.BlendModes.ADD);

                this.goldenBananaContainer.add(dot);
                this.bananaGlowDots.push(dot);

             // Soft pulsing animation
                this.tweens.add({
                    targets: dot,
                    alpha: 0.25,
                    scale: 1.5,
                    duration: 500 + (index * 60),
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            });

            console.log('Golden Banana with glow dots created!');
        }


    // STORM RESCUE 3/3: TWO GOLDEN BANANAS

    createStormLevel3GoldenBananas() {

        const { width, height } = this.scale;

        this.stormLevel3Bananas = [];


        const mainLevel = Number(this.mainLevelId);
        const sublevel = Number(this.sublevelId);

        const isRainbowLevel1 =
            mainLevel === 4 && sublevel === 1;

        const isRainbowLevel2 =
            mainLevel === 4 && sublevel === 2;


        const isRainbowLevel3 =
            mainLevel === 4 && sublevel === 3;


                const positions = isRainbowLevel3
            ? [
                {
                    id: 'rainbow-3-banana-1',
                    x: width * 2.65,
                    y: height * 0.53
                },
                {
                    id: 'rainbow-3-banana-2',
                    x: width * 5.85,
                    y: height * 0.57
                }
            ]
            : isRainbowLevel2
            ? [
                {
                    id: 'rainbow-2-banana-1',
                    x: width * 2.45,
                    y: height * 0.52
                },
                {
                    id: 'rainbow-2-banana-2',
                    x: width * 4.90,
                    y: height * 0.58
                }
            ]
            : isRainbowLevel1
                ? [
                    {
                        id: 'rainbow-banana-1',
                        x: width * 2.35,
                        y: height * 0.52
                    },
                    {
                        id: 'rainbow-banana-2',
                        x: width * 4.10,
                        y: height * 0.60
                    }
                ]
                : [
                    {
                        id: 'storm-banana-1',
                        x: width * 3.90,
                        y: height * 0.54
                    },
                    {
                        id: 'storm-banana-2',
                        x: width * 7.45,
                        y: height * 0.56
                    }
                ];



        if (!this.textures.exists('goldenBanana')) {
            console.error('Golden Banana texture missing.');
            return;
        }

        for (const config of positions) {

            const bananaContainer =
                this.add.container(config.x, config.y);

            const banana = this.add.image(
                0,
                0,
                'goldenBanana'
            );

            banana.setScale(
                (width * 0.10) / banana.width
            );

            bananaContainer.add(banana);
            bananaContainer.setDepth(25);

            // Glowing dotted trail
            const maxDistance = width * 0.24;
            const startDistance = width * 0.07;
            const dotsPerSide = 11;

            for (const side of [-1, 1]) {

                for (let i = 0; i < dotsPerSide; i++) {

                    const distance =
                        startDistance +
                        (i / (dotsPerSide - 1)) *
                        (maxDistance - startDistance);

                    const progress =
                        distance / maxDistance;

                    const curveY = height * (
                        -0.035 +
                        0.13 * progress * progress
                    );

                    const dot = this.add.circle(
                        side * distance,
                        curveY,
                        5,
                        0xffe066,
                        0.9
                    );

                    dot.setStrokeStyle(
                        2,
                        0xfff7b3,
                        1
                    );

                    dot.setBlendMode(
                        Phaser.BlendModes.ADD
                    );

                    bananaContainer.add(dot);

                    this.tweens.add({
                        targets: dot,
                        alpha: 0.25,
                        scale: 1.5,
                        duration: 500 + i * 60,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            }

            this.tweens.add({
                targets: bananaContainer,
                y: config.y - 12,
                duration: 1100,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this.stormLevel3Bananas.push({
                id: config.id,
                container: bananaContainer,
                image: banana,
                collected: false
            });
        }

        console.log(
            'Storm Rescue 3/3 Golden Bananas created:',
            this.stormLevel3Bananas.length
        );
    }

    checkGoldenBananaCollection() {


        if (
            (
                Number(this.mainLevelId) === 3 &&
                Number(this.sublevelId) === 3
            ) ||

            (
                Number(this.mainLevelId) === 4 &&
                [1, 2,3].includes(Number(this.sublevelId))
            )

        ) {
            this.checkStormLevel3Bananas();
            return;
        }


        // Only check during active gameplay.
        if (
            !this.gameplayStarted ||
            this.isGamePaused ||
            this.isPuzzleOpen ||
            this.isGameOver ||
            this.levelCompleted ||
            this.isLandingSequencePlaying ||
            this.goldenBananaCollected ||
            !this.goldenBananaContainer
        ) {
        return;
        }

        // Use the existing panda collision box.
        const pandaBox = this.getPandaCollisionBox(
        this.pandaPosition.x,
        this.pandaPosition.y + this.floatOffset
        );

        // Banana position in the gameplay world.
        const bananaX = this.goldenBananaContainer.x;
        const bananaY = this.goldenBananaContainer.y;

        // Smaller collision box for the visible banana.
        const bananaWidth = this.goldenBanana.displayWidth * 0.6;
        const bananaHeight = this.goldenBanana.displayHeight * 0.6;

        const bananaBox = new Phaser.Geom.Rectangle(
            bananaX - bananaWidth / 2,
            bananaY - bananaHeight / 2,
            bananaWidth,
            bananaHeight
        );

        // Check whether the panda touches the banana.
        if (
            Phaser.Geom.Intersects.RectangleToRectangle(
                pandaBox,
                bananaBox
            )
        ) {

        this.goldenBananaCollected = true;

        // Hide banana and glowing trail.
        this.goldenBananaContainer.setVisible(false);

        console.log(
            'Golden Banana collected successfully!'
        );

        this.openGoldenBananaPuzzle();
    }
}


    // CHECK STORM RESCUE 3/3 GOLDEN BANANAS

    checkStormLevel3Bananas() {

        if (
            !this.gameplayStarted ||
            this.isGamePaused ||
            this.isPuzzleOpen ||
            this.isGameOver ||
            this.levelCompleted ||
            this.isLandingSequencePlaying ||
            !this.stormLevel3Bananas
        ) {
            return;
        }

        const pandaBox =
            this.getPandaCollisionBox(
                this.pandaPosition.x,
                this.pandaPosition.y + this.floatOffset
            );

        for (const item of this.stormLevel3Bananas) {

            if (item.collected) {
                continue;
            }

            const bananaWidth =
                item.image.displayWidth * 0.6;

            const bananaHeight =
                item.image.displayHeight * 0.6;

            const bananaBox =
                new Phaser.Geom.Rectangle(
                    item.container.x - bananaWidth / 2,
                    item.container.y - bananaHeight / 2,
                    bananaWidth,
                    bananaHeight
                );

            if (
                Phaser.Geom.Intersects.RectangleToRectangle(
                    pandaBox,
                    bananaBox
                )
            ) {

                // Mark only this banana as collected.
                item.collected = true;

                // Hide this banana and its glow trail.
                item.container.setVisible(false);

                console.log(
                    'Storm Rescue Golden Banana collected:',
                    item.id
                );

                // Reuse existing Banana API puzzle.
                this.openGoldenBananaPuzzle();

                // One puzzle per collection event.
                break;
            }
        }
    }


    openGoldenBananaPuzzle() {

        if (
            this.isPuzzleOpen || this.isGameOver || this.levelCompleted
        ) {
            return;
        }

        this.isPuzzleOpen = true;

        // Freeze timers and animations
        this.time.paused = true;
        this.tweens.pauseAll();


        const { width, height } = this.scale;

        // CENTER BANANA PUZZLE ON THE SCREEN


        const popup = this.add.container(0, 0);

        // Keep popup fixed in the visible screen.
        popup.setScrollFactor(0);

        // Display above gameplay objects.
        popup.setDepth(4000);

        this.bananaPuzzlePopup = popup;


        // Dark overlay
        const shade = this.add.rectangle(
            width / 2,
            height / 2,
            width + 400,
            height + 200,
            0x102c57,
            0.60
        );

        shade.setInteractive();
        popup.add(shade);

        // Custom Banana Energy Low panel.
        const panel = this.add.image(
            width / 2,
            height * 0.50,
            'bananaPuzzlePanel'
        );

        panel.setScale(Math.min(
            (width * 0.65) / panel.width,
            (height * 0.80) / panel.height
        ));

        popup.add(panel);

        const placeholder = this.add.text(
            width / 2,
         height * 0.54,
            'Loading Banana API puzzle...',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${Math.round(height * 0.025)}px`,
                fontStyle: 'bold',
                color: '#164b9c',
                align: 'center'
            }
        ).setOrigin(0.5);

        popup.add(placeholder);

        // Puzzle answer input

        const answerInput = this.add.dom(
            width * 0.45,
            height * 0.79,
            'input',
            {
                width: `${Math.round(width * 0.15)}px`,
                height: '42px',
                fontSize: '18px',
                fontFamily: 'Arial, sans-serif',
                textAlign: 'center',
                border: '2px solid #68b6ef',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                color: '#164b9c',
                outline: 'none',
                pointerEvents: 'auto'
            }
        );

        answerInput.node.type = 'number';
        answerInput.node.step = '1';
        answerInput.node.placeholder = 'Enter your answer';
        answerInput.node.autocomplete = 'off';

        // DOM input remains fixed on the screen
        answerInput.setScrollFactor(0);
        answerInput.setDepth(4100);

       // SUBMIT btn

        const submitButton = this.add.text(
            width * 0.58,
            height * 0.79,
            'Submit',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${Math.round(height * 0.026)}px`,
                fontStyle: 'bold',
                color: '#ffffff',
                backgroundColor: '#e99b00',
                border: '2px solid #ce7800',
                borderRadius: '10px',
                padding: {
                    x: 18,
                    y: 11
                }
            }
        ).setOrigin(0.5);


        // Keep the Submit button's input position
        // aligned with the fixed popup.

        submitButton.setScrollFactor(0);

        submitButton.setInteractive({
            useHandCursor: true
        });

        popup.add(submitButton);



        // BANANA API FAILURE RECOVERY

        let recoveryVisible = false;

        const showPuzzleRecovery = (message) => {

            if (
                recoveryVisible ||
                !this.sys.isActive() ||
                !this.isPuzzleOpen ||
                this.bananaPuzzlePopup !== popup
            ) {
                return;
            }

            recoveryVisible = true;

            // Show an understandable error message.
            placeholder.setVisible(true);
            placeholder.setText(message);
            placeholder.setWordWrapWidth(width * 0.42);
            placeholder.setAlign('center');

            // Hide controls that cannot be used.
            answerInput.setVisible(false);
            submitButton.setVisible(false);
            submitButton.disableInteractive();

            // Allow the player to continue without a reward.
            const recoveryButton = this.add.text(
                width / 2,
                height * 0.79,
                'Continue Rescue (No Bonus)',
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: `${Math.round(height * 0.024)}px`,
                    fontStyle: 'bold',
                    color: '#ffffff',
                    backgroundColor: '#e99b00',
                    padding: { x: 18, y: 12 }
                }
            ).setOrigin(0.5);

            recoveryButton.setScrollFactor(0);

            recoveryButton.setInteractive({
                useHandCursor: true
            });

            popup.add(recoveryButton);

            recoveryButton.once('pointerdown', () => {

                // Remove the HTML input and popup.
                answerInput.destroy();
                popup.destroy(true);

                this.bananaPuzzlePopup = null;
                this.activeBananaPuzzle = null;

                // Resume gameplay without awarding energy.
                this.isPuzzleOpen = false;
                this.time.paused = false;
                this.tweens.resumeAll();

                console.log(
                    'Puzzle unavailable. Rescue resumed without bonus.'
                );
            });
        };



        // submit the answer to spring boot

        let isSubmittingAnswer = false;
        let answerAlreadySubmitted = false;

        submitButton.on('pointerdown', async () => {

            console.log('SUBMIT BUTTON CLICK DETECTED!');

            // Prevent duplicate submissions
            if (
                isSubmittingAnswer ||answerAlreadySubmitted || !this.isPuzzleOpen || !this.activeBananaPuzzle
            ) {
                return;
            }

        const value = answerInput.node.value.trim();

            // Validate the player's input
            if (
                !/^-?\d+$/.test(value) ||
                !Number.isSafeInteger(Number(value))
            ) {
                console.log('Please enter a valid whole number.');
                return;
            }

        const answer = Number(value);

        isSubmittingAnswer = true;

        submitButton.setText('Checking...');
        submitButton.disableInteractive();

        try {

            // Send answer to the Spring Boot backend.
            const result = await submitBananaPuzzleAnswer(
                this.activeBananaPuzzle.puzzleId,
                answer
            );

            // Ignore response if popup was closed.
            if (
                !this.sys.isActive() || !this.isPuzzleOpen || this.bananaPuzzlePopup !== popup
            ) {
                return;
            }

            answerAlreadySubmitted = true;

            // Save result for the result popup.
            this.bananaPuzzleResult = result;


        // DISPLAY FINAL BANANA PUZZLE RESULT

        // Remove the HTML answer input completely.
        answerInput.destroy();

        // Hide the original puzzle panel, image,
        // placeholder and Submit button.
        // Keep the dark background visible.
        popup.list.forEach((child) => {

            if (child !== shade) {

                child.setVisible(false);

                if (child.input) {
                    child.disableInteractive();
                }
            }
        });

        // Select the appropriate result artwork
        const resultTexture = result.correct
            ? 'bananaCorrectPopup'
            : 'bananaWrongPopup';

        // RESULT IMAGE

        const resultImage = this.add.image(
            width / 2,
            height * 0.44,
            resultTexture
        );

        // Preserve original image proportions.
        const resultScale = Math.min(
            (width * 0.43) / resultImage.width,
            (height * 0.66) / resultImage.height
        );

        resultImage.setScale(resultScale);

        popup.add(resultImage);

        // Continue Rescue btn

        const continueButton = this.add.image(
            width / 2,
            height * 0.73,
            'bananaContinueButton'
        );

        const continueScale = Math.min(
            (width * 0.32) / continueButton.width,
            (height * 0.115) / continueButton.height
        );

        continueButton.setScale(continueScale);
        continueButton.setScrollFactor(0);

        continueButton.setInteractive({
            useHandCursor: true
        });

        popup.add(continueButton);

        // Continue rescue click event

        continueButton.once('pointerdown', () => {

            AudioManager.playButtonClick(this);

            // Remove result popup and all its objects
            popup.destroy(true);

            this.bananaPuzzlePopup = null;
            this.activeBananaPuzzle = null;

            // Resume normal gameplay
            this.isPuzzleOpen = false;
            this.time.paused = false;
            this.tweens.resumeAll();

            console.log(
                'Banana puzzle completed. Rescue resumed!'
            );
        });

        console.log(
            'Banana puzzle result displayed:',
            result.correct ? 'Correct' : 'Wrong'
        );


            if (result.correct) {

            // CORRECT ANSWER: RESTORE ENERGY

            // Add the reward received from Spring Boot

                this.bananaEnergy = Phaser.Math.Clamp(
                this.bananaEnergy + result.energyReward,
                    0,
                    100
                    );

                // Immediately update the energy HUD.
                this.updateEnergyHUD();

                console.log(
                    'Correct answer! Banana Energy updated:',
                    this.bananaEnergy
                );

                submitButton.setText('Correct!');

            } else {

            // WRONG ANSWER: NO ENERGY REWARD

                console.log(
                    'Wrong answer! No energy awarded.'
                );

                submitButton.setText('Wrong Answer');

            }




            } catch (error) {

                console.error(
                    'Banana puzzle submission failed:',
                    error
                );

                if (
                    this.sys.isActive() &&
                    this.isPuzzleOpen &&
                    this.bananaPuzzlePopup === popup
                ) {

                    // Hide the puzzle image so the recovery message remains clearly visible.
                    popup.list.forEach((child) => {

                        if (
                            child.texture?.key?.startsWith('bananaPuzzle-')
                        ) {
                            child.setVisible(false);
                        }

                    });

                    // Allow gameplay to continue safely.
                    showPuzzleRecovery(
                        'Unable to verify your answer.\nContinue rescue without a bonus.'
                    );

                }

            } finally {

                isSubmittingAnswer = false;

            }

        });


        // REQUEST BANANA API PUZZLE

        startBananaPuzzle()
            .then((puzzle) => {

                // Ignore responses if the scene or popup has already been closed.
                if (
                    !this.sys.isActive() || !this.isPuzzleOpen ||this.bananaPuzzlePopup !== popup
                ) {
                    return;
                }

                // Store the puzzle information.
                // The backend keeps the solution.
                this.activeBananaPuzzle = puzzle;


                placeholder.setText('Loading puzzle image...');

            const textureKey = `bananaPuzzle-${puzzle.puzzleId}`;

            const isPopupOpen = () =>
             this.sys.isActive() && this.isPuzzleOpen && this.bananaPuzzlePopup === popup;

            const completeEvent = `filecomplete-image-${textureKey}`;

            const onImageLoadError = (file) => {
                if (file.key !== textureKey) return;

                this.load.off(completeEvent, onImageLoaded);
                this.load.off('loaderror', onImageLoadError);


                if (isPopupOpen()) {

                    showPuzzleRecovery(
                        'Puzzle image could not be loaded.\nContinue rescue without a bonus.'
                    );

                }


                console.error('Banana puzzle image failed to load.');
            };

            const onImageLoaded = () => {
                this.load.off('loaderror', onImageLoadError);

                if (!isPopupOpen()) return;

                // Hide the placeholder message
                placeholder.setVisible(false);

            // Display the Banana API image.
            const puzzleImage = this.add.image(
                width / 2,
                height * 0.62,
                textureKey
            );

            // Fit the image inside the white puzzle area
            const maxWidth = panel.displayWidth * 0.78;
            const maxHeight = height * 0.24;

                puzzleImage.setScale(Math.min(
                    maxWidth / puzzleImage.width,
                    maxHeight / puzzleImage.height
                ));

                popup.add(puzzleImage);

                console.log('Real Banana API puzzle image displayed!');
            };

            // Listen for the dynamic image-loading result.
            this.load.once(completeEvent, onImageLoaded);
            this.load.on('loaderror', onImageLoadError);


            /*  - Load image through spring boot
                - Used  authenticated backend endpoint instead of the external sanfoh.com URL*/

            const imageEndpoint =
                `/api/banana-puzzles/${encodeURIComponent(puzzle.puzzleId)}/image`;

            this.load.image(textureKey, imageEndpoint);
            this.load.start();



                console.log(
                    'Banana API puzzle loaded:',
                    {
                        puzzleId: puzzle.puzzleId,
                        imageUrl: puzzle.imageUrl
                    }
                );

            })
            .catch((error) => {

                console.error(
                    'Failed to load Banana API puzzle:',
                    error
                );

                if (
                    this.sys.isActive() && this.isPuzzleOpen && this.bananaPuzzlePopup === popup
                ) {
                    showPuzzleRecovery(
                        'Banana API is unavailable.\nContinue rescue without a bonus.'
                    );
                }
            });


                console.log('Golden Banana puzzle opened!');
        }

         // CREATE GAMEPLAY ISLANDS



    createGameplayIslands() {

        const { width, height } = this.scale;

        const mainLevel = Number(this.mainLevelId);
        const sublevel = Number(this.sublevelId);


        // RAINBOW VALLEY 1/3

        if (
            mainLevel === 4 &&
            sublevel === 1
        ) {
            this.createRainbowValleyLevel1Islands();
            return;
        }

        // RAINBOW VALLEY 2/3

        if (
            mainLevel === 4 &&
            sublevel === 2
        ) {
            this.createRainbowValleyLevel2Islands();
            return;
        }

        // RAINBOW VALLEY 3/3

        if (
            mainLevel === 4 &&
            sublevel === 3
        ) {
            this.createRainbowValleyLevel3Islands();
            return;
        }

        // Windy Heights 1/3
        if (mainLevel === 2 && sublevel === 1) {
            this.createWindyHeightsLevel1Islands();
            return;
        }

        // Windy Heights 2/3
        if (mainLevel === 2 && sublevel === 2) {
            this.createWindyHeightsLevel2Islands();
            return;
        }

        // Windy Heights 3/3
        if (mainLevel === 2 && sublevel === 3) {
            this.createWindyHeightsLevel3Islands();
            return;
        }

        // Storm Rescue 1/3
        if (mainLevel === 3 && sublevel === 1) {
            this.createStormRescueLevel1Islands();
            return;
        }

        // Storm Rescue 2/3
        if (mainLevel === 3 && sublevel === 2) {
            this.createStormRescueLevel2Islands();
            return;
        }

        // STORM RESCUE 3/3

        if (mainLevel === 3 && sublevel === 3) {
            this.createStormRescueLevel3Islands();
            return;
        }

        const isSunnySkies =
            mainLevel === 1 &&
            [1, 2, 3].includes(sublevel);

        const isWindyLevel1 =
            mainLevel === 2 &&
            sublevel === 1;

        if (!isSunnySkies && !isWindyLevel1) {
            return;
        }

        const isLevel2 = sublevel === 2;
        const isLevel3 = sublevel === 3;

        // SUNNY SKIES LEVEL 1

        const level1Layout = [
            {
                key: 'floatingIsland',
                x: width * 0.90,
                y: height * 0.76,
                size: 0.22,
                moving: true,
                speed: 75
            },
            {
                key: 'animalRescueIsland',
                x: width * 1.48,
                y: height * 0.75,
                size: 0.20,
                moving: false
            },
            {
                key: 'obstacleIsland1',
                x: width * 2.15,
                y: height * 0.30,
                size: 0.20,
                moving: false
            },
            {
                key: 'floatingIsland',
                x: width * 2.67,
                y: height * 0.75,
                size: 0.21,
             moving: true,
             speed: 95
            },
            {
                key: 'obstacleIsland2',
                x: width * 3.14,
                y: height * 0.30,
                size: 0.20,
                moving: false
            }
        ];

        // SUNNY SKIES LEVEL 2

        const level2Layout = [
            {
                key: 'floatingIsland',
                x: width * 0.85,
                y: height * 0.76,
                size: 0.20,
                moving: true,
                speed: 90
            },
            {
                key: 'animalRescueIsland',
                x: width * 1.35,
                y: height * 0.75,
                size: 0.21,
                moving: false,
                rescueAnimal: 'monkey'
            },
            {
                key: 'obstacleIsland1',
                x: width * 1.90,
                y: height * 0.30,
                size: 0.19,
                moving: false
            },
            {
                key: 'floatingIsland',
                x: width * 2.50,
                y: height * 0.76,
                size: 0.20,
                moving: true,
                speed: 105
            },
            {
                key: 'animalRescueIsland',
                x: width * 3.10,
                y: height * 0.74,
                size: 0.22,
                moving: false,
                rescueAnimal: 'elephant'
            },
            {
                key: 'obstacleIsland2',
                x: width * 3.55,
                y: height * 0.30,
                size: 0.19,
                moving: false
            },
            {
                key: 'floatingIsland',
                x: width * 3.95,
                y: height * 0.77,
                size: 0.20,
                moving: true,
                speed: 110
            }
        ];


        // SUNNY SKIES LEVEL 3

        const level3Layout = [
            {
                key: 'floatingIsland',
                x: width * 0.80,
                y: height * 0.76,
                size: 0.20,
                moving: true,
                speed: 95
            },
            {
                key: 'animalRescueIsland',
                x: width * 1.30,
                y: height * 0.75,
                size: 0.21,
                moving: false,
                rescueAnimal: 'monkey'
            },
            {
                key: 'obstacleIsland1',
                x: width * 1.80,
                y: height * 0.30,
                size: 0.19,
                moving: false
            },
            {
                key: 'floatingIsland',
                x: width * 2.25,
                y: height * 0.76,
                size: 0.20,
                moving: true,
                speed: 110
            },
            {
                key: 'animalRescueIsland',
                x: width * 2.75,
                y: height * 0.74,
                size: 0.22,
                moving: false,
                rescueAnimal: 'elephant'
            },
            {
                key: 'obstacleIsland2',
                x: width * 3.20,
                y: height * 0.30,
                size: 0.19,
                moving: false
            },
            {
                key: 'floatingIsland',
                x: width * 3.65,
                y: height * 0.77,
                size: 0.20,
                moving: true,
                speed: 120
            },
            {
                key: 'animalRescueIsland',
                x: width * 4.25,
                y: height * 0.75,
                size: 0.21,
                moving: false,
                rescueAnimal: 'bunny'
            },
            {
                key: 'obstacleIsland1',
                x: width * 4.70,
                y: height * 0.30,
                size: 0.19,
                moving: false
            },
            {
                key: 'floatingIsland',
                x: width * 4.95,
                y: height * 0.76,
                size: 0.20,
                moving: true,
                speed: 125
            }
        ];



        // Choose the island layout for each sublevel.
        const islandLayout = isLevel3
            ? level3Layout
            : isLevel2
                ? level2Layout
                : level1Layout;


        // RESET ISLAND COLLECTIONS

        this.gameplayIslands = [];
        this.blockingIslands = [];
        this.movingIslands = [];

        // Store rescue islands for the next step.
        this.rescueIslands = [];

        // CREATE FLOATING ISLANDS

        for (const islandData of islandLayout) {

            if (!this.textures.exists(islandData.key)) {

                console.warn(
                    'Missing island texture:',
                    islandData.key
                );

                continue;
            }

            const island = this.add.image(
                islandData.x,
                islandData.y,
                islandData.key
            );

            const targetWidth =
                width * islandData.size;

            island.setScale(
                targetWidth / island.width
            );

            island.setDepth(5);

            this.gameplayIslands.push(island);
            this.blockingIslands.push(island);

            // Record the island assigned to an animal.
            if (islandData.rescueAnimal) {

                this.rescueIslands.push({
                    animalType: islandData.rescueAnimal,
                    sprite: island
                });
            }

            // Register moving islands.
            if (islandData.moving) {

                this.movingIslands.push({
                    sprite: island,
                    speed: islandData.speed,
                    activated: false,
                    finished: false
                });
            }
        }



        // CREATE SAFE ISLAND


        // Safe Island artwork for each sublevel
        const safeIslandKey = isLevel3
            ? 'safeIsland_1_3'
            : isLevel2
                ? 'safeIsland_1_2'
                : 'safeIsland_1_1';



        if (this.textures.exists(safeIslandKey)) {
            this.safeIsland = this.add.image(
                this.worldWidth - width * (
                    isLevel3 ? 0.34 :
                    isLevel2 ? 0.30 : 0.25
                ),
                height * 0.53,
                safeIslandKey
            );



        const safeIslandWidth = width * (
            isLevel3 ? 0.62 :
            isLevel2 ? 0.56 : 0.45
        );
        this.safeIsland.setScale(
            safeIslandWidth / this.safeIsland.width
        );



        this.safeIsland.setDepth(5);

        this.gameplayIslands.push(
            this.safeIsland
        );

        // Safe Island is not a blocking obstacle.

        if (this.textures.exists('safeIslandSign')) {

            this.safeIslandSign = this.add.image(
                this.safeIsland.x - width * 0.32,
                height * 0.30,
                'safeIslandSign'
            );

            this.safeIslandSign.setScale(
                (width * 0.10) /
                this.safeIslandSign.width
            );

            this.safeIslandSign.setDepth(6);

            this.gameplayIslands.push(
                this.safeIslandSign
            );
        }
    }

    console.log(
        `Sunny Skies ${sublevel}/3 islands created:`,
        {
            totalIslands: this.gameplayIslands.length,
            movingIslands: this.movingIslands.length,
            rescueIslands: this.rescueIslands.length,
            worldWidth: this.worldWidth
        }
    );
}



    // ==========================================
    // RAINBOW VALLEY 1/3: COMPLETE ENVIRONMENT
    // ==========================================

    createRainbowValleyLevel1Islands() {

        const { width, height } = this.scale;

        // Reset island collections
        this.gameplayIslands = [];
        this.blockingIslands = [];
        this.movingIslands = [];
        this.rescueIslands = [];

        // ======================================
        // LEVEL 1 ISLAND LAYOUT
        // ======================================

        const layout = [

            // MOVING FLOATING ISLAND 1
            {
                key: 'floatingIsland',
                x: 0.80,
                y: 0.55,
                size: 0.21,
                moving: true,
                speed: 100
            },

            // RESCUE ISLAND: BABY DOG
            {
                key: 'animalRescueIsland',
                x: 1.30,
                y: 0.49,
                size: 0.25,
                rescueAnimal: 'dog'
            },

            // RAINBOW STATIONARY ISLAND 1
            {
                key: 'rainbowStationary1',
                x: 1.80,
                y: 0.28,
                size: 0.37
            },

            // MOVING FLOATING ISLAND 2
            {
                key: 'floatingIsland',
                x: 2.05,
                y: 0.76,
                size: 0.20,
                moving: true,
                speed: 95
            },

            // RAINBOW STATIONARY ISLAND 2
            {
                key: 'rainbowStationary2',
                x: 2.45,
                y: 0.35,
                size: 0.37
            },

            // RESCUE ISLAND: BABY ELEPHANT
            {
                key: 'animalRescueIsland',
                x: 2.90,
                y: 0.72,
                size: 0.25,
                rescueAnimal: 'elephant'
            },

            // MOVING FLOATING ISLAND 3
            {
                key: 'floatingIsland',
                x: 3.20,
                y: 0.77,
                size: 0.20,
                moving: true,
                speed: 105
            },

            // RAINBOW STATIONARY ISLAND 3
            {
                key: 'rainbowStationary3',
                x: 3.55,
                y: 0.30,
                size: 0.37
            },

            // RESCUE ISLAND: BABY GIRAFFE
            {
                key: 'animalRescueIsland',
                x: 4.00,
                y: 0.73,
                size: 0.25,
                rescueAnimal: 'giraffe'
            },

            // RAINBOW STATIONARY ISLAND 4
            {
                key: 'rainbowStationary4',
                x: 4.50,
                y: 0.70,
                size: 0.37
            },

            // MOVING FLOATING ISLAND 4
            {
                key: 'floatingIsland',
                x: 4.65,
                y: 0.76,
                size: 0.20,
                moving: true,
                speed: 115
            }
        ];

        // CREATE ISLAND SPRITES

        for (const config of layout) {

            if (!this.textures.exists(config.key)) {
                console.error(
                    'Rainbow island texture missing:',
                    config.key
                );
                continue;
            }

            const island = this.add.image(
                width * config.x,
                height * config.y,
                config.key
            );

            // Preserve original image proportions
            island.setScale(
                (width * config.size) /
                island.width
            );

            island.setDepth(5);

            this.gameplayIslands.push(island);

            // Island collision system
            this.blockingIslands.push(island);

            // Register animal rescue island
            if (config.rescueAnimal) {

                this.rescueIslands.push({
                    animalType: config.rescueAnimal,
                    sprite: island
                });
            }

            // Register moving floating island
            if (config.moving) {

                this.movingIslands.push({
                    sprite: island,
                    speed: config.speed,
                    activated: false,
                    finished: false
                });
            }
        }


        // RAINBOW VALLEY SAFE ISLAND 1/3

        const safeKey = 'safeIsland_4_1';

        if (!this.textures.exists(safeKey)) {
            console.error(
                'Rainbow Valley Safe Island missing:',
                safeKey
            );
            return;
        }

        this.safeIsland = this.add.image(
            this.worldWidth - width * 0.38,
            height * 0.53,
            safeKey
        );

        this.safeIsland.setScale(
            (width * 0.66) /
            this.safeIsland.width
        );

        this.safeIsland.setDepth(5);

        this.gameplayIslands.push(
            this.safeIsland
        );

        // Safe Island must NOT be a blocking obstacle

        // SAFE ISLAND SIGN

        if (this.textures.exists('safeIslandSign')) {

            this.safeIslandSign = this.add.image(
                this.safeIsland.x -
                    width * 0.40,
                height * 0.29,
                'safeIslandSign'
            );

            this.safeIslandSign.setScale(
                (width * 0.10) /
                this.safeIslandSign.width
            );

            this.safeIslandSign.setDepth(6);

            this.gameplayIslands.push(
                this.safeIslandSign
            );
        }

        //
        // DEBUG INFORMATION

        console.log(
            'Rainbow Valley 1/3 islands created:',
            {
                totalIslands:
                    this.gameplayIslands.length,

                stationaryIslands: 4,

                movingIslands:
                    this.movingIslands.length,

                rescueIslands:
                    this.rescueIslands.length,

                worldWidth:
                    this.worldWidth
            }
        );
    }


    // ==========================================
    // RAINBOW VALLEY 2/3: ISLAND ENVIRONMENT
    // ==========================================

    createRainbowValleyLevel2Islands() {

        const { width, height } = this.scale;

        this.gameplayIslands = [];
        this.blockingIslands = [];
        this.movingIslands = [];
        this.rescueIslands = [];

        const layout = [

            // Moving island 1
            {
                key: 'floatingIsland',
                x: 0.85,
                y: 0.72,
                size: 0.21,
                moving: true,
                speed: 100
            },

            // Rescue reindeer
            {
                key: 'animalRescueIsland',
                x: 1.40,
                y: 0.50,
                size: 0.25,
                rescueAnimal: 'reindeer'
            },

            // Stationary island 1
            {
                key: 'rainbowStationary1',
                x: 1.90,
                y: 0.28,
                size: 0.37
            },

            // Moving island 2
            {
                key: 'floatingIsland',
                x: 2.35,
                y: 0.77,
                size: 0.20,
                moving: true,
                speed: 110
            },

            // Stationary island 2
            {
                key: 'rainbowStationary2',
                x: 2.85,
                y: 0.34,
                size: 0.37
            },

            // Rescue puppy
            {
                key: 'animalRescueIsland',
                x: 3.35,
                y: 0.72,
                size: 0.25,
                rescueAnimal: 'dog'
            },

            // Moving island 3
            {
                key: 'floatingIsland',
                x: 3.90,
                y: 0.76,
                size: 0.20,
                moving: true,
                speed: 115
            },

            // Stationary island 3
            {
                key: 'rainbowStationary3',
                x: 4.35,
                y: 0.29,
                size: 0.37
            },

            // Moving island 4
            {
                key: 'floatingIsland',
                x: 4.85,
                y: 0.77,
                size: 0.20,
                moving: true,
                speed: 120
            },

            // Rescue unicorn
            {
                key: 'animalRescueIsland',
                x: 5.25,
                y: 0.55,
                size: 0.25,
                rescueAnimal: 'unicorn'
            },

            // Stationary island 4
            {
                key: 'rainbowStationary4',
                x: 5.75,
                y: 0.31,
                size: 0.37
            },

            // Moving island 5
            {
                key: 'floatingIsland',
                x: 6.10,
                y: 0.76,
                size: 0.20,
                moving: true,
                speed: 125
            }
        ];

        // CREATE ISLANDS

        for (const config of layout) {

            if (!this.textures.exists(config.key)) {
                console.error(
                    'Rainbow Valley 2/3 missing island:',
                    config.key
                );
                continue;
            }

            const island = this.add.image(
                width * config.x,
                height * config.y,
                config.key
            );

            island.setScale(
                (width * config.size) / island.width
            );

            island.setDepth(5);

            this.gameplayIslands.push(island);
            this.blockingIslands.push(island);

            if (config.rescueAnimal) {
                this.rescueIslands.push({
                    animalType: config.rescueAnimal,
                    sprite: island
                });
            }

            if (config.moving) {
                this.movingIslands.push({
                    sprite: island,
                    speed: config.speed,
                    activated: false,
                    finished: false
                });
            }
        }

        // CREATE SAFE ISLAND 2/3

        const safeKey = 'safeIsland_4_2';

        if (!this.textures.exists(safeKey)) {
            console.error(
                'Rainbow Valley 2/3 safe island missing:',
                safeKey
            );
            return;
        }

        this.safeIsland = this.add.image(
            this.worldWidth - width * 0.40,
            height * 0.53,
            safeKey
        );

        this.safeIsland.setScale(
            (width * 0.68) / this.safeIsland.width
        );

        this.safeIsland.setDepth(5);
        this.gameplayIslands.push(this.safeIsland);

        // Safe island is NOT a blocking obstacle.

        if (this.textures.exists('safeIslandSign')) {

            this.safeIslandSign = this.add.image(
                this.safeIsland.x - width * 0.41,
                height * 0.29,
                'safeIslandSign'
            );

            this.safeIslandSign.setScale(
                (width * 0.10) /
                this.safeIslandSign.width
            );

            this.safeIslandSign.setDepth(6);

            this.gameplayIslands.push(
                this.safeIslandSign
            );
        }

        console.log(
            'Rainbow Valley 2/3 islands created:',
            {
                totalIslands: this.gameplayIslands.length,
                movingIslands: this.movingIslands.length,
                rescueIslands: this.rescueIslands.length,
                worldWidth: this.worldWidth
            }
        );
    }



    // ==========================================
    // RAINBOW VALLEY 3/3: COMPLETE ENVIRONMENT
    // ==========================================

    createRainbowValleyLevel3Islands() {

        const { width, height } = this.scale;

        this.gameplayIslands = [];
        this.blockingIslands = [];
        this.movingIslands = [];
        this.rescueIslands = [];

        const layout = [

            // MOVING FLOATING ISLAND 1
            {
                key: 'floatingIsland',
                x: 0.85,
                y: 0.72,
                size: 0.21,
                moving: true,
                speed: 105
            },

            // RESCUE ISLAND: UNICORN
            {
                key: 'animalRescueIsland',
                x: 1.40,
                y: 0.50,
                size: 0.25,
                rescueAnimal: 'unicorn'
            },

            // STATIONARY ISLAND 1
            {
                key: 'rainbowStationary1',
                x: 1.90,
                y: 0.28,
                size: 0.37
            },

            // MOVING FLOATING ISLAND 2
            {
                key: 'floatingIsland',
                x: 2.30,
                y: 0.76,
                size: 0.20,
                moving: true,
                speed: 110
            },

            // STATIONARY ISLAND 2
            {
                key: 'rainbowStationary2',
                x: 2.85,
                y: 0.34,
                size: 0.37
            },

            // RESCUE ISLAND: PUPPY
            {
                key: 'animalRescueIsland',
                x: 3.30,
                y: 0.72,
                size: 0.25,
                rescueAnimal: 'dog'
            },

            // MOVING FLOATING ISLAND 3
            {
                key: 'floatingIsland',
                x: 3.85,
                y: 0.76,
                size: 0.20,
                moving: true,
                speed: 115
            },

            // STATIONARY ISLAND 3
            {
                key: 'rainbowStationary3',
                x: 4.40,
                y: 0.30,
                size: 0.37
            },

            // RESCUE ISLAND: FOX
            {
                key: 'animalRescueIsland',
                x: 4.90,
                y: 0.53,
                size: 0.25,
                rescueAnimal: 'fox'
            },

            // MOVING FLOATING ISLAND 4
            {
                key: 'floatingIsland',
                x: 5.35,
                y: 0.76,
                size: 0.20,
                moving: true,
                speed: 120
            },

            // STATIONARY ISLAND 4
            {
                key: 'rainbowStationary4',
                x: 5.95,
                y: 0.32,
                size: 0.37
            },

            // MOVING FLOATING ISLAND 5
            {
                key: 'floatingIsland',
                x: 6.35,
                y: 0.77,
                size: 0.20,
                moving: true,
                speed: 125
            },

            // RESCUE ISLAND: REINDEER
            {
                key: 'animalRescueIsland',
                x: 6.90,
                y: 0.54,
                size: 0.25,
                rescueAnimal: 'reindeer'
            },

            // MOVING FLOATING ISLAND 6
            {
                key: 'floatingIsland',
                x: 7.35,
                y: 0.76,
                size: 0.20,
                moving: true,
                speed: 130
            }
        ];

        // CREATE ALL ISLAND SPRITES

        for (const config of layout) {

            if (!this.textures.exists(config.key)) {
                console.error(
                    'Rainbow Valley 3/3 missing island:',
                    config.key
                );
                continue;
            }

            const island = this.add.image(
                width * config.x,
                height * config.y,
                config.key
            );

            island.setScale(
                (width * config.size) / island.width
            );

            island.setDepth(5);

            this.gameplayIslands.push(island);
            this.blockingIslands.push(island);

            // REGISTER ANIMAL RESCUE ISLAND

            if (config.rescueAnimal) {

                this.rescueIslands.push({
                    animalType: config.rescueAnimal,
                    sprite: island
                });
            }

            // REGISTER MOVING ISLAND

            if (config.moving) {

                this.movingIslands.push({
                    sprite: island,
                    speed: config.speed,
                    activated: false,
                    finished: false
                });
            }
        }

        // ======================================
        // CREATE SAFE ISLAND 3/3
        // ======================================

        const safeKey = 'safeIsland_4_3';

        if (!this.textures.exists(safeKey)) {

            console.error(
                'Rainbow Valley 3/3 safe island missing:',
                safeKey
            );

            return;
        }

        this.safeIsland = this.add.image(
            this.worldWidth - width * 0.43,
            height * 0.53,
            safeKey
        );

        this.safeIsland.setScale(
            (width * 0.74) / this.safeIsland.width
        );

        this.safeIsland.setDepth(5);

        this.gameplayIslands.push(this.safeIsland);

        // Safe island must not be a blocking obstacle.

        // CREATE SAFE ISLAND SIGN

        if (this.textures.exists('safeIslandSign')) {

            this.safeIslandSign = this.add.image(
                this.safeIsland.x - width * 0.44,
                height * 0.29,
                'safeIslandSign'
            );

            this.safeIslandSign.setScale(
                (width * 0.10) /
                this.safeIslandSign.width
            );

            this.safeIslandSign.setDepth(6);

            this.gameplayIslands.push(
                this.safeIslandSign
            );
        }

        console.log(
            'Rainbow Valley 3/3 islands created:',
            {
                totalIslands: this.gameplayIslands.length,
                movingIslands: this.movingIslands.length,
                rescueIslands: this.rescueIslands.length,
                worldWidth: this.worldWidth
            }
        );
    }


    // WINDY HEIGHTS LEVEL 1/3: FLOATING ISLANDS


    createWindyHeightsLevel1Islands() {

        const { width, height } = this.scale;

        // Reset Windy Heights island collections.
        this.gameplayIslands = [];
        this.blockingIslands = [];
        this.movingIslands = [];
        this.rescueIslands = [];

        // Separate World 2 layout.

const windyLevel1Layout = [

    // MOVING FLOATING ISLAND 1
    {
        key: 'floatingIsland',
        x: width * 0.85,
        y: height * 0.76,
        size: 0.20,
        moving: true,
        speed: 65
    },

    // BABY GIRAFFE RESCUE ISLAND
    {
        key: 'animalRescueIsland',
        x: width * 1.45,
        y: height * 0.75,
        size: 0.22,
        moving: false,
        rescueAnimal: 'giraffe'
    },

    // WINDY HEIGHTS STATIONARY ISLAND 1
    {
        key: 'windyStationaryIsland1',
        x: width * 2.05,
        y: height * 0.27,
        size: 0.36,
        moving: false
    },

    // MOVING FLOATING ISLAND 2
    {
        key: 'floatingIsland',
        x: width * 2.65,
        y: height * 0.74,
        size: 0.20,
        moving: true,
        speed: 80
    },

    // WINDY HEIGHTS STATIONARY ISLAND 2
    {
        key: 'windyStationaryIsland2',
        x: width * 3,
        y: height * 0.30,
        size: 0.35,
        moving: false
    }

];


        // Create floating islands.
        for (const islandData of windyLevel1Layout) {

            if (!this.textures.exists(islandData.key)) {
                console.warn(
                    'Missing Windy Heights island texture:',
                    islandData.key
                );
                continue;
            }

            const island = this.add.image(
                islandData.x,
                islandData.y,
                islandData.key
            );

            island.setScale(
                (width * islandData.size) / island.width
            );

            island.setDepth(5);

            this.gameplayIslands.push(island);
            this.blockingIslands.push(island);

            // Register the giraffe's rescue island.
            if (islandData.rescueAnimal) {
                this.rescueIslands.push({
                    animalType: islandData.rescueAnimal,
                    sprite: island
                });
            }

            // Reuse existing moving-island mechanics.
            if (islandData.moving) {
                this.movingIslands.push({
                    sprite: island,
                    speed: islandData.speed,
                    activated: false,
                    finished: false
                });
            }
        }

        // =====================================
        // WINDY HEIGHTS LEVEL 1 SAFE ISLAND
        // =====================================

        if (this.textures.exists('safeIsland_2_1')) {

            this.safeIsland = this.add.image(
                this.worldWidth - width * 0.30,
                height * 0.53,
                'safeIsland_2_1'
            );

            this.safeIsland.setScale(
                (width * 0.50) / this.safeIsland.width
            );

            this.safeIsland.setDepth(5);

            this.gameplayIslands.push(this.safeIsland);

            // Safe Island is not a blocking obstacle.

            if (this.textures.exists('safeIslandSign')) {

                this.safeIslandSign = this.add.image(
                    this.safeIsland.x - width * 0.32,
                    height * 0.30,
                    'safeIslandSign'
                );

                this.safeIslandSign.setScale(
                    (width * 0.10) /
                    this.safeIslandSign.width
                );

                this.safeIslandSign.setDepth(6);

                this.gameplayIslands.push(
                    this.safeIslandSign
                );
            }

        } else {
            console.warn(
                'Windy Heights Safe Island texture is missing.'
            );
        }

        console.log(
            'Windy Heights 1/3 islands created:',
            {
                totalIslands: this.gameplayIslands.length,
                movingIslands: this.movingIslands.length,
                rescueIslands: this.rescueIslands.length,
                worldWidth: this.worldWidth
            }
        );
    }


    // =============================================
    // WINDY HEIGHTS LEVEL 2/3: FLOATING ISLANDS
    // =============================================

    createWindyHeightsLevel2Islands() {

        const { width, height } = this.scale;

        // Reset island collections for this sublevel.
        this.gameplayIslands = [];
        this.blockingIslands = [];
        this.movingIslands = [];
        this.rescueIslands = [];

        // WINDY HEIGHTS 2/3 ISLAND LAYOUT

        const windyLevel2Layout = [

            // MOVING FLOATING ISLAND 1
            {
                key: 'floatingIsland',
                x: width * 0.80,
                y: height * 0.76,
                size: 0.20,
                moving: true,
                speed: 85
            },

            // FIRST ANIMAL: BABY GIRAFFE
            {
                key: 'animalRescueIsland',
                x: width * 1.35,
                y: height * 0.75,
                size: 0.22,
                moving: false,
                rescueAnimal: 'giraffe'
            },

            // STATIONARY ISLAND 1
            {
                key: 'windyStationaryIsland1',
                x: width * 1.90,
                y: height * 0.28,
                size: 0.34,
                moving: false
            },

            // MOVING FLOATING ISLAND 2
            {
                key: 'floatingIsland',
                x: width * 2.35,
                y: height * 0.77,
                size: 0.20,
                moving: true,
                speed: 100
            },

            // SECOND ANIMAL: BABY ELEPHANT
            {
                key: 'animalRescueIsland',
                x: width * 3.05,
                y: height * 0.74,
                size: 0.23,
                moving: false,
                rescueAnimal: 'elephant'
            },

            // STATIONARY ISLAND 2
            {
                key: 'windyStationaryIsland2',
                x: width * 3.55,
                y: height * 0.29,
                size: 0.33,
                moving: false
            },

            // MOVING FLOATING ISLAND 3
            {
                key: 'floatingIsland',
                x: width * 3.95,
                y: height * 0.77,
                size: 0.20,
                moving: true,
                speed: 110
            }
        ];

        // CREATE GAMEPLAY ISLANDS

        for (const islandData of windyLevel2Layout) {

            if (!this.textures.exists(islandData.key)) {

                console.warn(
                    'Missing Windy Heights island texture:',
                    islandData.key
                );

                continue;
            }

            const island = this.add.image(
                islandData.x,
                islandData.y,
                islandData.key
            );

            // Scale while preserving image proportions.
            const targetWidth =
                width * islandData.size;

            island.setScale(
                targetWidth / island.width
            );

            island.setDepth(5);

            // Register visible and blocking islands.
            this.gameplayIslands.push(island);
            this.blockingIslands.push(island);

            // Register assigned animal rescue island.
            if (islandData.rescueAnimal) {

                this.rescueIslands.push({
                    animalType: islandData.rescueAnimal,
                    sprite: island
                });
            }

            // Register moving islands.
            if (islandData.moving) {

                this.movingIslands.push({
                    sprite: island,
                    speed: islandData.speed,
                    activated: false,
                    finished: false
                });
            }
        }

        // WINDY HEIGHTS LEVEL 2 SAFE ISLAND

        const safeIslandKey = 'safeIsland_2_2';

        if (this.textures.exists(safeIslandKey)) {

            this.safeIsland = this.add.image(
                this.worldWidth - width * 0.30,
                height * 0.53,
                safeIslandKey
            );

            // Slightly larger for two rescued animals.
            const safeIslandWidth = width * 0.58;

            this.safeIsland.setScale(
                safeIslandWidth / this.safeIsland.width
            );

            this.safeIsland.setDepth(5);

            this.gameplayIslands.push(
                this.safeIsland
            );

            // Safe Island is not a blocking obstacle.

            // SAFE ISLAND SIGN


            if (this.textures.exists('safeIslandSign')) {

                this.safeIslandSign = this.add.image(
                    this.safeIsland.x - width * 0.35,
                    height * 0.30,
                    'safeIslandSign'
                );

                this.safeIslandSign.setScale(
                    (width * 0.10) /
                    this.safeIslandSign.width
                );

                this.safeIslandSign.setDepth(6);

                this.gameplayIslands.push(
                    this.safeIslandSign
                );
            }

        } else {

            console.warn(
                'Windy Heights 2/3 Safe Island texture missing.'
            );
        }


        console.log(
            'Windy Heights 2/3 islands created:',
            {
                totalIslands: this.gameplayIslands.length,
                movingIslands: this.movingIslands.length,
                rescueIslands: this.rescueIslands.length,
                worldWidth: this.worldWidth
            }
        );
    }



    // WINDY HEIGHTS LEVEL 3/3: FLOATING ISLANDS

    createWindyHeightsLevel3Islands() {

        const { width, height } = this.scale;

        // Reset island collections.
        this.gameplayIslands = [];
        this.blockingIslands = [];
        this.movingIslands = [];
        this.rescueIslands = [];

        // WINDY HEIGHTS 3/3 ISLAND LAYOUT

        const windyLevel3Layout = [

            // MOVING ISLAND 1
            {
                key: 'floatingIsland',
                x: width * 0.75,
                y: height * 0.56,
                size: 0.20,
                moving: true,
                speed: 95
            },

            // RESCUE 1: BABY GIRAFFE
            {
                key: 'animalRescueIsland',
                x: width * 1.30,
                y: height * 0.75,
                size: 0.22,
                moving: false,
                rescueAnimal: 'giraffe'
            },

            // STATIONARY ISLAND 1
            {
                key: 'windyStationaryIsland1',
                x: width * 1.80,
                y: height * 0.28,
                size: 0.35,
                moving: false
            },

            // MOVING ISLAND 2
            {
                key: 'floatingIsland',
                x: width * 2.20,
                y: height * 0.45,
                size: 0.22,
                moving: true,
                speed: 150
            },

            // RESCUE 2: BABY COW
            {
                key: 'animalRescueIsland',
                x: width * 2.70,
                y: height * 0.64,
                size: 0.23,
                moving: false,
                rescueAnimal: 'cow'
            },

            // STATIONARY ISLAND 2
            {
                key: 'windyStationaryIsland2',
                x: width * 3.20,
                y: height * 0.30,
                size: 0.40,
                moving: false
            },

            // MOVING ISLAND 3
            {
                key: 'floatingIsland',
                x: width * 3.65,
                y: height * 0.80,
                size: 0.20,
                moving: true,
                speed: 190
            },

            // RESCUE 3: BABY ELEPHANT
            {
                key: 'animalRescueIsland',
                x: width * 4.20,
                y: height * 0.75,
                size: 0.23,
                moving: false,
                rescueAnimal: 'elephant'
            },

            // STATIONARY ISLAND 3
            {
                key: 'windyStationaryIsland1',
                x: width * 4.65,
                y: height * 0.28,
                size: 0.38,
                moving: false
            },

            // MOVING ISLAND 4
            {
                key: 'floatingIsland',
                x: width * 4.95,
                y: height * 0.50,
                size: 0.20,
                moving: true,
                speed: 127
            }
        ];

        // CREATE FLOATING ISLANDS

        for (const islandData of windyLevel3Layout) {

            if (!this.textures.exists(islandData.key)) {

                console.warn(
                    'Missing Windy Heights island texture:',
                    islandData.key
                );

                continue;
            }

            const island = this.add.image(
                islandData.x,
                islandData.y,
                islandData.key
            );

            const targetWidth =
                width * islandData.size;

            island.setScale(
                targetWidth / island.width
            );

            island.setDepth(5);

            // Register island for existing systems.
            this.gameplayIslands.push(island);
            this.blockingIslands.push(island);

            // Register animal rescue islands.
            if (islandData.rescueAnimal) {

                this.rescueIslands.push({
                    animalType: islandData.rescueAnimal,
                    sprite: island
                });
            }

            // Register moving islands.
            if (islandData.moving) {

                this.movingIslands.push({
                    sprite: island,
                    speed: islandData.speed,
                    activated: false,
                    finished: false
                });
            }
        }

        // WINDY HEIGHTS 3/3 SAFE ISLAND

        const safeIslandKey = 'safeIsland_2_3';

        if (this.textures.exists(safeIslandKey)) {

            this.safeIsland = this.add.image(
                this.worldWidth - width * 0.34,
                height * 0.53,
                safeIslandKey
            );

            // Larger landing island for 3 animals.
            const safeIslandWidth = width * 0.66;

            this.safeIsland.setScale(
                safeIslandWidth / this.safeIsland.width
            );

            this.safeIsland.setDepth(5);

            this.gameplayIslands.push(
                this.safeIsland
            );

            // Safe Island is not a blocking obstacle.

            // SAFE ISLAND SIGN

            if (this.textures.exists('safeIslandSign')) {

                this.safeIslandSign = this.add.image(
                    this.safeIsland.x - width * 0.38,
                    height * 0.30,
                    'safeIslandSign'
                );

                this.safeIslandSign.setScale(
                    (width * 0.10) /
                    this.safeIslandSign.width
                );

                this.safeIslandSign.setDepth(6);

                this.gameplayIslands.push(
                    this.safeIslandSign
                );
            }

        } else {

            console.warn(
                'Windy Heights 3/3 Safe Island texture missing.'
            );
        }

        // DEBUG INFORMATION

        console.log(
            'Windy Heights 3/3 islands created:',
            {
                totalIslands: this.gameplayIslands.length,
                movingIslands: this.movingIslands.length,
                rescueIslands: this.rescueIslands.length,
                worldWidth: this.worldWidth
            }
        );
    }



    // STORM RESCUE LEVEL 1/3: ISLAND ENVIRONMENT

    createStormRescueLevel1Islands() {

        const { width, height } = this.scale;

        // Separate World 3 island collections.
        this.gameplayIslands = [];
        this.blockingIslands = [];
        this.movingIslands = [];
        this.rescueIslands = [];


        // STORM RESCUE 1/3 LAYOUT

        const stormLevel1Layout = [

            // MOVING FLOATING ISLAND 1
            {
                key: 'stormFloatingIsland',
                x: width * 0.85,
                y: height * 0.50,
                size: 0.20,
                moving: true,
                speed: 130
            },

            // FIRST ANIMAL RESCUE ISLAND
            {
                key: 'stormAnimalRescueIsland',
                x: width * 1.45,
                y: height * 0.35,
                size: 0.28,
                moving: false,
                rescueAnimal: 'fox'
            },

            // STATIONARY ISLAND 1
            {
                key: 'stormStationaryIsland1',
                x: width * 2.05,
                y: height * 0.30,
                size: 0.46,
                moving: false
            },

            // MOVING FLOATING ISLAND 2
            {
                key: 'stormFloatingIsland',
                x: width * 2.60,
                y: height * 0.76,
                size: 0.20,
                moving: true,
                speed: 100
            },

            // SECOND ANIMAL RESCUE ISLAND
            {
                key: 'stormAnimalRescueIsland',
                x: width * 3.15,
                y: height * 0.60,
                size: 0.28,
                moving: false,
                rescueAnimal: 'bunny'
            },

            // STATIONARY ISLAND 2
            {
                key: 'stormStationaryIsland2',
                x: width * 3.75,
                y: height * 0.70,
                size: 0.49,
                moving: false
            },

            // MOVING FLOATING ISLAND 3
            {
                key: 'stormFloatingIsland',
                x: width * 4.35,
                y: height * 0.25,
                size: 0.20,
                moving: true,
                speed: 98
            }
        ];

        // CREATE GAMEPLAY ISLANDS

        for (const islandData of stormLevel1Layout) {

            if (!this.textures.exists(islandData.key)) {

                console.warn(
                    'Missing Storm Rescue island texture:',
                    islandData.key
                );

                continue;
            }

            const island = this.add.image(
                islandData.x,
                islandData.y,
                islandData.key
            );

            // Scale each artwork proportionally.
            const targetWidth = width * islandData.size;

            island.setScale(
                targetWidth / island.width
            );

            island.setDepth(5);

            // Register for existing collision system.
            this.gameplayIslands.push(island);
            this.blockingIslands.push(island);

            // Register animal rescue locations.
            if (islandData.rescueAnimal) {

                this.rescueIslands.push({
                    animalType: islandData.rescueAnimal,
                    sprite: island
                });
            }

            // Register moving island obstacles.
            if (islandData.moving) {

                this.movingIslands.push({
                    sprite: island,
                    speed: islandData.speed,
                    activated: false,
                    finished: false
                });
            }
        }

        // STORM RESCUE 1/3 SAFE ISLAND

        const safeIslandKey = 'safeIsland_3_1';

        if (this.textures.exists(safeIslandKey)) {

            this.safeIsland = this.add.image(
                this.worldWidth - width * 0.32,
                height * 0.53,
                safeIslandKey
            );

            // Two animals will be delivered here.
            const safeIslandWidth = width * 0.58;

            this.safeIsland.setScale(
                safeIslandWidth / this.safeIsland.width
            );

            this.safeIsland.setDepth(5);

            this.gameplayIslands.push(
                this.safeIsland
            );

            // The Safe Island is not a blocking obstacle.

            // SAFE ISLAND SIGN

            if (this.textures.exists('safeIslandSign')) {

                this.safeIslandSign = this.add.image(
                    this.safeIsland.x - width * 0.35,
                    height * 0.30,
                    'safeIslandSign'
                );

                this.safeIslandSign.setScale(
                    (width * 0.10) /
                    this.safeIslandSign.width
                );

                this.safeIslandSign.setDepth(6);

                this.gameplayIslands.push(
                    this.safeIslandSign
                );
            }

        } else {

            console.warn(
                'Storm Rescue 1/3 Safe Island texture missing.'
            );
        }

        // DEBUG INFORMATION

        console.log(
            'Storm Rescue 1/3 islands created:',
            {
                totalIslands: this.gameplayIslands.length,
                movingIslands: this.movingIslands.length,
                rescueIslands: this.rescueIslands.length,
                worldWidth: this.worldWidth
            }
        );
    }



    // STORM RESCUE LEVEL 2/3: ISLAND ENVIRONMENT


    createStormRescueLevel2Islands() {

        const { width, height } = this.scale;

        // Separate World 3 Level 2 collections
        this.gameplayIslands = [];
        this.blockingIslands = [];
        this.movingIslands = [];
        this.rescueIslands = [];

        // STORM RESCUE 2/3 ISLAND LAYOUT

        const stormLevel2Layout = [

            // MOVING FLOATING ISLAND 1
            {
                key: 'stormFloatingIsland',
                x: width * 0.85,
                y: height * 0.59,
                size: 0.20,
                moving: true,
                speed: 150
            },

            // RESCUE ISLAND 1: FOX
            {
                key: 'stormAnimalRescueIsland',
                x: width * 1.45,
                y: height * 0.45,
                size: 0.28,
                moving: false,
                rescueAnimal: 'fox'
            },

            // STATIONARY ISLAND 1
            {
                key: 'stormStationaryIsland1',
                x: width * 2.10,
                y: height * 0.76,
                size: 0.46,
                moving: false
            },

            // MOVING FLOATING ISLAND 2
            {
                key: 'stormFloatingIsland',
                x: width * 2.75,
                y: height * 0.19,
                size: 0.20,
                moving: true,
                speed: 190
            },

            // RESCUE ISLAND 2: RABBIT
            {
                key: 'stormAnimalRescueIsland',
                x: width * 3.35,
                y: height * 0.62,
                size: 0.28,
                moving: false,
                rescueAnimal: 'bunny'
            },

            // STATIONARY ISLAND 2
            {
                key: 'stormStationaryIsland2',
                x: width * 3.95,
                y: height * 0.35,
                size: 0.45,
                moving: false
            },

            // MOVING FLOATING ISLAND 3
            {
                key: 'stormFloatingIsland',
                x: width * 4.40,
                y: height * 0.75,
                size: 0.20,
                moving: true,
                speed: 120
            },

            // RESCUE ISLAND 3: BABY CHEETAH
            {
                key: 'stormAnimalRescueIsland',
                x: width * 5.05,
                y: height * 0.40,
                size: 0.28,
                moving: false,
                rescueAnimal: 'cheetah'
            },

            // STATIONARY ISLAND 3
            {
                key: 'stormStationaryIsland1',
                x: width * 5.55,
                y: height * 0.28,
                size: 0.42,
                moving: false
            },

            // MOVING FLOATING ISLAND 4
            {
                key: 'stormFloatingIsland',
                x: width * 6.05,
                y: height * 0.73,
                size: 0.20,
                moving: true,
                speed: 125
            }
        ];

        // CREATE ISLAND SPRITES

        for (const islandData of stormLevel2Layout) {

            if (!this.textures.exists(islandData.key)) {

                console.warn(
                    'Missing Storm Rescue texture:',
                    islandData.key
                );

                continue;
            }

            const island = this.add.image(
                islandData.x,
                islandData.y,
                islandData.key
            );

            const targetWidth =
                width * islandData.size;

            island.setScale(
                targetWidth / island.width
            );

            island.setDepth(5);

            // Register with existing systems
            this.gameplayIslands.push(island);
            this.blockingIslands.push(island);

            // Rescue islands
            if (islandData.rescueAnimal) {

                this.rescueIslands.push({
                    animalType: islandData.rescueAnimal,
                    sprite: island
                });
            }

            // Moving obstacles
            if (islandData.moving) {

                this.movingIslands.push({
                    sprite: island,
                    speed: islandData.speed,
                    activated: false,
                    finished: false
                });
            }
        }

        // STORM RESCUE 2/3 SAFE ISLAND

        const safeIslandKey = 'safeIsland_3_2';

        if (this.textures.exists(safeIslandKey)) {

            this.safeIsland = this.add.image(
                this.worldWidth - width * 0.37,
                height * 0.53,
                safeIslandKey
            );

            // Larger for three delivered animals
            const safeIslandWidth = width * 0.66;

            this.safeIsland.setScale(
                safeIslandWidth / this.safeIsland.width
            );

            this.safeIsland.setDepth(5);

            this.gameplayIslands.push(
                this.safeIsland
            );

            // Safe Island is not a blocking obstacle.

            // SAFE ISLAND SIGN

            if (this.textures.exists('safeIslandSign')) {

                this.safeIslandSign = this.add.image(
                    this.safeIsland.x - width * 0.38,
                    height * 0.30,
                    'safeIslandSign'
                );

                this.safeIslandSign.setScale(
                    (width * 0.10) /
                    this.safeIslandSign.width
                );

                this.safeIslandSign.setDepth(6);

                this.gameplayIslands.push(
                    this.safeIslandSign
                );
            }

        } else {

            console.warn(
                'Storm Rescue 2/3 Safe Island texture missing.'
            );
        }

        // DEBUG INFORMATION

        console.log(
            'Storm Rescue 2/3 islands created:',
            {
                totalIslands: this.gameplayIslands.length,
                movingIslands: this.movingIslands.length,
                rescueIslands: this.rescueIslands.length,
                worldWidth: this.worldWidth
            }
        );
    }



    // STORM RESCUE 3/3: ISLAND ENVIRONMENT

    createStormRescueLevel3Islands() {

        const { width, height } = this.scale;

        this.gameplayIslands = [];
        this.blockingIslands = [];
        this.movingIslands = [];
        this.rescueIslands = [];

        const layout = [

            // MOVING ISLAND 1
            {
                key: 'stormFloatingIsland',
                x: 0.90,
                y: 0.73,
                size: 0.20,
                moving: true,
                speed: 125
            },

            // MONKEY RESCUE
            {
                key: 'stormAnimalRescueIsland',
                x: 1.45,
                y: 0.37,
                size: 0.28,
                rescueAnimal: 'monkey'
            },

            // STATIONARY ISLAND 1
            {
                key: 'stormStationaryIsland1',
                x: 2.05,
                y: 0.70,
                size: 0.43
            },

            // MOVING ISLAND 2
            {
                key: 'stormFloatingIsland',
                x: 2.65,
                y: 0.29,
                size: 0.20,
                moving: true,
                speed: 135
            },

            // FOX RESCUE
            {
                key: 'stormAnimalRescueIsland',
                x: 3.15,
                y: 0.64,
                size: 0.28,
                rescueAnimal: 'fox'
            },

            // STATIONARY ISLAND 2
            {
                key: 'stormStationaryIsland2',
                x: 3.70,
                y: 0.29,
                size: 0.44
            },

            // MOVING ISLAND 3
            {
                key: 'stormFloatingIsland',
                x: 4.30,
                y: 0.73,
                size: 0.20,
                moving: true,
                speed: 140
            },

            // CHEETAH RESCUE
            {
                key: 'stormAnimalRescueIsland',
                x: 4.95,
                y: 0.36,
                size: 0.28,
                rescueAnimal: 'cheetah'
            },

            // STATIONARY ISLAND 3
            {
                key: 'stormStationaryIsland1',
                x: 5.55,
                y: 0.72,
                size: 0.42
            },

            // MOVING ISLAND 4
            {
                key: 'stormFloatingIsland',
                x: 6.12,
                y: 0.30,
                size: 0.20,
                moving: true,
                speed: 145
            },

            // RABBIT RESCUE
            {
                key: 'stormAnimalRescueIsland',
                x: 6.70,
                y: 0.62,
                size: 0.28,
                rescueAnimal: 'bunny'
            },

            // STATIONARY ISLAND 4
            {
                key: 'stormStationaryIsland2',
                x: 7.25,
                y: 0.29,
                size: 0.42
            },

            // MOVING ISLAND 5
            {
                key: 'stormFloatingIsland',
                x: 7.75,
                y: 0.72,
                size: 0.20,
                moving: true,
                speed: 150
            }
        ];

        // =====================================
        // CREATE ALL GAMEPLAY ISLANDS
        // =====================================

        for (const config of layout) {

            if (!this.textures.exists(config.key)) {
                console.warn(
                    'Missing island texture:',
                    config.key
                );
                continue;
            }

            const island = this.add.image(
                width * config.x,
                height * config.y,
                config.key
            );

            island.setScale(
                (width * config.size) / island.width
            );

            island.setDepth(5);

            this.gameplayIslands.push(island);
            this.blockingIslands.push(island);

            if (config.rescueAnimal) {

                this.rescueIslands.push({
                    animalType: config.rescueAnimal,
                    sprite: island
                });
            }

            if (config.moving) {

                this.movingIslands.push({
                    sprite: island,
                    speed: config.speed,
                    activated: false,
                    finished: false
                });
            }
        }

        // =====================================
        // SAFE ISLAND
        // =====================================

        const safeKey = 'safeIsland_3_3';

        if (!this.textures.exists(safeKey)) {
            console.error(
                'Storm Rescue 3/3 Safe Island missing.'
            );
            return;
        }

        this.safeIsland = this.add.image(
            this.worldWidth - width * 0.40,
            height * 0.53,
            safeKey
        );

        // Slightly wider for four animals
        const targetWidth = width * 0.72;

        this.safeIsland.setScale(
            targetWidth / this.safeIsland.width
        );

        this.safeIsland.setDepth(5);
        this.gameplayIslands.push(this.safeIsland);

        // Safe Island is not a collision obstacle.

        // =====================================
        // SAFE ISLAND SIGN
        // =====================================

        if (this.textures.exists('safeIslandSign')) {

            this.safeIslandSign = this.add.image(
                this.safeIsland.x - width * 0.42,
                height * 0.29,
                'safeIslandSign'
            );

            this.safeIslandSign.setScale(
                (width * 0.10) /
                this.safeIslandSign.width
            );

            this.safeIslandSign.setDepth(6);

            this.gameplayIslands.push(
                this.safeIslandSign
            );
        }

        console.log(
            'Storm Rescue 3/3 islands created:',
            {
                movingIslands: this.movingIslands.length,
                rescueIslands: this.rescueIslands.length,
                totalIslandSprites:
                    this.gameplayIslands.length,
                worldWidth: this.worldWidth
            }
        );
    }




        // COLLISION RECTANGLES
         // The original PNGs contain transparent areas.


        getPandaCollisionBox(x, y) {
            return new Phaser.Geom.Rectangle(
                x - this.pandaWidth * 0.29,
                y - this.pandaHeight * 0.38,
                this.pandaWidth * 0.58,
                this.pandaHeight * 0.76
            );
        }

        getIslandCollisionBox(island) {
            return new Phaser.Geom.Rectangle(
                island.x - island.displayWidth * 0.38,
                island.y - island.displayHeight * 0.30,
                island.displayWidth * 0.76,
                island.displayHeight * 0.60
            );
        }


        // CHECK PANDA COLLISION

        getBlockingCollisionAt(x, y) {
            const pandaBox = this.getPandaCollisionBox(
                x,
                y + this.floatOffset
            );

            for (const island of this.blockingIslands) {
                if (!island.active) continue;

            const islandBox =
                this.getIslandCollisionBox(island);

                if (
                    Phaser.Geom.Intersects.RectangleToRectangle(
                        pandaBox,
                        islandBox
                    )
                ) {
                    return island;
                }
            }

            return null;
        }

        //MOVING FLOATING ISLANDS

        updateMovingIslands(dt, time) {
            if (
                !this.gameplayStarted || this.isGamePaused
            ) {
                return;
            }

            const { width } = this.scale;

            for (const obstacle of this.movingIslands) {
                if (obstacle.finished) continue;

            const island = obstacle.sprite;

            // Start approaching when the panda gets reasonably close to the island.
            if (!obstacle.activated) {
                const distance =
                    island.x - this.pandaPosition.x;

                if (
                    distance > 0 &&
                    distance < width * 1.05
                ) {
                    obstacle.activated = true;
                }
            }

            if (!obstacle.activated) continue;

            const oldX = island.x;

            // Move island toward the left.
            island.x -= obstacle.speed * dt;

            const pandaBox = this.getPandaCollisionBox(
                this.pandaPosition.x,
                this.pandaPosition.y + this.floatOffset
            );

            const islandBox =
                this.getIslandCollisionBox(island);

                // Prevent moving island from entering and passing through the panda.
                if (
                    Phaser.Geom.Intersects.RectangleToRectangle(
                        pandaBox,
                        islandBox
                    )
                ) {
                    island.x = oldX;
                    this.registerPandaHit(time);
                }

                // Stop moving after leaving the region sufficiently far behind the panda.
                if (
                    island.x + island.displayWidth / 2 <
                    this.pandaPosition.x - width * 0.50
                ) {
                    obstacle.finished = true;
                }
            }
        }

        //Panda hit feedback

        registerPandaHit(time) {

            // Ignore collisions when gameplay is inactive.
            if (
                !this.gameplayStarted || this.isGamePaused || this.isLandingSequencePlaying || this.levelCompleted || this.isPuzzleOpen || this.bananaEnergy <= 0
            ) {
            return;
        }

        // COLLISION COOLDOWN

        // Prevent repeated penalties while the panda remains touching an obstacle
        if (
            time - this.lastEnergyHitTime <
            this.energyHitCooldown
        ) {
            return;
        }

        this.lastEnergyHitTime = time;

        // PANDA HIT REACTION

        this.hitFeedbackUntil = Math.max(
        this.hitFeedbackUntil,
        time + 350
        );

        // ENERGY PENALTY: -5

        this.bananaEnergy = Phaser.Math.Clamp(
        this.bananaEnergy - 5,
        0,
        100
        );

        this.updateEnergyHUD();

        console.log(
            'Obstacle collision! Energy -5:',
            this.bananaEnergy
        );

        // Game Over logic will be implemented next.
        if (this.bananaEnergy === 0) {
            this.triggerGameOver();

        }
    }


    updatePandaAppearance(moveX, moveY, time) {
        const isHit =
            time < this.hitFeedbackUntil;

        let texture = 'pandaIdle';

        if (
            isHit &&
            this.textures.exists('pandaHit')
        ) {
            texture = 'pandaHit';
        } else if (moveX !== 0 || moveY !== 0) {
            if (Math.abs(moveX) >= Math.abs(moveY)) {
                texture = moveX < 0
                    ? 'pandaLeft'
                    : 'pandaRight';
            } else {
                texture = moveY < 0
                    ? 'pandaUp'
                    : 'pandaDown';
            }
        }

        if (this.panda.texture.key !== texture) {
            this.panda.setTexture(texture);

            this.panda.setDisplaySize(
                this.pandaWidth,
                this.pandaHeight
            );
        }

        // Fallback visual feedback if a dedicated
        // pandaHit image is not preloaded.
        if (
            isHit &&
            !this.textures.exists('pandaHit')
        ) {
            this.panda.setTint(0xff5555);
        } else {
            this.panda.clearTint();
        }
    }



    createRescueMonkey() {
        // Sunny Skies Sublevel 1 has one monkey.
        if (
            Number(this.mainLevelId) !== 1 ||
            Number(this.sublevelId) !== 1
        ) {
            return;
        }

        const { width, height } = this.scale;

        // Find the animal rescue island.
        const rescueIsland = this.gameplayIslands.find(
            island => island.texture.key === 'animalRescueIsland'
        );

        if (!rescueIsland) {
            console.warn('Animal Rescue Island not found');
            return;
        }

        // Help monkey

        // Position the monkey just above the grass.
        const monkeyX = rescueIsland.x;

        const monkeyY =
            rescueIsland.y -
            rescueIsland.displayHeight * 0.28;

        this.rescueMonkey = this.add.image(
            monkeyX,
            monkeyY,
            'monkeyWorried'
        );

        // Keep monkey small compared with island.
        const monkeyWidth = width * 0.070;

        this.rescueMonkey.setScale(
            monkeyWidth / this.rescueMonkey.width
        );

        // Place monkey on the island's grass.
        this.rescueMonkey.setOrigin(0.5, 1);

        this.rescueMonkey.y =
            rescueIsland.y -
            rescueIsland.displayHeight * 0.10;

        this.rescueMonkey.setDepth(12);

        // HELP SPEECH BUBBLE

        this.monkeyHelpBubble = this.add.image(
            this.rescueMonkey.x +
            monkeyWidth * 0.69,
            this.rescueMonkey.y -
            this.rescueMonkey.displayHeight * 1.05,
            'animalHelpBubble'
        );

        const bubbleWidth = width * 0.10;

        this.monkeyHelpBubble.setScale(
            bubbleWidth / this.monkeyHelpBubble.width
        );

        this.monkeyHelpBubble.setDepth(13);



        //CUSTOM PRESS E RESCUE PROMPT

        this.monkeyRescuePrompt = this.add.image(
            this.rescueMonkey.x,
            this.rescueMonkey.y -
            this.rescueMonkey.displayHeight * 1.55,
            'animalRescuePrompt'
        );

        // Scale the image proportionally.
        const promptWidth = width * 0.18;

        this.monkeyRescuePrompt.setScale(
            promptWidth / this.monkeyRescuePrompt.width
        );

        this.monkeyRescuePrompt.setOrigin(0.5);
        this.monkeyRescuePrompt.setDepth(30);

        // Hidden until the basket approaches.
        this.monkeyRescuePrompt.setVisible(false);


        // REGISTER RESCUE ANIMAL

        // The same structure can be used for other animals.

        this.rescueAnimals.push({
            id: 'monkey-1',
            type: 'monkey',

            sprite: this.rescueMonkey,
            helpBubble: this.monkeyHelpBubble,
            prompt: this.monkeyRescuePrompt,

            happyFaceKey: 'monkeyHappyFace',

            rescued: false,
            carriedFace: null
        });


            console.log(
                'Monkey placed on Animal Rescue Island'
            );
        }



    // WINDY HEIGHTS 1/3: BABY GIRAFFE RESCUE

    createWindyGiraffe() {

        if (
            Number(this.mainLevelId) !== 2 ||
            Number(this.sublevelId) !== 1
        ) {
            return;
        }

        const { width } = this.scale;

        // Find the giraffe's assigned island.
        const rescueIslandData =
            this.rescueIslands?.find(
                item => item.animalType === 'giraffe'
            );

        if (!rescueIslandData) {
            console.error('Giraffe rescue island not found.');
            return;
        }

        const requiredTextures = [
            'giraffeWorried',
            'giraffeHappyFace',
            'giraffeSafe'
        ];

        if (
            !requiredTextures.every(key =>
                this.textures.exists(key)
            )
        ) {
            console.error('Giraffe textures are missing.');
            return;
        }

        const island = rescueIslandData.sprite;

        // WORRIED GIRAFFE ON RESCUE ISLAND

        const giraffe = this.add.image(
            island.x,
            island.y - island.displayHeight * 0.10,
            'giraffeWorried'
        );

        giraffe.setOrigin(0.5, 1);

        giraffe.setScale(
            (width * 0.075) / giraffe.width
        );

        giraffe.setDepth(12);

        // HELP BUBBLE

        const helpBubble = this.add.image(
            giraffe.x + giraffe.displayWidth * 0.60,
            giraffe.y - giraffe.displayHeight * 1.05,
            'animalHelpBubble'
        );

        helpBubble.setScale(
            (width * 0.10) / helpBubble.width
        );

        helpBubble.setDepth(13);

        // PRESS E TO RESCUE

        const rescuePrompt = this.add.image(
            giraffe.x,
            giraffe.y - giraffe.displayHeight * 1.55,
            'animalRescuePrompt'
        );

        rescuePrompt.setScale(
            (width * 0.18) / rescuePrompt.width
        );

        rescuePrompt.setDepth(30);
        rescuePrompt.setVisible(false);

        // REGISTER USING THE EXISTING RESCUE SYSTEM

        this.rescueAnimals.push({
            id: 'giraffe-1',
            type: 'giraffe',

            sprite: giraffe,
            helpBubble: helpBubble,
            prompt: rescuePrompt,

            happyFaceKey: 'giraffeHappyFace',

            rescued: false,
            carriedFace: null
        });

        console.log(
            'Windy Heights baby giraffe created successfully.'
        );
    }



    // SUNNY SKIES LEVEL 2
    // MONKEY AND BABY ELEPHANT RESCUE

    createMultiRescueAnimals() {

        const { width } = this.scale;


        // MULTI-ANIMAL RESCUE CONFIGURATIONS

        const currentMainLevel = Number(this.mainLevelId);
        const currentSublevel = Number(this.sublevelId);

        const isSunnyLevel3 =
            currentMainLevel === 1 &&
            currentSublevel === 3;

        const isWindyLevel2 =
            currentMainLevel === 2 &&
            currentSublevel === 2;

        const isWindyLevel3 =
            currentMainLevel === 2 &&
            currentSublevel === 3;

        const isStormLevel1 =
            currentMainLevel === 3 &&
            currentSublevel === 1;

        // STORM RESCUE 2/3

        const isStormLevel2 =
            currentMainLevel === 3 &&
            currentSublevel === 2;
        //STORM RESCUE 3/3
        const isStormLevel3 =
            currentMainLevel === 3 &&
            currentSublevel === 3;

        const isRainbowLevel1 =
            currentMainLevel === 4 &&
            currentSublevel === 1;


        const isRainbowLevel2 =
            currentMainLevel === 4 &&
            currentSublevel === 2;


        const isRainbowLevel3 =
            currentMainLevel === 4 &&
            currentSublevel === 3;





      const animalConfigs = isRainbowLevel3
            ? [
                // RAINBOW VALLEY 3/3: UNICORN
                {
                    id: 'unicorn-rainbow-3',
                    type: 'unicorn',
                    texture: 'unicornWorried',
                    happyFaceKey: 'unicornHappyFace',
                    widthRatio: 0.070
                },

                // RAINBOW VALLEY 3/3: PUPPY
                {
                    id: 'dog-rainbow-3',
                    type: 'dog',
                    texture: 'dogWorried',
                    happyFaceKey: 'dogHappyFace',
                    widthRatio: 0.065
                },

                // RAINBOW VALLEY 3/3: FOX
                {
                    id: 'fox-rainbow-3',
                    type: 'fox',
                    texture: 'foxWorried',
                    happyFaceKey: 'foxHappyFace',
                    widthRatio: 0.065
                },

                // RAINBOW VALLEY 3/3: REINDEER
                {
                    id: 'reindeer-rainbow-3',
                    type: 'reindeer',
                    texture: 'reindeerWorried',
                    happyFaceKey: 'reindeerHappyFace',
                    widthRatio: 0.070
                }
            ]
            : isRainbowLevel2
                ? [
                    // RAINBOW VALLEY 2/3: REINDEER
                    {
                        id: 'reindeer-rainbow-2',
                        type: 'reindeer',
                        texture: 'reindeerWorried',
                        happyFaceKey: 'reindeerHappyFace',
                        widthRatio: 0.072
                    },

                    // RAINBOW VALLEY 2/3: PUPPY
                    {
                        id: 'dog-rainbow-2',
                        type: 'dog',
                        texture: 'dogWorried',
                        happyFaceKey: 'dogHappyFace',
                        widthRatio: 0.070
                    },

                    // RAINBOW VALLEY 2/3: UNICORN
                    {
                        id: 'unicorn-rainbow-2',
                        type: 'unicorn',
                        texture: 'unicornWorried',
                        happyFaceKey: 'unicornHappyFace',
                        widthRatio: 0.075
                    }
                ]

            : isRainbowLevel1
                ? [
                    // RAINBOW VALLEY 1/3: THREE ANIMALS

                    // BABY DOG
                    {
                        id: 'dog-rainbow-1',
                        type: 'dog',
                        texture: 'dogWorried',
                        happyFaceKey: 'dogHappyFace',
                        widthRatio: 0.065
                    },

                    // BABY ELEPHANT
                    {
                        id: 'elephant-rainbow-1',
                        type: 'elephant',
                        texture: 'elephantWorried',
                        happyFaceKey: 'elephantHappyFace',
                        widthRatio: 0.070
                    },

                    // BABY GIRAFFE
                    {
                        id: 'giraffe-rainbow-1',
                        type: 'giraffe',
                        texture: 'giraffeWorried',
                        happyFaceKey: 'giraffeHappyFace',
                        widthRatio: 0.070
                    }
                ]

            : isStormLevel3
             ? [
                // STORM RESCUE 3/3: FOUR ANIMALS

                // MONKEY
                {
                    id: 'monkey-storm-3',
                    type: 'monkey',
                    texture: 'monkeyWorried',
                    happyFaceKey: 'monkeyHappyFace',
                    widthRatio: 0.065
                },

                // FOX
                {
                    id: 'fox-storm-3',
                    type: 'fox',
                    texture: 'foxWorried',
                    happyFaceKey: 'foxHappyFace',
                    widthRatio: 0.070
                },

                // CHEETAH
                {
                    id: 'cheetah-storm-3',
                    type: 'cheetah',
                    texture: 'cheetahWorried',
                    happyFaceKey: 'cheetahHappyFace',
                    widthRatio: 0.070
                },

                // RABBIT
                {
                    id: 'bunny-storm-3',
                    type: 'bunny',
                    texture: 'bunnyWorried',
                    happyFaceKey: 'bunnyHappyFace',
                    widthRatio: 0.060
                }
            ]

            : isStormLevel2
            ? [
                    // STORM RESCUE 2/3


                    // BABY FOX
                {
                    id: 'fox-storm-2',
                    type: 'fox',
                    texture: 'foxWorried',
                    happyFaceKey: 'foxHappyFace',
                    widthRatio: 0.075
                },

                // BABY RABBIT
                {
                    id: 'bunny-storm-2',
                    type: 'bunny',
                    texture: 'bunnyWorried',
                    happyFaceKey: 'bunnyHappyFace',
                    widthRatio: 0.065
                },

                // BABY CHEETAH
                {
                    id: 'cheetah-storm-2',
                    type: 'cheetah',
                    texture: 'cheetahWorried',
                    happyFaceKey: 'cheetahHappyFace',
                    widthRatio: 0.075
                }
            ]

            : isStormLevel1
                ? [
                // STORM RESCUE 1/3: FOX AND RABBIT

                // BABY FOX
                {
                    id: 'fox-storm-1',
                    type: 'fox',
                    texture: 'foxWorried',
                    happyFaceKey: 'foxHappyFace',
                    widthRatio: 0.075
                },

                // BABY RABBIT
                {
                    id: 'bunny-storm-1',
                    type: 'bunny',
                    texture: 'bunnyWorried',
                    happyFaceKey: 'bunnyHappyFace',
                    widthRatio: 0.065
                }
            ]

            : isWindyLevel3
                ? [
                    // WINDY HEIGHTS 3/3: THREE ANIMALS


                    // BABY GIRAFFE
                    {
                        id: 'giraffe-3',
                        type: 'giraffe',
                        texture: 'giraffeWorried',
                        happyFaceKey: 'giraffeHappyFace',
                        widthRatio: 0.075
                    },

                    // BABY COW
                    {
                        id: 'cow-1',
                        type: 'cow',
                        texture: 'cowWorried',
                        happyFaceKey: 'cowHappyFace',
                        widthRatio: 0.075
                    },

                    // BABY ELEPHANT
                    {
                        id: 'elephant-3',
                        type: 'elephant',
                        texture: 'elephantWorried',
                        happyFaceKey: 'elephantHappyFace',
                        widthRatio: 0.075
                    }
                ]

                : isWindyLevel2
                    ? [
                        // WINDY HEIGHTS 2/3: TWO ANIMALS

                        // BABY GIRAFFE
                        {
                            id: 'giraffe-2',
                            type: 'giraffe',
                            texture: 'giraffeWorried',
                            happyFaceKey: 'giraffeHappyFace',
                            widthRatio: 0.075
                        },

                        // BABY ELEPHANT
                        {
                            id: 'elephant-2',
                            type: 'elephant',
                            texture: 'elephantWorried',
                            happyFaceKey: 'elephantHappyFace',
                            widthRatio: 0.075
                        }
                    ]

                    : [
                    // SUNNY SKIES 2/3 AND 3/3

                        // BABY MONKEY
                        {
                            id: 'monkey-2',
                            type: 'monkey',
                            texture: 'monkeyWorried',
                            happyFaceKey: 'monkeyHappyFace',
                            widthRatio: 0.070
                        },

                        // BABY ELEPHANT
                        {
                            id: 'elephant-1',
                            type: 'elephant',
                            texture: 'elephantWorried',
                            happyFaceKey: 'elephantHappyFace',
                            widthRatio: 0.070
                        },

                        // BABY BUNNY FOR SUNNY SKIES 3/3
                        ...(isSunnyLevel3 ? [{
                            id: 'bunny-1',
                            type: 'bunny',
                            texture: 'bunnyWorried',
                            happyFaceKey: 'bunnyHappyFace',
                            widthRatio: 0.060
                        }] : [])
                    ];


         for (const config of animalConfigs) {

            // Find the assigned rescue island.
            const rescueIslandData =
                this.rescueIslands?.find(
                    item => item.animalType === config.type
                );

            if (!rescueIslandData) {
                console.error(
                    `Rescue island missing for ${config.type}`
                );
                continue;
            }

            if (
                !this.textures.exists(config.texture) ||
                !this.textures.exists(config.happyFaceKey)
            ) {
                console.error(
                    `Missing animal textures for ${config.type}`
                );
                continue;
            }

            const island = rescueIslandData.sprite;

            // WORRIED ANIMAL ON THE ISLAND

            const animal = this.add.image(
                island.x,
                island.y -
                    island.displayHeight * 0.10,
                config.texture
            );

            animal.setOrigin(0.5, 1);

            animal.setScale(
                (width * config.widthRatio) /
                animal.width
            );

            animal.setDepth(12);

            // HELP SPEECH BUBBLE

            const helpBubble = this.add.image(
                animal.x +
                    animal.displayWidth * 0.60,
                animal.y -
                    animal.displayHeight * 1.05,
                'animalHelpBubble'
            );

            helpBubble.setScale(
                (width * 0.10) /
                helpBubble.width
            );

            helpBubble.setDepth(13);

            // PRESS E TO RESCUE PROMPT

            const rescuePrompt = this.add.image(
                animal.x,
                animal.y -
                    animal.displayHeight * 1.55,
                'animalRescuePrompt'
            );

            rescuePrompt.setScale(
                (width * 0.18) /
                rescuePrompt.width
            );

            rescuePrompt.setDepth(30);
            rescuePrompt.setVisible(false);

            // REGISTER THE ANIMAL

            this.rescueAnimals.push({
                id: config.id,
                type: config.type,

                sprite: animal,
                helpBubble: helpBubble,
                prompt: rescuePrompt,

                happyFaceKey: config.happyFaceKey,

                rescued: false,
                carriedFace: null
            });

            console.log(
                `Level 2 rescue animal created: ${config.type}`
            );
        }

        console.log(
            'Level 2 rescue animals:',
            this.rescueAnimals.length
        );
    }



    // WINDY HEIGHTS: WIND GUST OBSTACLES

    createWindGustObstacles() {

        const mainLevel = Number(this.mainLevelId);
        const sublevel = Number(this.sublevelId);

        // WINDY HEIGHTS 1/3 AND 2/3 ONLY

        if (
            mainLevel !== 2 ||
            ![1, 2,3].includes(sublevel)
        ) {
            return;
        }

        if (!this.textures.exists('windGust')) {
            console.warn('Wind gust texture is missing.');
            return;
        }

        const { width, height } = this.scale;

        // WIND GUST CONFIGURATION


        const gustPositions = sublevel === 3
            ? [
                // WINDY HEIGHTS 3/3

                // Gust 1: after giraffe rescue
                {
                    x: 1.95,
                    y: 0.49,
                    speed: 80
                },

                // Gust 2: near middle of the level
                {
                    x: 3.15,
                    y: 0.52,
                    speed: 95
                },

                // Gust 3: before final rescue area
                {
                    x: 4.55,
                    y: 0.43,
                    speed: 105
                }
            ]
            : sublevel === 2
                ? [
                    // PRESERVE WINDY HEIGHTS 2/3
                    {
                        x: 2.15,
                        y: 0.46,
                        speed: 85
                    },
                    {
                        x: 3.55,
                        y: 0.52,
                        speed: 100
                    }
                ]
                : [
                    // PRESERVE WINDY HEIGHTS 1/3
                    {
                        x: 2.35,
                        y: 0.46,
                        speed: 75
                    }
                ];


            this.windGustObstacles = gustPositions.map(config => {

            const gust = this.add.image(
                width * config.x,
                height * config.y,
                'windGust'
            );

            // Maintain the image's original proportions.
            const targetWidth = width * 0.16;

            gust.setScale(
                targetWidth / gust.width
            );

            gust.setDepth(16);

            return {
                sprite: gust,
                speed: config.speed,
                active: false,
                finished: false,
                lastPushTime: -Infinity
            };
        });

        console.log(
            'Windy Heights wind gusts created:',
            this.windGustObstacles.length
        );
    }



    // UPDATE WIND GUST OBSTACLES

    updateWindGustObstacles(dt, time) {

        if (
            !this.gameplayStarted ||
            this.isGamePaused ||
            this.isPuzzleOpen ||
            this.isLandingSequencePlaying ||
            this.levelCompleted ||
            this.isGameOver
        ) {
            return;
        }

        const { width } = this.scale;

        for (const obstacle of this.windGustObstacles) {

            if (obstacle.finished) continue;

            const gust = obstacle.sprite;

            if (!obstacle.active) {

                const distance =
                    gust.x - this.pandaPosition.x;

                if (
                    distance > 0 &&
                    distance < width * 1.1
                ) {
                    obstacle.active = true;
                }
            }

            if (!obstacle.active) continue;

            // Gust travels from right to left.
            gust.x -= obstacle.speed * dt;

            // Tight collision box to avoid transparent
            // pixels triggering collisions.
            const gustBox = new Phaser.Geom.Rectangle(
                gust.x - gust.displayWidth * 0.35,
                gust.y - gust.displayHeight * 0.25,
                gust.displayWidth * 0.59,
                gust.displayHeight * 0.50
            );

            const pandaBox = this.getPandaCollisionBox(
                this.pandaPosition.x,
                this.pandaPosition.y + this.floatOffset
            );

            if (
                Phaser.Geom.Intersects.RectangleToRectangle(
                    pandaBox,
                    gustBox
                )
            ) {

                // Reuse existing energy collision handling.
                this.registerPandaHit(time);

                // Apply a small leftward push only once
                // per collision cooldown.
                if (
                    time - obstacle.lastPushTime >=
                    this.energyHitCooldown
                ) {

                    const proposedX = Phaser.Math.Clamp(
                        this.pandaPosition.x - 35,
                        this.pandaWidth / 2,
                        this.worldWidth - this.pandaWidth / 2
                    );

                    // Never push the panda through an island.
                    if (
                        !this.getBlockingCollisionAt(
                            proposedX,
                            this.pandaPosition.y
                        )
                    ) {
                        this.pandaPosition.x = proposedX;
                    }

                    obstacle.lastPushTime = time;
                }
            }

            // Stop updating after passing the panda.
            if (
                gust.x + gust.displayWidth / 2 <
                this.pandaPosition.x - width * 0.5
            ) {
                obstacle.finished = true;
                gust.setVisible(false);
            }
        }
    }


    // RAINBOW VALLEY: CREATE OBSTACLES

    createRainbowObstacles() {

        const mainLevel = Number(this.mainLevelId);
        const sublevel = Number(this.sublevelId);

        this.rainbowObstacles = [];

        // Only Rainbow Valley 1/3 for now

        if (
            mainLevel !== 4 ||
            ![1, 2,3].includes(sublevel)
        ) {
            return;
        }


        const { width, height } = this.scale;


        // RAINBOW VALLEY 1/3 OBSTACLE LAYOUT

        const level1Configurations = [

            // PINK CLOUD 1
            {
                key: 'pinkCloudObstacle',
                x: 1.70,
                y: 0.49,
                size: 0.13,
                speed: 75,
                rotationSpeed: 0
            },

            // SPINNING TOFFEE 1
            {
                key: 'spinningToffeeObstacle',
                x: 2.55,
                y: 0.43,
                size: 0.095,
                speed: 95,
                rotationSpeed: 1.8
            },

            // RAINBOW TORNADO 1
            {
                key: 'rainbowTornadoObstacle',
                x: 3.35,
                y: 0.55,
                size: 0.13,
                speed: 85,
                rotationSpeed: 0
            },

            // PINK CLOUD 2
            {
                key: 'pinkCloudObstacle',
                x: 4.25,
                y: 0.42,
                size: 0.13,
                speed: 90,
                rotationSpeed: 0
            },

            // SPINNING TOFFEE 2
            {
                key: 'spinningToffeeObstacle',
                x: 4.80,
                y: 0.56,
                size: 0.095,
                speed: 105,
                rotationSpeed: -2
            }
        ];


        // RAINBOW VALLEY 2/3: OBSTACLE LAYOUT

        const level2Configurations = [

            {
                key: 'pinkCloudObstacle',
                x: 1.85,
                y: 0.50,
                size: 0.13,
                speed: 85,
                rotationSpeed: 0
            },

            {
                key: 'spinningToffeeObstacle',
                x: 2.55,
                y: 0.55,
                size: 0.095,
                speed: 105,
                rotationSpeed: 2.0
            },

            {
                key: 'rainbowTornadoObstacle',
                x: 3.10,
                y: 0.45,
                size: 0.13,
                speed: 95,
                rotationSpeed: 0
            },

            {
                key: 'pinkCloudObstacle',
                x: 3.85,
                y: 0.48,
                size: 0.13,
                speed: 100,
                rotationSpeed: 0
            },

            {
                key: 'spinningToffeeObstacle',
                x: 4.60,
                y: 0.58,
                size: 0.095,
                speed: 110,
                rotationSpeed: -2.1
            },

            {
                key: 'rainbowTornadoObstacle',
                x: 5.55,
                y: 0.44,
                size: 0.13,
                speed: 105,
                rotationSpeed: 0
            },

            {
                key: 'pinkCloudObstacle',
                x: 6.00,
                y: 0.55,
                size: 0.13,
                speed: 110,
                rotationSpeed: 0
            }
        ];



        // RAINBOW VALLEY 3/3 OBSTACLE LAYOUT

        const level3Configurations = [

            // PINK CLOUD 1
            {
                key: 'pinkCloudObstacle',
                x: 1.85,
                y: 0.49,
                size: 0.13,
                speed: 90,
                rotationSpeed: 0
            },

            // SPINNING TOFFEE 1
            {
                key: 'spinningToffeeObstacle',
                x: 2.65,
                y: 0.56,
                size: 0.095,
                speed: 110,
                rotationSpeed: 2.1
            },

            // RAINBOW TORNADO 1
            {
                key: 'rainbowTornadoObstacle',
                x: 3.70,
                y: 0.45,
                size: 0.13,
                speed: 100,
                rotationSpeed: 0
            },

            // PINK CLOUD 2
            {
                key: 'pinkCloudObstacle',
                x: 4.35,
                y: 0.55,
                size: 0.13,
                speed: 105,
                rotationSpeed: 0
            },

            // SPINNING TOFFEE 2
            {
                key: 'spinningToffeeObstacle',
                x: 5.40,
                y: 0.43,
                size: 0.095,
                speed: 120,
                rotationSpeed: -2.2
            },

            // RAINBOW TORNADO 2
            {
                key: 'rainbowTornadoObstacle',
                x: 6.20,
                y: 0.51,
                size: 0.13,
                speed: 110,
                rotationSpeed: 0
            },

            // PINK CLOUD 3
            {
                key: 'pinkCloudObstacle',
                x: 7.15,
                y: 0.45,
                size: 0.13,
                speed: 115,
                rotationSpeed: 0
            }
        ];


        const configurations =
            sublevel === 3
                ? level3Configurations
                : sublevel === 2
                    ? level2Configurations
                    : level1Configurations;



        // CREATE OBSTACLE SPRITES

        for (const config of configurations) {

            if (!this.textures.exists(config.key)) {

                console.error(
                    'Rainbow obstacle texture missing:',
                    config.key
                );

                continue;
            }

            const obstacleSprite = this.add.image(
                width * config.x,
                height * config.y,
                config.key
            );

            obstacleSprite.setScale(
                (width * config.size) /
                obstacleSprite.width
            );

            obstacleSprite.setDepth(16);

            this.rainbowObstacles.push({

                sprite: obstacleSprite,

                speed: config.speed,

                rotationSpeed: config.rotationSpeed,

                active: false,

                finished: false
            });
        }

        console.log(
            'Rainbow Valley 1/3 obstacles created:',
            this.rainbowObstacles.length
        );
    }








    // ==========================================
    // RAINBOW VALLEY: UPDATE OBSTACLES
    // ==========================================

    updateRainbowObstacles(dt, time) {

        // Check whether the rainbow obstacle
        // system has been created.
        if (!this.rainbowObstacles) {
            return;
        }

        // Only update during active gameplay
        if (
            !this.gameplayStarted ||
            this.isGamePaused ||
            this.isPuzzleOpen ||
            this.isLandingSequencePlaying ||
            this.levelCompleted ||
            this.isGameOver
        ) {
            return;
        }

        const { width } = this.scale;

        for (const obstacle of this.rainbowObstacles) {

            if (obstacle.finished) {
                continue;
            }

            const sprite = obstacle.sprite;

            // ==================================
            // ACTIVATE WHEN PANDA APPROACHES
            // ==================================

            if (!obstacle.active) {

                const distance =
                    sprite.x - this.pandaPosition.x;

                if (
                    distance > 0 &&
                    distance < width * 1.1
                ) {
                    obstacle.active = true;
                }
            }

            if (!obstacle.active) {
                continue;
            }

            // ==================================
            // MOVE FROM RIGHT TO LEFT
            // ==================================

            sprite.x -= obstacle.speed * dt;

            // ==================================
            // ROTATE SPINNING TOFFEE
            // ==================================

            if (obstacle.rotationSpeed !== 0) {

                sprite.rotation +=
                    obstacle.rotationSpeed * dt;
            }

            // ==================================
            // OBSTACLE COLLISION BOX
            // ==================================

            const obstacleBox =
                new Phaser.Geom.Rectangle(

                    sprite.x -
                        sprite.displayWidth * 0.30,

                    sprite.y -
                        sprite.displayHeight * 0.30,

                    sprite.displayWidth * 0.60,

                    sprite.displayHeight * 0.60
                );

            // ==================================
            // PANDA COLLISION BOX
            // ==================================

            const pandaBox =
                this.getPandaCollisionBox(

                    this.pandaPosition.x,

                    this.pandaPosition.y +
                        this.floatOffset
                );

            // ==================================
            // HANDLE OBSTACLE COLLISION
            // ==================================

            if (
                Phaser.Geom.Intersects.RectangleToRectangle(
                    pandaBox,
                    obstacleBox
                )
            ) {

                // Reuse existing -5 energy
                // collision penalty and cooldown
                this.registerPandaHit(time);
            }

            // ==================================
            // FINISH WHEN OBSTACLE PASSES PANDA
            // ==================================

            if (
                sprite.x +
                    sprite.displayWidth / 2 <

                this.pandaPosition.x -
                    width * 0.5
            ) {

                obstacle.finished = true;

                sprite.setVisible(false);
            }
        }
    }



    createBirdObstacles() {

        const mainLevel = Number(this.mainLevelId);
        const sublevel = Number(this.sublevelId);

        // Only implemented Sunny Skies sublevels.
        // ENABLE BIRDS FOR BOTH REGIONS

        const isSunnySkies =
            mainLevel === 1 &&
            [1, 2, 3].includes(sublevel);

        const isWindyLevel1 =
            mainLevel === 2 &&
            sublevel === 1;

        const isWindyLevel2 =
            mainLevel === 2 &&
            sublevel === 2;

        const isWindyLevel3 =
            mainLevel === 2 &&
            sublevel === 3;

            if (
                !isSunnySkies && !isWindyLevel1 && !isWindyLevel2 && !isWindyLevel3
            ) {
                return;
            }

        if (!this.textures.exists('blackBird')) {
            console.warn('Black bird texture is missing');
            return;
        }

        const { width, height } = this.scale;

        // Level 1 keeps its two original birds.
        const level1Birds = [
            { x: 1.90, y: 0.42, speed: 120 },
            { x: 2.85, y: 0.55, speed: 120 }
        ];

        // Level 2 has three faster birds.
        const level2Birds = [
            { x: 1.90, y: 0.42, speed: 135 },
            { x: 2.80, y: 0.53, speed: 145 },
            { x: 3.75, y: 0.41, speed: 150 }
        ];
        const level3Birds = [
            { x: 1.75, y: 0.42, speed: 140 },
            { x: 2.45, y: 0.53, speed: 150 },
            { x: 3.30, y: 0.40, speed: 155 },
            { x: 4.60, y: 0.49, speed: 160 }
        ];

        // WINDY HEIGHTS 1/3 BIRDS
        const windyLevel1Birds = [
            { x: 1.90, y: 0.42, speed: 120 },
            { x: 2.85, y: 0.55, speed: 120 }
        ];

        // WINDY HEIGHTS 2/3: THREE BIRDS

        const windyLevel2Birds = [
            { x: 1.90, y: 0.42, speed: 140 },
            { x: 2.75, y: 0.52, speed: 150 },
            { x: 3.70, y: 0.40, speed: 160 }
        ];

        // WINDY HEIGHTS 3/3: FOUR BIRDS

        const windyLevel3Birds = [
            { x: 1.65, y: 0.43, speed: 145 },
            { x: 2.45, y: 0.55, speed: 155 },
            { x: 3.60, y: 0.39, speed: 165 },
            { x: 4.75, y: 0.50, speed: 170 }
        ];

        // SELECT BIRDS BY MAIN LEVEL AND SUBLEVEL
        const birdPositions = isWindyLevel3
            ? windyLevel3Birds
            : isWindyLevel2
                ? windyLevel2Birds
                : isWindyLevel1
                    ? windyLevel1Birds
                    : sublevel === 3
                        ? level3Birds
                        : sublevel === 2
                            ? level2Birds
                            : level1Birds;


        this.birdObstacles = birdPositions.map(config => {

            const bird = this.add.image(
                width * config.x,
                height * config.y,
                'blackBird'
            );

            bird.setDisplaySize(
                width * 0.055,
                width * 0.045
            );

            bird.setDepth(15);

            return {
                sprite: bird,
                speed: config.speed,
                active: false,
                finished: false
            };
        });

        console.log(
            `Sunny Skies ${sublevel}/3 birds created:`,
            this.birdObstacles.length
        );
        const regionName =
         mainLevel === 2 ? 'Windy Heights' : 'Sunny Skies';

            console.log(
            `${regionName} ${sublevel}/3 birds created:`,
            this.birdObstacles.length
        );
    }



    // STORM RESCUE 1/3: PURPLE BAT OBSTACLES


    // ==========================================
    // STORM RESCUE: PURPLE BAT OBSTACLES
    // ==========================================

    createStormBatObstacles() {

        const mainLevel = Number(this.mainLevelId);
        const sublevel = Number(this.sublevelId);

        // Reset the bat collection
        this.stormBatObstacles = [];

        // Only Storm Rescue 1/3 and 2/3
        if (
            mainLevel !== 3 ||
            ![1, 2,3].includes(sublevel)
        ) {
            return;
        }

        if (!this.textures.exists('stormBat')) {
            console.warn('Storm bat texture is missing.');
            return;
        }

        const { width, height } = this.scale;

        // =====================================
        // BAT POSITIONS BY SUBLEVEL
        // =====================================


const batPositions = sublevel === 1
    ? [
        // STORM RESCUE 1/3
        { x: 2.10, y: 0.43, speed: 125 },
        { x: 3.85, y: 0.54, speed: 140 }
    ]

    : sublevel === 2
        ? [
            // STORM RESCUE 2/3
            { x: 1.90, y: 0.43, speed: 125 },
            { x: 3.65, y: 0.55, speed: 140 },
            { x: 5.70, y: 0.38, speed: 150 }
        ]

        : [
            // STORM RESCUE 3/3
            { x: 1.95, y: 0.53, speed: 135 },
            { x: 3.80, y: 0.44, speed: 145 },
            { x: 5.65, y: 0.57, speed: 150 },
            { x: 7.40, y: 0.40, speed: 160 }
        ];


        // =====================================
        // CREATE BAT SPRITES
        // =====================================

        this.stormBatObstacles = batPositions.map(
            config => {

                const bat = this.add.image(
                    width * config.x,
                    height * config.y,
                    'stormBat'
                );

                // Keep existing bat artwork size
                const targetWidth = width * 0.085;

                bat.setScale(
                    targetWidth / bat.width
                );

                bat.setDepth(15);

                return {
                    sprite: bat,
                    speed: config.speed,
                    active: false,
                    finished: false
                };
            }
        );

        console.log(
            `Storm Rescue ${sublevel}/3 bats created:`,
            this.stormBatObstacles.length
        );
    }




    // STORM RESCUE 1/3: STORM CLOUD OBSTACLES



    // STORM RESCUE: STORM CLOUD OBSTACLES


    createStormCloudObstacles() {

        const mainLevel = Number(this.mainLevelId);
        const sublevel = Number(this.sublevelId);

        // Reset the storm cloud collection
        this.stormCloudObstacles = [];

        // Only Storm Rescue 1/3 and 2/3
        if (
            mainLevel !== 3 ||
            ![1, 2,3].includes(sublevel)
        ) {
            return;
        }

        if (!this.textures.exists('stormCloud')) {
            console.warn(
                'Storm cloud texture is missing.'
            );
            return;
        }

        const { width, height } = this.scale;

        // STORM CLOUD POSITIONS BY SUBLEVEL


const cloudPositions = sublevel === 1
    ? [
        // STORM RESCUE 1/3
        { x: 2.55, y: 0.35, speed: 65 },
        { x: 4.20, y: 0.48, speed: 80 }
    ]

    : sublevel === 2
        ? [
            // STORM RESCUE 2/3
            { x: 2.40, y: 0.32, speed: 65 },
            { x: 4.35, y: 0.48, speed: 80 },
            { x: 5.95, y: 0.35, speed: 90 }
        ]

        : [
            // STORM RESCUE 3/3
            { x: 2.35, y: 0.33, speed: 75 },
            { x: 4.05, y: 0.57, speed: 85 },
            { x: 5.85, y: 0.34, speed: 90 },
            { x: 7.60, y: 0.56, speed: 95 }
        ];


        // CREATE STORM CLOUD SPRITES


        this.stormCloudObstacles = cloudPositions.map(
            config => {

                const cloud = this.add.image(
                    width * config.x,
                    height * config.y,
                    'stormCloud'
                );

                // Keep existing storm cloud size
                const targetWidth = width * 0.13;

                cloud.setScale(
                    targetWidth / cloud.width
                );

                cloud.setDepth(14);

                return {
                    sprite: cloud,
                    speed: config.speed,
                    active: false,
                    finished: false
                };
            }
        );

        console.log(
            `Storm Rescue ${sublevel}/3 storm clouds created:`,
            this.stormCloudObstacles.length
        );
    }




    // UPDATE STORM CLOUD OBSTACLES

    updateStormCloudObstacles(dt, time) {

        // Do not update while gameplay is inactive.
        if (
            !this.gameplayStarted ||
            this.isGamePaused ||
            this.isPuzzleOpen ||
            this.isLandingSequencePlaying ||
            this.levelCompleted ||
            this.isGameOver ||
            !this.stormCloudObstacles
        ) {
            return;
        }

        const { width } = this.scale;

        for (const obstacle of this.stormCloudObstacles) {

            if (obstacle.finished) {
                continue;
            }

            const cloud = obstacle.sprite;

            // =====================================
            // ACTIVATE WHEN APPROACHING THE PANDA
            // =====================================

            if (!obstacle.active) {

                const distance =
                    cloud.x - this.pandaPosition.x;

                if (
                    distance > 0 &&
                    distance < width * 1.1
                ) {
                    obstacle.active = true;
                }
            }

            if (!obstacle.active) {
                continue;
            }

            // =====================================
            // MOVE CLOUD FROM RIGHT TO LEFT
            // =====================================

            cloud.x -= obstacle.speed * dt;

            // =====================================
            // COLLISION RECTANGLES
            // =====================================

            // Smaller than the artwork to ensure
            // fair collision detection.
            const cloudBox = new Phaser.Geom.Rectangle(
                cloud.x - cloud.displayWidth * 0.32,
                cloud.y - cloud.displayHeight * 0.28,
                cloud.displayWidth * 0.64,
                cloud.displayHeight * 0.56
            );

            const pandaBox = this.getPandaCollisionBox(
                this.pandaPosition.x,
                this.pandaPosition.y + this.floatOffset
            );

            // =====================================
            // STORM CLOUD COLLISION
            // =====================================

            if (
                Phaser.Geom.Intersects.RectangleToRectangle(
                    pandaBox,
                    cloudBox
                )
            ) {
                // Existing -5 energy penalty
                // and shared cooldown.
                this.registerPandaHit(time);
            }

            // =====================================
            // REMOVE CLOUD AFTER PASSING PANDA
            // =====================================

            if (
                cloud.x + cloud.displayWidth / 2 <
                this.pandaPosition.x - width * 0.5
            ) {
                obstacle.finished = true;
                cloud.setVisible(false);
            }
        }
    }



    // UPDATE STORM RESCUE BAT OBSTACLES

    updateStormBatObstacles(dt, time) {

        if (
            !this.gameplayStarted ||
            this.isGamePaused ||
            this.isPuzzleOpen ||
            this.isLandingSequencePlaying ||
            this.levelCompleted ||
            this.isGameOver ||
            !this.stormBatObstacles
        ) {
            return;
        }

        const { width } = this.scale;

        for (const obstacle of this.stormBatObstacles) {

            if (obstacle.finished) continue;

            const bat = obstacle.sprite;

            // Activate only when the bat is
            // approaching the panda.
            if (!obstacle.active) {

                const distance =
                    bat.x - this.pandaPosition.x;

                if (
                    distance > 0 &&
                    distance < width * 1.1
                ) {
                    obstacle.active = true;
                }
            }

            if (!obstacle.active) continue;

            // Move from right to left.
            bat.x -= obstacle.speed * dt;

            // Smaller collision box for fair gameplay.
            const batBox = new Phaser.Geom.Rectangle(
                bat.x - bat.displayWidth * 0.35,
                bat.y - bat.displayHeight * 0.30,
                bat.displayWidth * 0.70,
                bat.displayHeight * 0.60
            );

            const pandaBox = this.getPandaCollisionBox(
                this.pandaPosition.x,
                this.pandaPosition.y + this.floatOffset
            );

            // BAT COLLISION
            if (
                Phaser.Geom.Intersects.RectangleToRectangle(
                    pandaBox,
                    batBox
                )
            ) {
                // Existing -5 energy penalty
                // with collision cooldown.
                this.registerPandaHit(time);
            }

            // Stop updating when the bat
            // is far behind the panda.
            if (
                bat.x + bat.displayWidth / 2 <
                this.pandaPosition.x - width * 0.5
            ) {
                obstacle.finished = true;
                bat.setVisible(false);
            }
        }
    }



        updateBirdObstacles(dt, time) {
            if (
                !this.gameplayStarted || this.isGamePaused || !this.birdObstacles
            ) {
            return;
            }

            const { width } = this.scale;

                for (const obstacle of this.birdObstacles) {
                    if (obstacle.finished) continue;

            const bird = obstacle.sprite;

            // Activate when the bird is ahead of the panda.
                if (!obstacle.active) {
                    const distance =
                        bird.x - this.pandaPosition.x;

                if (
                    distance > 0 &&
                    distance < width * 1.1
                ) {
                    obstacle.active = true;
                }
                }

                if (!obstacle.active) continue;

                // Fly from right to left.
                bird.x -= obstacle.speed * dt;

                // Use smaller collision areas.
            const birdBox = new Phaser.Geom.Rectangle(
                bird.x - bird.displayWidth * 0.35,
                bird.y - bird.displayHeight * 0.30,
                bird.displayWidth * 0.70,
                bird.displayHeight * 0.60
            );

            const pandaBox = this.getPandaCollisionBox(
                this.pandaPosition.x,
                this.pandaPosition.y + this.floatOffset
            );

                if (
                    Phaser.Geom.Intersects.RectangleToRectangle(
                        pandaBox,
                        birdBox
                    )
                ) {
                    this.registerPandaHit(time);
                }

                // Remove bird once it is far behind the panda.
                if (
                    bird.x + bird.displayWidth / 2 <
                    this.pandaPosition.x - width * 0.5
                )   {
                    obstacle.finished = true;
                    bird.setVisible(false);
                }
            }


        }



        createRescueHUD() {
            const { width, height } = this.scale;

            // ANIMAL RESCUE COUNTER IMAGE

            const hudX = width * 0.680;
            const hudY = height * 0.075;

            this.animalRescueHUD = this.add.image(
                hudX,
                hudY,
                'gameplayAnimalCounter'
            );

            // Keep the original image proportions.
            const targetWidth = width * 0.16;

            this.animalRescueHUD.setScale(
                targetWidth / this.animalRescueHUD.width
            );

            // Fixed to the screen while the camera moves
            this.animalRescueHUD.setScrollFactor(0);
            this.animalRescueHUD.setDepth(150);

            // RESCUED ANIMAL COUNT

            const textX =
                hudX + this.animalRescueHUD.displayWidth * 0.18;

            const textY =
                hudY + this.animalRescueHUD.displayHeight * 0.10;

            this.rescueCounterText = this.add.text(
                textX,
                textY,
                `${this.rescuedCount}/${this.requiredRescues}`,
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: `${Math.round(height * 0.030)}px`,
                    fontStyle: 'bold',
                    color: '#ffffff',
                    stroke: '#164b9c',
                    strokeThickness: 3,
                    align: 'center'
                }
            );

            this.rescueCounterText.setOrigin(0.5);
            this.rescueCounterText.setScrollFactor(0);
            this.rescueCounterText.setDepth(151);

            console.log('Animal Rescue HUD created');
        }


        // GET BALLOON BASKET POSITION

        getBalloonBasketPosition() {
            return {
                x: this.panda.x,
                y: this.panda.y +
                    this.pandaHeight * 0.28
            };
        }

        // CHECK ANIMAL PICKUP

        updateAnimalRescue() {
            if (
                !this.gameplayStarted || this.isGamePaused || !this.rescueKey
            ) {
                return;
            }

            const { width, height } = this.scale;

            const basket = this.getBalloonBasketPosition();

            // Read E once per key press.
            const rescuePressed =
                Phaser.Input.Keyboard.JustDown(
                    this.rescueKey
                );

            for (const animal of this.rescueAnimals) {
                if (animal.rescued) {
                    continue;
                }

                // The sprite's origin is at its feet.
                // Measure the distance to the center
                // of the animal's body.
                const animalX = animal.sprite.x;

                const animalY =
                    animal.sprite.y -
                    animal.sprite.displayHeight * 0.45;

                const horizontalDistance = Math.abs(
                    basket.x - animalX
                );

                const verticalDistance = Math.abs(
                    basket.y - animalY
                );

                // Pickup range around the basket.
                const closeEnough =
                    horizontalDistance <= width * 0.16 &&
                    verticalDistance <= height * 0.18;

                // Show the interaction prompt only
                // when the basket is close enough.
                animal.prompt.setVisible(closeEnough);

                if (closeEnough && rescuePressed) {
                    this.pickupRescueAnimal(animal);
                    break;
                }
            }

            // Keep rescued animal faces attached
            // to the moving balloon basket.
            this.updateCarriedAnimalFaces();
        }

        // PICK UP AN ANIMAL

        pickupRescueAnimal(animal) {
            if (animal.rescued) {
                return;
            }

            animal.rescued = true;


                // The rescue success sound when an animal is successfully picked up.
                if (
                    AudioManager.soundEnabled &&
                    this.cache.audio.exists('successSound')
                ) {
                    this.sound.play('successSound', {
                        volume: 0.9
                    });
                }


            // Remove worried animal and HELP bubble.
            animal.sprite.setVisible(false);
            animal.helpBubble.setVisible(false);
            animal.prompt.setVisible(false);

            // Create happy face inside the balloon.

            // Create happy face inside the balloon.
            const happyFace = this.add.image(
                this.panda.x,
                this.panda.y,
                animal.happyFaceKey
            );

            // Set the face size for each rescue level.
            const targetWidth =
                this.requiredRescues === 3
                    ? this.pandaWidth * 0.25
                    : this.requiredRescues > 1
                        ? this.pandaWidth * 0.24
                        : this.pandaWidth * 0.27;

            // IMPORTANT: Apply the calculated size!
            happyFace.setScale(targetWidth / happyFace.width);

            happyFace.setDepth(21);

            animal.carriedFace = happyFace;
            this.carriedAnimalFaces.push(happyFace);


            // Update rescued animal count.
            this.rescuedCount++;

            // Award points for rescuing an animal.
            this.currentScore += 100;

            // Update the existing Score HUD.
            if (this.scoreText) {
                this.scoreText.setText(`${this.currentScore}`);
            }

            console.log(
                'Animal rescued! Current Score:',
                this.currentScore
            );

            //ANIMAL RESCUE ENERGY REWARD

            // Each successfully rescued animal restores 10 Banana Energy.
            this.bananaEnergy = Phaser.Math.Clamp(
                this.bananaEnergy + 10,
                0,
                100
            );

            // Refresh the energy number and yellow fill.
            this.updateEnergyHUD();

            console.log(
                'Animal rescued! Energy +10:',
                this.bananaEnergy
            );


                if (this.rescueCounterText) {
                    this.rescueCounterText.setText(
                        `${this.rescuedCount}/${this.requiredRescues}`
                    );
                }


            // Immediately align the face.
            this.updateCarriedAnimalFaces();

            console.log(
                'Animal rescued:',
                animal.type
            );

         console.log(
                'Rescue progress:',
                `${this.rescuedCount}/${this.requiredRescues}`
            );
        }

        // KEEP ANIMALS INSIDE BALLOON


    updateCarriedAnimalFaces() {

        if (
            !this.carriedAnimalFaces ||
            this.carriedAnimalFaces.length === 0
        ) {
            return;
        }

        const basket = this.getBalloonBasketPosition();

        const mainLevel = Number(this.mainLevelId);
        const sublevel = Number(this.sublevelId);

        const isStormLevel1 =
            mainLevel === 3 && sublevel === 1;

        const isStormLevel2 =
            mainLevel === 3 && sublevel === 2;

        const isStormLevel3 =
            mainLevel === 3 && sublevel === 3;

        const isWindyLevel3 =
            mainLevel === 2 && sublevel === 3;

        this.carriedAnimalFaces.forEach((face, index) => {

            let offsetX = 0.17;

            if (isStormLevel3) {

                // Monkey, Fox, Cheetah, Rabbit
                const offsets = [
                -0.15,
                -0.04,
                 0.09,
                 0.22
            ];

            offsetX = offsets[index] ?? 0;

        } else if (this.requiredRescues === 3) {

            const offsets = isStormLevel2
                ? [-0.10, 0.08, 0.24]
                : isWindyLevel3
                    ? [-0.10, 0.08, 0.24]
                    : [-0.10, 0.08, 0.22];

            offsetX = offsets[index] ?? 0;

        } else if (this.requiredRescues > 1) {

            offsetX = isStormLevel1
                ? ([0.02, 0.24][index] ?? 0.02)
                : 0.02 + index * 0.25;
        }

        const faceX =
            basket.x + this.pandaWidth * offsetX;

        const faceY =
            basket.y - this.pandaHeight * 0.12;

        face.setPosition(faceX, faceY);
    });
}



        checkSafeIslandLanding() {
        // ENABLE LANDING FOR SUNNY SKIES AND WINDY HEIGHTS 1/3

            const mainLevel = Number(this.mainLevelId);
            const sublevel = Number(this.sublevelId);

            const isSunnySkies =
                mainLevel === 1 &&
                [1, 2, 3].includes(sublevel);

            const isWindyHeights =
                mainLevel === 2 &&
                [1, 2,3].includes(sublevel);


            const isStormLevel1 =
                mainLevel === 3 &&
                sublevel === 1;

            const isStormLevel2 =
                mainLevel === 3 &&
                sublevel === 2;

            const isStormLevel3 =
                mainLevel === 3 &&
                sublevel === 3;


            const isRainbowLevel1 =
                mainLevel === 4 &&
                sublevel === 1;


            const isRainbowLevel2 =
                mainLevel === 4 &&
                sublevel === 2;

            const isRainbowLevel3 =
                mainLevel === 4 &&
                sublevel === 3;

            const isRainbowValley =
                isRainbowLevel1 ||
                isRainbowLevel2 ||
                isRainbowLevel3;


            // Enable Storm Rescue 1/3 and 2/3 landing.
            if (
                !isSunnySkies && !isWindyHeights && !isStormLevel1 && !isStormLevel2 && !isStormLevel3 && !isRainbowLevel1 && !isRainbowValley
            ) {
                return;
            }


            if (
                !this.gameplayStarted || this.isGamePaused ||this.isLandingSequencePlaying ||this.levelCompleted || this.isGameOver ||!this.safeIsland
            ) {
                return;
            }

            // Do not allow landing until all animals
            // have been rescued.
            if (
                this.rescuedCount < this.requiredRescues
            ) {
                return;
            }

            // RAINBOW VALLEY:
            // BOTH BANANAS MUST BE COLLECTED

            if (
                isRainbowValley &&
                (
                    !this.stormLevel3Bananas ||
                    this.stormLevel3Bananas.some(
                        banana => !banana.collected
                    )
                )
            ) {
                return;
            }


            // LANDING POSITION FOR ALL IMPLEMENTED LEVELS

            const isLevel2 =
                mainLevel === 1 && sublevel === 2;

            const isLevel3 =
                mainLevel === 1 && sublevel === 3;

            const isWindyLevel1 =
                mainLevel === 2 && sublevel === 1;

            const isWindyLevel2 =
                mainLevel === 2 && sublevel === 2;

            const isWindyLevel3 =
                mainLevel === 2 && sublevel === 3;


            const landingX =
                this.safeIsland.x +
                this.safeIsland.displayWidth * (
                    isRainbowLevel1 ? -0.04 :
                    isStormLevel3 ? 0.0 :
                    isStormLevel2 ? 0.0 :
                    isStormLevel1 ? 0.0 :
                    isWindyLevel3 ? 0.02 :
                    isWindyLevel2 ? 0.02 :
                    isWindyLevel1 ? 0.0 :
                    isLevel3 ? 0.03 :
                    isLevel2 ? -0.02 : -0.05
            );

            const landingY =
               this.safeIsland.y +
                this.safeIsland.displayHeight * (
                    isRainbowValley ? 0.0 :
                    isRainbowLevel1 ? -0.04 :
                    isStormLevel3 ? -0.04 :
                    isStormLevel2 ? -0.04 :
                    isStormLevel1 ? -0.04 :
                    isWindyLevel3 ? -0.04 :
                    isWindyLevel2 ? -0.06 :
                    isWindyLevel1 ? -0.06 :
                    isLevel3 ? 0.055 :
                    isLevel2 ? -0.12 : -0.08
            );

            // Use the existing balloon basket position,
            // not the center of the full panda image.
            const basket =
                this.getBalloonBasketPosition();

            const landingWidth =
                this.safeIsland.displayWidth * 0.30;

            const landingHeight =
                this.safeIsland.displayHeight * 0.18;

            const isInsideLandingZone =
                Math.abs(basket.x - landingX) <=
                    landingWidth / 2 &&
                Math.abs(basket.y - landingY) <=
                    landingHeight / 2;

                if (
                    isInsideLandingZone &&
                    !this.hasReachedLandingZone
                ) {
                    this.hasReachedLandingZone = true;

                    console.log(
                        'Safe Island landing sequence started!'
                    );

                    this.startSafeIslandLanding(
                        landingX,
                        landingY
                    );

                    return;
                }

                // Reset detection if the player flies away.
            if (!isInsideLandingZone) {
                this.hasReachedLandingZone = false;
            }
        }


        startSafeIslandLanding(landingX, landingY) {

            if (
                this.isLandingSequencePlaying ||
                this.levelCompleted
            ) {
                return;
            }

            // Prevent the landing from starting twice.
            this.isLandingSequencePlaying = true;

            console.log('Panda is landing...');

            // The target is based on the BALLOON BASKET,
            // not the center of the panda image.
            const targetX = landingX;

            const targetY =
                landingY - this.pandaHeight * 0.28;

            // Animate the existing position object,
            // which is used by update() to place the panda.
            this.tweens.add({
                targets: this.pandaPosition,

                x: targetX,
                y: targetY,

                duration: 1300,
                ease: 'Sine.easeInOut',

                onComplete: () => {

                    console.log(
                        'Panda landed successfully!'
                    );

                    this.finishMonkeyDelivery();
                }
            });
        }


        finishMonkeyDelivery() {
            if (this.levelCompleted) return;

            // Ensure the final landing has finished.
            this.levelCompleted = true;


            // FINAL LEVEL SCORE CALCULATION

            // Active seconds spent playing.
            const activeSeconds = Math.floor(
                this.activePlayMs / 1000
            );

            // Faster rescue earns more points.
            const timeBonus = Math.max(
                0,
                500 - (5 * activeSeconds)
            );

            // Remaining energy earns bonus points.
            const energyBonus = this.bananaEnergy * 2;

            // Rescue points were already added
            // during animal pickup.
            this.currentScore += timeBonus + energyBonus;

            // Update the final score on the HUD.
            if (this.scoreText) {
                this.scoreText.setText(`${this.currentScore}`);
            }

            console.log('LEVEL SCORE SUMMARY', {
                rescuedAnimals: this.rescuedCount,
                rescuePoints: this.rescuedCount * 100,
                activeSeconds,
                timeBonus,
                remainingEnergy: this.bananaEnergy,
                energyBonus,
                finalScore: this.currentScore
            });


        // SAVE COMPLETED LEVEL SCORE TO MYSQL

        if (!this.scoreSaveRequested) {

            this.scoreSaveRequested = true;

            console.log('Saving completed level score...');

            saveCompletedLevelScore({

                mainLevelId: Number(this.mainLevelId),

                sublevelId: Number(this.sublevelId),

                rescuedAnimals: this.rescuedCount,

                activeSeconds: activeSeconds,

                remainingEnergy: this.bananaEnergy

            })
            .then((result) => {

                console.log(
                    'PLAYER SCORE SAVED SUCCESSFULLY!',
                    result
                );

                console.log(
                    'Current Attempt Score:',
                    result.submittedScore
                );

                console.log(
                    'Personal Best Score:',
                    result.bestScore
                );

                console.log(
                    'New Personal Best:',
                    result.newPersonalBest
                );

                if (result.submittedScore !== this.currentScore) {
                    console.warn(
                        'Frontend and backend score calculations differ.',
                        {
                            frontendScore: this.currentScore,
                            backendScore: result.submittedScore
                        }
                    );
                }

            })
            .catch((error) => {

                console.error(
                    'Failed to save completed level score:',
                    error
                );


            });

        }



            // Stop the panda's floating animation.
            if (this.floatTween) {
                this.floatTween.pause();
            }

            this.floatOffset = 0;

            // Keep the panda at its final landing position.
            this.panda.setPosition(
                this.pandaPosition.x,
                this.pandaPosition.y
            );

            // Hide the happy monkey face from the basket.

            // DELIVER ALL RESCUED ANIMALS

            this.deliveredAnimals = [];

            const isLevel2 =
                Number(this.mainLevelId) === 1 && Number(this.sublevelId) === 2;
            const isLevel3 =
                Number(this.mainLevelId) === 1 && Number(this.sublevelId) === 3;

            const isWindyLevel1 =
                Number(this.mainLevelId) === 2 && Number(this.sublevelId) === 1;

            const isWindyLevel2 =
                Number(this.mainLevelId) === 2 && Number(this.sublevelId) === 2;

            const isWindyLevel3 =
                Number(this.mainLevelId) === 2 && Number(this.sublevelId) === 3;

            const isStormLevel1 =
                Number(this.mainLevelId) === 3 && Number(this.sublevelId) === 1;

            const isStormLevel2 =
                Number(this.mainLevelId) === 3 && Number(this.sublevelId) === 2;

            const isStormLevel3 =
                Number(this.mainLevelId) === 3 && Number(this.sublevelId) === 3;

            const isRainbowLevel1 =
                Number(this.mainLevelId) === 4 && Number(this.sublevelId) === 1;


            const isRainbowLevel2 =
                Number(this.mainLevelId) === 4 && Number(this.sublevelId) === 2;


            const isRainbowLevel3 =
                Number(this.mainLevelId) === 4 && Number(this.sublevelId) === 3;

            const rescuedAnimals =
                this.rescueAnimals.filter(
                    animal => animal.rescued
                );

            rescuedAnimals.forEach((animal, index) => {

                // Remove the animal's face from the basket.
                if (animal.carriedFace) {
                    animal.carriedFace.setVisible(false);
                }


            // SELECT DELIVERED ANIMAL TEXTURE




            const safeTextures = {
                dog: 'dogSafe',
                monkey: 'monkeySafe',
                fox: 'foxSafe',
                cheetah: 'cheetahSafe',
                bunny: 'bunnySafe',
                giraffe: 'giraffeSafe',
                cow: 'cowSafe',
                elephant: 'elephantSafe',
                reindeer: 'reindeerSafe',
                unicorn: 'unicornSafe'
            };

            const safeTexture =
                safeTextures[animal.type];

            if (!safeTexture) {
                console.error(
                    'No safe texture configured for:',
                    animal.type
                );
                return;
            }




                if (!this.textures.exists(safeTexture)) {
                    console.warn(
                        'Missing safe animal texture:',
                        safeTexture
                    );
                    return;
                }

                // POSITION ANIMALS ON SAFE ISLAND

            const level3Offsets = [
                -0.26,
                0.12,
                0.21
            ];

            const windyLevel3Offsets = {
                giraffe: -0.13,
                cow: 0.12,
                elephant: 0.27
            };


            const stormLevel2Offsets = {
                fox: -0.13,
                bunny: 0.11,
                cheetah: 0.21
            };

            const stormLevel3Offsets = {
                monkey: -0.17,
                fox: -0.08,
                cheetah: 0.09,
                bunny: 0.17
            };

            const rainbowLevel1Offsets = {
                dog: -0.13,
                elephant: 0.10,
                giraffe: 0.23
            };


            // RAINBOW VALLEY 2/3:
            // Position animals close to panda.

            const rainbowLevel2Offsets = {
                reindeer: -0.15,
                dog: 0.12,
                unicorn: 0.24
            };


            // RAINBOW VALLEY 3/3
            // Four animals positioned close to panda.

            const rainbowLevel3Offsets = {
                unicorn: -0.20,
                dog: -0.105,
                fox: 0.105,
                reindeer: 0.20
            };





            const xOffset = isRainbowLevel3
                ? (rainbowLevel3Offsets[animal.type] ?? 0)
                : isRainbowLevel2
                ? (rainbowLevel2Offsets[animal.type] ?? 0)
                : isRainbowLevel1
                    ? (rainbowLevel1Offsets[animal.type] ?? 0)
                : isStormLevel3
                    ? (stormLevel3Offsets[animal.type] ?? 0)
                        : isStormLevel2
                        ? (stormLevel2Offsets[animal.type] ?? 0)
                    : isStormLevel1
                    ? (animal.type === 'fox' ? -0.17 : 0.18)
                    : isWindyLevel3
                        ? (windyLevel3Offsets[animal.type] ?? 0)
                        : isWindyLevel2
                            ? (animal.type === 'giraffe' ? -0.19 : 0.20)
                            : isWindyLevel1
                                ? 0.17
                                : isLevel3
                                    ? (level3Offsets[index] ?? 0)
                                    : isLevel2
                                        ? (index === 0 ? -0.16 : 0.14)
                                        : -0.24;

            const stormLevel3YOffsets = {
                monkey: 0.015,
                fox: 0.02,
                cheetah: 0.025,
                bunny: 0.02
            };

            const yOffset = isRainbowLevel3
                ? 0.015
                : isRainbowLevel2
                ? 0.015
                : isRainbowLevel1
                    ? 0.015
                : isStormLevel3
                    ? (stormLevel3YOffsets[animal.type] ?? 0.02)
                    :isStormLevel2
                        ?(
                        animal.type === 'fox' ? 0.02 :
                        animal.type === 'bunny' ? 0.015 : 0.02
                    )
                        : isStormLevel1
                        ? 0.02
                            : isWindyLevel3
                            ? (
                                animal.type === 'giraffe' ? 0.01 :
                                animal.type === 'cow' ? 0.015 : 0.02
                            )
                                : isWindyLevel2
                                ? -0.02
                                    : isWindyLevel1
                                    ? -0.02
                                        : isLevel3
                                        ? 0.08
                                            : isLevel2
                                                ? 0.065
                                                : -0.04;


                    const deliveredSprite = this.add.image(
                    this.safeIsland.x +
                        this.safeIsland.displayWidth * xOffset,
                    this.safeIsland.y +
                        this.safeIsland.displayHeight * yOffset,
                    safeTexture
                );

                const stormLevel3Sizes = {
                    monkey: 0.085,
                    fox: 0.090,
                    cheetah: 0.090,
                    bunny: 0.078
                };
                // Level 3 animals should fit together.

            const rainbowLevel2Sizes = {
                reindeer: 0.095,
                dog: 0.090,
                unicorn: 0.095
            };


            const rainbowLevel3Sizes = {
                unicorn: 0.078,
                dog: 0.075,
                fox: 0.075,
                reindeer: 0.078
            };


            const sizeRatio = isRainbowLevel3
                ? (rainbowLevel3Sizes[animal.type] ?? 0.075)
                : isRainbowLevel2
                    ? (rainbowLevel2Sizes[animal.type] ?? 0.090)
                    : isRainbowLevel1
                        ? (
                        animal.type === 'elephant'
                            ? 0.105
                            : 0.095
                        )
                        : isStormLevel3
                            ? (stormLevel3Sizes[animal.type] ?? 0.085)
                            :isStormLevel2
                        ? (
                            animal.type === 'fox' ? 0.10 :
                            animal.type === 'bunny' ? 0.088 :
                            0.098
                        )
                            : isStormLevel1
                            ? (animal.type === 'fox' ? 0.12 : 0.11)
                                : isWindyLevel3
                                ? (
                                    animal.type === 'giraffe' ? 0.11 :
                                    animal.type === 'cow' ? 0.105 : 0.12
                                )
                                : isWindyLevel2
                                    ? (animal.type === 'giraffe' ? 0.12 : 0.13)
                                    : isWindyLevel1
                                        ? 0.125
                                        : isLevel3
                                            ? (animal.type === 'elephant' ? 0.11 : 0.09)
                                            : isLevel2
                                                ? (animal.type === 'elephant' ? 0.14 : 0.12)
                                                : 0.13;



                deliveredSprite.setScale(
                    (this.safeIsland.displayWidth * sizeRatio) /
                    deliveredSprite.width
                );


                // Anchor the animal at its feet.
                deliveredSprite.setOrigin(0.5, 1);

                deliveredSprite.setDepth(
                    (isLevel3 || isWindyLevel3 || isStormLevel2  || isStormLevel3|| isRainbowLevel1 || isRainbowLevel2 || isRainbowLevel3)
                        ? 18
                        : 22
                );


                this.deliveredAnimals.push(deliveredSprite);

                console.log(
                    `${animal.type} safely delivered!`
                );
            });


            const regionName =
                Number(this.mainLevelId) === 4
                    ? 'Rainbow Valley'
                    : Number(this.mainLevelId) === 3
                        ? 'Storm Rescue'
                        : Number(this.mainLevelId) === 2
                            ? 'Windy Heights'
                            : 'Sunny Skies';


            console.log(
                `${regionName} ${this.sublevelId}/3: ` +
                `${this.deliveredAnimals.length} animals delivered`
            );



                // Play completion sound once.
                if (
                    AudioManager.soundEnabled &&
                    this.cache.audio.exists('levelCompleteSound')
                ) {
                    this.sound.play('levelCompleteSound');
                }

                // Prevent gameplay from continuing.
                this.gameplayStarted = false;

                // Giving the player time to see the happy monkey on the Safe Island.
                this.time.delayedCall(1200, () => {
                    if (this.sys.isActive()) {
                        this.showLevelCompletePopup();
                    }
                });

        }



        triggerGameOver() {

            // Prevent Game Over from triggering twice.
            if (this.isGameOver || this.levelCompleted) {
                return;
            }

            this.isGameOver = true;

            // Stop active gameplay and energy consumption.
            this.gameplayStarted = false;
            this.isLandingSequencePlaying = false;

            // Stop the panda's floating animation.
            if (this.floatTween) {
                this.floatTween.pause();
            }

            console.log('GAME OVER! Banana Energy reached zero.');

            this.showGameOverPopup();
        }


        showGameOverPopup() {

            console.log('Game Over panel:', this.textures.exists('gameOverPanel'));
            console.log('Exhausted panda:', this.textures.exists('pandaExhausted'));

            if (this.gameOverPopup) return;

            const { width, height } = this.scale;

            const camera = this.cameras.main;

            const popup = this.add.container(
                camera.scrollX,
                camera.scrollY
            );

            popup.setScrollFactor(1);
            popup.setDepth(3000);
            this.gameOverPopup = popup;


            // Full-screen dim background
            const shade = this.add.rectangle(
                width / 2,
                height / 2,
                width + 10,
                height + 10,
                0x102c57,
                0.68
            );
            shade.setInteractive();
            popup.add(shade);

            // Main popup panel
            const panel = this.add.image(
             width * 0.58,
                height * 0.50,
                'gameOverPanel'
            );

            panel.setScale(Math.min(
                (width * 0.54) / panel.width,
                (height * 0.82) / panel.height
            ));
            popup.add(panel);

            // score row bg
            const scoreY = panel.y + panel.displayHeight * 0.12;

            const scoreBg = this.add.graphics();
            scoreBg.fillStyle(0xfff4c9, 0.95);
            scoreBg.lineStyle(3, 0xf2c14e, 1);
            scoreBg.fillRoundedRect(
                panel.x - panel.displayWidth * 0.30,
                scoreY - height * 0.035,
                panel.displayWidth * 0.58,
                height * 0.085,
                18
            );
            scoreBg.strokeRoundedRect(
                panel.x - panel.displayWidth * 0.30,
                scoreY - height * 0.035,
                panel.displayWidth * 0.58,
                height * 0.085,
                18
         );
            popup.add(scoreBg);

            const scoreIcon = this.add.image(
                panel.x - panel.displayWidth * 0.23,
                scoreY,
                'levelGoldStar'
            );
            scoreIcon.setDisplaySize(height * 0.060, height * 0.060);
                popup.add(scoreIcon);

            const scoreText = this.add.text(
                panel.x - panel.displayWidth * 0.09,
                scoreY,
                `${this.currentScore ?? 0}`,
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: `${Math.round(height * 0.027)}px`,
                    fontStyle: 'bold',
                    color: '#8a4b00',
                    align: 'left'
                }
            ).setOrigin(0, 0.5);
            popup.add(scoreText);

            // Optional small label
            const scoreLabel = this.add.text(
                panel.x + panel.displayWidth * 0.08,
                scoreY,
                'Score',
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: `${Math.round(height * 0.025)}px`,
                     fontStyle: 'bold',
                    color: '#164b9c',
                    align: 'left'
                }
            ).setOrigin(0, 0.5);
            popup.add(scoreLabel);

            // Rescued animals row bg

            const rescueY = panel.y + panel.displayHeight * 0.25;

            const rescueBg = this.add.graphics();
            rescueBg.fillStyle(0xdff4ff, 0.95);
            rescueBg.lineStyle(3, 0x8fd3ff, 1);
            rescueBg.fillRoundedRect(
                panel.x - panel.displayWidth * 0.30,
                rescueY - height * 0.035,
                    panel.displayWidth * 0.58,
                height * 0.085,
                18
             );
            rescueBg.strokeRoundedRect(
                panel.x - panel.displayWidth * 0.30,
                rescueY - height * 0.035,
                panel.displayWidth * 0.58,
                height * 0.085,
                18
            );
            popup.add(rescueBg);

            const monkeyIcon = this.add.image(
                panel.x - panel.displayWidth * 0.23,
                rescueY,
                'monkeyHappyFace'
            );
            monkeyIcon.setDisplaySize(height * 0.070, height * 0.070);
            popup.add(monkeyIcon);

            const rescueText = this.add.text(
                panel.x - panel.displayWidth * 0.10,
                rescueY,
                `Animals Rescued: ${this.rescuedCount}/${this.requiredRescues}`,
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: `${Math.round(height * 0.026)}px`,
                    fontStyle: 'bold',
                    color: '#164b9c',
                    align: 'left'
                }
            ).setOrigin(0, 0.5);
            popup.add(rescueText);

            // BUTTONS
            const buttonY = panel.y + panel.displayHeight * 0.38;
            const buttonWidth = Math.min(panel.displayWidth * 0.32, width * 0.18);

            const restartButton = this.add.image(
                panel.x - panel.displayWidth * 0.19,
                buttonY,
                'pauseRestart'
            );
            restartButton.setScale(buttonWidth / restartButton.width);
            restartButton.setInteractive({ useHandCursor: true });
            popup.add(restartButton);

            const backButton = this.add.image(
                panel.x + panel.displayWidth * 0.19,
                buttonY,
                'pauseBackLevels'
            );
            backButton.setScale(buttonWidth / backButton.width);
            backButton.setInteractive({ useHandCursor: true });
            popup.add(backButton);

            // exhausted panda
            const exhaustedPanda = this.add.image(
                width * 0.18,
                height * 0.54,
                'pandaExhausted'
            );

            const pandaTargetScale = Math.min(
                (width * 0.28) / exhaustedPanda.width,
                (height * 0.66) / exhaustedPanda.height
            );

            exhaustedPanda.setScale(pandaTargetScale * 0.45);
            exhaustedPanda.setAlpha(0);
            popup.add(exhaustedPanda);

            this.tweens.add({
                targets: exhaustedPanda,
                scale: pandaTargetScale,
                alpha: 1,
                duration: 1800,
                ease: 'Sine.Out'
            });

            // Restart button
            restartButton.on('pointerdown', () => {
                AudioManager.playButtonClick(this);

                this.time.paused = false;
                this.tweens.resumeAll();

                const music = this.sound.get('gameplayMusic');
                if (music) music.stop();

                this.scene.restart({
                    mainLevelId: this.mainLevelId,
                    sublevelId: this.sublevelId
                });
            });

            // Back to levels button
            backButton.on('pointerdown', () => {
                AudioManager.playButtonClick(this);

                this.time.paused = false;
                this.tweens.resumeAll();

                const music = this.sound.get('gameplayMusic');
                if (music) music.stop();

                AudioManager.startMusic(this, 'menuMusic');

                this.scene.start('SublevelSelectionScene', {
                    levelId: this.mainLevelId
                });
            });

            console.log('Game Over popup displayed!');
        }



        showLevelCompletePopup() {
            if (this.successPopup) return;

            const { width, height } = this.scale;

            const camera = this.cameras.main;

            // Match the working pause popup technique.
            this.successPopup = this.add.container(
                camera.scrollX,
                camera.scrollY
            );

            this.successPopup.setScrollFactor(1);
            this.successPopup.setDepth(2000);


            // DARK OVERLAY

            const shade = this.add.rectangle(
                width / 2,
                height / 2,
                width,
                height,
                0x102c57,
                0.65
            );

            shade.setInteractive();
            this.successPopup.add(shade);

            // Level complete panel

            const panel = this.add.image(
                width / 2,
                height * 0.49,
                'levelCompletePopup'
            );

            const panelScale = Math.min(
                (width * 0.52) / panel.width,
                (height * 0.82) / panel.height
            );

            panel.setScale(panelScale);

            this.successPopup.add(panel);



            // LEVEL COMPLETED - PLAYER STATISTICS


            const panelW = panel.displayWidth;
            const panelH = panel.displayHeight;

            // Format active gameplay time as MM:SS.
            const totalSeconds = Math.floor(
            (this.activePlayMs || 0) / 1000
            );

            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            const timeTaken =
                `${String(minutes).padStart(2, '0')}:` +
                `${String(seconds).padStart(2, '0')}`;

            // Real gameplay statistics
            const statistics = [
                {
                    label: 'Final Score',
                    value: `${this.currentScore}`,
                    color: 0xf5dc85,
                    icon: '🏆',
                    y: -0.050
                },
                {
                    label: 'Animals Rescued',
                    value: `${this.rescuedCount}/${this.requiredRescues}`,
                    color: 0xc9f1b7,
                    icon: '🐵',
                    y: 0.020
                },
                {
                    label: 'Banana Energy',
                    value: `${this.bananaEnergy}/100`,
                    color: 0xaadff9,
                    icon: '🍌',
                    y: 0.090
                },
                {
                    label: 'Time Taken',
                    value: timeTaken,
                    color: 0xf7b9c0,
                    icon: '⏱️',
                    y: 0.160
                }
            ];


        // ALIGNED STATISTICS POSITIONS

        // Center icons inside the colored squares.
        const iconX = panel.x - panelW * 0.210;

        // Align all labels consistently.
        const labelX = panel.x - panelW * 0.150;

        // Move the value badges to the right.
        const valueX = panel.x + panelW * 0.230;

        const badgeW = panelW * 0.175;
        const badgeH = panelH * 0.052;


        statistics.forEach((row) => {

            const rowY = panel.y + panelH * row.y;

            // Icon
            const icon = this.add.text(
                iconX,
                rowY,
                row.icon,
                {
                    fontFamily: 'Segoe UI Emoji, Arial',
                    fontSize: `${Math.round(panelH * 0.034)}px`
                }
            ).setOrigin(0.5);

            this.successPopup.add(icon);

            // Statistic label
            const label = this.add.text(
                labelX,
                rowY,
                row.label,
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: `${Math.round(panelH * 0.030)}px`,
                    fontStyle: 'bold',
                    color: '#173b78'
                }
            ).setOrigin(0, 0.5);

            this.successPopup.add(label);

            // Rounded value background
            const badge = this.add.graphics();

            badge.fillStyle(row.color, 0.98);

            badge.fillRoundedRect(
                valueX - badgeW / 2,
                rowY - badgeH / 2,
                badgeW,
                badgeH,
                badgeH / 2
            );

            this.successPopup.add(badge);

            // Statistic value
            const value = this.add.text(
                valueX,
                rowY,
                row.value,
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: `${Math.round(panelH * 0.028)}px`,
                    fontStyle: 'bold',
                    color: '#63340d'
                }
            ).setOrigin(0.5);

            this.successPopup.add(value);
        });




        // LEVEL COMPLETION ACHIEVEMENT

        const allAnimalsRescued =
            this.rescuedCount === this.requiredRescues &&
            this.requiredRescues > 0;

        if (allAnimalsRescued) {

            const achievementX = panel.x + panelW * 0.06;

            const achievementTitle = this.add.text(
                achievementX,
                panel.y + panelH * 0.265,
                'New Achievement Unlocked!',
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: `${Math.round(panelH * 0.023)}px`,
                    fontStyle: 'bold',
                    color: '#17418a'
                }
            ).setOrigin(0.5);

            this.successPopup.add(achievementTitle);

            const achievementName = this.add.text(
                achievementX - panelW * 0.065,
                panel.y + panelH * 0.310,
                '🐾 Animal Rescuer',
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: `${Math.round(panelH * 0.037)}px`,
                    fontStyle: 'bold',
                    color: '#ffda39',
                    stroke: '#71400d',
                    strokeThickness: 4
                }
            ).setOrigin(0.5);

            this.successPopup.add(achievementName);
        }


            // Navigation buttons

            const buttonWidth =
                Math.min(panel.displayWidth * 0.43, width * 0.19);

            const buttonY =
                panel.y + panel.displayHeight * 0.40;

            // Reuse your existing Next Level asset.
            const nextButton = this.add.image(
                panel.x - panel.displayWidth * 0.23,
                buttonY,
                'nextLevelBtn'
            );

                nextButton.setScale(
                buttonWidth / nextButton.width
            );

            nextButton.setInteractive({
                useHandCursor: true
            });

            this.successPopup.add(nextButton);

            // Reuse the Back to Levels asset
            // already used in the pause popup.
            const backButton = this.add.image(
                panel.x + panel.displayWidth * 0.23,
                buttonY,
                'pauseBackLevels'
            );

            backButton.setScale(
                buttonWidth / backButton.width
            );

            backButton.setInteractive({
                useHandCursor: true
            });

            this.successPopup.add(backButton);

            // FEEDBACK MESSAGE

            const statusText = this.add.text(
                panel.x,
                panel.y + panel.displayHeight * 0.47,
                '',
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: `${Math.round(height * 0.018)}px`,
                    fontStyle: 'bold',
                    color: '#ffffff',
                    stroke: '#153b7a',
                    strokeThickness: 4,
                    align: 'center',
                    wordWrap: {
                        width: panel.displayWidth * 0.85
                    }
                }
            );

            statusText.setOrigin(0.5);
            this.successPopup.add(statusText);

            // BACK TO LEVELS

            backButton.on('pointerdown', () => {
                AudioManager.playButtonClick(this);

                const gameplayMusic =
                    this.sound.get('gameplayMusic');

                if (gameplayMusic) {
                    gameplayMusic.stop();
                }

                AudioManager.startMusic(
                    this,
                    'menuMusic'
                );

                this.scene.start(
                    'SublevelSelectionScene',
                    {
                        levelId: this.mainLevelId
                    }
                );
            });

            // NEXT LEVEL

            let checkingProgress = false;

            nextButton.on('pointerdown', async () => {
                if (checkingProgress) return;

                AudioManager.playButtonClick(this);

                checkingProgress = true;
                statusText.setText('Checking next level...');

                const nextSublevelId =
                    Number(this.sublevelId) + 1;

                // No more sublevels after 3/3.

                // MOVE TO THE NEXT MAIN LEVEL

                if (nextSublevelId > 3) {

                    const nextMainLevelId =
                        Number(this.mainLevelId) + 1;

                    try {
                        const progress =
                            await fetchPlayerProgress();

                        if (!this.sys.isActive()) return;

                        const nextMainLevel = progress.find(
                            level =>
                                Number(level.mainLevelId) ===
                                nextMainLevelId
                        );

                        if (nextMainLevel?.unlocked !== true) {
                            statusText.setText(
                                'Next region is still locked.'
                            );
                            return;
                        }

                        const gameplayMusic =
                            this.sound.get('gameplayMusic');

                        if (gameplayMusic) {
                            gameplayMusic.stop();
                        }

                        AudioManager.startMusic(
                            this,
                            'menuMusic'
                        );

                        // Show the next region's sublevels.
                        this.scene.start(
                            'SublevelSelectionScene',
                            {
                                levelId: nextMainLevelId
                            }
                        );

                    } catch (error) {

                        console.error(
                            'Unable to open next region:',
                            error
                        );

                        if (this.sys.isActive()) {
                            statusText.setText(
                                'Unable to check next region.'
                            );
                        }

                    } finally {
                        checkingProgress = false;
                    }

                    return;
                }


                try {
                    const progress =
                        await fetchPlayerProgress();

                    if (!this.sys.isActive()) return;

                    const mainProgress = progress.find(
                        item =>
                            Number(item.mainLevelId) ===
                            Number(this.mainLevelId)
                    );

                    const nextProgress =
                        mainProgress?.sublevels?.find(
                            item =>
                                Number(item.sublevelId) ===
                                nextSublevelId
                        );

                    if (nextProgress?.unlocked !== true) {
                        statusText.setText(
                            'Next level is still locked.'
                     );
                     return;
                 }

                    const gameplayMusic =
                        this.sound.get('gameplayMusic');

                    if (gameplayMusic) {
                        gameplayMusic.stop();
                    }

                 this.scene.start('GameplayScene', {
                       mainLevelId: this.mainLevelId,
                     sublevelId: nextSublevelId
                  });

             } catch (error) {
                    console.error(
                     'Unable to verify next level:',
                         error
                 );

                    if (this.sys.isActive()) {
                       statusText.setText(
                            'Unable to check progress.'
                      );
                   }
                } finally {
                    checkingProgress = false;
                }
         });


         // POPUP ENTRANCE ANIMATION

            this.successPopup.setScale(0.85);
            this.successPopup.setAlpha(0);

            // Scale around screen center.
            this.successPopup.setPosition(
                camera.scrollX + width * 0.075,
                camera.scrollY + height * 0.0735
            );

            this.tweens.add({
                targets: this.successPopup,
                scale: 1,
                alpha: 1,
                x: camera.scrollX,
                y: camera.scrollY,
                duration: 350,
                ease: 'Back.Out'
            });

            console.log('Level Completed popup displayed!');
        }





        createEnergyHUD() {
            const { width, height } = this.scale;

            // Initial energy value
            this.bananaEnergy = 100;

            // ENERGY BAR POSITION

            const hudX = width * 0.16;
            const hudY = height * 0.08;

            this.energyHUD = this.add.image(
                hudX,
                hudY,
                'gameplayEnergyBar'
            );

            // Increase the overall size while
            // preserving the image proportions.
            const targetWidth = width * 0.29;

            this.energyHUD.setScale(
                targetWidth / this.energyHUD.width
            );

            this.energyHUD.setScrollFactor(0);
            this.energyHUD.setDepth(150);


            // DYNAMIC ENERGY FILL

            this.energyFill = this.add.graphics();

            this.energyFill.setScrollFactor(0);
            this.energyFill.setDepth(150.5);

            // Approximate the inner dark-blue track using the scaled dimensions of the PNG.
            this.energyTrack = {
                x: this.energyHUD.x -
                    this.energyHUD.displayWidth * 0.22,

                y: this.energyHUD.y -
                    this.energyHUD.displayHeight * 0.06,

             width: this.energyHUD.displayWidth * 0.592,
             height: this.energyHUD.displayHeight * 0.18
            };


            // Energy valu text

            const textX =
                hudX + this.energyHUD.displayWidth * 0.30;

            const textY =
              hudY + this.energyHUD.displayHeight * 0.068;

            this.energyText = this.add.text(
                textX,
                textY,
                `${this.bananaEnergy}/100`,
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: `${Math.round(height * 0.022)}px`,
                    fontStyle: 'bold',
                    color: '#ffffff',
                    stroke: '#123b79',
                    strokeThickness: 3,
                    align: 'center'
                }
            );


                this.energyText.setOrigin(0.5);
                this.energyText.setScrollFactor(0);
                this.energyText.setDepth(151);

                // Update only AFTER the new text object exists.
                this.updateEnergyHUD();

                console.log('Banana Energy HUD created');

        }


        updateEnergyHUD() {
            if (!this.energyFill || !this.energyTrack) {
                return;
            }

            // Energy is always between 0 and 100.
            this.bananaEnergy = Phaser.Math.Clamp(
                this.bananaEnergy,
                0,
                100
            );

            const { x, y, width, height } = this.energyTrack;

            const fillWidth =
                width * (this.bananaEnergy / 100);

                this.energyFill.clear();

            if (fillWidth > 0) {
                // Yellow energy fill.
                this.energyFill.fillStyle(0xffd42a, 1);

                this.energyFill.fillRoundedRect(
                    x,
                    y,
                    fillWidth,
                    height,
                    Math.min(height / 2, fillWidth / 2)
                );
            }

            // Keep the number synchronized.
            if (this.energyText) {
                this.energyText.setText(
                    `${this.bananaEnergy}/100`
                );
            }
        }



        updateEnergyDrain(delta) {
            //no drain energy outside active gameplay
            if (
                !this.gameplayStarted || this.isGamePaused || this.isLandingSequencePlaying || this.levelCompleted || this.isPuzzleOpen || this.bananaEnergy <= 0
            ) {
                return;
            }

            this.energyElapsedMs += delta;

            while (this.energyElapsedMs >= 1000) {
                this.energyElapsedMs -= 1000;

                this.bananaEnergy = Phaser.Math.Clamp(
                    this.bananaEnergy - 1,
                    0,
                    100
                );

                this.updateEnergyHUD();

                if (this.bananaEnergy === 0) {
                    this.triggerGameOver();
                    break;
                }
            }
        }



        //ScoreHUD Image
        createScoreHUD() {
            const { width, height } = this.scale;

            // Current sublevel score.
            // Actual scoring calculations come later.
            this.currentScore = 0;

            // Position below the animal rescue counter
            // so it does not overlap the pause button.
            const hudX = width * 0.850;
            const hudY = height * 0.075;

            this.scoreHUD = this.add.image(
                hudX,
                hudY,
                'levelStarCounter'
            );

            const targetWidth = width * 0.15;

            // Preserve the original image proportions.
            this.scoreHUD.setScale(
                targetWidth / this.scoreHUD.width
            );

            this.scoreHUD.setScrollFactor(0);
            this.scoreHUD.setDepth(150);

            // Numeric score displayed on the artwork.
            const textX =
                hudX + this.scoreHUD.displayWidth * 0.18;

            const textY =
                hudY + this.scoreHUD.displayHeight * 0.02;

            this.scoreText = this.add.text(
                textX,
                textY,
                `${this.currentScore}`,
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: `${Math.round(height * 0.030)}px`,
                    fontStyle: 'bold',
                    color: '#ffffff',
                    stroke: '#164b9c',
                    strokeThickness: 3,
                    align: 'center'
                }
            );

            this.scoreText.setOrigin(0.5);
            this.scoreText.setScrollFactor(0);
            this.scoreText.setDepth(151);

            console.log('Gameplay Score HUD created');
        }


        //COUNTDOWN

        startCountdown() {
            const { width, height } = this.scale;

            this.gameplayStarted = false;

            const countdownText = this.add.text(
                width / 2,
                height / 2,
                    '',
                {
                    fontFamily: 'Arial, sans-serif',
                   fontSize: `${Math.round(height * 0.16)}px`,
                   fontStyle: 'bold',
                    color: '#ffdf27',
                    stroke: '#164b9c',
                    strokeThickness: 10
                }
            );

            countdownText.setOrigin(0.5);
            countdownText.setScrollFactor(0);
            countdownText.setDepth(200);

            const countdownValues = [
                '3',
                '2',
                '1',
                'GO!'
            ];

            let countdownIndex = 0;

            const showNext = () => {
                if (
                    countdownIndex >= countdownValues.length
                ) {
                    countdownText.destroy();
                    return;
                }

                const value = countdownValues[countdownIndex];

                countdownText.setText(value);
                countdownText.setScale(0.5);
                countdownText.setAlpha(1);

                this.tweens.add({
                    targets: countdownText,
                    scale: 1.15,
                    duration: 400,
                    ease: 'Back.Out'
                });

                if (value === 'GO!') {
                    this.gameplayStarted = true;
                }

                countdownIndex++;

                this.time.delayedCall(1000, showNext);
            };

            showNext();
        }

        // OPEN PAUSE MENU

        openPauseMenu() {
            if (
                this.isGamePaused || this.isGameOver || this.levelCompleted || this.isLandingSequencePlaying
            )
            {
                return;
            }

            this.isGamePaused = true;

            this.time.paused = true;
            this.tweens.pauseAll();

            const gameplayMusic =
                this.sound.get('gameplayMusic');

            this.musicWasPlayingBeforePause =
                Boolean(gameplayMusic?.isPlaying);

            if (this.musicWasPlayingBeforePause) {
                gameplayMusic.pause();
            }

            const { width, height } = this.scale;

            const camera = this.cameras.main;
            const cameraX = camera.scrollX;
            const cameraY = camera.scrollY;

            // Preserve the working camera-aware popup.
            this.pauseOverlay = this.add.container(
                cameraX,
                cameraY
            );

            this.pauseOverlay.setScrollFactor(1);
            this.pauseOverlay.setDepth(1000);

            const shade = this.add.rectangle(
                width / 2,
                height / 2,
                width,
                height,
                0x102c57,
                0.48
            );

            shade.setInteractive();
            this.pauseOverlay.add(shade);

            const panel = this.add.image(
                width / 2,
                height * 0.50,
                'pausePanel'
            );

            const panelScale = Math.min(
                (width * 0.60) / panel.width,
                (height * 0.72) / panel.height
            );

            panel.setScale(panelScale);
            this.pauseOverlay.add(panel);

            const buttonsX =
                panel.x + panel.displayWidth * 0.17;

            const buttonWidth = Math.min(
                panel.displayWidth * 0.32,
                width * 0.21
            );

            const buttonSpacing =
                panel.displayHeight * 0.14;

            const restartY =
                panel.y + panel.displayHeight * 0.19;

            const resumeY =
                restartY - buttonSpacing;

            const backY =
                restartY + buttonSpacing;

            // Resume
            this.addPauseAction(
                buttonsX,
                resumeY,
                'pauseResume',
                buttonWidth * 1.12,
                () => this.closePauseMenu()
            );

            // Restart current sublevel
            this.addPauseAction(
                buttonsX,
                restartY,
                'pauseRestart',
                buttonWidth,
                () => {
                    this.leavePauseMenu();

                    this.scene.restart({
                        mainLevelId: this.mainLevelId,
                        sublevelId: this.sublevelId
                    });
                }
            );

            // Back to sublevel selection
            this.addPauseAction(
                buttonsX,
                backY,
                'pauseBackLevels',
                buttonWidth,
                () => {
                    this.leavePauseMenu();

                    AudioManager.startMusic(
                        this,
                        'menuMusic'
                    );

                    this.scene.start(
                        'SublevelSelectionScene',
                        {
                            levelId: this.mainLevelId
                        }
                    );
                }
            );
        }

        //PAUSE POPUP BUTTON HELPER

        addPauseAction(x, y, texture, width, callback) {
            const image = this.add.image(x, y, texture);

            image.setScale(width / image.width);

            image.setInteractive({
                useHandCursor: true
            });

            image.on('pointerover', () => {
                image.setTint(0xe8f8ff);
            });

            image.on('pointerout', () => {
                image.clearTint();
            });

            image.on('pointerdown', () => {
                if (!this.isGamePaused) return;

                console.log(
                    'Pause button clicked:',
                    texture
                );

                callback();
            });

            this.pauseOverlay.add(image);

            return image;
        }

        // RESUME GAME

        closePauseMenu() {
            if (!this.isGamePaused) return;

            this.pauseOverlay?.destroy(true);
            this.pauseOverlay = null;

            this.isGamePaused = false;

            this.time.paused = false;
            this.tweens.resumeAll();

            const gameplayMusic =
                this.sound.get('gameplayMusic');

            if (
                this.musicWasPlayingBeforePause &&
                gameplayMusic?.isPaused
            ) {
                gameplayMusic.resume();
            }
        }

        //CLEANUP BEFORE RESTART OR EXIT


        leavePauseMenu() {
         // Remove the pause popup.
         if (this.pauseOverlay) {
                this.pauseOverlay.destroy(true);
                this.pauseOverlay = null;
            }

            // Reset pause state.
            this.isGamePaused = false;
            this.musicWasPlayingBeforePause = false;

            // Restore the Phaser clock.
            this.time.paused = false;

            // Restore all tweens.
            this.tweens.resumeAll();

            // Stop gameplay music before navigation.
            const gameplayMusic =
                this.sound.get('gameplayMusic');

            if (gameplayMusic) {
                gameplayMusic.stop();
            }

            console.log('Pause state cleaned before navigation');
        }


            //GAME UPDATE LOOP

            update(time, delta) {
                if (
                    !this.panda || !this.cursors || this.isGamePaused || this.isPuzzleOpen
                ) {
                    return;
                }

                // Count only active gameplay time.
                // Puzzle time, pause time and landing time are excluded.
                if (
                    this.gameplayStarted && !this.isLandingSequencePlaying && !this.levelCompleted && !this.isGameOver
                ) {
                    this.activePlayMs += delta;
                }

                const dt = Math.min(delta, 50) / 1000;

                if (this.input.keyboard.addKey('D').isDown) {
                    console.log({
                        pandaWorldX: Math.round(this.pandaPosition.x),
                        cameraScrollX: Math.round(this.cameras.main.scrollX)
                    });
                }

                let moveX = 0;
                let moveY = 0;

                if (
                    this.gameplayStarted &&
                    !this.isLandingSequencePlaying &&
                    !this.levelCompleted
                ) {
                    if (this.cursors.left.isDown) {
                        moveX = -1;
                    } else if (this.cursors.right.isDown) {
                        moveX = 1;
                    }

                    if (this.cursors.up.isDown) {
                        moveY = -1;
                    } else if (this.cursors.down.isDown) {
                        moveY = 1;
                    }
                }

                const magnitude = Math.hypot(moveX, moveY);

                if (magnitude > 0) {
                    moveX /= magnitude;
                    moveY /= magnitude;
                }

            // UPDATE MOVING ISLANDS

                this.updateMovingIslands(dt, time);

            //NEW PANDA POSITION

                const { height } = this.scale;

                const halfWidth = this.pandaWidth / 2;
                const halfHeight = this.pandaHeight / 2;

                const proposedX = Phaser.Math.Clamp(
                    this.pandaPosition.x +
                        moveX * this.pandaSpeed * dt,
                    halfWidth,
                    Math.max(
                        halfWidth,
                        this.worldWidth - halfWidth
                    )
                );

                const proposedY = Phaser.Math.Clamp(
                    this.pandaPosition.y +
                        moveY * this.pandaSpeed * dt,
                    halfHeight + 5,
                    Math.max(
                        halfHeight + 5,
                        height - halfHeight - 5
                    )
                );

                // HORIZONTAL COLLISION CHECK

                const horizontalCollision =
                    this.getBlockingCollisionAt(
                        proposedX,
                        this.pandaPosition.y
                    );

                if (!horizontalCollision) {
                    this.pandaPosition.x = proposedX;
                } else if (moveX !== 0) {
                    this.registerPandaHit(time);
                }

                // VERTICAL COLLISION CHECK

                const verticalCollision =
                    this.getBlockingCollisionAt(
                        this.pandaPosition.x,
                        proposedY
                    );

                if (!verticalCollision) {
                    this.pandaPosition.y = proposedY;
                } else if (moveY !== 0) {
                    this.registerPandaHit(time);
                }

             // PANDA APPEARANCE

                this.updatePandaAppearance(
                    moveX,
                    moveY,
                    time
                );

                // UPDATE PANDA POSITION
                this.panda.setPosition(
                    this.pandaPosition.x,
                    this.pandaPosition.y + this.floatOffset
                );

                // GOLDEN BANANA COLLECTION
                this.checkGoldenBananaCollection();

                // ANIMAL PICKUP AND BALLOON ATTACHMENT
                this.updateAnimalRescue();

                // Check whether the rescued animals have reached the Safe Island
                this.checkSafeIslandLanding();

                // SLOW SKY PARALLAX SCROLLING

                    this.skyBackground.tilePositionX =
                    this.cameras.main.scrollX *
                    this.backgroundParallaxFactor /
                    this.skyBackground.tileScaleX;



                // SUNNY SKIES BIRDS
                this.updateBirdObstacles(dt, time);

                // STORM RESCUE OBSTACLES
                this.updateStormBatObstacles(dt, time);
                this.updateStormCloudObstacles(dt, time);

                // WINDY HEIGHTS
                this.updateWindGustObstacles(dt, time);

                // RAINBOW VALLEY
                this.updateRainbowObstacles(dt, time);


                    //Energydrain by -1

                    this.updateEnergyDrain(delta);
            }
        }

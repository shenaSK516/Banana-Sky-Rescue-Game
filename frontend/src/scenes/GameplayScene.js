import Phaser from 'phaser';
import ImageButton from '../components/ImageButton.js';
import AudioManager from '../components/AudioManager.js';
import { fetchPlayerProgress } from '../services/playerProgressApi.js';
import {startBananaPuzzle,submitBananaPuzzleAnswer} from '../services/bananaPuzzleApi.js';

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
        this.isPuzzleOpen = false;

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

        this.worldWidth = width * 4;
        this.worldHeight = height;

        this.cameras.main.setBackgroundColor('#87CEEB');

        this.cameras.main.setBounds(
            0,
            0,
            this.worldWidth,
            this.worldHeight
        );

        //Gameplay islands

        this.createGameplayIslands();

        this.createRescueMonkey();

        this.createRescueHUD();

        this.createBirdObstacles();

        this.createGoldenBanana();

        //SUNNY SKIES BACKGROUND

        const backgroundTexture =
            this.textures.get('sunnyGameplayBackground');

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
            'sunnyGameplayBackground'
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

        // Only for Sunny Skies 1/3
        if (
            Number(this.mainLevelId) !== 1 ||
            Number(this.sublevelId) !== 1
        ) {
            return;
        }

        const { width, height } = this.scale;

        // Golden Banana position
        const bananaX = width * 1.83;
        const bananaY = height * 0.63;

        // Create a container to hold banana + glow dots
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


    checkGoldenBananaCollection() {

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
        const camera = this.cameras.main;


        // Pause and Game Over popups
        const popup = this.add.container(
            camera.scrollX,
            camera.scrollY
        );

        popup.setScrollFactor(1);
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

            if (
                Number(this.mainLevelId) !== 1 || Number(this.sublevelId) !== 1
            ) {
                return;
            }

        // Smaller islands for Sunny Skies 1/3.
        // Moving islands:
        // floatingIsland
        // Stationary islands:
        //   animalRescueIsland
        //   obstacleIsland1
        //   obstacleIsland2

            const islandLayout = [
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

            this.gameplayIslands = [];
            this.blockingIslands = [];
            this.movingIslands = [];

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

            // All islands above are blocking.
            this.blockingIslands.push(island);

            if (islandData.moving) {
                this.movingIslands.push({
                    sprite: island,
                    speed: islandData.speed,
                    activated: false,
                    finished: false
                });
            }
        }

        // SAFE ISLAND

        const safeIslandKey = 'safeIsland_1_1';

        if (this.textures.exists(safeIslandKey)) {
            this.safeIsland = this.add.image(
                this.worldWidth - width * 0.25,
                height * 0.53,
                safeIslandKey
            );

            this.safeIsland.setScale(
                (width * 0.45) / this.safeIsland.width
            );

            this.safeIsland.setDepth(5);

            this.gameplayIslands.push(
                this.safeIsland
            );

            // The Safe Island is intentionally
            // NOT added to blockingIslands.

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
            'Gameplay islands:',
            this.gameplayIslands.length
        );

        console.log(
            'Moving islands:',
            this.movingIslands.length
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



        createBirdObstacles() {
            if (
                Number(this.mainLevelId) !== 1 ||
                Number(this.sublevelId) !== 1
            ) {
                return;
            }

            if (!this.textures.exists('blackBird')) {
                console.warn('Black bird texture is missing');
             return;
            }

            const { width, height } = this.scale;

            // Two birds positioned along the journey.
            const birdPositions = [
                { x: width * 1.90, y: height * 0.42 },
                { x: width * 2.85, y: height * 0.55 }
            ];

                this.birdObstacles = birdPositions.map(position => {
                const bird = this.add.image(
                    position.x,
                    position.y,
                    'blackBird'
                );

                bird.setDisplaySize(
                    width * 0.055,
                    width * 0.045
                );

                bird.setDepth(15);

                return {
                    sprite: bird,
                    speed: 120,
                    active: false,
                    finished: false
                };
            });
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
                        volume: 0.7
                    });
                }


            // Remove worried animal and HELP bubble.
            animal.sprite.setVisible(false);
            animal.helpBubble.setVisible(false);
            animal.prompt.setVisible(false);

            // Create happy face inside the balloon.
            const happyFace = this.add.image(
                this.panda.x,
                this.panda.y,
                animal.happyFaceKey
            );

            // Small enough to fit inside the basket.
            const targetWidth = this.pandaWidth * 0.27;

            happyFace.setScale(
                targetWidth / happyFace.width
            );

            happyFace.setDepth(21);

            animal.carriedFace = happyFace;

            this.carriedAnimalFaces.push(happyFace);

            // Update rescued animal count.
            this.rescuedCount++;

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
                !this.carriedAnimalFaces || this.carriedAnimalFaces.length === 0
            ) {
                return;
            }

            const basket = this.getBalloonBasketPosition();

            this.carriedAnimalFaces.forEach(
                (face, index) => {

                    // Place faces beside the panda
                    // inside the balloon basket.
                    const faceX =
                        basket.x +
                        this.pandaWidth * 0.17 +
                        index * this.pandaWidth * 0.12;

                    const faceY =
                        basket.y -
                        this.pandaHeight * 0.12;

                    face.setPosition(
                        faceX,
                        faceY
                    );
                }
            );
        }


        checkSafeIslandLanding() {
            // Only Sunny Skies 1/3 for now.
            if (
                Number(this.mainLevelId) !== 1 ||
                Number(this.sublevelId) !== 1
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

            // Approximate paw-print landing position
            // relative to the Safe Island.
            const landingX =
                this.safeIsland.x -
                this.safeIsland.displayWidth * 0.05;

            const landingY =
                this.safeIsland.y -
                this.safeIsland.displayHeight * 0.08;

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
            const monkey = this.rescueAnimals.find(
                animal => animal.id === 'monkey-1'
            );

            if (monkey?.carriedFace) {
                monkey.carriedFace.setVisible(false);
            }

            // Show the happy sitting monkey on the Safe Island
            if (
                this.safeIsland &&
                this.textures.exists('monkeySafe')
            ) {
                this.deliveredMonkey = this.add.image(
                    this.safeIsland.x -
                        this.safeIsland.displayWidth * 0.24,
                    this.safeIsland.y -
                        this.safeIsland.displayHeight * 0.04,
                    'monkeySafe'
                );

                // Scale relative to the Safe Island.
                const monkeyWidth =
                    this.safeIsland.displayWidth * 0.13;

                this.deliveredMonkey.setScale(
                    monkeyWidth / this.deliveredMonkey.width
                );

                // Position based on the monkey's feet.
                this.deliveredMonkey.setOrigin(0.5, 1);
                this.deliveredMonkey.setDepth(22);
            }

                console.log(
                    'Monkey safely delivered to Safe Island!'
                );

                console.log(
                    'Sunny Skies 1/3 rescue delivery complete!'
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

            // Rescue result

            const resultText = this.add.text(
                panel.x,
                panel.y + panel.displayHeight * 0.025,
                `Animals Rescued: ${this.rescuedCount}/${this.requiredRescues}`,
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: `${Math.round(height * 0.022)}px`,
                    fontStyle: 'bold',
                    color: '#153b7a',
                    stroke: '#ffffff',
                    strokeThickness: 2,
                    align: 'center'
                }
            );

            resultText.setOrigin(0.5);
            this.successPopup.add(resultText);

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
                if (nextSublevelId > 3) {
                    statusText.setText(
                        'Return to Levels to continue.'
                    );
                    checkingProgress = false;
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

                const dt = Math.min(delta, 50) / 1000;

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


                    this.updateBirdObstacles(dt, time);

                    //Energydrain by -1

                    this.updateEnergyDrain(delta);
            }
        }

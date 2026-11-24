import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Opening screen images
        this.load.image(
            'openingBackground',
            '/assets/backgrounds/opening_background.png'
        );

        this.load.image(
            'gameLogo',
            '/assets/characters/game_logo.png'
        );

        this.load.image(
            'playButton',
            '/assets/buttons/Openscreen_play_button.png'
        );

        this.load.image(
            'musicButton',
            '/assets/buttons/music_button.png'
        );

        this.load.image(
            'volumeButton',
            '/assets/buttons/volume_button.png'
        );

        // Audio files
        this.load.audio(
            'menuMusic',
            '/assets/audio/menu-theme.mp3'
        );

        this.load.audio(
            'buttonClick',
            '/assets/audio/button-click.mp3'
        );

        this.load.audio(
            'gameplayMusic',
            '/assets/audio/gameplay-theme.mp3'
        )


        //Reserved for the animal rescue success sound.

        this.load.audio(
           'successSound',
           '/assets/audio/success.mp3'
        );

        this.load.image(
            'mainMenuBackground',
            '/assets/backgrounds/main-menu-background.png'
        );

        this.load.image(
            'menuLogin',
            '/assets/buttons/menu-login.png'
        );

        this.load.image(
            'menuRegister',
            '/assets/buttons/menu-register.png'
        );

        this.load.image(
            'menuHowToPlay',
            '/assets/buttons/menu-how-to-play.png'
        );

        this.load.image(
            'backButton',
            '/assets/buttons/back-button.png'
        );

        this.load.image(
            'settingsButton',
            '/assets/buttons/settings-button.png'
        );

        this.load.image(
            'loginSky',
            '/assets/authentication/login-sky.png'
        );

        this.load.image(
            'loginCard',
            '/assets/authentication/login-card.png'
        );

        this.load.image(
            'bananaOpen',
            '/assets/authentication/banana-open.png'
        );

        this.load.image(
            'bananaClosed',
            '/assets/authentication/banana-closed.png'
        );

        this.load.image(
            'loginButton',
            '/assets/authentication/login-button.png'
        );

        this.load.image(
            'otpPanel',
            '/assets/authentication/otp-panel.png'
        );

        this.load.image(
            'verifyEmailButton',
            '/assets/authentication/verify-email-button.png'
        );

        this.load.image(
            'otpCloseButton',
            '/assets/authentication/close-button.png'
        );
        this.load.image(
            'emailVerifiedCard',
            '/assets/cards/email-verified-card.png'
        );

        this.load.image(
            'continueButton',
            '/assets/buttons/continue-button.png'
        );

        this.load.image(
        'authPlay',
        '/assets/buttons/auth-play.png'
        );

        this.load.image(
        'authProfile',
        '/assets/buttons/auth-profile.png'
        );

        this.load.image(
        'authHowToPlay',
        '/assets/buttons/auth-how-to-play.png'
        );

        this.load.image(
        'authLeaderboard',
        '/assets/buttons/auth-leaderboard.png'
        );

        this.load.image(
        'authLogout',
        '/assets/buttons/auth-logout.png'
        );


        // Level Selection Screen assets
        this.load.image(
            'levelSelectionBackground',
            '/assets/level-selection/level-selection-background.png'
        );

        this.load.image(
            'levelSunnySkies',
            '/assets/level-selection/level-sunny-skies.png'
        );

        this.load.image(
            'levelWindyHeights',
            '/assets/level-selection/level-windy-heights.png'
        );

        this.load.image(
            'levelStormRescue',
            '/assets/level-selection/level-storm-rescue.png'
        );

        this.load.image(
            'levelRainbowValley',
            '/assets/level-selection/level-rainbow-valley.png'
        );

        this.load.image(
            'levelPlayerNameplate',
            '/assets/level-selection/level-player-nameplate.png'
        );

        this.load.image(
            'levelStarCounter',
            '/assets/level-selection/level-star-counter.png'
        );

        this.load.image(
            'levelGoldStar',
            '/assets/level-selection/level-gold-star.png'
        );

        this.load.image(
            'levelPadlock',
            '/assets/level-selection/level-padlock.png'
        );

        this.load.image(
            'levelGreyStar',
            '/assets/level-selection/grey-star.png'
        );

        this.load.image(
            'sublevelSunnyBackground',
            '/assets/sublevel-selection/sunny-skies-background.png'
        );

        this.load.image(
            'sublevelWindyBackground',
            '/assets/sublevel-selection/windy-heights-background.png'
        );

        this.load.image(
            'sublevelStormBackground',
            '/assets/sublevel-selection/storm-rescue-background.png'
        );

        this.load.image(
            'sublevelRainbowBackground',
            '/assets/sublevel-selection/rainbow-valley-background.png'
        );

        this.load.image(
            'sublevelUnlockedIsland',
            '/assets/sublevel-selection/stage-unlocked.png'
        );

        this.load.image(
            'sublevelLockedIsland',
            '/assets/sublevel-selection/stage-locked.png'
        );

        this.load.image(
            'sublevelSunnyBanner',
            '/assets/sublevel-selection/banners/sunny-skies-banner.png'
        );

        this.load.image(
            'sublevelWindyBanner',
            '/assets/sublevel-selection/banners/windy-heights-banner.png'
        );

        this.load.image(
            'sublevelStormBanner',
            '/assets/sublevel-selection/banners/storm-rescue-banner.png'
        );

        this.load.image(
            'sublevelRainbowBanner',
            '/assets/sublevel-selection/banners/rainbow-valley-banner.png'
        );

        // GAMEPLAY - PANDA PLAYER ASSETS

        this.load.image(
            'pandaIdle',
            '/assets/gameplay/player/panda-idle.png'
        );

        this.load.image(
            'pandaRight',
            '/assets/gameplay/player/panda-right.png'
        );

        this.load.image(
            'pandaLeft',
            '/assets/gameplay/player/panda-left.png'
        );

        this.load.image(
            'pandaUp',
            '/assets/gameplay/player/panda-up.png'
        );

        this.load.image(
            'pandaDown',
            '/assets/gameplay/player/panda-down.png'
        );

        this.load.image(
            'pandaHit',
            '/assets/gameplay/player/panda-hit.png'
        );

        this.load.image(
            'pandaEnergyEmpty',
            '/assets/gameplay/player/panda-energy-empty.png'
        );

        this.load.image(
            'gameplayPauseButton',
            'assets/gameplay/ui/pause-button.png'
        );

        this.load.image(
            'pausePanel',
            '/assets/gameplay/ui/pause-panel.png'
        );

        this.load.image(
            'pauseResume',
            '/assets/gameplay/ui/pause-resume.png'
        );

        this.load.image(
            'pauseRestart',
            '/assets/gameplay/ui/pause-restart.png'
        );

        this.load.image(
            'pauseBackLevels',
            '/assets/gameplay/ui/pause-back-levels.png'
        );

       /* this.load.image(
            'sunnyGameplayBackground',
            '/assets/gameplay/backgrounds/sunny-skies-gameplay.png'
        );*/

        this.load.image(
            'sunnyGameplayBackground',
            '/assets/gameplay/backgrounds/sunny-skies-seamless.png'
        );


        //GAMEPLAY ISLAND ASSETS

        // Island where animals wait for rescue
        this.load.image(
            'animalRescueIsland',
            '/assets/gameplay/islands/common/animal-rescue-island.png'
        );

        // Additional floating island
        this.load.image(
            'floatingIsland',
            '/assets/gameplay/islands/common/floating-island.png'
        );

        // Stationary obstacle islands
        this.load.image(
            'obstacleIsland1',
            '/assets/gameplay/islands/common/obstacle-island-1.png'
        );

        this.load.image(
            'obstacleIsland2',
            '/assets/gameplay/islands/common/obstacle-island-2.png'
        );

        // Shared sign for all sublevels
        this.load.image(
            'safeIslandSign',
            '/assets/gameplay/islands/common/safe-island-sign.png'
        );

        // Safe Island for Sunny Skies, Sublevel 1
        this.load.image(
            'safeIsland_1_1',
            '/assets/gameplay/islands/safe-islands/sunny-1.png'
        );

        // Sunny Skies 2/3 - Safe Island
        this.load.image(
            'safeIsland_1_2',
            '/assets/gameplay/islands/safe-islands/sunny-2.png'
        );

        /*ANIMAL RESCUE ASSETS
        Sunny Skies - Sublevel 1*/

        // HELP bubble for all animals
        this.load.image(
            'animalHelpBubble',
            '/assets/gameplay/animals/common/help-bubble.png'
        );


        this.load.image(
            'monkeyWorried',
            '/assets/gameplay/animals/monkey/monkey-worried.png'
        );

        this.load.image(
            'monkeyHappyFace',
            '/assets/gameplay/animals/monkey/monkey-happy-face.png'
        );

        this.load.image(
            'monkeySafe',
            '/assets/gameplay/animals/monkey/monkey-safe.png'
        );


        //BABY ELEPHANT

        this.load.image(
            'elephantWorried',
            '/assets/gameplay/animals/elephant/elephant-worried.png'
        );

        this.load.image(
            'elephantHappyFace',
            '/assets/gameplay/animals/elephant/elephant-happy-face.png'
        );

        this.load.image(
            'elephantSafe',
            '/assets/gameplay/animals/elephant/elephant-safe.png'
        );



        // ==========================================
        // SUNNY SKIES LEVEL 3: BUNNY ASSETS
        // ==========================================

        this.load.image(
            'bunnyWorried',
            '/assets/gameplay/animals/bunny/bunny-worried.png'
        );

        this.load.image(
            'bunnyHappyFace',
            '/assets/gameplay/animals/bunny/bunny-happy-face.png'
        );

        this.load.image(
            'bunnySafe',
            '/assets/gameplay/animals/bunny/bunny-safe.png'
        );



        this.load.image(
            'blackBird',
            '/assets/gameplay/obstacles/black-bird.png'
        );


        this.load.image(
            'animalRescuePrompt',
            '/assets/gameplay/animals/common/press-e-rescue.png'
        );

        // LEVEL COMPLETION ASSETS

        this.load.image(
            'levelCompletePopup',
            '/assets/gameplay/animals/common/level-complete-popup.png'
        );

        this.load.image(
            'nextLevelBtn',
            '/assets/gameplay/animals/common/next-level-btn.png'
        );

        this.load.audio(
            'levelCompleteSound',
            '/assets/audio/level-complete.mp3'
        );

        // Sunny Skies Level 3 Safe Island
        this.load.image(
            'safeIsland_1_3',
            '/assets/gameplay/islands/safe-islands/sunny-3.png'
        );

        // GAMEPLAY HUD ASSETS

        this.load.image(
            'gameplayEnergyBar',
            '/assets/gameplay/hud/banana-energy-bar.png'
        );

        this.load.image(
            'gameplayAnimalCounter',
            '/assets/gameplay/hud/animal-rescue-counter.png'
        );


        // =====================================
        // GAME OVER POPUP ASSETS
        // =====================================

        this.load.image(
            'gameOverPanel',
            '/assets/gameplay/ui/game-over-panel.png'
        );

        this.load.image(
            'pandaExhausted',
            '/assets/gameplay/player/panda-exhausted.png'
        );

        this.load.image(
            'goldenBanana',
            '/assets/gameplay/collectibles/golden-banana.png'
        );

        this.load.image(
        'windyGameplayBackground',
        '/assets/gameplay/backgrounds/windy-heights-seamless.png'
        );


        // WINDY HEIGHTS LEVEL 1: SAFE ISLAND

        this.load.image(
            'safeIsland_2_1',
            '/assets/gameplay/islands/safe-islands/windy-1.png'
        );

        // WINDY HEIGHTS LEVEL 2: SAFE ISLAND

        this.load.image(
            'safeIsland_2_2',
            '/assets/gameplay/islands/safe-islands/windy-2.png'
        );

        // WINDY HEIGHTS: WIND GUST OBSTACLE
        this.load.image(
            'windGust',
            '/assets/gameplay/obstacles/wind-gust.png'
        );

        // WINDY HEIGHTS: BABY GIRAFFE

        this.load.image(
            'giraffeWorried',
            '/assets/gameplay/animals/giraffe/giraffe-worried.png'
        );

        this.load.image(
            'giraffeHappyFace',
            '/assets/gameplay/animals/giraffe/giraffe-happy-face.png'
        );

        this.load.image(
            'giraffeSafe',
            '/assets/gameplay/animals/giraffe/giraffe-safe.png'
        );

        // Safe Island
        this.load.image(
            'safeIsland_2_3',
            '/assets/gameplay/islands/safe-islands/windy-3.png'
        );

        // New worried baby cow
        this.load.image(
            'cowWorried',
            '/assets/gameplay/animals/cow/cow-worried.png'
        );

        this.load.image(
            'cowHappyFace',
            '/assets/gameplay/animals/cow/cow-happy-face.png'
        );

        this.load.image(
            'cowSafe',
            '/assets/gameplay/animals/cow/cow-safe.png'
        );

        // WINDY HEIGHTS: STATIONARY ISLANDS

        this.load.image(
            'windyStationaryIsland1',
            '/assets/gameplay/islands/common/stationary-island-1.png'
        );

        this.load.image(
            'windyStationaryIsland2',
            '/assets/gameplay/islands/common/stationary-island-2.png'
        );


        // STORM RESCUE: WORLD 3 ASSETS

        //gameplay background
        this.load.image(
            'stormGameplayBackground',
            '/assets/gameplay/backgrounds/storm-rescue-seamless.png'
        );

        // Moving floating island
        this.load.image(
            'stormFloatingIsland',
            '/assets/gameplay/islands/common/storm-floating-island.png'
        );

        // Animal rescue island
        this.load.image(
            'stormAnimalRescueIsland',
            '/assets/gameplay/islands/common/storm-rescue-island.png'
        );

        // Stationary obstacle islands
        this.load.image(
            'stormStationaryIsland1',
            '/assets/gameplay/islands/common/storm-stationary-1.png'
        );

        this.load.image(
            'stormStationaryIsland2',
            '/assets/gameplay/islands/common/storm-stationary-2.png'
        );

        // Safe Island for Storm Rescue 1/3
        this.load.image(
            'safeIsland_3_1',
            '/assets/gameplay/islands/safe-islands/storm-1.png'
        );

        // Safe Island for Storm Rescue 2/3
        this.load.image(
            'safeIsland_3_2',
            '/assets/gameplay/islands/safe-islands/storm-2.png'
        );

        // Safe Island for Storm Rescue 3/3
        this.load.image(
            'safeIsland_3_3',
            '/assets/gameplay/islands/safe-islands/storm-3.png'
        );

        // New Storm Rescue obstacles
        this.load.image(
            'stormCloud',
            '/assets/gameplay/obstacles/storm-cloud.png'
        );

        this.load.image(
            'stormBat',
            '/assets/gameplay/obstacles/storm-bat.png'
        );


        // STORM RESCUE: BABY FOX

        this.load.image(
            'foxWorried',
            '/assets/gameplay/animals/fox/fox-worried.png'
        );

        this.load.image(
            'foxHappyFace',
            '/assets/gameplay/animals/fox/fox-happy-face.png'
        );

        this.load.image(
            'foxSafe',
            '/assets/gameplay/animals/fox/fox-safe.png'
        );


        // STORM RESCUE: BABY CHEETAH


        this.load.image(
            'cheetahWorried',
            '/assets/gameplay/animals/cheetah/cheetah-worried.png'
        );

        this.load.image(
            'cheetahHappyFace',
            '/assets/gameplay/animals/cheetah/cheetah-happy-face.png'
        );

        this.load.image(
            'cheetahSafe',
            '/assets/gameplay/animals/cheetah/cheetah-safe.png'
        );

        //RAINBOW VALLEY ASSETS

        this.load.image(
            'rainbowValleySeamlessV1',
            '/assets/gameplay/backgrounds/rainbow-valley-seamless.png'
        );
        this.load.image(
            'rainbowStationary1',
            'assets/gameplay/islands/common/rainbowStationary1.png'
        );

        this.load.image(
            'rainbowStationary2',
            'assets/gameplay/islands/common/rainbowStationary2.png'
        );

        this.load.image(
            'rainbowStationary3',
             'assets/gameplay/islands/common/rainbowStationary3.png'
        );

        this.load.image(
            'rainbowStationary4',
            'assets/gameplay/islands/common/rainbowStationary4.png'
        );

        this.load.image(
            'pinkCloudObstacle',
             'assets/gameplay/obstacles/pinkCloudObstacle.png'
            );

        this.load.image(
            'spinningToffeeObstacle',
            'assets/gameplay/obstacles/spinningToffeeObstacle.png'
        );

        this.load.image(
            'rainbowTornadoObstacle',
            'assets/gameplay/obstacles/rainbowTornadoObstacle.png'
        );

        this.load.image(
            'safeIsland_4_1',
            'assets/gameplay/islands/safe-islands/rainbow-1.png'
        );

        this.load.image(
            'safeIsland_4_2',
            'assets/gameplay/islands/safe-islands/rainbow-2.png'
        );

        this.load.image(
            'safeIsland_4_3',
            'assets/gameplay/islands/safe-islands/rainbow-3.png'
        );


        // RAINBOW VALLEY: BABY DOG


        this.load.image(
            'dogHappyFace',
            'assets/gameplay/animals/dog/dog-happy-face.png'
        );

        this.load.image(
            'dogSafe',
            'assets/gameplay/animals/dog/dog-safe.png'
        );

        this.load.image(
            'dogWorried',
            'assets/gameplay/animals/dog/dog-worried.png'
        );



        // RAINBOW VALLEY 2/3: REINDEER

        this.load.image(
            'reindeerWorried',
            'assets/gameplay/animals/reindeer/reindeer-worried.png'
        );

        this.load.image(
            'reindeerSafe',
            'assets/gameplay/animals/reindeer/reindeer-safe.png'
        );

        this.load.image(
            'reindeerHappyFace',
            'assets/gameplay/animals/reindeer/reindeer-happy-face.png'
        );


        // RAINBOW VALLEY 2/3: UNICORN

        this.load.image(
            'unicornWorried',
            'assets/gameplay/animals/unicorn/unicorn-worried.png'
        );

        this.load.image(
            'unicornSafe',
            'assets/gameplay/animals/unicorn/unicorn-safe.png'
        );

        this.load.image(
            'unicornHappyFace',
            'assets/gameplay/animals/unicorn/unicorn-happy-face.png'
        );





    }

    create() {
        this.scene.start('OpeningScene');
    }
}

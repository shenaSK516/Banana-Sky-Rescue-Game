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

        // GAMEPLAY HUD ASSETS

        this.load.image(
            'gameplayEnergyBar',
            '/assets/gameplay/hud/banana-energy-bar.png'
        );

        this.load.image(
            'gameplayAnimalCounter',
            '/assets/gameplay/hud/animal-rescue-counter.png'
        );



    }

    create() {
        this.scene.start('OpeningScene');
    }
}

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
    }

    create() {
        this.scene.start('OpeningScene');
    }
}



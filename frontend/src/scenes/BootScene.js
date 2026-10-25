/*import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {

    constructor() {
        super('BootScene');
    }

    preload() {
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

        
import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Opening screen images
        this.load.image(
            'openingBackground',
            '/assets/backgrounds/opening-background.png'
        );

        this.load.image(
            'playButton',
            '/assets/buttons/play-button.png'
        );

        this.load.image(
            'musicButton',
            '/assets/buttons/music-button.png'
        );

        this.load.image(
            'volumeButton',
            '/assets/buttons/volume-button.png'
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
    }

    create() {
        this.scene.start('OpeningScene');
    }
}

    }
}*/


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
    }

    create() {
        this.scene.start('OpeningScene');
    }
}



import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {

    constructor() {
        super('MainMenuScene');
    }

    create() {

        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor('#70CFFF');

        this.add.text(
            width / 2,
            height * 0.28,
            'BANANA SKY RESCUE',
            {
                fontFamily: 'Arial',
                fontSize: '64px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#0759B8',
                strokeThickness: 8
            }
        ).setOrigin(0.5);

        this.add.text(
            width / 2,
            height * 0.48,
            'MAIN MENU',
            {
                fontFamily: 'Arial',
                fontSize: '46px',
                color: '#ffffff',
                stroke: '#0759B8',
                strokeThickness: 5
            }
        ).setOrigin(0.5);

        const backButton = this.add.text(
            width / 2,
            height * 0.68,
            'BACK TO OPENING',
            {
                fontFamily: 'Arial',
                fontSize: '30px',
                backgroundColor: '#087AF0',
                color: '#ffffff',
                padding: {
                    x: 25,
                    y: 15
                }
            }
        ).setOrigin(0.5);

        backButton.setInteractive({
            useHandCursor: true
        });

        backButton.on('pointerdown', () => {
            this.scene.start('OpeningScene');
        });
    }
}
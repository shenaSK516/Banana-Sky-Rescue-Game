
import Phaser from 'phaser';
import AudioManager from '../components/AudioManager.js';
import ImageButton from '../components/ImageButton.js';

export default class EmailVerifiedScene extends Phaser.Scene {

    constructor() {
        super('EmailVerifiedScene');
    }

    create() {
        const { width, height } = this.scale;

        // 1. Sky background
        this.add.image(
            width / 2,
            height / 2,
            'loginSky'
        )
        .setDisplaySize(width, height)
        .setDepth(0);

        // 2. Verified card
        const card = this.add.image(
            width / 2,
            height * 0.49,
            'emailVerifiedCard'
        );

        const cardScale = Math.min(
            (width * 0.46) / card.width,
            (height * 0.93) / card.height
        );

        card.setDepth(2);
        card.setAlpha(0);
        card.setScale(cardScale * 0.6);

        // 3. Card popup animation
        this.tweens.add({
            targets: card,
            scaleX: cardScale,
            scaleY: cardScale,
            alpha: 1,
            duration: 450,
            ease: 'Back.Out'
        });

        // 4. Continue button
        const continueButton = new ImageButton(
            this,
            width / 2,
            height * 0.855,
            'continueButton',
            width * 0.22,
            () => {
                AudioManager.playButtonClick(this);

                // Return to Login
                this.scene.start('LoginScene');
            }
        );

        const buttonImage = continueButton.button;

        buttonImage.setDepth(4);
        buttonImage.setAlpha(0);
        buttonImage.disableInteractive();

        // 5. Reveal Continue button
        this.tweens.add({
            targets: buttonImage,
            alpha: 1,
            duration: 250,
            delay: 400,
            onComplete: () => {
                buttonImage.setInteractive({
                    useHandCursor: true
                });
            }
        });
    }
}

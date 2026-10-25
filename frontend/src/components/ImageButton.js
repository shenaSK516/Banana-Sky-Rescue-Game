
import AudioManager from './AudioManager.js';

export default class ImageButton {
    constructor(scene, x, y, texture, width, onClick) {
        this.scene = scene;

        this.button = scene.add.image(x, y, texture);

        const normalScale = width / this.button.width;

        this.button.setScale(normalScale);
        this.button.setInteractive({
            useHandCursor: true
        });

        this.button.on('pointerover', () => {
            scene.tweens.add({
                targets: this.button,
                scaleX: normalScale * 1.08,
                scaleY: normalScale * 1.08,
                duration: 120
            });
        });

        this.button.on('pointerout', () => {
            scene.tweens.add({
                targets: this.button,
                scaleX: normalScale,
                scaleY: normalScale,
                duration: 120
            });
        });

        this.button.on('pointerdown', () => {
            AudioManager.playButtonClick(scene);

            scene.tweens.add({
                targets: this.button,
                scaleX: normalScale * 0.94,
                scaleY: normalScale * 0.94,
                duration: 90,
                yoyo: true,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    if (typeof onClick === 'function') {
                        onClick();
                    }
                }
            });
        });
    }
}

import ImageButton from './ImageButton.js';

export default class BackButton {

    constructor(scene, targetScene, options = {}) {

        const { width, height } = scene.scale;

        // Same size and position on every screen
        const x = options.x ?? width * 0.045;
        const y = options.y ?? height * 0.09;
        const size = options.size ?? 75;

        this.button = new ImageButton(
            scene,
            x,
            y,
            'backButton',
            size,
            () => {
                scene.scene.start(targetScene);
            }
        );
    }
}
export default class AudioManager {
    static musicEnabled = true;
    static soundEnabled = true;

    static initialize(scene) {
        let music = scene.sound.get('menuMusic');

        if (!music) {
            music = scene.sound.add('menuMusic', {
                loop: true,
                volume: 0.35
            });
        }

        music.setMute(
            !this.musicEnabled || !this.soundEnabled
        );

        return music;
    }

    static startMusic(scene) {
        const music = this.initialize(scene);

        if (!this.musicEnabled || !this.soundEnabled) {
            return;
        }

        if (music.isPaused) {
            music.resume();
        } else if (!music.isPlaying) {
            music.play();
        }
    }

    static toggleMusic(scene) {
        this.musicEnabled = !this.musicEnabled;

        this.initialize(scene);

        if (this.musicEnabled && this.soundEnabled) {
            this.startMusic(scene);
        }

        return this.musicEnabled;
    }

    static toggleSound(scene) {
        this.soundEnabled = !this.soundEnabled;

        this.initialize(scene);

        if (this.soundEnabled) {
            this.startMusic(scene);
        }

        return this.soundEnabled;
    }

    static playButtonClick(scene) {
        if (!this.soundEnabled) return;

        scene.sound.play('buttonClick', {
            volume: 0.55
        });
    }

    static playSuccess(scene) {
        if (!this.soundEnabled) return;

        scene.sound.play('successSound', {
            volume: 0.7
        });
    }
}
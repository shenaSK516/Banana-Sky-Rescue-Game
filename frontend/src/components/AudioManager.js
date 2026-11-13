
export default class AudioManager {
    static musicEnabled = true;
    static soundEnabled = true;

    static currentMusicKey = null;

    static musicVolumes = {
        menuMusic: 0.35,
        gameplayMusic: 0.35
    };

    static initialize(scene) {
        const musicKey = this.currentMusicKey || 'menuMusic';

        let music = scene.sound.get(musicKey);

        if (!music) {
            music = scene.sound.add(musicKey, {
                loop: true,
                volume: this.musicVolumes[musicKey] ?? 0.35
            });
        }

        music.setMute(
            !this.musicEnabled || !this.soundEnabled
        );

        return music;
    }

    static startMusic(scene, musicKey = 'menuMusic') {
        if (!scene.cache.audio.exists(musicKey)) {
            console.warn(`Music not loaded: ${musicKey}`);
            return;
        }

        // Stop other background music tracks.
        for (const key of Object.keys(this.musicVolumes)) {
            if (key !== musicKey) {
                const otherMusic = scene.sound.get(key);

                if (otherMusic) {
                    otherMusic.stop();
                }
            }
        }

        this.currentMusicKey = musicKey;

        const music = this.initialize(scene);

        if (!this.musicEnabled || !this.soundEnabled) {
            if (music.isPlaying || music.isPaused) {
                music.stop();
            }
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

        this.updateMusicState(scene);

        return this.musicEnabled;
    }

    static toggleSound(scene) {
        this.soundEnabled = !this.soundEnabled;

        this.updateMusicState(scene);

        return this.soundEnabled;
    }

    static updateMusicState(scene) {
        const musicKey = this.currentMusicKey || 'menuMusic';
        const music = this.initialize(scene);

        if (!this.musicEnabled || !this.soundEnabled) {
            music.setMute(true);
        } else {
            music.setMute(false);
            this.startMusic(scene, musicKey);
        }
    }

    static pauseMusic(scene) {
        const music = scene.sound.get(this.currentMusicKey);

        if (music?.isPlaying) {
            music.pause();
        }
    }

    static resumeMusic(scene) {
        if (!this.musicEnabled || !this.soundEnabled) {
            return;
        }

        const music = scene.sound.get(this.currentMusicKey);

        if (music?.isPaused) {
            music.resume();
        }
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

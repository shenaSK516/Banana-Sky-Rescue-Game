import Phaser from 'phaser';
import AudioManager from '../components/AudioManager.js';
import {fetchPlayerProfile,updatePlayerDisplayName,uploadPlayerAvatar} from '../services/playerProfileApi.js';

export default class ProfileScene extends Phaser.Scene {

    constructor() {
        super('ProfileScene');
    }

    create() {

        const { width, height } = this.scale;

        // BACKGROUND

        const background = this.add.image(
            width / 2,
            height / 2,
            'mainMenuBackground'
        );

        background.setScale(Math.max(
            width / background.width,
            height / background.height
        ));

        this.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x062450,
            0.40
        );

        // TITLE

        this.add.text(
            width / 2,
            height * 0.11,
            'PLAYER PROFILE',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${Math.round(height * 0.060)}px`,
                fontStyle: 'bold',
                color: '#ffdf4a',
                stroke: '#164b9c',
                strokeThickness: 7
            }
        ).setOrigin(0.5);

        // PROFILE PANEL


        const panel = this.add.graphics();

        panel.fillStyle(0x07356a, 0.94);
        panel.fillRoundedRect(
            width * 0.13,
            height * 0.18,
            width * 0.74,
            height * 0.68,
            24
        );

        panel.lineStyle(4, 0x86d9ff, 1);
        panel.strokeRoundedRect(
            width * 0.13,
            height * 0.18,
            width * 0.74,
            height * 0.68,
            24
        );

        // Container for dynamic profile information.
        this.profileContent = this.add.container(0, 0);

        this.statusText = this.add.text(
            width / 2,
            height * 0.5,
            'Loading player profile...',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${Math.round(height * 0.028)}px`,
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);

        // BACK BUTTON

        const backButton = this.add.rectangle(
            width / 2,
            height * 0.925,
            width * 0.27,
            height * 0.068,
            0x168be7
        );

        backButton.setStrokeStyle(3, 0xffe066);
        backButton.setInteractive({ useHandCursor: true });

        this.add.text(
            width / 2,
            height * 0.925,
            '← BACK TO MENU',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${Math.round(height * 0.027)}px`,
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#164b9c',
                strokeThickness: 3
            }
        ).setOrigin(0.5);

        backButton.on('pointerdown', () => {
            AudioManager.playButtonClick(this);
            this.scene.start('AuthenticatedMainMenuScene');
        });

        // Load real player data.
        this.loadProfile();
    }

    // FETCH PROFILE FROM SPRING BOOT

    async loadProfile() {

        try {

            const profile = await fetchPlayerProfile();

            if (!this.sys.isActive()) return;

            this.statusText.setVisible(false);
            this.renderProfile(profile);

            console.log(
                'Player profile loaded successfully!'
            );

        } catch (error) {

            console.error('Profile loading failed:', error);

            if (!this.sys.isActive()) return;

            this.statusText.setText(
                'Unable to load profile.\nPlease try again.'
            );
        }
    }

    // DISPLAY PLAYER PROFILE

    renderProfile(profile) {

        const { width, height } = this.scale;

        this.profileContent.removeAll(true);

        const addText = (x, y, value, size, color, options = {}) => {

            const text = this.add.text(
                x,
                y,
                String(value),
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: `${Math.round(height * size)}px`,
                    fontStyle: 'bold',
                    color,
                    ...options
                }
            );

            this.profileContent.add(text);
            return text;
        };

        // ACCOUNT DETAILS

        addText(
            width * 0.17,
            height * 0.225,
            '👤 PLAYER INFORMATION',
            0.029,
            '#ffdf4a'
        );

        const usernameText = addText(
            width * 0.18,
            height * 0.280,
            `Username: ${profile.username}`,
            0.029,
            '#ffffff'
        );

        usernameText.setScale(Math.min(
            1,
            (width * 0.64) / Math.max(usernameText.width, 1)
        ));

        const emailText = addText(
            width * 0.18,
            height * 0.320,
            `Email: ${profile.email}`,
            0.023,
            '#d3ebff'
        );

        emailText.setScale(Math.min(
            1,
            (width * 0.64) / Math.max(emailText.width, 1)
        ));

        const joinedDate = profile.joinedAt
            ? new Date(profile.joinedAt).toLocaleDateString('en-GB')
            : 'Unavailable';

        addText(
            width * 0.18,
            height * 0.360,
            `Joined: ${joinedDate}`,
            0.022,
            '#d3ebff'
        );



        // EDITABLE PLAYER DISPLAY NAME

        const currentDisplayName =
            profile.displayName?.trim() || profile.username;

            addText(
                width * 0.59,
                height * 0.270,
                'DISPLAY NAME',
                0.020,
                '#ffdf4a'
            );

        const displayNameText = addText(
                width * 0.59,
                height * 0.310,
                currentDisplayName,
                0.030,
                '#ffffff'
        );

        // Prevent a long name from overflowing.
        displayNameText.setScale(Math.min(
            1,
            (width * 0.24) / Math.max(displayNameText.width, 1)
        ));

        // Edit button
        const editNameButton = this.add.rectangle(
            width * 0.70,
            height * 0.365,
            width * 0.19,
            height * 0.045,
            0x168be7
        );

        editNameButton.setStrokeStyle(2, 0xffdf4a);
        editNameButton.setInteractive({ useHandCursor: true });

        this.profileContent.add(editNameButton);

        addText(
            width * 0.70,
            height * 0.365,
            'EDIT NAME',
            0.020,
            '#ffffff'
        ).setOrigin(0.5);

        editNameButton.on('pointerdown', () => {
            AudioManager.playButtonClick(this);
            this.openDisplayNameEditor(currentDisplayName);
        });


        // PLAYER STATISTICS

        addText(
            width * 0.17,
            height * 0.409,
            '🏆 PLAYER STATISTICS',
            0.028,
            '#ffdf4a'
        );

        const statistics = [
            {
                label: 'OVERALL SCORE',
                value: profile.overallScore ?? 0,
                x: 0.285
            },
            {
                label: 'HIGHEST SCORE',
                value: profile.highestScore ?? 0,
                x: 0.500
            },
            {
                label: 'LEVELS COMPLETED',
                value: profile.completedLevels ?? 0,
                x: 0.715
            }
        ];

        statistics.forEach((stat) => {

            const centerX = width * stat.x;
            const centerY = height * 0.505;

            const card = this.add.rectangle(
                centerX,
                centerY,
                width * 0.19,
                height * 0.115,
                0x1766aa,
                0.95
            );

            card.setStrokeStyle(2, 0x8cd9ff);
            this.profileContent.add(card);

            addText(
                centerX,
                height * 0.467,
                stat.label,
                0.019,
                '#e4f5ff'
            ).setOrigin(0.5);

            addText(
                centerX,
                height * 0.515,
                stat.value,
                0.043,
                '#ffdf4a'
            ).setOrigin(0.5);
        });

        // COMPLETED LEVEL INFORMATION

        addText(
            width * 0.17,
            height * 0.596,
            '🎮 LEVEL PROGRESS',
            0.028,
            '#ffdf4a'
        );

        const level = profile.levelScores?.[0];

        if (level) {

            const levelName =
                Number(level.mainLevelId) === 1
                    ? 'Sunny Skies'
                    : `Main Level ${level.mainLevelId}`;

            addText(
                width * 0.18,
                height * 0.655,
                `${levelName} ${level.sublevelId}/3`,
                0.024,
                '#ffffff'
            );

            addText(
                width * 0.60,
                height * 0.655,
                `Best: ${level.bestScore}`,
                0.024,
                '#ffdf4a'
            );

        } else {

            addText(
                width * 0.18,
                height * 0.655,
                'No completed levels yet.',
                0.023,
                '#ffffff'
            );
        }

        // ACHIEVEMENTS

        const achievementBox = this.add.rectangle(
            width / 2,
            height * 0.770,
            width * 0.64,
            height * 0.105,
            0x1266a7,
            0.95
        );

        achievementBox.setStrokeStyle(2, 0xffd447);
        this.profileContent.add(achievementBox);

        addText(
            width / 2,
            height * 0.742,
            'ACHIEVEMENTS',
            0.021,
            '#d3ebff'
        ).setOrigin(0.5);

        addText(
            width / 2,
            height * 0.783,
            profile.animalRescuerUnlocked
                ? '🐾 Animal Rescuer - Unlocked!'
                : '🔒 Animal Rescuer - Locked',
            0.028,
            profile.animalRescuerUnlocked
                ? '#ffdf4a'
                : '#c3cbd5'
        ).setOrigin(0.5);


        // Create profile picture and upload controls.
        this.createAvatarControls();
    }


    // ==========================================
    // PLAYER AVATAR AND CHANGE PHOTO
    // ==========================================

    createAvatarControls() {

        const { width, height } = this.scale;

        // Clean up controls from previous profile renders.
        if (this.profileAvatarImage) {
            this.profileAvatarImage.destroy();
            this.profileAvatarImage = null;
        }

        if (this.profileAvatarInput) {
            this.profileAvatarInput.destroy();
            this.profileAvatarInput = null;
        }

        const avatarX = width * 0.52;
        const avatarY = height * 0.285;

        const avatarSize = Math.round(
            Math.min(width * 0.075, height * 0.105)
        );

        // Default icon when no picture exists.
        const fallback = this.add.text(
            avatarX,
            avatarY,
            '👤',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${Math.round(avatarSize * 0.7)}px`,
                color: '#ffffff'
            }
        ).setOrigin(0.5);

        this.profileContent.add(fallback);

        // Display image from authenticated backend.
        const avatar = this.add.dom(
            avatarX,
            avatarY,
            'img',
            {
                width: `${avatarSize}px`,
                height: `${avatarSize}px`,
                borderRadius: '50%',
                border: '4px solid #ffdf4a',
                objectFit: 'cover',
                backgroundColor: '#1766aa',
                visibility: 'hidden'
            }
        );

        avatar.setDepth(100);

        this.profileAvatarImage = avatar;

        const refreshAvatar = () => {

            // Hide old image until the replacement loads.
            avatar.node.style.visibility = 'hidden';

            avatar.node.src =
                `/api/profile/avatar?v=${Date.now()}`;
        };

        avatar.node.onload = () => {

            if (!this.sys.isActive()) return;

            avatar.node.style.visibility = 'visible';
            fallback.setVisible(false);
        };

        avatar.node.onerror = () => {

            if (!this.sys.isActive()) return;

            avatar.node.style.visibility = 'hidden';
            fallback.setVisible(true);
        };

        // ==========================================
        // CHANGE PHOTO BUTTON
        // ==========================================

        const buttonX = avatarX;
        const buttonY = height * 0.365;

        const buttonWidth = width * 0.14;
        const buttonHeight = height * 0.045;

        const button = this.add.rectangle(
            buttonX,
            buttonY,
            buttonWidth,
            buttonHeight,
            0x168be7
        );

        button.setStrokeStyle(2, 0xffdf4a);

        this.profileContent.add(button);

        const buttonText = this.add.text(
            buttonX,
            buttonY,
            'CHANGE PHOTO',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${Math.round(height * 0.018)}px`,
                fontStyle: 'bold',
                color: '#ffffff'
            }
        ).setOrigin(0.5);

        this.profileContent.add(buttonText);

        // Native file input placed over the button.
        // This allows a direct browser file selection.
        const fileInput = this.add.dom(
            buttonX,
            buttonY,
            'input',
            {
                width: `${Math.round(buttonWidth)}px`,
                height: `${Math.round(buttonHeight)}px`,
                opacity: '0',
                cursor: 'pointer',
                pointerEvents: 'auto'
            }
        );

        fileInput.node.type = 'file';
        fileInput.node.accept = 'image/png,image/jpeg';

        fileInput.setDepth(200);

        this.profileAvatarInput = fileInput;

        // Upload feedback.
        const message = this.add.text(
            width * 0.71,
            height * 0.405,
            '',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${Math.round(height * 0.017)}px`,
                color: '#ffdf4a'
            }
        ).setOrigin(0.5);

        this.profileContent.add(message);

        let uploading = false;

        // ==========================================
        // UPLOAD SELECTED IMAGE
        // ==========================================

        fileInput.node.addEventListener(
            'change',
            async () => {

                const file = fileInput.node.files?.[0];

                if (!file || uploading) return;

                uploading = true;

                fileInput.node.disabled = true;

                message.setText('Uploading photo...');

                try {

                    await uploadPlayerAvatar(file);

                    if (!this.sys.isActive()) return;

                    message.setText('Photo updated!');

                    // Retrieve updated image from backend.
                    refreshAvatar();

                    console.log(
                        'Player profile picture uploaded successfully!'
                    );

                } catch (error) {

                    console.error(
                        'Profile picture upload failed:',
                        error
                    );

                    if (this.sys.isActive()) {
                        message.setText(error.message);
                    }

                } finally {

                    uploading = false;

                    // Allow selecting the same file again.
                    if (this.sys.isActive()) {
                        fileInput.node.disabled = false;
                        fileInput.node.value = '';
                    }
                }
            }
        );

        // Load existing profile picture if available.
        refreshAvatar();
    }


    // EDIT DISPLAY NAME POPUP

openDisplayNameEditor(currentName) {

    if (this.profileNameModal) return;

    const { width, height } = this.scale;

    const popup = this.add.container(0, 0);
    popup.setDepth(3000);

    this.profileNameModal = popup;

    const shade = this.add.rectangle(
        width / 2,
        height / 2,
        width,
        height,
        0x061b3c,
        0.76
    ).setInteractive();

    const panel = this.add.rectangle(
        width / 2,
        height / 2,
        width * 0.46,
        height * 0.37,
        0x10457d
    );

    panel.setStrokeStyle(4, 0x85d9ff);

    const title = this.add.text(
        width / 2,
        height * 0.39,
        'EDIT DISPLAY NAME',
        {
            fontFamily: 'Arial, sans-serif',
            fontSize: `${Math.round(height * 0.035)}px`,
            fontStyle: 'bold',
            color: '#ffdf4a'
        }
    ).setOrigin(0.5);

    const message = this.add.text(
        width / 2,
        height * 0.57,
        '',
        {
            fontFamily: 'Arial, sans-serif',
            fontSize: `${Math.round(height * 0.020)}px`,
            color: '#ffffff'
        }
    ).setOrigin(0.5);

    popup.add([shade, panel, title, message]);

    // Native text input inside Phaser's DOM container.
    const input = this.add.dom(
        width / 2,
        height * 0.485,
        'input',
        {
            width: `${Math.round(width * 0.32)}px`,
            height: '46px',
            fontSize: '20px',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center',
            border: '2px solid #85d9ff',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            color: '#173b78',
            outline: 'none'
        }
    );

    input.node.type = 'text';
    input.node.maxLength = 40;
    input.node.value = currentName;
    input.node.autocomplete = 'off';
    input.setDepth(3100);

    this.profileNameInput = input;
    input.node.focus();

    let saving = false;

    const closeEditor = () => {

        if (this.profileNameInput) {
            this.profileNameInput.destroy();
            this.profileNameInput = null;
        }

        if (this.profileNameModal) {
            this.profileNameModal.destroy(true);
            this.profileNameModal = null;
        }
    };

    // Remove the DOM input when leaving the scene.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, closeEditor);

    const makeButton = (x, label, color, onClick) => {

        const button = this.add.rectangle(
            x,
            height * 0.635,
            width * 0.155,
            height * 0.055,
            color
        );

        button.setStrokeStyle(2, 0xffdf4a);
        button.setInteractive({ useHandCursor: true });

        const buttonText = this.add.text(
            x,
            height * 0.635,
            label,
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${Math.round(height * 0.023)}px`,
                fontStyle: 'bold',
                color: '#ffffff'
            }
        ).setOrigin(0.5);

        popup.add([button, buttonText]);

        button.on('pointerdown', onClick);
    };

    // CANCEL
    makeButton(
        width * 0.405,
        'CANCEL',
        0x597089,
        () => {
            if (!saving) {
                closeEditor();
            }
        }
    );

    // SAVE
    makeButton(
        width * 0.595,
        'SAVE',
        0x168be7,
        async () => {

            if (saving) return;

            const newName = input.node.value.trim();

            if (
                newName.length < 1 ||
                newName.length > 40 ||
                /[\u0000-\u001f\u007f-\u009f]/u.test(newName)
            ) {
                message.setText('Enter a valid name (1-40 characters).');
                return;
            }

            saving = true;
            message.setText('Saving profile...');

            try {

                const result =
                    await updatePlayerDisplayName(newName);

                if (!this.sys.isActive()) return;

                console.log(
                    'Display name updated:',
                    result.displayName
                );

                closeEditor();

                // Reload profile from MySQL.
                this.loadProfile();

            } catch (error) {

                console.error(
                    'Profile update failed:',
                    error
                );

                if (this.sys.isActive()) {
                    message.setText(
                        'Unable to save. Please try again.'
                    );
                }

            } finally {
                saving = false;
            }
        }
    );
}

}

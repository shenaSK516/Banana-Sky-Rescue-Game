
import Phaser from 'phaser';
import AudioManager from '../components/AudioManager.js';

export default class HowToPlayScene extends Phaser.Scene {

    constructor() {
        super('HowToPlayScene');

        this.currentPage = 0;
        this.pageElements = [];
        this.pageDots = [];
    }

    // ==================================================
    // SCENE INITIALIZATION
    // ==================================================

    create() {

        const { width, height } = this.scale;

        this.returnScene = this.registry.get('authenticatedPlayer')
            ? 'AuthenticatedMainMenuScene'
            : 'MainMenuScene';

        this.pages = [
            {
                title: 'Welcome to Banana Sky Rescue!',
                subtitle: 'YOUR ADVENTURE STARTS HERE',
                description:
                    'Join our brave Panda on an exciting journey through magical floating worlds. Rescue adorable animals, explore beautiful islands and bring everyone safely home.',
                tip: 'YOUR MISSION: Rescue the animals and reach the Safe Island!',
                visual: 'welcome'
            },
            {
                title: 'Meet the Controls',
                subtitle: 'LEARN HOW TO FLY',
                description:
                    'Guide your Panda through the sky using the arrow keys on your keyboard. Move up, down, left and right to explore the floating islands and find animals waiting for help.',
                tip: 'Use all four arrow keys to control your movement.',
                visual: 'controls'
            },
            {
                title: 'Rescue the Animals',
                subtitle: 'BECOME A HERO',
                description:
                    'Find animals in trouble and move your balloon basket close to them. When the rescue prompt appears, press E on your keyboard to rescue the animal.',
                tip: '+100 POINTS  |  +10 BANANA ENERGY FOR EACH RESCUE',
                visual: 'rescue'
            },
            {
                title: 'Watch Your Banana Energy!',
                subtitle: 'KEEP YOUR ENERGY UP',
                description:
                    'Your Banana Energy starts at 100 and decreases by 1 point every second. Obstacle collisions cost 5 energy, while rescuing an animal restores 10 energy. Correct Golden Banana puzzle answers can also reward extra energy.',
                tip: 'Be careful! When your energy reaches zero, it is Game Over.',
                visual: 'energy'
            },
            {
                title: 'Avoid the Obstacles!',
                subtitle: 'STAY ALERT IN THE SKY',
                description:
                    'Every world has its own challenges. Watch out for flying birds, powerful wind gusts, storm clouds and bats. Avoid colliding with obstacles to protect your Banana Energy.',
                tip: 'Every obstacle collision costs 5 Banana Energy.',
                visual: 'obstacles'
            },
            {
                title: 'Complete Your Mission!',
                subtitle: 'YOUR FINAL DESTINATION',
                description:
                    'Rescue all the required animals and guide your Panda to the Safe Island to complete the level. In Rainbow Valley, collect both Golden Bananas before landing.',
                tip: 'RESCUE. COLLECT. LAND SAFELY. BECOME A HERO!',
                visual: 'mission'
            }
        ];

        this.createBackground(width, height);
        this.createPanel(width, height);
        this.createHeader();
        this.createNavigation();

        this.showPage(0);
    }

    // ==================================================
    // COLOUR PALETTE
    // ==================================================

    COLORS = {
        navy: 0x123e68,
        deepNavy: 0x082b50,
        cyan: 0x18c8d9,
        lightCyan: 0x65eaff,
        yellow: 0xffd447,
        orange: 0xff9f1c,
        coral: 0xff7043,
        white: 0xffffff,
        text: 0xf2f8ff,
        muted: 0xc5d0d9
    };

    // ==================================================
    // BACKGROUND
    // ==================================================

    createBackground(width, height) {

        const background = this.add.image(
            width / 2,
            height / 2,
            'mainMenuBackground'
        );

        background.setScale(Math.max(
            width / background.width,
            height / background.height
        ));

        background.setDepth(0);

        // Keep the original game artwork visible.
        this.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x03152f,
            0.20
        ).setDepth(1);
    }

    // ==================================================
    // MAIN TUTORIAL PANEL
    // ==================================================

    createPanel(width, height) {

        this.panelX = width / 2;
        this.panelY = height / 2;

        this.panelWidth = Math.min(width * 0.90, 1180);
        this.panelHeight = Math.min(height * 0.84, 720);

        const left = this.panelX - this.panelWidth / 2;
        const top = this.panelY - this.panelHeight / 2;

        // Panel shadow.
        const shadow = this.add.graphics();

        shadow.fillStyle(0x020c20, 0.45);

        shadow.fillRoundedRect(
            left + 10,
            top + 13,
            this.panelWidth,
            this.panelHeight,
            28
        );

        shadow.setDepth(2);

        // Main fantasy-blue panel.
        const panel = this.add.graphics();

        panel.fillStyle(0x123e68, 0.97);

        panel.fillRoundedRect(
            left,
            top,
            this.panelWidth,
            this.panelHeight,
            28
        );

        // Bright cyan border.
        panel.lineStyle(6, 0x18c8d9, 1);

        panel.strokeRoundedRect(
            left,
            top,
            this.panelWidth,
            this.panelHeight,
            28
        );

        panel.setDepth(3);

        // Decorative top and bottom lines.
        const decoration = this.add.graphics();

        decoration.lineStyle(2, 0x65eaff, 0.8);

        decoration.lineBetween(
            left + 45,
            top + 112,
            left + this.panelWidth - 45,
            top + 112
        );

        decoration.lineBetween(
            left + 45,
            top + this.panelHeight - 115,
            left + this.panelWidth - 45,
            top + this.panelHeight - 115
        );

        decoration.setDepth(4);

        // Decorative corner stars.
        this.add.text(
            left + 24,
            top + 20,
            '✦',
            {
                fontSize: '25px',
                color: '#ffd447'
            }
        ).setDepth(5);

        this.add.text(
            left + this.panelWidth - 49,
            top + 20,
            '✦',
            {
                fontSize: '25px',
                color: '#ffd447'
            }
        ).setDepth(5);
    }

    // ==================================================
    // HEADER
    // ==================================================

    createHeader() {

        const titleSize = Math.max(
            27,
            Math.min(this.scale.width * 0.033, 42)
        );

        this.add.text(
            this.panelX,
            this.panelY - this.panelHeight * 0.405,
            'HOW TO PLAY',
            {
                fontFamily: 'Arial',
                fontSize: `${titleSize}px`,
                fontStyle: 'bold',
                color: '#ffe45e',
                stroke: '#082b50',
                strokeThickness: 5,
                align: 'center'
            }
        )
        .setOrigin(0.5)
        .setDepth(6);

        this.add.text(
            this.panelX,
            this.panelY - this.panelHeight * 0.335,
            'A LITTLE GUIDE FOR YOUR BIG ADVENTURE',
            {
                fontFamily: 'Arial',
                fontSize: '12px',
                fontStyle: 'bold',
                color: '#65eaff',
                letterSpacing: 2,
                align: 'center'
            }
        )
        .setOrigin(0.5)
        .setDepth(6);
    }

    // ==================================================
    // NAVIGATION
    // ==================================================

    createNavigation() {

        const buttonY = this.panelY + this.panelHeight * 0.415;

        const buttonWidth = Math.min(
            this.panelWidth * 0.215,
            190
        );

        const buttonHeight = 52;

        this.previousButton = this.createNavButton(
            this.panelX - this.panelWidth * 0.30,
            buttonY,
            buttonWidth,
            buttonHeight,
            'PREVIOUS',
            () => this.previousPage()
        );

        this.menuButton = this.createNavButton(
            this.panelX,
            buttonY,
            buttonWidth,
            buttonHeight,
            'MAIN MENU',
            () => this.returnToMenu(),
            0x18c8d9
        );

        this.nextButton = this.createNavButton(
            this.panelX + this.panelWidth * 0.30,
            buttonY,
            buttonWidth,
            buttonHeight,
            'NEXT',
            () => this.nextPage()
        );

        // Page number.
        this.pageIndicator = this.add.text(
            this.panelX,
            this.panelY + this.panelHeight * 0.305,
            '',
            {
                fontFamily: 'Arial',
                fontSize: '15px',
                fontStyle: 'bold',
                color: '#ffe45e'
            }
        )
        .setOrigin(0.5)
        .setDepth(8);

        // Progress dots.
        const gap = 23;
        const startX = this.panelX - (5 * gap) / 2;

        for (let i = 0; i < 6; i++) {

            const dot = this.add.circle(
                startX + i * gap,
                this.panelY + this.panelHeight * 0.35,
                6,
                0x607d98
            );

            dot.setDepth(8);

            this.pageDots.push(dot);
        }
    }

    createNavButton(x, y, width, height, label, callback, color = 0xff9f1c) {

        const graphics = this.add.graphics();
        graphics.setDepth(8);

        const zone = this.add.zone(
            x,
            y,
            width,
            height
        )
        .setDepth(9)
        .setInteractive({ useHandCursor: true });

        const text = this.add.text(
            x,
            y,
            label,
            {
                fontFamily: 'Arial',
                fontSize: '15px',
                fontStyle: 'bold',
                color: '#123e68'
            }
        )
        .setOrigin(0.5)
        .setDepth(10);

        const button = {
            graphics,
            zone,
            text,
            x,
            y,
            width,
            height,
            color,
            disabled: false
        };

        this.drawNavButton(button, color);

        zone.on('pointerover', () => {

            if (!button.disabled) {

                this.drawNavButton(button, 0xff7043);

                this.tweens.add({
                    targets: text,
                    scaleX: 1.06,
                    scaleY: 1.06,
                    duration: 100
                });
            }
        });

        zone.on('pointerout', () => {

            this.drawNavButton(
                button,
                button.disabled ? 0x607d98 : button.color
            );

            text.setScale(1);
        });

        zone.on('pointerdown', () => {

            if (button.disabled) return;

            AudioManager.playButtonClick(this);

            callback();
        });

        return button;
    }

    drawNavButton(button, color) {

        const { x, y, width, height, graphics } = button;

        graphics.clear();

        graphics.fillStyle(color, 1);

        graphics.fillRoundedRect(
            x - width / 2,
            y - height / 2,
            width,
            height,
            13
        );

        graphics.lineStyle(3, 0xffd447, 1);

        graphics.strokeRoundedRect(
            x - width / 2,
            y - height / 2,
            width,
            height,
            13
        );
    }

    // ==================================================
    // PAGE CONTENT
    // ==================================================

    showPage(index) {

        if (index < 0 || index >= this.pages.length) {
            return;
        }

        this.currentPage = index;

        // Remove all old page elements.
        this.pageElements.forEach(element => {
            element.destroy();
        });

        this.pageElements = [];

        this.createContentArea();

        const page = this.pages[index];

        this.createPageHeading(page);
        this.createPageDescription(page);
        this.createTip(page);
        this.createPageVisual(page);

        this.updateNavigation();
    }

    // ==================================================
    // ILLUSTRATION CARD
    // ==================================================

    createContentArea() {

        this.visualWidth = this.panelWidth * 0.37;
        this.visualHeight = this.panelHeight * 0.55;

        this.visualX = this.panelX + this.panelWidth * 0.235;
        this.visualY = this.panelY + this.panelHeight * 0.015;

        const card = this.add.graphics();

        // Turquoise illustration background.
        card.fillStyle(0x18c8d9, 1);

        card.fillRoundedRect(
            this.visualX - this.visualWidth / 2,
            this.visualY - this.visualHeight / 2,
            this.visualWidth,
            this.visualHeight,
            25
        );

        card.lineStyle(4, 0xffffff, 1);

        card.strokeRoundedRect(
            this.visualX - this.visualWidth / 2,
            this.visualY - this.visualHeight / 2,
            this.visualWidth,
            this.visualHeight,
            25
        );

        card.setDepth(4);

        this.pageElements.push(card);

        // Decorative yellow stars.
        const star1 = this.add.text(
            this.visualX - this.visualWidth * 0.40,
            this.visualY - this.visualHeight * 0.40,
            '✦',
            {
                fontSize: '24px',
                color: '#ffe45e'
            }
        ).setDepth(5);

        const star2 = this.add.text(
            this.visualX + this.visualWidth * 0.35,
            this.visualY + this.visualHeight * 0.35,
            '✦',
            {
                fontSize: '20px',
                color: '#ffe45e'
            }
        ).setDepth(5);

        this.pageElements.push(star1, star2);
    }

    // ==================================================
    // PAGE HEADING
    // ==================================================

    createPageHeading(page) {

        const leftX = this.panelX - this.panelWidth * 0.415;
        const titleY = this.panelY - this.panelHeight * 0.245;

        const title = this.add.text(
            leftX,
            titleY,
            page.title,
            {
                fontFamily: 'Arial',
                fontSize: `${Math.max(21, Math.min(this.scale.width * 0.023, 29))}px`,
                fontStyle: 'bold',
                color: '#ffffff',
                wordWrap: {
                    width: this.panelWidth * 0.46
                },
                lineSpacing: 4
            }
        )
        .setDepth(6);

        this.pageElements.push(title);

        const subtitle = this.add.text(
            leftX,
            titleY + 58,
            page.subtitle,
            {
                fontFamily: 'Arial',
                fontSize: '12px',
                fontStyle: 'bold',
                color: '#65eaff',
                letterSpacing: 1
            }
        )
        .setDepth(6);

        this.pageElements.push(subtitle);
    }

    // ==================================================
    // DESCRIPTION
    // ==================================================

    createPageDescription(page) {

        const leftX = this.panelX - this.panelWidth * 0.415;
        const textY = this.panelY - this.panelHeight * 0.105;

        const description = this.add.text(
            leftX,
            textY,
            page.description,
            {
                fontFamily: 'Arial',
                fontSize: `${Math.max(16, Math.min(this.scale.width * 0.016, 20))}px`,
                color: '#f2f8ff',
                lineSpacing: 9,
                wordWrap: {
                    width: this.panelWidth * 0.46
                }
            }
        )
        .setDepth(6);

        this.pageElements.push(description);
    }

    // ==================================================
    // TIP CARD
    // ==================================================

    createTip(page) {

        const x = this.panelX - this.panelWidth * 0.415;
        const y = this.panelY + this.panelHeight * 0.205;

        const width = this.panelWidth * 0.47;
        const height = 68;

        const background = this.add.graphics();

        background.fillStyle(0xffd447, 1);

        background.fillRoundedRect(
            x,
            y,
            width,
            height,
            14
        );

        background.lineStyle(2, 0xffa62b, 1);

        background.strokeRoundedRect(
            x,
            y,
            width,
            height,
            14
        );

        background.setDepth(6);

        const icon = this.add.text(
            x + 17,
            y + 13,
            '★',
            {
                fontSize: '20px',
                color: '#e17b00'
            }
        )
        .setDepth(7);

        const tip = this.add.text(
            x + 44,
            y + 13,
            page.tip,
            {
                fontFamily: 'Arial',
                fontSize: '14px',
                fontStyle: 'bold',
                color: '#49300a',
                wordWrap: {
                    width: width - 60
                },
                lineSpacing: 3
            }
        )
        .setDepth(7);

        this.pageElements.push(background, icon, tip);
    }

    // ==================================================
    // ILLUSTRATION HELPERS
    // ==================================================

    addIllustration(key, x, y, maxWidth, maxHeight) {

        if (!this.textures.exists(key)) {

            console.warn(
                `Tutorial asset not found: ${key}`
            );

            return null;
        }

        const image = this.add.image(x, y, key);

        const scale = Math.min(
            maxWidth / image.width,
            maxHeight / image.height
        );

        image.setScale(scale);
        image.setDepth(6);

        this.pageElements.push(image);

        return image;
    }

    addVisualText(x, y, content, style = {}) {

        const text = this.add.text(
            x,
            y,
            content,
            {
                fontFamily: 'Arial',
                fontSize: '14px',
                fontStyle: 'bold',
                color: '#123e68',
                align: 'center',
                ...style
            }
        )
        .setOrigin(0.5)
        .setDepth(7);

        this.pageElements.push(text);

        return text;
    }

    createPageVisual(page) {

    switch (page.visual) {

        case 'welcome':
            this.showWelcomeVisual();
            break;

        case 'controls':
            this.showControlsVisual();
            break;

        case 'rescue':
            this.showRescueVisual();
            break;

        case 'energy':
            this.showEnergyVisual();
            break;

        case 'obstacles':
            this.showObstacleVisual();
            break;

        case 'mission':
            this.showMissionVisual();
            break;
    }
}

    // ==================================================
    // PAGE 1: WELCOME
    // ==================================================

    showWelcomeVisual() {

        this.addIllustration(
            'pandaIdle',
            this.visualX,
            this.visualY - 15,
            this.visualWidth * 0.65,
            this.visualHeight * 0.70
        );

        const animals = [
            'monkeyWorried',
            'elephantWorried',
            'bunnyWorried'
        ];

        const gap = this.visualWidth * 0.25;
        const startX = this.visualX - gap;

        animals.forEach((key, index) => {

            this.addIllustration(
                key,
                startX + index * gap,
                this.visualY + this.visualHeight * 0.35,
                65,
                65
            );
        });

        this.addVisualText(
            this.visualX,
            this.visualY + this.visualHeight * 0.46,
            'LET THE ADVENTURE BEGIN!',
            {
                fontSize: '13px',
                color: '#123e68'
            }
        );
    }

    // ==================================================
    // PAGE 2: CONTROLS
    // ==================================================

    showControlsVisual() {

        this.addIllustration(
            'pandaIdle',
            this.visualX,
            this.visualY - 75,
            this.visualWidth * 0.42,
            this.visualHeight * 0.43
        );

        const size = 47;
        const gap = 7;

        const keyY = this.visualY + 85;

        this.createArrowKey(
            this.visualX,
            keyY - size - gap,
            '↑',
            size
        );

        this.createArrowKey(
            this.visualX - size - gap,
            keyY,
            '←',
            size
        );

        this.createArrowKey(
            this.visualX,
            keyY,
            '↓',
            size
        );

        this.createArrowKey(
            this.visualX + size + gap,
            keyY,
            '→',
            size
        );

        this.addVisualText(
            this.visualX,
            this.visualY + this.visualHeight * 0.45,
            'MOVE IN FOUR DIRECTIONS'
        );
    }

    createArrowKey(x, y, symbol, size) {

        const background = this.add.graphics();

        background.fillStyle(0x123e68, 1);

        background.fillRoundedRect(
            x - size / 2,
            y - size / 2,
            size,
            size,
            9
        );

        background.lineStyle(3, 0xffd447, 1);

        background.strokeRoundedRect(
            x - size / 2,
            y - size / 2,
            size,
            size,
            9
        );

        background.setDepth(7);

        const text = this.add.text(
            x,
            y,
            symbol,
            {
                fontSize: '29px',
                fontStyle: 'bold',
                color: '#ffffff'
            }
        )
        .setOrigin(0.5)
        .setDepth(8);

        this.pageElements.push(background, text);
    }

    // ==================================================
    // PAGE 3: RESCUE
    // ==================================================

    showRescueVisual() {

        this.addIllustration(
            'monkeyWorried',
            this.visualX,
            this.visualY - 55,
            this.visualWidth * 0.48,
            this.visualHeight * 0.56
        );

        this.addIllustration(
            'animalRescuePrompt',
            this.visualX,
            this.visualY + 125,
            this.visualWidth * 0.78,
            100
        );

        this.addVisualText(
            this.visualX,
            this.visualY + this.visualHeight * 0.45,
            'PRESS E TO RESCUE!'
        );
    }

    // ==================================================
    // PAGE 4: ENERGY
    // ==================================================

    showEnergyVisual() {

        this.addIllustration(
            'gameplayEnergyBar',
            this.visualX,
            this.visualY - 45,
            this.visualWidth * 0.86,
            125
        );

        this.addIllustration(
            'goldenBanana',
            this.visualX,
            this.visualY + 105,
            100,
            115
        );

        this.addVisualText(
            this.visualX,
            this.visualY + this.visualHeight * 0.45,
            'SAVE ENERGY • EARN REWARDS'
        );
    }

    // ==================================================
    // PAGE 5: OBSTACLES
    // ==================================================

    showObstacleVisual() {

        const obstacles = [
            {
                key: 'blackBird',
                label: 'BIRDS'
            },
            {
                key: 'windGust',
                label: 'WIND GUSTS'
            },
            {
                key: 'stormCloud',
                label: 'STORM CLOUDS'
            },
            {
                key: 'stormBat',
                label: 'BATS'
            }
        ];

        const positions = [
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1]
        ];

        const gapX = this.visualWidth * 0.22;
        const gapY = this.visualHeight * 0.20;

        obstacles.forEach((obstacle, index) => {

            const [offsetX, offsetY] = positions[index];

            const x = this.visualX + offsetX * gapX;
            const y = this.visualY + offsetY * gapY - 10;

            this.addIllustration(
                obstacle.key,
                x,
                y,
                this.visualWidth * 0.29,
                this.visualHeight * 0.29
            );

            this.addVisualText(
                x,
                y + 57,
                obstacle.label,
                {
                    fontSize: '12px'
                }
            );
        });

        this.addVisualText(
            this.visualX,
            this.visualY + this.visualHeight * 0.45,
            'DODGE • AVOID • SURVIVE'
        );
    }

    // ==================================================
    // PAGE 6: MISSION
    // ==================================================

    showMissionVisual() {

        this.addIllustration(
            'safeIsland_1_1',
            this.visualX,
            this.visualY + 15,
            this.visualWidth * 0.80,
            this.visualHeight * 0.65
        );

        this.addIllustration(
            'goldenBanana',
            this.visualX + this.visualWidth * 0.29,
            this.visualY - this.visualHeight * 0.29,
            65,
            75
        );

        this.addVisualText(
            this.visualX,
            this.visualY + this.visualHeight * 0.43,
            'LAND SAFELY ON THE ISLAND!'
        );
    }

    // ==================================================
    // UPDATE PAGE INDICATORS AND BUTTONS
    // ==================================================

    updateNavigation() {

        const isFirst = this.currentPage === 0;
        const isLast = this.currentPage === this.pages.length - 1;

        this.previousButton.disabled = isFirst;

        this.drawNavButton(
            this.previousButton,
            isFirst ? 0x607d98 : this.previousButton.color
        );

        this.previousButton.text.setAlpha(
            isFirst ? 0.55 : 1
        );

        this.nextButton.text.setText(
            isLast ? 'FINISH' : 'NEXT'
        );

        this.pageIndicator.setText(
            `PAGE ${this.currentPage + 1} OF ${this.pages.length}`
        );

        this.pageDots.forEach((dot, index) => {

            dot.setFillStyle(
                index === this.currentPage
                    ? 0xffd447
                    : 0x607d98
            );

            dot.setScale(
                index === this.currentPage ? 1.35 : 1
            );
        });
    }

    // ==================================================
    // NAVIGATION ACTIONS
    // ==================================================

    previousPage() {

        if (this.currentPage > 0) {
            this.showPage(this.currentPage - 1);
        }
    }

    nextPage() {

        if (this.currentPage < this.pages.length - 1) {

            this.showPage(this.currentPage + 1);

        } else {

            this.returnToMenu();
        }
    }

    returnToMenu() {

        this.scene.start(this.returnScene);
    }
}

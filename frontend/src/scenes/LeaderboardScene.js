
import Phaser from 'phaser';
import AudioManager from '../components/AudioManager.js';
import {
    fetchLevelLeaderboard,fetchOverallLeaderboard} from '../services/playerScoreApi.js';
export default class LeaderboardScene extends Phaser.Scene {

    constructor() {
        super('LeaderboardScene');
    }

    create() {

        const { width, height } = this.scale;

        // =====================================
        // BACKGROUND
        // =====================================

        const background = this.add.image(
            width / 2,
            height / 2,
            'mainMenuBackground'
        );

        background.setScale(Math.max(
            width / background.width,
            height / background.height
        ));

        // Dark overlay for readability.
        this.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x062450,
            0.40
        );

        // =====================================
        // TITLE
        // =====================================

        this.add.text(
            width / 2,
            height * 0.105,
            '🏆 LEADERBOARD',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${Math.round(height * 0.060)}px`,
                fontStyle: 'bold',
                color: '#ffdf4a',
                stroke: '#164b9c',
                strokeThickness: 7
            }
        ).setOrigin(0.5);

        this.add.text(
            width / 2,
            height * 0.167,
            'Sunny Skies 1/3  |  Top 10 Players',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${Math.round(height * 0.025)}px`,
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#164b9c',
                strokeThickness: 3
            }
        ).setOrigin(0.5);

        // =====================================
        // LEADERBOARD PANEL
        // =====================================

        const panel = this.add.graphics();

        panel.fillStyle(0x07356a, 0.90);

        panel.fillRoundedRect(
            width * 0.105,
            height * 0.205,
            width * 0.790,
            height * 0.640,
            22
        );

        panel.lineStyle(4, 0x86d9ff, 1);

        panel.strokeRoundedRect(
            width * 0.105,
            height * 0.205,
            width * 0.790,
            height * 0.640,
            22
        );


// =====================================
// LEADERBOARD SELECTION TABS
// =====================================

this.currentLeaderboardMode = 'overall';

const createTab = (x, label, mode) => {

    const tab = this.add.rectangle(
        x,
        height * 0.245,
        width * 0.19,
        height * 0.045,
        0x1479c5
    );

    tab.setStrokeStyle(2, 0xffffff);
    tab.setInteractive({ useHandCursor: true });

    const tabText = this.add.text(
        x,
        height * 0.245,
        label,
        {
            fontFamily: 'Arial, sans-serif',
            fontSize: `${Math.round(height * 0.022)}px`,
            fontStyle: 'bold',
            color: '#ffffff'
        }
    ).setOrigin(0.5);

    tab.on('pointerdown', () => {

        if (this.currentLeaderboardMode === mode) {
            return;
        }

        AudioManager.playButtonClick(this);

        this.currentLeaderboardMode = mode;

        this.updateLeaderboardTabs();
        this.loadLeaderboard();
    });

    return tab;
};

this.overallTab = createTab(
    width * 0.40,
    'OVERALL',
    'overall'
);

this.levelTab = createTab(
    width * 0.60,
    'SUNNY SKIES 1/3',
    'level'
);

this.updateLeaderboardTabs = () => {

    this.overallTab.setFillStyle(
        this.currentLeaderboardMode === 'overall'
            ? 0xf2af28
            : 0x1479c5
    );

    this.levelTab.setFillStyle(
        this.currentLeaderboardMode === 'level'
            ? 0xf2af28
            : 0x1479c5
    );
};

this.updateLeaderboardTabs();


        // COLUMN HEADINGS

        const headerStyle = {
            fontFamily: 'Arial, sans-serif',
            fontSize: `${Math.round(height * 0.026)}px`,
            fontStyle: 'bold',
            color: '#ffe66a'
        };

        const headerY = height * 0.310;

        this.add.text(
            width * 0.195,
            headerY,
            'RANK',
            headerStyle
        ).setOrigin(0.5);

        this.add.text(
            width * 0.285,
            headerY,
            'PLAYER',
            headerStyle
        ).setOrigin(0, 0.5);

        this.scoreHeader = this.add.text(
            width * 0.675,
            headerY,
            'TOTAL SCORE',
            headerStyle
        ).setOrigin(0.5);

        this.timeHeader = this.add.text(
            width * 0.810,
            headerY,
            'LEVELS',
            headerStyle
        ).setOrigin(0.5);

        // Container for dynamically loaded rows.
        this.rowsContainer = this.add.container(0, 0);

        // Loading and error messages.
        this.statusText = this.add.text(
            width / 2,
            height * 0.52,
            'Loading leaderboard...',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${Math.round(height * 0.028)}px`,
                color: '#ffffff',
                align: 'center',
                wordWrap: {
                    width: width * 0.55
                }
            }
        ).setOrigin(0.5);

        // =====================================
        // BACK TO MENU BUTTON
        // =====================================

        const backButton = this.add.rectangle(
            width / 2,
            height * 0.925,
            width * 0.27,
            height * 0.068,
            0x168be7
        );

        backButton.setStrokeStyle(3, 0xffe066);

        backButton.setInteractive({
            useHandCursor: true
        });

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

        // Request real data from Spring Boot.
        this.loadLeaderboard();
    }

    // =====================================
    // LOAD LEADERBOARD FROM API
    // =====================================


    async loadLeaderboard() {

        const mode = this.currentLeaderboardMode;

        // Prevent an older request from replacing newer results.
        const requestId = (this.leaderboardRequestId || 0) + 1;
        this.leaderboardRequestId = requestId;

        this.rowsContainer.removeAll(true);

        this.statusText.setVisible(true);
        this.statusText.setText('Loading leaderboard...');

        // Update the column headings.
        this.scoreHeader.setText(
            mode === 'overall' ? 'TOTAL SCORE' : 'SCORE'
        );

        this.timeHeader.setText(
            mode === 'overall' ? 'LEVELS' : 'TIME'
        );

        try {

            const entries = mode === 'overall'
                ? await fetchOverallLeaderboard()
                : await fetchLevelLeaderboard(1, 1);

            if (
             !this.sys.isActive() ||
             requestId !== this.leaderboardRequestId
            ) {
                return;
            }

            this.renderLeaderboard(entries, mode);

        } catch (error) {

            console.error('Leaderboard loading failed:', error);

            if (
                !this.sys.isActive() ||
                requestId !== this.leaderboardRequestId
            ) {
                return;
            }

            this.statusText.setVisible(true);
            this.statusText.setText(
                'Unable to load leaderboard.\nPlease check your connection.'
            );
        }
    }


    // DISPLAY TOP 10 PLAYERS

    renderLeaderboard(entries, mode) {

        const { width, height } = this.scale;

        this.rowsContainer.removeAll(true);

        if (entries.length === 0) {

            this.statusText.setVisible(true);

            this.statusText.setText(
                'No scores yet!\nBe the first player on the leaderboard.'
            );

            return;
        }

        this.statusText.setVisible(false);

        const top10 = entries.slice(0, 10);

        top10.forEach((entry, index) => {

            const rowY =
                height * (0.365 + index * 0.046);

            const rowHeight = height * 0.043;

            // Highlight the top three ranks.
            const colors = [
                0xffe7a0,
                0xe9f1fa,
                0xffd5aa
            ];

            const rowColor =
                colors[index] ?? 0xc4e4ff;

            // Row background.
            const row = this.add.graphics();

            row.fillStyle(rowColor, 0.97);

            row.fillRoundedRect(
                width * 0.145,
                rowY - rowHeight / 2,
                width * 0.710,
                rowHeight,
                10
            );

            this.rowsContainer.add(row);

            const textStyle = {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${Math.round(height * 0.022)}px`,
                fontStyle: 'bold',
                color: '#173b78'
            };

            // Rank
            const rankText = this.add.text(
                width * 0.195,
                rowY,
                `${entry.rank}`,
                textStyle
            ).setOrigin(0.5);

            this.rowsContainer.add(rankText);

            // Player name, shortened if necessary.
            const username = String(entry.username);

            const displayName =
                username.length > 20
                    ? `${username.slice(0, 19)}…`
                    : username;

            const playerText = this.add.text(
                width * 0.285,
                rowY,
                displayName,
                textStyle
            ).setOrigin(0, 0.5);

            this.rowsContainer.add(playerText);

            // Best score
            const scoreText = this.add.text(
                width * 0.675,
                rowY,
                `${mode === 'overall' ? entry.totalScore : entry.score}`,
                textStyle
            ).setOrigin(0.5);

            this.rowsContainer.add(scoreText);

            // Format active seconds into MM:SS.
            const totalSeconds = Math.max(
                0,
                Math.floor(Number(entry.activeSeconds) || 0)
            );

            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            const formattedTime =
                `${String(minutes).padStart(2, '0')}:` +
                `${String(seconds).padStart(2, '0')}`;


            const timeText = this.add.text(
                width * 0.810,
                rowY,
                mode === 'overall'
                    ? `${entry.levelsCompleted}`
                    : formattedTime,
                textStyle
            ).setOrigin(0.5);

this.rowsContainer.add(timeText);

        });

        console.log(
            'Leaderboard loaded successfully:',
            top10
        );
    }
}

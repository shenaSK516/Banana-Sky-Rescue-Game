
import Phaser from 'phaser';
import QRCode from 'qrcode';
import BackButton from '../components/BackButton.js';
import authenticationService from '../components/AuthenticationService.js';
import './mfa.css';

export default class MfaSetupScene extends Phaser.Scene {

    constructor() {
        super('MfaSetupScene');
    }

    create() {

        const { width, height } = this.scale;

        this.shuttingDown = false;
        this.mfaBusy = false;

        // BACKGROUND
        const background = this.add.image(
            width / 2,
            height / 2,
            'loginSky'
        );

        background.setScale(Math.max(
            width / background.width,
            height / background.height
        ));

        background.setDepth(0);

        // LOGIN CARD
        const card = this.add.image(
            width / 2,
            height / 2,
            'loginCard'
        );

        const cardScale = Math.min(
            width / card.width,
            height / card.height
        );

        card.setScale(cardScale);
        card.setDepth(1);

        const bounds = card.getBounds();

        const cx = (fraction) =>
            bounds.left + bounds.width * fraction;

        const cy = (fraction) =>
            bounds.top + bounds.height * fraction;

        // BANANA CHARACTER
        const banana = this.add.image(
            cx(0.28),
            cy(0.52),
            'bananaOpen'
        );

        const bananaScale = Math.min(
            (bounds.width * 0.34) / banana.width,
            (bounds.height * 0.58) / banana.height
        );

        banana.setScale(bananaScale);
        banana.setDepth(2);

        // BACK BUTTON
        new BackButton(this, 'LoginScene');

        // MFA SETUP FORM
        const html = `
            <div class="banana-mfa-form">

                <h2>Secure Your Account</h2>

                <p class="mfa-description">
                    Connect your account to Microsoft Authenticator.
                </p>

                <p id="mfa-setup-status" class="mfa-status">
                    Preparing your authenticator setup...
                </p>

                <div id="mfa-setup-panel" hidden>

                    <p class="mfa-instruction">
                        1. Open Microsoft Authenticator and scan this QR code.
                    </p>

                    <img
                        id="mfa-qr-code"
                        class="mfa-qr-code"
                        alt="Authenticator setup QR code"
                    />

                    <p class="mfa-instruction">
                        Can't scan the QR code? Enter this setup key manually:
                    </p>

                    <div
                        id="mfa-manual-secret"
                        class="mfa-manual-secret"
                    ></div>

                    <p class="mfa-instruction">
                        2. Enter the six-digit code shown in your authenticator.
                    </p>

                    <form id="mfa-confirm-form">

                        <input
                            id="mfa-code"
                            type="text"
                            inputmode="numeric"
                            autocomplete="one-time-code"
                            maxlength="6"
                            pattern="[0-9]{6}"
                            placeholder="Enter 6-digit code"
                            required
                        />

                        <button
                            id="mfa-confirm-button"
                            type="submit"
                        >
                            Confirm & Enable
                        </button>

                    </form>

                </div>

                <div
                    id="mfa-recovery-panel"
                    class="mfa-recovery-panel"
                    hidden
                >

                    <h3>MFA Successfully Enabled!</h3>

                    <p>
                        Save these recovery codes somewhere safe.
                        Each code can only be used once.
                    </p>

                    <div
                        id="mfa-recovery-codes"
                        class="mfa-recovery-codes"
                    ></div>

                    <p class="mfa-warning">
                        These codes will not be shown again.
                    </p>

                    <button
                        id="mfa-continue-button"
                        type="button"
                    >
                        Continue to Game
                    </button>

                </div>

                <div
                    id="mfa-setup-error"
                    class="mfa-error"
                    role="alert"
                    aria-live="polite"
                ></div>

            </div>
        `;

        this.form = this.add.dom(
            cx(0.65),
            cy(0.53)
        ).createFromHTML(html);

        this.form.setDepth(3);

        const formWidth = bounds.width * 0.39;
        const formScale = formWidth / 460;

        this.form.setScale(formScale);

        // HTML ELEMENT REFERENCES
        const root = this.form.node;
        root.querySelector('.banana-mfa-form')
            .classList.add('mfa-compact-layout');

        const status = root.querySelector('#mfa-setup-status');
        const setupPanel = root.querySelector('#mfa-setup-panel');
        const qrImage = root.querySelector('#mfa-qr-code');
        const manualSecret = root.querySelector('#mfa-manual-secret');

        const confirmForm = root.querySelector('#mfa-confirm-form');
        const codeInput = root.querySelector('#mfa-code');
        const confirmButton = root.querySelector('#mfa-confirm-button');

        const recoveryPanel = root.querySelector('#mfa-recovery-panel');
        const recoveryCodes = root.querySelector('#mfa-recovery-codes');
        const continueButton = root.querySelector('#mfa-continue-button');

        const error = root.querySelector('#mfa-setup-error');

        // START MFA ENROLLMENT
        this.startEnrollment(
            status,
            setupPanel,
            qrImage,
            manualSecret,
            error
        );

        // CONFIRM MFA ENROLLMENT
        confirmForm.addEventListener('submit', async (event) => {

            event.preventDefault();

            if (this.mfaBusy || this.shuttingDown) {
                return;
            }

            const code = codeInput.value.trim();

            error.textContent = '';

            if (!/^[0-9]{6}$/.test(code)) {
                error.textContent =
                    'Please enter a valid six-digit authenticator code.';
                return;
            }

            this.mfaBusy = true;
            codeInput.disabled = true;
            confirmButton.disabled = true;
            confirmButton.textContent = 'Verifying...';

            try {

                const result =
                    await authenticationService.confirmMfaEnrollment(code);

                if (this.shuttingDown || !this.sys.isActive()) {
                    return;
                }

                if (
                    result.status !== 'MFA_SETUP_COMPLETED' ||
                    !Array.isArray(result.recoveryCodes) ||
                    result.recoveryCodes.length === 0
                ) {
                    throw new Error(
                        'Unexpected MFA enrollment response.'
                    );
                }

                // Keep the username for the authenticated game menu.
                const username =
                    this.registry.get('pendingMfaUsername');

                if (username) {
                    this.registry.set('authenticatedPlayer', username);
                }

                this.registry.remove('pendingMfaUsername');

                // Display recovery codes only once.
                recoveryCodes.replaceChildren();

                result.recoveryCodes.forEach((recoveryCode) => {

                    const codeElement =
                        document.createElement('div');

                    codeElement.className = 'mfa-recovery-code';
                    codeElement.textContent = recoveryCode;

                    recoveryCodes.appendChild(codeElement);
                });

                setupPanel.hidden = true;
                status.hidden = true;
                recoveryPanel.hidden = false;

            } catch (confirmationError) {

                if (this.shuttingDown || !this.sys.isActive()) {
                    return;
                }

                error.textContent =
                    confirmationError.message ||
                    'Unable to confirm authenticator setup.';

                codeInput.value = '';

            } finally {

                if (!this.shuttingDown && this.sys.isActive()) {

                    this.mfaBusy = false;

                    codeInput.disabled = false;
                    confirmButton.disabled = false;
                    confirmButton.textContent = 'Confirm & Enable';
                }
            }
        });

        // CONTINUE AFTER SAVING RECOVERY CODES
        continueButton.addEventListener('click', () => {

            if (this.shuttingDown) {
                return;
            }

            this.scene.start('AuthenticatedMainMenuScene');
        });

        // CLEANUP
        this.events.once(
            Phaser.Scenes.Events.SHUTDOWN,
            () => {
                this.shuttingDown = true;
            }
        );
    }

    // REQUEST ENROLLMENT DETAILS AND GENERATE QR CODE
    async startEnrollment(
        status,
        setupPanel,
        qrImage,
        manualSecret,
        error
    ) {

        try {

            const result =
                await authenticationService.startMfaEnrollment();

            if (this.shuttingDown || !this.sys.isActive()) {
                return;
            }

            if (
                result.status !== 'MFA_SETUP_STARTED' ||
                typeof result.otpauthUri !== 'string'
            ) {
                throw new Error(
                    'Invalid authenticator setup response.'
                );
            }

            const otpAuthUrl = new URL(result.otpauthUri);

            if (
                otpAuthUrl.protocol !== 'otpauth:' ||
                !otpAuthUrl.searchParams.get('secret')
            ) {
                throw new Error(
                    'Invalid authenticator setup information.'
                );
            }

            const secret = otpAuthUrl.searchParams.get('secret');

            const qrDataUrl = await QRCode.toDataURL(
                result.otpauthUri,
                {
                    errorCorrectionLevel: 'H',
                    margin: 2,
                    width: 220
                }
            );

            if (this.shuttingDown || !this.sys.isActive()) {
                return;
            }

            qrImage.src = qrDataUrl;

            manualSecret.textContent = secret;

            setupPanel.hidden = false;

            status.textContent =
                'Scan the QR code using Microsoft Authenticator.';

        } catch (setupError) {

            if (this.shuttingDown || !this.sys.isActive()) {
                return;
            }

            status.textContent = 'Authenticator setup could not start.';

            error.textContent =
                setupError.message ||
                'Unable to start authenticator enrollment.';
        }
    }
}

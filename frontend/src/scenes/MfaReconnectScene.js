
import Phaser from 'phaser';
import QRCode from 'qrcode';
import BackButton from '../components/BackButton.js';
import authenticationService from '../components/AuthenticationService.js';
import './mfa.css';

export default class MfaReconnectScene extends Phaser.Scene {

    constructor() {
        super('MfaReconnectScene');
    }

    create() {

        const { width, height } = this.scale;

        this.shuttingDown = false;
        this.mfaBusy = false;
        this.verificationMethod = 'TOTP';

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
        new BackButton(this, 'ProfileScene');

        // RECONNECT FORM
        const html = `
            <div class="banana-mfa-form">

                <h2>Reconnect Authenticator</h2>

                <p class="mfa-description">
                    Replace the authenticator connected to your account.
                </p>

                <p id="reconnect-status" class="mfa-status">
                    Verify your identity to continue.
                </p>

                <!-- STEP 1: VERIFY CURRENT IDENTITY -->

                <div id="reconnect-identity-panel">

                    <form id="reconnect-identity-form">

                        <p class="mfa-instruction">
                            Enter your account password.
                        </p>

                        <input
                            id="reconnect-password"
                            type="password"
                            autocomplete="current-password"
                            placeholder="Account password"
                            required
                            style="
                                box-sizing:border-box;
                                width:90%;
                                height:46px;
                                margin:8px auto;
                                padding:0 15px;
                                border:3px solid #83d7ff;
                                border-radius:30px;
                                background:#ffffff;
                                color:#194587;
                                font-size:16px;
                                letter-spacing:1px;
                                text-align:center;
                            "
                        />

                        <p id="current-code-instruction"
                           class="mfa-instruction">
                            Enter your current six-digit authenticator code.
                        </p>

                        <input
                            id="reconnect-current-code"
                            class="mfa-verification-input"
                            type="text"
                            inputmode="numeric"
                            autocomplete="one-time-code"
                            maxlength="6"
                            placeholder="000000"
                            required
                        />

                        <button
                            id="reconnect-start-button"
                            type="submit"
                        >
                            Verify & Continue
                        </button>

                    </form>

                    <button
                        id="reconnect-toggle-method"
                        class="mfa-secondary-button"
                        type="button"
                    >
                        Use a recovery code instead
                    </button>

                </div>

                <!-- STEP 2: CONNECT NEW AUTHENTICATOR -->

                <div id="reconnect-setup-panel" hidden>

                    <p class="mfa-instruction">
                        1. Open Microsoft Authenticator and scan this new QR code.
                    </p>

                    <img
                        id="reconnect-qr-code"
                        class="mfa-qr-code"
                        alt="New authenticator QR code"
                    />

                    <p class="mfa-instruction">
                        Can't scan it? Enter this setup key manually:
                    </p>

                    <div
                        id="reconnect-manual-secret"
                        class="mfa-manual-secret"
                    ></div>

                    <p class="mfa-instruction">
                        2. Enter the six-digit code from your NEW authenticator.
                    </p>

                    <form id="reconnect-confirm-form">

                        <input
                            id="reconnect-new-code"
                            class="mfa-verification-input"
                            type="text"
                            inputmode="numeric"
                            autocomplete="one-time-code"
                            maxlength="6"
                            placeholder="000000"
                            required
                        />

                        <button
                            id="reconnect-confirm-button"
                            type="submit"
                        >
                            Confirm New Authenticator
                        </button>

                    </form>

                </div>

                <!-- STEP 3: NEW RECOVERY CODES -->

                <div
                    id="reconnect-recovery-panel"
                    class="mfa-recovery-panel"
                    hidden
                >

                    <h3>Authenticator Successfully Replaced!</h3>

                    <p>
                        Save your new recovery codes somewhere safe.
                        Each code can only be used once.
                    </p>

                    <div
                        id="reconnect-recovery-codes"
                        class="mfa-recovery-codes"
                    ></div>

                    <p class="mfa-warning">
                        Your previous recovery codes are no longer valid.
                        These new codes will not be shown again.
                    </p>

                    <button
                        id="reconnect-continue-button"
                        type="button"
                    >
                        Return to Profile
                    </button>

                </div>

                <div
                    id="reconnect-error"
                    class="mfa-error"
                    role="alert"
                    aria-live="polite"
                ></div>

            </div>
        `;

        this.form = this.add.dom(
            cx(0.70),
            cy(0.62)
        ).createFromHTML(html);

        this.form.setDepth(3);

        const formWidth = bounds.width * 0.47;
        const formScale = formWidth / 460;

        this.form.setScale(formScale);

        // HTML ELEMENT REFERENCES
        const root = this.form.node;

        root.querySelector('.banana-mfa-form')
            .classList.add('mfa-compact-layout');

        const status = root.querySelector('#reconnect-status');
        const error = root.querySelector('#reconnect-error');

        const identityPanel =
            root.querySelector('#reconnect-identity-panel');

        const identityForm =
            root.querySelector('#reconnect-identity-form');

        const passwordInput =
            root.querySelector('#reconnect-password');

        const currentCodeInput =
            root.querySelector('#reconnect-current-code');

        const currentCodeInstruction =
            root.querySelector('#current-code-instruction');

        const startButton =
            root.querySelector('#reconnect-start-button');

        const toggleButton =
            root.querySelector('#reconnect-toggle-method');

        const setupPanel =
            root.querySelector('#reconnect-setup-panel');

        const qrImage =
            root.querySelector('#reconnect-qr-code');

        const manualSecret =
            root.querySelector('#reconnect-manual-secret');

        const confirmForm =
            root.querySelector('#reconnect-confirm-form');

        const newCodeInput =
            root.querySelector('#reconnect-new-code');

        const confirmButton =
            root.querySelector('#reconnect-confirm-button');

        const recoveryPanel =
            root.querySelector('#reconnect-recovery-panel');

        const recoveryCodes =
            root.querySelector('#reconnect-recovery-codes');

        const continueButton =
            root.querySelector('#reconnect-continue-button');

        // STEP 1: SWITCH BETWEEN CURRENT TOTP AND RECOVERY CODE

        toggleButton.addEventListener('click', () => {

            if (this.mfaBusy || this.shuttingDown) {
                return;
            }

            this.verificationMethod =
                this.verificationMethod === 'TOTP'
                    ? 'RECOVERY'
                    : 'TOTP';

            currentCodeInput.value = '';
            error.textContent = '';

            if (this.verificationMethod === 'RECOVERY') {

                currentCodeInput.maxLength = 14;
                currentCodeInput.inputMode = 'text';
                currentCodeInput.autocomplete = 'off';
                currentCodeInput.placeholder = 'XXXX-XXXX-XXXX';

                currentCodeInput.classList.add(
                    'mfa-recovery-entry'
                );

                currentCodeInstruction.textContent =
                    'Enter one of your unused recovery codes.';

                toggleButton.textContent =
                    'Use an authenticator code instead';

            } else {

                currentCodeInput.maxLength = 6;
                currentCodeInput.inputMode = 'numeric';
                currentCodeInput.autocomplete = 'one-time-code';
                currentCodeInput.placeholder = '000000';

                currentCodeInput.classList.remove(
                    'mfa-recovery-entry'
                );

                currentCodeInstruction.textContent =
                    'Enter your current six-digit authenticator code.';

                toggleButton.textContent =
                    'Use a recovery code instead';
            }

            currentCodeInput.focus();
        });

        // STEP 1: VERIFY PASSWORD AND CURRENT MFA

        identityForm.addEventListener('submit', async (event) => {

            event.preventDefault();

            if (this.mfaBusy || this.shuttingDown) {
                return;
            }

            const password = passwordInput.value;
            const code = currentCodeInput.value.trim();

            error.textContent = '';

            if (!password.trim()) {
                error.textContent =
                    'Please enter your account password.';
                passwordInput.focus();
                return;
            }

            if (this.verificationMethod === 'TOTP') {

                if (!/^[0-9]{6}$/.test(code)) {
                    error.textContent =
                        'Enter a valid six-digit authenticator code.';
                    currentCodeInput.focus();
                    return;
                }

            } else {

                const normalizedCode = code
                    .replace(/[-\s]/g, '')
                    .toUpperCase();

                if (!/^[A-HJ-NP-Z2-9]{12}$/.test(normalizedCode)) {
                    error.textContent =
                        'Enter a valid recovery code.';
                    currentCodeInput.focus();
                    return;
                }
            }

            this.mfaBusy = true;

            passwordInput.disabled = true;
            currentCodeInput.disabled = true;
            startButton.disabled = true;
            toggleButton.disabled = true;

            startButton.textContent = 'Verifying...';
            status.textContent = 'Verifying your account...';

            try {

                const result =
                    await authenticationService.startMfaReconnect(
                        password,
                        code,
                        this.verificationMethod
                    );

                if (this.shuttingDown || !this.sys.isActive()) {
                    return;
                }

                if (
                    result.status !== 'MFA_RECONNECT_STARTED' ||
                    typeof result.otpauthUri !== 'string'
                ) {
                    throw new Error(
                        'Unexpected authenticator replacement response.'
                    );
                }

                // Validate the provisioning URI.
                const otpAuthUrl = new URL(result.otpauthUri);

                if (
                    otpAuthUrl.protocol !== 'otpauth:' ||
                    !otpAuthUrl.searchParams.get('secret')
                ) {
                    throw new Error(
                        'Invalid new authenticator setup information.'
                    );
                }

                const secret =
                    otpAuthUrl.searchParams.get('secret');

                // Generate QR code.
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

                identityPanel.hidden = true;
                setupPanel.hidden = false;

                status.textContent =
                    'Connect your new authenticator within 5 minutes.';

                passwordInput.value = '';
                currentCodeInput.value = '';

            } catch (reconnectError) {

                if (this.shuttingDown || !this.sys.isActive()) {
                    return;
                }

                status.textContent =
                    'Authenticator replacement could not start.';

                error.textContent =
                    reconnectError.message ||
                    'Unable to verify your account.';

                passwordInput.value = '';
                currentCodeInput.value = '';

            } finally {

                if (!this.shuttingDown && this.sys.isActive()) {

                    this.mfaBusy = false;

                    passwordInput.disabled = false;
                    currentCodeInput.disabled = false;
                    startButton.disabled = false;
                    toggleButton.disabled = false;

                    startButton.textContent = 'Verify & Continue';
                }
            }
        });

        // STEP 2: CONFIRM NEW AUTHENTICATOR

        confirmForm.addEventListener('submit', async (event) => {

            event.preventDefault();

            if (this.mfaBusy || this.shuttingDown) {
                return;
            }

            const code = newCodeInput.value.trim();

            error.textContent = '';

            if (!/^[0-9]{6}$/.test(code)) {
                error.textContent =
                    'Enter a valid six-digit code from your new authenticator.';
                newCodeInput.focus();
                return;
            }

            this.mfaBusy = true;

            newCodeInput.disabled = true;
            confirmButton.disabled = true;

            confirmButton.textContent = 'Confirming...';
            status.textContent = 'Confirming your new authenticator...';

            try {

                const result =
                    await authenticationService.confirmMfaReconnect(code);

                if (this.shuttingDown || !this.sys.isActive()) {
                    return;
                }

                if (
                    result.status !== 'MFA_RECONNECT_COMPLETED' ||
                    !Array.isArray(result.recoveryCodes) ||
                    result.recoveryCodes.length === 0
                ) {
                    throw new Error(
                        'Unexpected authenticator replacement response.'
                    );
                }

                // Display new recovery codes only once.
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
                error.textContent = '';

                recoveryPanel.hidden = false;

            } catch (confirmationError) {

                if (this.shuttingDown || !this.sys.isActive()) {
                    return;
                }

                error.textContent =
                    confirmationError.message ||
                    'Unable to confirm your new authenticator.';

                newCodeInput.value = '';

            } finally {

                if (!this.shuttingDown && this.sys.isActive()) {

                    this.mfaBusy = false;

                    newCodeInput.disabled = false;
                    confirmButton.disabled = false;

                    confirmButton.textContent =
                        'Confirm New Authenticator';
                }
            }
        });

        // STEP 3: RETURN TO PROFILE

        continueButton.addEventListener('click', () => {

            if (this.shuttingDown) {
                return;
            }

            this.scene.start('ProfileScene');
        });

        // CLEANUP

        this.events.once(
            Phaser.Scenes.Events.SHUTDOWN,
            () => {
                this.shuttingDown = true;
            }
        );
    }
}

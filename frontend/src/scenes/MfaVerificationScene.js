
import Phaser from 'phaser';
import BackButton from '../components/BackButton.js';
import authenticationService from '../components/AuthenticationService.js';
import './mfa.css';

export default class MfaVerificationScene extends Phaser.Scene {

    constructor() {
        super('MfaVerificationScene');
    }

    create() {

        const { width, height } = this.scale;

        this.shuttingDown = false;
        this.verificationInProgress = false;
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
        new BackButton(this, 'LoginScene');

        // VERIFICATION FORM
        const html = `
            <div class="banana-mfa-form">

                <h2>Verify Your Identity</h2>

                <p class="mfa-description">
                    Your account is protected with two-factor authentication.
                </p>

                <p id="mfa-verification-instruction"
                   class="mfa-instruction">
                    Open Microsoft Authenticator and enter your six-digit code.
                </p>

                <form id="mfa-verification-form">

                    <input
                        id="mfa-verification-code"
                        class="mfa-verification-input"
                        type="text"
                        inputmode="numeric"
                        autocomplete="one-time-code"
                        maxlength="6"
                        placeholder="000000"
                        required
                    />

                    <button
                        id="mfa-verification-submit"
                        type="submit"
                    >
                        Verify & Login
                    </button>

                </form>

                <button
                    id="mfa-toggle-method"
                    class="mfa-secondary-button"
                    type="button"
                >
                    Use a recovery code instead
                </button>

                <div
                    id="mfa-verification-error"
                    class="mfa-error"
                    role="alert"
                    aria-live="polite"
                ></div>

            </div>
        `;

        this.form = this.add.dom(
            cx(0.72),
            cy(0.62)
        ).createFromHTML(html);

        this.form.setDepth(3);

        const formWidth = bounds.width * 0.43;
        const formScale = formWidth / 460;

        this.form.setScale(formScale);

        // HTML ELEMENT REFERENCES
        const root = this.form.node;

        const form = root.querySelector('#mfa-verification-form');
        const codeInput = root.querySelector('#mfa-verification-code');
        const submitButton = root.querySelector('#mfa-verification-submit');
        const toggleButton = root.querySelector('#mfa-toggle-method');
        const instruction = root.querySelector('#mfa-verification-instruction');
        const error = root.querySelector('#mfa-verification-error');

        // SWITCH BETWEEN TOTP AND RECOVERY CODE
        toggleButton.addEventListener('click', () => {

            if (this.verificationInProgress) {
                return;
            }

            this.verificationMethod =
                this.verificationMethod === 'TOTP'
                    ? 'RECOVERY'
                    : 'TOTP';

            codeInput.value = '';
            error.textContent = '';

            if (this.verificationMethod === 'RECOVERY') {

                codeInput.maxLength = 14;
                codeInput.inputMode = 'text';
                codeInput.autocomplete = 'off';
                codeInput.placeholder = 'XXXX-XXXX-XXXX';

                codeInput.classList.add('mfa-recovery-entry');

                instruction.textContent =
                    'Enter one of your unused recovery codes.';

                toggleButton.textContent =
                    'Use an authenticator code instead';

            } else {

                codeInput.maxLength = 6;
                codeInput.inputMode = 'numeric';
                codeInput.autocomplete = 'one-time-code';
                codeInput.placeholder = '000000';

                codeInput.classList.remove('mfa-recovery-entry');

                instruction.textContent =
                    'Open Microsoft Authenticator and enter your six-digit code.';

                toggleButton.textContent =
                    'Use a recovery code instead';
            }

            codeInput.focus();
        });

        // VERIFY MFA
        form.addEventListener('submit', async (event) => {

            event.preventDefault();

            if (
                this.verificationInProgress ||
                this.shuttingDown
            ) {
                return;
            }

            const code = codeInput.value.trim();

            error.textContent = '';

            if (this.verificationMethod === 'TOTP') {

                if (!/^[0-9]{6}$/.test(code)) {
                    error.textContent =
                        'Please enter a valid six-digit authenticator code.';
                    codeInput.focus();
                    return;
                }

            } else {

                const normalizedCode = code
                    .replace(/[-\s]/g, '')
                    .toUpperCase();

                if (!/^[A-HJ-NP-Z2-9]{12}$/.test(normalizedCode)) {
                    error.textContent =
                        'Please enter a valid recovery code.';
                    codeInput.focus();
                    return;
                }
            }

            this.verificationInProgress = true;

            codeInput.disabled = true;
            submitButton.disabled = true;
            toggleButton.disabled = true;

            submitButton.textContent = 'Verifying...';

            try {

                // Verify the selected MFA method.
                const result =
                    await authenticationService.verifyMfa(
                        code,
                        this.verificationMethod
                    );

                if (this.shuttingDown || !this.sys.isActive()) {
                    return;
                }

                if (result.status !== 'MFA_VERIFIED') {
                    throw new Error(
                        'Unexpected MFA verification response.'
                    );
                }

                // Confirm that Spring Security created the full session.
                const player =
                    await authenticationService.getCurrentPlayer();

                if (this.shuttingDown || !this.sys.isActive()) {
                    return;
                }

                this.registry.set(
                    'authenticatedPlayer',
                    player.username
                );

                this.registry.remove('pendingMfaUsername');

                console.log('MFA verification successful.');

                this.scene.start('AuthenticatedMainMenuScene');

            } catch (verificationError) {

                if (this.shuttingDown || !this.sys.isActive()) {
                    return;
                }

                error.textContent =
                    verificationError.message ||
                    'Verification failed. Please try again.';

                codeInput.value = '';
                codeInput.focus();

            } finally {

                if (!this.shuttingDown && this.sys.isActive()) {

                    this.verificationInProgress = false;

                    codeInput.disabled = false;
                    submitButton.disabled = false;
                    toggleButton.disabled = false;

                    submitButton.textContent = 'Verify & Login';
                }
            }
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

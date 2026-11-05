
import Phaser from 'phaser';
import AudioManager from '../components/AudioManager.js';
import BackButton from '../components/BackButton.js';
import authenticationService from '../components/AuthenticationService.js';
import './email-recovery.css';

export default class EmailRecoveryScene extends Phaser.Scene {

    constructor() {
        super('EmailRecoveryScene');
    }

    create() {
        const { width, height } = this.scale;

        this.shuttingDown = false;
        this.requestInProgress = false;

        // =========================================
        // 1. BACKGROUND
        // =========================================

        const sky = this.add.image(
            width / 2,
            height / 2,
            'loginSky'
        );

        sky.setScale(Math.max(
            width / sky.width,
            height / sky.height
        ));

        sky.setDepth(0);

        // =========================================
        // 2. LOGIN CARD
        // =========================================

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

        // =========================================
        // 3. BANANA CHARACTER
        // =========================================

        const banana = this.add.image(
            cx(0.28),
            cy(0.50),
            'bananaOpen'
        );

        const bananaScale = Math.min(
            (bounds.width * 0.34) / banana.width,
            (bounds.height * 0.58) / banana.height
        );

        banana.setScale(bananaScale);
        banana.setDepth(2);

        // =========================================
        // 4. BACK BUTTON
        // =========================================

        new BackButton(this, 'LoginScene');

        // =========================================
        // 5. HEADINGS
        // =========================================

        const headingX = cx(0.70);

        this.add.text(
            headingX,
            cy(0.36),
            'Verify Your Email',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '35px',
                fontStyle: 'bold',
                color: '#123D80',
                align: 'center'
            }
        )
        .setOrigin(0.5)
        .setDepth(3);

        this.add.text(
            headingX,
            cy(0.405),
            'Resume your banana adventure!',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                color: '#496788',
                align: 'center'
            }
        )
        .setOrigin(0.5)
        .setDepth(3);

        // =========================================
        // 6. EMAIL RECOVERY FORM
        // =========================================

        const html = `
            <div class="banana-recovery-form">
                <form id="banana-recovery" novalidate>

                    <label for="recovery-email">
                        Enter your registered email address
                    </label>

                    <input
                        id="recovery-email"
                        type="email"
                        placeholder="✉  Email address"
                        autocomplete="email"
                        maxlength="254"
                        required
                    />

                    <div
                        id="recovery-message"
                        class="recovery-message"
                        role="status"
                        aria-live="polite"
                    ></div>

                    <button
                        type="submit"
                        id="recovery-submit"
                        class="recovery-submit"
                        aria-label="Send Verification Code"
                    >
                        Send Verification Code
                    </button>

                    <p class="recovery-hint">
                        If your email is eligible, a verification
                        code will be sent. Check your inbox.
                    </p>

                </form>
            </div>
        `;

        this.form = this.add.dom(
            cx(0.72),
            cy(0.66)
        ).createFromHTML(html);

        this.form.setDepth(3);

        // Match LoginScene form scaling.
        const formWidth = bounds.width * 0.37;
        const formScale = formWidth / 500;

        this.form.setScale(formScale);

        const root = this.form.node;

        const form =
            root.querySelector('#banana-recovery');

        const emailInput =
            root.querySelector('#recovery-email');

        const message =
            root.querySelector('#recovery-message');

        const submitButton =
            root.querySelector('#recovery-submit');

        // =========================================
        // 7. BANANA TYPING ANIMATION
        // =========================================

        let typingTimer = null;

        const onTyping = () => {

            if (this.shuttingDown || !banana.active) {
                return;
            }

            // Close banana's mouth while typing.
            banana.setTexture('bananaClosed');

            // Restart the timer for every keystroke.
            if (typingTimer !== null) {
                clearTimeout(typingTimer);
            }

            typingTimer = setTimeout(() => {

                if (!this.shuttingDown && banana.active) {
                    banana.setTexture('bananaOpen');
                }

                typingTimer = null;

            }, 700);
        };

        emailInput.addEventListener('input', onTyping);

        // =========================================
        // 8. RESTORE PENDING EMAIL
        // =========================================

        const previousEmail =
            this.registry.get('pendingRegistrationEmail');

        if (typeof previousEmail === 'string') {
            emailInput.value = previousEmail;
        }

        // =========================================
        // 9. SEND VERIFICATION CODE
        // =========================================

        form.addEventListener('submit', async (event) => {

            event.preventDefault();

            // Prevent duplicate requests.
            if (this.requestInProgress) {
                return;
            }

            AudioManager.playButtonClick(this);

            const email = emailInput.value.trim();

            message.textContent = '';
            message.className = 'recovery-message';

            // Validate email.
            if (!email || !emailInput.validity.valid) {

                message.textContent =
                    'Please enter a valid email address.';

                message.classList.add('error');

                emailInput.focus();
                return;
            }

            this.requestInProgress = true;

            submitButton.disabled = true;
            emailInput.disabled = true;

            submitButton.setAttribute(
                'aria-busy',
                'true'
            );

            try {

                // Request a new OTP from Spring Boot.
                await authenticationService.resendOtp(email);

                if (
                    this.shuttingDown ||
                    !this.sys.isActive()
                ) {
                    return;
                }

                // Store email for OTPVerificationScene.
                // This does not verify the account.
                this.registry.set(
                    'pendingRegistrationEmail',
                    email
                );

                // Navigate to OTP screen.
                this.scene.start('OTPVerificationScene');

            } catch (error) {

                if (
                    this.shuttingDown ||
                    !this.sys.isActive()
                ) {
                    return;
                }

                message.textContent =
                    error.message ||
                    'Unable to process the request.';

                message.classList.add('error');

            } finally {

                if (
                    !this.shuttingDown &&
                    this.sys.isActive()
                ) {

                    this.requestInProgress = false;

                    submitButton.disabled = false;
                    emailInput.disabled = false;

                    submitButton.setAttribute(
                        'aria-busy',
                        'false'
                    );
                }
            }
        });

        // =========================================
        // 10. CLEANUP
        // =========================================

        this.events.once(
            Phaser.Scenes.Events.SHUTDOWN,
            () => {

                this.shuttingDown = true;

                if (typingTimer !== null) {
                    clearTimeout(typingTimer);
                    typingTimer = null;
                }
            }
        );
    }
}

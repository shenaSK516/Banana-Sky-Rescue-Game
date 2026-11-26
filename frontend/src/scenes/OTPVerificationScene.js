
import Phaser from 'phaser';
import AudioManager from '../components/AudioManager.js';
import ImageButton from '../components/ImageButton.js';
import './otp-verification.css';

export default class OTPVerificationScene extends Phaser.Scene {

    constructor() {
        super('OTPVerificationScene');
    }

    create() {
        const { width, height } = this.scale;

        // 1. SKY BACKGROUND

        this.add.image(
            width / 2,
            height / 2,
            'loginSky'
        )
        .setDisplaySize(width, height)
        .setDepth(0);

        // 2. TRANSPARENT VERIFICATION PANEL

        this.add.image(
            width * 0.5,
            height * 0.52,
            'otpPanel'
        )
        .setDisplaySize(
            width * 0.69,
            height * 0.98
        )
        .setDepth(1);

        // CLOSE BUTTON

        const closeButton = new ImageButton(
            this,
            width * 0.766,
            height * 0.240,
            'otpCloseButton',
            92,
            () => this.scene.start('RegisterScene')
        );

        // Ensure the button appears above the OTP panel
        closeButton.button.setDepth(5);

        // EMAIL FROM REGISTRATION

        const email =
            this.registry.get('pendingRegistrationEmail') || '';

        // Hide part of the email address
        const maskEmail = (address) => {

            const parts = address.split('@');

            if (parts.length !== 2) {
                return 'Email address not available';
            }

            const name = parts[0];

            const masked = name.slice(0, 1) + '***';

            return masked + '@' + parts[1];
        };

        // 5. HTML VERIFICATION FORM

        const html = `
            <div class="banana-otp-form">

                <!-- Masked email display -->
                <div
                    class="otp-email"
                    id="otp-email-display"
                ></div>

                <form id="otp-form" novalidate>

                    <!-- Six OTP input boxes -->
                    <div
                        class="otp-inputs"
                        role="group"
                        aria-label="Six-digit verification code"
                    >

                        ${Array.from({ length: 6 }, (_, index) => `
                            <input
                                class="otp-digit"
                                type="text"
                                inputmode="numeric"
                                pattern="[0-9]*"
                                maxlength="1"
                                autocomplete="${
                                    index === 0
                                        ? 'one-time-code'
                                        : 'off'
                                }"
                                aria-label="Digit ${index + 1}"
                            />
                        `).join('')}

                    </div>

                    <!-- Validation error -->
                    <div
                        id="otp-error"
                        class="otp-error"
                        role="alert"
                        aria-live="polite"
                    ></div>

                    <!-- Verify Email button -->
                    <button
                        type="submit"
                        class="otp-verify-button"
                        aria-label="Verify Email"
                    ></button>

                    <!-- Resend OTP -->
                    <button
                        type="button"
                        id="otp-resend"
                        class="otp-resend"
                        disabled
                    >
                        Resend Code (00:45)
                    </button>

                    <!-- Change email -->
                    <button
                        type="button"
                        id="otp-change-email"
                        class="otp-change-email"
                    >
                        Change Email Address
                    </button>

                </form>

            </div>
        `;

        // 6. ADD HTML FORM TO PHASER

        this.form = this.add.dom(
            width * 0.52,
            height * 0.63
        ).createFromHTML(html);

        this.form.setDepth(3);

        const root = this.form.node;


        // Safe email display
        root.querySelector('#otp-email-display').textContent =
            '✉  ' + maskEmail(email);

        const form = root.querySelector('#otp-form');

        const inputs = [
            ...root.querySelectorAll('.otp-digit')
        ];

        const error = root.querySelector('#otp-error');
        const resend = root.querySelector('#otp-resend');
        const changeEmail = root.querySelector('#otp-change-email');

        // 6. Fill OTP boxes
        const fillCode = (value) => {
            const digits = value
                .replace(/\D/g, '')
                .slice(0, 6);

            inputs.forEach((input, index) => {
                input.value = digits[index] || '';
            });

            inputs[Math.min(digits.length, 5)].focus();
        };

        // 7. OTP input events
        inputs.forEach((input, index) => {

            input.addEventListener('input', () => {

                const digits = input.value.replace(/\D/g, '');

                if (digits.length > 1) {
                    fillCode(digits);
                    error.textContent = '';
                    return;
                }

                input.value = digits.slice(0, 1);
                error.textContent = '';

                if (input.value && index < 5) {
                    inputs[index + 1].focus();
                }
            });

            input.addEventListener('keydown', (event) => {

                if (
                    event.key === 'Backspace' &&
                    !input.value &&
                    index > 0
                ) {
                    inputs[index - 1].focus();
                    inputs[index - 1].value = '';
                }

                if (
                    event.key === 'ArrowLeft' &&
                    index > 0
                ) {
                    event.preventDefault();
                    inputs[index - 1].focus();
                }

                if (
                    event.key === 'ArrowRight' &&
                    index < 5
                ) {
                    event.preventDefault();
                    inputs[index + 1].focus();
                }
            });

            input.addEventListener('paste', (event) => {

                event.preventDefault();

                const pasted =
                    event.clipboardData.getData('text');

                fillCode(pasted);
                error.textContent = '';
            });
        });

        // 8. Resend countdown
        let secondsLeft = 45;

        const updateCountdown = () => {

            if (secondsLeft > 0) {
                resend.disabled = true;

                resend.textContent =
                    `Resend Code (00:${String(secondsLeft).padStart(2, '0')})`;

            } else {
                resend.disabled = false;
                resend.textContent = 'Resend Code';
            }
        };

        updateCountdown();

        const countdownEvent = this.time.addEvent({
            delay: 1000,
            repeat: 44,
            callback: () => {
                secondsLeft--;
                updateCountdown();
            }
        });

        // 9. Verify OTP
        form.addEventListener('submit', (event) => {

            event.preventDefault();

            AudioManager.playButtonClick(this);

            error.textContent = '';

            const code = inputs
                .map(input => input.value)
                .join('');

            // Validate six digits
            if (!/^\d{6}$/.test(code)) {

                error.textContent =
                    'Please enter the complete 6-digit code.';

                return;
            }

            // Real verification will be connected to Spring Boot.
            error.textContent =
                'Verification service is not connected yet.';

            // After the backend confirms successful verification,
            // navigate to the success screen using:
            //
            // this.scene.start('EmailVerifiedScene');
        });

        // 10. Resend code
        resend.addEventListener('click', () => {

            AudioManager.playButtonClick(this);

            // Later: call Spring Boot resend OTP endpoint.
            error.textContent =
                'Email service is not connected yet.';
        });

        // 11. Change email address
        changeEmail.addEventListener('click', () => {

            AudioManager.playButtonClick(this);

            this.scene.start('RegisterScene');
        });

        // 12. Development-only preview
        // Press Shift + V while on this screen to preview
        // the Email Verified popup without verifying an account.
        const previewSuccess = (event) => {
            if (
                import.meta.env.DEV &&
                event.shiftKey &&
                event.code === 'KeyV'
            ) {
                this.scene.start('EmailVerifiedScene');
            }
        };

        if (import.meta.env.DEV) {
            this.input.keyboard.on('keydown', previewSuccess);
        }

        // 13. Cleanup
        this.events.once(
            Phaser.Scenes.Events.SHUTDOWN,
            () => {
                countdownEvent.remove();

                if (import.meta.env.DEV) {
                    this.input.keyboard.off(
                        'keydown',
                        previewSuccess
                    );
                }
            }
        );
    }
}



     
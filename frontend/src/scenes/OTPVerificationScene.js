
import Phaser from 'phaser';

import AudioManager from '../components/AudioManager.js';
import ImageButton from '../components/ImageButton.js';
import authenticationService from '../components/AuthenticationService.js';

import './otp-verification.css';

export default class OTPVerificationScene extends Phaser.Scene {

    constructor() {
        super('OTPVerificationScene');
    }

    create() {

        const { width, height } = this.scale;

        let sceneShuttingDown = false;
        let verificationInProgress = false;
        let resendInProgress = false;

        // =========================================
        // 1. BACKGROUND IMAGE
        // =========================================

        this.add.image(
            width / 2,
            height / 2,
            'loginSky'
        )
        .setDisplaySize(width, height)
        .setDepth(0);

        // =========================================
        // 2. TRANSPARENT VERIFICATION PANEL
        // =========================================

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

        // =========================================
        // 3. CLOSE BUTTON
        // =========================================

        const closeButton = new ImageButton(
            this,
            width * 0.766,
            height * 0.240,
            'otpCloseButton',
            92,
            () => {
                if (
                    !verificationInProgress &&
                    !resendInProgress
                ) {
                    this.scene.start('RegisterScene');
                }
            }
        );

        closeButton.button.setDepth(5);

        // =========================================
        // 4. EMAIL FROM REGISTRATION
        // =========================================

        const email =
            this.registry.get('pendingRegistrationEmail') || '';

        const maskEmail = address => {

            const parts = address.split('@');

            if (parts.length !== 2) {
                return 'Email address not available';
            }

            const name = parts[0];
            const masked = name.slice(0, 1) + '***';

            return masked + '@' + parts[1];
        };

        // =========================================
        // 5. HTML VERIFICATION FORM
        // =========================================

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
                        Resend Code (01:00)
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

        // =========================================
        // 6. ADD HTML FORM TO PHASER
        // =========================================

        this.form = this.add.dom(
            width * 0.52,
            height * 0.63
        ).createFromHTML(html);

        this.form.setDepth(3);

        const root = this.form.node;

        const emailDisplay = root.querySelector(
            '#otp-email-display'
        );

        const form = root.querySelector('#otp-form');

        const inputs = [
            ...root.querySelectorAll('.otp-digit')
        ];

        const error = root.querySelector('#otp-error');

        const resend = root.querySelector('#otp-resend');

        const changeEmail = root.querySelector(
            '#otp-change-email'
        );

        const verifyButton = root.querySelector(
            '.otp-verify-button'
        );

        emailDisplay.textContent =
            '✉  ' + maskEmail(email);

        // =========================================
        // 7. OTP INPUT HELPERS
        // =========================================

        const clearCode = () => {

            inputs.forEach(input => {
                input.value = '';
            });
        };

        const fillCode = value => {

            const digits = value
                .replace(/\D/g, '')
                .slice(0, 6);

            inputs.forEach((input, index) => {
                input.value = digits[index] || '';
            });

            inputs[Math.min(digits.length, 5)].focus();
        };

        // =========================================
        // 8. OTP INPUT EVENTS
        // =========================================

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

            input.addEventListener('keydown', event => {

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

            input.addEventListener('paste', event => {

                event.preventDefault();

                const pasted =
                    event.clipboardData.getData('text');

                fillCode(pasted);

                error.textContent = '';
            });
        });

        // =========================================
        // 9. RESEND COUNTDOWN
        // =========================================

        let secondsLeft = 60;
        let countdownEvent = null;

        const formatTime = seconds => {

            const minutes = Math.floor(seconds / 60);

            const remainingSeconds = seconds % 60;

            return (
                String(minutes).padStart(2, '0') +
                ':' +
                String(remainingSeconds).padStart(2, '0')
            );
        };

        const updateButtons = () => {

            if (sceneShuttingDown) {
                return;
            }

            verifyButton.disabled =
                verificationInProgress || resendInProgress;

            changeEmail.disabled =
                verificationInProgress || resendInProgress;

            resend.disabled =
                verificationInProgress ||
                resendInProgress ||
                secondsLeft > 0;

            verifyButton.setAttribute(
                'aria-busy',
                String(verificationInProgress)
            );

            resend.setAttribute(
                'aria-busy',
                String(resendInProgress)
            );

            if (resendInProgress) {

                resend.textContent = 'Sending...';

            } else if (secondsLeft > 0) {

                resend.textContent =
                    `Resend Code (${formatTime(secondsLeft)})`;

            } else {

                resend.textContent = 'Resend Code';
            }
        };

        const startCountdown = (duration = 60) => {

            // Remove any existing countdown first
            if (countdownEvent) {

                countdownEvent.remove();
                countdownEvent = null;
            }

            secondsLeft = duration;

            updateButtons();

            if (duration <= 0) {
                return;
            }

            countdownEvent = this.time.addEvent({

                delay: 1000,

                repeat: duration - 1,

                callback: () => {

                    if (sceneShuttingDown) {
                        return;
                    }

                    secondsLeft = Math.max(
                        0,
                        secondsLeft - 1
                    );

                    updateButtons();
                }
            });
        };

        // Start initial 60-second countdown
        startCountdown(60);

        // =========================================
        // 10. VERIFY OTP THROUGH SPRING BOOT
        // =========================================

        form.addEventListener('submit', async event => {

            event.preventDefault();

            if (
                sceneShuttingDown ||
                verificationInProgress ||
                resendInProgress
            ) {
                return;
            }

            AudioManager.playButtonClick(this);

            error.textContent = '';

            const code = inputs
                .map(input => input.value)
                .join('');

            if (!/^\d{6}$/.test(code)) {

                error.textContent =
                    'Please enter the complete 6-digit code.';

                return;
            }

            if (!email) {

                error.textContent =
                    'Registration email not found. Please register again.';

                return;
            }

            verificationInProgress = true;

            updateButtons();

            error.textContent = 'Verifying your email...';

            try {

                const result =
                    await authenticationService.verifyEmail(
                        email,
                        code
                    );

                if (
                    sceneShuttingDown ||
                    !this.sys.isActive()
                ) {
                    return;
                }

                console.log(
                    'Email verification successful:',
                    result.message
                );

                clearCode();

                this.registry.remove(
                    'pendingRegistrationEmail'
                );

                this.scene.start('EmailVerifiedScene');

            } catch (verificationError) {

                if (
                    sceneShuttingDown ||
                    !this.sys.isActive()
                ) {
                    return;
                }

                error.textContent =
                    verificationError.message ||
                    'Verification failed. Please try again.';

            } finally {

                verificationInProgress = false;

                if (
                    !sceneShuttingDown &&
                    this.sys.isActive()
                ) {
                    updateButtons();
                }
            }
        });

        // =========================================
        // 11. RESEND OTP THROUGH SPRING BOOT
        // =========================================

        resend.addEventListener('click', async () => {

            if (
                sceneShuttingDown ||
                resendInProgress ||
                verificationInProgress ||
                secondsLeft > 0
            ) {
                return;
            }

            AudioManager.playButtonClick(this);

            error.textContent = '';

            if (!email) {

                error.textContent =
                    'Registration email not found. Please register again.';

                return;
            }

            resendInProgress = true;

            updateButtons();

            try {

                const result =
                    await authenticationService.resendOtp(
                        email
                    );

                if (
                    sceneShuttingDown ||
                    !this.sys.isActive()
                ) {
                    return;
                }

                // The backend intentionally gives a
                // generic response for account privacy.
                error.textContent =
                    result.message ||
                    'If eligible, a verification code will be sent.';

                // Clear the old code from the inputs
                clearCode();

                // Restart the 60-second cooldown
                startCountdown(60);

            } catch (resendError) {

                if (
                    sceneShuttingDown ||
                    !this.sys.isActive()
                ) {
                    return;
                }

                error.textContent =
                    resendError.message ||
                    'Unable to resend the code. Please try again.';

            } finally {

                resendInProgress = false;

                if (
                    !sceneShuttingDown &&
                    this.sys.isActive()
                ) {
                    updateButtons();
                }
            }
        });

        // =========================================
        // 12. CHANGE EMAIL ADDRESS
        // =========================================

        changeEmail.addEventListener('click', () => {

            if (
                sceneShuttingDown ||
                verificationInProgress ||
                resendInProgress
            ) {
                return;
            }

            AudioManager.playButtonClick(this);

            // Returns to registration.
            // Does not update the existing account.
            this.scene.start('RegisterScene');
        });

        // =========================================
        // 13. SCENE CLEANUP
        // =========================================

        this.events.once(
            Phaser.Scenes.Events.SHUTDOWN,
            () => {

                sceneShuttingDown = true;

                if (countdownEvent) {

                    countdownEvent.remove();
                    countdownEvent = null;
                }
            }
        );
    }
}

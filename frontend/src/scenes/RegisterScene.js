
import Phaser from 'phaser';
import AudioManager from '../components/AudioManager.js';
import ImageButton from '../components/ImageButton.js';
import './register.css';

export default class RegisterScene extends Phaser.Scene {

    constructor() {
        super('RegisterScene');
    }

    create() {
        const { width, height } = this.scale;

        // =========================================
        // 1. SKY BACKGROUND
        // =========================================

        const sky = this.add.image(
            width / 2,
            height / 2,
            'loginSky'
        );

        sky.setDisplaySize(width, height);
        sky.setDepth(0);

        // =========================================
        // 2. TRANSPARENT REGISTRATION CARD
        // =========================================

        const card = this.add.image(
            width / 2,
            height / 2,
            'loginCard'
        );

        card.setDisplaySize(
            width * 0.78,
            height * 1.0
        );

        card.setDepth(1);

        // =========================================
        // 3. ANIMATED BANANA
        // =========================================

        this.banana = this.add.image(
            width * 0.285,
            height * 0.60,
            'bananaOpen'
        );

        this.banana.setDisplaySize(
            width * 0.29,
            height * 0.64
        );

        this.banana.setDepth(2);

        // =========================================
        // 4. REUSABLE BACK BUTTON
        // =========================================

        new ImageButton(
            this,
            width * 0.075,
            height * 0.16,
            'backButton',
            75,
            () => this.scene.start('MainMenuScene')
        );

        // =========================================
        // 5. REGISTRATION HEADING
        // =========================================

        this.add.text(
            width * 0.65,
            height * 0.35,
            'Join the Adventure!',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '26px',
                fontStyle: 'bold',
                color: '#123D80'
            }
        )
        .setOrigin(0.5)
        .setDepth(3);

        this.add.text(
            width * 0.65,
            height * 0.38,
            'Create your account and start rescuing animals.',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '12px',
                color: '#52749A'
            }
        )
        .setOrigin(0.5)
        .setDepth(3);

        // =========================================
        // 6. HTML REGISTRATION FORM
        // =========================================

        const eyeOpen = `
            <svg class="eye-icon"
                 viewBox="0 0 24 24"
                 fill="none"
                 stroke="currentColor"
                 stroke-width="2"
                 stroke-linecap="round"
                 stroke-linejoin="round"
                 aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
                <circle cx="12" cy="12" r="3"/>
            </svg>
        `;

        const eyeClosed = `
            <svg class="eye-icon"
                 viewBox="0 0 24 24"
                 fill="none"
                 stroke="currentColor"
                 stroke-width="2"
                 stroke-linecap="round"
                 stroke-linejoin="round"
                 aria-hidden="true">
                <path d="M3 3l18 18"/>
                <path d="M10.6 5.1A11 11 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-3 3.7"/>
                <path d="M6.2 6.2C3.4 8.1 2 12 2 12s3.5 7 10 7a10.5 10.5 0 0 0 4.3-.9"/>
                <path d="M10 10a3 3 0 0 0 4 4"/>
            </svg>
        `;

        const html = `
            <div class="banana-register-form">

                <form id="banana-register" novalidate>

                    <!-- USERNAME -->
                    <input
                        id="register-username"
                        type="text"
                        placeholder="👤  Username"
                        autocomplete="username"
                        maxlength="30"
                        required
                    />

                    <!-- EMAIL -->
                    <input
                        id="register-email"
                        type="email"
                        placeholder="✉  Email Address"
                        autocomplete="email"
                        maxlength="254"
                        required
                    />

                    <!-- PASSWORD -->
                    <div class="register-password-container">

                        <input
                            id="register-password"
                            type="password"
                            placeholder="🔒  Password"
                            autocomplete="new-password"
                            required
                        />

                        <button
                            type="button"
                            class="register-toggle-password"
                            data-target="register-password"
                            aria-label="Show password"
                            aria-pressed="false"
                        >
                            ${eyeOpen}
                        </button>

                    </div>

                    <!-- CONFIRM PASSWORD -->
                    <div class="register-password-container">

                        <input
                            id="register-confirm"
                            type="password"
                            placeholder="🔒  Confirm Password"
                            autocomplete="new-password"
                            required
                        />

                        <button
                            type="button"
                            class="register-toggle-password"
                            data-target="register-confirm"
                            aria-label="Show confirm password"
                            aria-pressed="false"
                        >
                            ${eyeOpen}
                        </button>

                    </div>

                    <!-- PASSWORD STRENGTH -->
                    <div class="register-strength">

                        <div class="register-strength-heading">
                            <span>Password strength</span>
                            <strong id="strength-label">
                                Not set
                            </strong>
                        </div>

                        <div class="register-strength-bars">
                            <span></span>
                            <span></span>
                            <span></span>
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>

                    </div>

                    <!-- VALIDATION MESSAGE -->
                    <div
                        id="register-error"
                        class="register-error"
                        role="alert"
                        aria-live="polite"
                    ></div>

                    <!-- CREATE ACCOUNT BUTTON -->
                    <button
                        id="register-submit"
                        class="register-image-button"
                        type="submit"
                        aria-label="Create Account"
                    ></button>

                    <!-- LOGIN LINK -->
                    <p class="register-login-link">
                        Already have an account?
                        <a href="#" id="go-to-login">
                            Login
                        </a>
                    </p>

                </form>

            </div>
        `;

        this.form = this.add.dom(
            width * 0.66,
            height * 0.630
        ).createFromHTML(html);

        this.form.setDepth(4);

        // =========================================
        // 7. GET HTML ELEMENTS
        // =========================================

        const root = this.form.node;

        const form = root.querySelector('#banana-register');
        const username = root.querySelector('#register-username');
        const email = root.querySelector('#register-email');
        const password = root.querySelector('#register-password');
        const confirm = root.querySelector('#register-confirm');
        const error = root.querySelector('#register-error');

        const strengthLabel = root.querySelector(
            '#strength-label'
        );

        const strengthBars = [
            ...root.querySelectorAll(
                '.register-strength-bars span'
            )
        ];

    
        // BANANA TYPING ANIMATION
      

        let typingTimer = null;

        const onTyping = () => {

            this.banana.setTexture('bananaClosed');

            if (typingTimer !== null) {
                clearTimeout(typingTimer);
            }

            typingTimer = setTimeout(() => {

                if (this.banana.active) {
                    this.banana.setTexture('bananaOpen');
                }

                typingTimer = null;

            }, 700);
        };

        [username, email, password, confirm].forEach(input => {
            input.addEventListener('input', onTyping);
        });

       
        //PASSWORD ICONS
      

        root.querySelectorAll('.register-toggle-password')
            .forEach(button => {

                button.addEventListener('click', () => {

                    const target = root.querySelector(
                        '#' + button.dataset.target
                    );

                    const isHidden =
                        target.type === 'password';

                    target.type = isHidden
                        ? 'text'
                        : 'password';

                    button.innerHTML = isHidden
                        ? eyeClosed
                        : eyeOpen;

                    const fieldName =
                        button.dataset.target === 'register-confirm'
                            ? 'confirm password'
                            : 'password';

                    button.setAttribute(
                        'aria-pressed',
                        String(isHidden)
                    );

                    button.setAttribute(
                        'aria-label',
                        isHidden
                            ? `Hide ${fieldName}`
                            : `Show ${fieldName}`
                    );
                });
            });

  
        // PASSWORD STRENGTH
        

        const getStrength = value => {

            if (!value) return 0;

            let score = 0;

            if (value.length >= 8) score++;
            if (value.length >= 12) score++;
            if (/[a-z]/.test(value)) score++;
            if (/[A-Z]/.test(value)) score++;
            if (/[0-9]/.test(value)) score++;
            if (/[^A-Za-z0-9]/.test(value)) score++;

            return score;
        };

        const updateStrength = () => {

            const score = getStrength(password.value);

            const label =
                score === 0 ? 'Not set' :
                score <= 2 ? 'Weak' :
                score <= 4 ? 'Medium' :
                'Strong';

            const color =
                score <= 2 ? '#ef4444' :
                score <= 4 ? '#f5aa12' :
                '#19ae65';

            strengthLabel.textContent = label;
            strengthLabel.style.color =
                score === 0 ? '#52749A' : color;

            strengthBars.forEach((bar, index) => {

                bar.style.backgroundColor =
                    index < score
                        ? color
                        : '#d4edfa';
            });
        };

        password.addEventListener(
            'input',
            updateStrength
        );

        updateStrength();

       
        //REGISTRATION VALIDATION
   

        form.addEventListener('submit', event => {

            event.preventDefault();

            AudioManager.playButtonClick(this);

            error.textContent = '';

            const usernameValue = username.value.trim();
            const emailValue = email.value.trim();
            const passwordValue = password.value;
            const confirmValue = confirm.value;

            // Validate username
            if (!/^[A-Za-z0-9_]{3,30}$/.test(usernameValue)) {

                error.textContent =
                    'Username must be 3–30 letters, numbers or underscores.';

                username.focus();
                return;
            }

            // Validate email
            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue) ||
                emailValue.length > 254
            ) {

                error.textContent =
                    'Enter a valid email address.';

                email.focus();
                return;
            }

            // Validate password
            if (
                passwordValue.length < 8 ||
                !/[A-Z]/.test(passwordValue) ||
                !/[a-z]/.test(passwordValue) ||
                !/[0-9]/.test(passwordValue)
            ) {

                error.textContent =
                    'Use 8+ characters with uppercase, lowercase and a number.';

                password.focus();
                return;
            }

            // Confirm password
            if (passwordValue !== confirmValue) {

                error.textContent =
                    'Passwords do not match.';

                confirm.focus();
                return;
            }

            // Backend integration will be added later.
            error.textContent =
                // Temporary frontend-only navigation for testing
                this.registry.set('pendingRegistrationEmail', emailValue);

                this.scene.start('OTPVerificationScene');

            // Later:
            // Send registration request to backend.
            // Navigate to email OTP verification scene.
        });

        // =========================================
        // 12. NAVIGATE TO LOGIN SCENE
        // =========================================

        root.querySelector('#go-to-login')
            .addEventListener('click', event => {

                event.preventDefault();

                AudioManager.playButtonClick(this);

                this.scene.start('LoginScene');
            });

        // =========================================
        // 13. CLEANUP
        // =========================================

        this.events.once(
            Phaser.Scenes.Events.SHUTDOWN,
            () => {

                if (typingTimer !== null) {
                    clearTimeout(typingTimer);
                }
            }
        );
    }
}

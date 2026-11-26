
import Phaser from 'phaser';
import AudioManager from '../components/AudioManager.js';
import BackButton from '../components/BackButton.js';
import authenticationService from '../components/AuthenticationService.js';
import './login.css';

export default class LoginScene extends Phaser.Scene {
    constructor() {
        super('LoginScene');
    }

    create() {
        const { width, height } = this.scale;

        //BACKGROUND IMAGE
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

        // TRANSPARENT LOGIN CARD
        // Keep its original aspect ratio.
        const card = this.add.image(
            width / 2,
            height / 2,
            'loginCard'
        );

        const cardScale = Math.min(
            (width * 1.0) / card.width,
            (height * 1.0) / card.height
        );

        card.setScale(cardScale);
        card.setDepth(1);

        // Coordinates relative to the card's displayed bounds
        const bounds = card.getBounds();

        const cx = (fraction) =>
            bounds.left + bounds.width * fraction;

        const cy = (fraction) =>
            bounds.top + bounds.height * fraction;

        // 3. BANANA CHARACTER
        this.banana = this.add.image(
            cx(0.28),
            cy(0.50),
            'bananaOpen'
        );

        // Preserve the banana's image proportions.
        const bananaScale = Math.min(
            (bounds.width * 0.34) / this.banana.width,
            (bounds.height * 0.58) / this.banana.height
        );

        this.banana.setScale(bananaScale);
        this.banana.setDepth(2);

        // 4. REUSABLE BACK BUTTON
        new BackButton(this, 'MainMenuScene');

        // 5. HEADINGS
        const headingX = cx(0.70);

        this.add.text(
            headingX,
            cy(0.36),
            'Welcome Back!',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '35px',
                fontStyle: 'bold',
                color: '#123D80',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(3);

        this.add.text(
            headingX,
            cy(0.405),
            'Login to continue your adventure.',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                color: '#496788',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(3);

        // 6. LOGIN FORM
        const html = `
            <div class="banana-login-form">
                <form id="banana-login" novalidate>

                    <input
                        id="login-username"
                        type="text"
                        placeholder="👤  Username"
                        autocomplete="username"
                        maxlength="254"
                        required
                    />

                    <div class="password-container">
                        <input
                            id="login-password"
                            type="password"
                            placeholder="🔒  Password"
                            autocomplete="current-password"
                            required
                        />

                        <button
                            type="button"
                            id="toggle-password"
                            class="toggle-password"
                            aria-label="Show password"
                            aria-pressed="false"
                            title="Show password"
                        >
                            <svg
                                class="eye-icon"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
                                <circle cx="12" cy="12" r="3"/>
                                <path class="eye-slash" d="M3 3l18 18"/>
                            </svg>
                        </button>
                    </div>

                    <div class="login-options">
                        <label>
                            <input id="remember-me" type="checkbox" />
                            Remember me
                        </label>

                        <a href="#" id="forgot-password">
                            Forgot Password?
                        </a>
                    </div>

                    <div
                        id="login-error"
                        class="login-error"
                        role="alert"
                        aria-live="polite"
                    ></div>

                    <button
                        type="submit"
                        id="login-submit"
                        class="login-image-button"
                        aria-label="Login"
                    ></button>

                    <p class="register-link">
                        Don't have an account?
                        <a href="#" id="create-account">
                        Create an Account
                        </a>
                    </p>

                    <p class="verification-recovery-link">
                        <a href="#" id="resume-verification">
                        Haven't verified your email? Resume Verification
                        </a>
                    </p>
                </form>
            </div>
        `;

        this.form = this.add.dom(
            cx(0.72),
            cy(0.66)
        ).createFromHTML(html);

        this.form.setDepth(3);

        // Size the HTML form relative to the card.
        const formWidth = bounds.width * 0.37;
        const formScale = formWidth / 500;

        this.form.setScale(formScale);

        const root = this.form.node;
        const form = root.querySelector('#banana-login');
        const username = root.querySelector('#login-username');
        const password = root.querySelector('#login-password');
        const error = root.querySelector('#login-error');
        const submitButton = root.querySelector('#login-submit');

        this.shuttingDown = false;
        this.loginInProgress = false;

        //SHOW / HIDE PASSWORD
        const togglePassword =
            root.querySelector('#toggle-password');

        const eyeSlash =
            togglePassword.querySelector('.eye-slash');

        eyeSlash.style.display = 'none';

        togglePassword.addEventListener('click', () => {
            const show = password.type === 'password';

            password.type = show ? 'text' : 'password';
            eyeSlash.style.display = show ? 'block' : 'none';

            togglePassword.setAttribute(
                'aria-label',
                show ? 'Hide password' : 'Show password'
            );

            togglePassword.setAttribute(
                'aria-pressed',
                String(show)
            );

            togglePassword.title =
                show ? 'Hide password' : 'Show password';

            this.playClick();
        });

        //BANANA TYPING ANIMATION
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

        username.addEventListener('input', onTyping);
        password.addEventListener('input', onTyping);


        // REAL LOGIN AUTHENTICATION

        form.addEventListener('submit', async (event) => {

            event.preventDefault();

            if (this.loginInProgress || this.shuttingDown) {
                return;
            }

            this.playClick();

            const userValue = username.value.trim();
            const passwordValue = password.value;

            error.textContent = '';

            if (!userValue) {
                error.textContent = 'Please enter your username.';
                username.focus();
                return;
            }

            if (!passwordValue) {
                error.textContent = 'Please enter your password.';
                password.focus();
                return;
            }

            this.loginInProgress = true;

            submitButton.disabled = true;
            username.disabled = true;
            password.disabled = true;

            submitButton.setAttribute('aria-busy', 'true');

            try {

                await authenticationService.login(
                    userValue,
                    passwordValue
                );


                // Verify that Spring Security recognizes
                // the authenticated session.

                const currentPlayer =
                    await authenticationService.getCurrentPlayer();

                if (this.shuttingDown || !this.sys.isActive()) {
                    return;
                }

                // Keep only non-sensitive player information.
                this.registry.set(
                    'authenticatedPlayer',
                    currentPlayer.username
                );

                console.log(
                    'Authenticated player session verified.'
                );


                if (this.shuttingDown || !this.sys.isActive()) {
                    return;
                }

                // Clear the password after authentication.
                password.value = '';

                console.log('Player login successful.');

                this.scene.start('AuthenticatedMainMenuScene');

            } catch (loginError) {

                if (this.shuttingDown || !this.sys.isActive()) {
                    return;
                }

                error.textContent =
                    loginError.message ||
                    'Unable to log in. Please try again.';

            } finally {

                if (!this.shuttingDown && this.sys.isActive()) {

                    this.loginInProgress = false;

                    submitButton.disabled = false;
                    username.disabled = false;
                    password.disabled = false;

                    submitButton.setAttribute('aria-busy', 'false');
                }
            }
        });


        //REGISTRATION LINK
        root.querySelector('#create-account')
            .addEventListener('click', (event) => {
                event.preventDefault();
                this.playClick();

                if (this.scene.manager.keys.RegisterScene) {
                    this.scene.start('RegisterScene');
                } else {
                    error.textContent =
                        'Registration screen is coming next.';
                }
            });


        //RESUME EMAIL VERIFICATION
        root.querySelector('#resume-verification')
            .addEventListener('click', (event) => {
                event.preventDefault();

                this.playClick();

                if (this.scene.manager.keys.EmailRecoveryScene) {
                    this.scene.start('EmailRecoveryScene');
                } else {
                    error.textContent =
                        'Email verification recovery is unavailable.';
                }
            });


        //FORGOT PASSWORD
        root.querySelector('#forgot-password')
            .addEventListener('click', (event) => {
                event.preventDefault();
                this.playClick();

                error.textContent =
                    'Password recovery will be available soon.';
            });

        // 12. CLEANUP
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

    playClick() {
        AudioManager.playButtonClick(this);
    }
}

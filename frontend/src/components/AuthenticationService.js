
const API_BASE_URL = '/api/auth';

class AuthenticationService {

    constructor() {
        this.csrfToken = null;
        this.csrfHeaderName = null;
    }

    // GET CSRF TOKEN FROM SPRING BOOT
    async getCsrfToken() {

        let response;

        try {
            response = await fetch(`${API_BASE_URL}/csrf`, {
                method: 'GET',
                credentials: 'same-origin'
            });
        } catch {
            throw new Error(
                'Unable to connect to the authentication server.'
            );
        }

        if (!response.ok) {
            throw new Error(
                'Unable to retrieve the security token.'
            );
        }

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                'Invalid security token response.'
            );
        }

        if (!data.token || !data.headerName) {
            throw new Error(
                'Invalid CSRF response from the server.'
            );
        }

        this.csrfToken = data.token;
        this.csrfHeaderName = data.headerName;

        return data;
    }

    // REUSABLE JSON POST REQUEST
    async postJson(endpoint, body) {

        await this.getCsrfToken();

        let response;

        try {
            response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    [this.csrfHeaderName]: this.csrfToken
                },
                body: JSON.stringify(body)
            });
        } catch {
            throw new Error(
                'Unable to reach the server. Please check your connection.'
            );
        }

        return this.handleResponse(response);
    }

    // REUSABLE URL-ENCODED POST REQUEST
    async postForm(endpoint, fields = {}) {

        await this.getCsrfToken();

        const formData = new URLSearchParams();

        Object.entries(fields).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.set(key, String(value));
            }
        });

        let response;

        try {
            response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type':
                        'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/json',
                    [this.csrfHeaderName]: this.csrfToken
                },
                body: formData.toString()
            });
        } catch {
            throw new Error(
                'Unable to connect to the authentication server.'
            );
        }

        return this.handleResponse(response);
    }

    // HANDLE SERVER RESPONSES
    async handleResponse(response) {

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                'Unexpected response from the server.'
            );
        }

        if (!response.ok) {
            const error = new Error(
                typeof data.message === 'string'
                    ? data.message
                    : 'Request failed. Please try again.'
            );

            error.status = response.status;
            throw error;
        }

        return data;
    }

    // REGISTER NEW PLAYER
    async register(username, email, password) {

        return this.postJson('/register', {
            username,
            email,
            password
        });
    }

    // VERIFY EMAIL WITH OTP
    async verifyEmail(email, otp) {

        return this.postJson('/verify-email', {
            email,
            otp
        });
    }

    // RESEND EMAIL VERIFICATION OTP
    async resendOtp(email) {

        return this.postJson('/resend-otp', {
            email
        });
    }

    // LOGIN PLAYER
    async login(username, password) {

        return this.postForm('/login', {
            username,
            password
        });
    }

    // START AUTHENTICATOR ENROLLMENT
    async startMfaEnrollment() {

        return this.postForm('/mfa/enrollment/start');
    }

    // CONFIRM AUTHENTICATOR ENROLLMENT
    async confirmMfaEnrollment(code) {

        return this.postForm('/mfa/enrollment/confirm', {
            code
        });
    }

    // VERIFY AUTHENTICATOR OR RECOVERY CODE
    async verifyMfa(code, method = 'TOTP') {

        return this.postForm('/mfa/verify', {
            code,
            method
        });
    }


    // START AUTHENTICATOR REPLACEMENT
    async startMfaReconnect(password, code, method = 'TOTP') {

        return this.postForm('/mfa/reconnect/start', {
            password,
            code,
            method
        });
    }

    // CONFIRM AUTHENTICATOR REPLACEMENT
    async confirmMfaReconnect(code) {

        return this.postForm('/mfa/reconnect/confirm', {
            code
        });
    }


    // VERIFY CURRENT PLAYER SESSION
    async getCurrentPlayer() {

        let response;

        try {
            response = await fetch(`${API_BASE_URL}/me`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json'
                }
            });
        } catch {
            throw new Error(
                'Unable to connect to the authentication server.'
            );
        }

        if (!response.ok) {

            const error = new Error(
                response.status === 401 || response.status === 403
                    ? 'Player session is not authenticated.'
                    : 'Unable to verify the player session.'
            );

            error.status = response.status;
            throw error;
        }

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                'Invalid session response from the server.'
            );
        }

        if (
            data.authenticated !== true ||
            typeof data.username !== 'string' ||
            !data.username
        ) {
            throw new Error(
                'Invalid authenticated player session.'
            );
        }

        return data;
    }

    // LOGOUT PLAYER
    async logout() {

        const { token, headerName } =
            await this.getCsrfToken();

        let response;

        try {
            response = await fetch(`${API_BASE_URL}/logout`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    [headerName]: token,
                    'Accept': 'application/json'
                }
            });
        } catch {
            throw new Error(
                'Unable to connect to the authentication server.'
            );
        }

        if (!response.ok) {
            throw new Error(
                'Unable to log out. Please try again.'
            );
        }

        this.csrfToken = null;
        this.csrfHeaderName = null;

        return response.json();
    }
}

// EXPORT SHARED SERVICE INSTANCE
const authenticationService = new AuthenticationService();

export default authenticationService;

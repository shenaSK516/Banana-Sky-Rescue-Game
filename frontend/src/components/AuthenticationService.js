
const API_BASE_URL = '/api/auth';

class AuthenticationService {

    constructor() {
        this.csrfToken = null;
        this.csrfHeaderName = null;
    }

    //GET CSRF TOKEN FROM SPRING BOOT

    async getCsrfToken() {

        let response;

        try {
            response = await fetch(
                `${API_BASE_URL}/csrf`,
                {
                    method: 'GET',
                    credentials: 'same-origin'
                }
            );
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

    // 2. REUSABLE JSON POST REQUEST

    async postJson(endpoint, body) {

        // Obtain a fresh CSRF token before POST.
        await this.getCsrfToken();

        let response;

        try {
            response = await fetch(
                `${API_BASE_URL}${endpoint}`,
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        [this.csrfHeaderName]: this.csrfToken
                    },
                    body: JSON.stringify(body)
                }
            );
        } catch {
            throw new Error(
                'Unable to reach the server. Please check your connection.'
            );
        }

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                'Unexpected response from the server.'
            );
        }

        if (!response.ok) {
            throw new Error(
                typeof data.message === 'string'
                    ? data.message
                    : 'Request failed. Please try again.'
            );
        }

        return data;
    }

    //REGISTER NEW PLAYER

    async register(username, email, password) {

        return this.postJson(
            '/register',
            {
                username,
                email,
                password
            }
        );
    }

    //VERIFY EMAIL WITH OTP

    async verifyEmail(email, otp) {

        return this.postJson(
            '/verify-email',
            {
                email,
                otp
            }
        );
    }

    // RESEND EMAIL VERIFICATION OTP

    async resendOtp(email) {

        return this.postJson(
            '/resend-otp',
            {
                email
            }
        );
    }


    // LOGIN PLAYER

    async login(username, password) {

        // Spring Security requires a CSRF token.
        await this.getCsrfToken();

        const formData = new URLSearchParams();

        formData.set('username', username);
        formData.set('password', password);

        let response;

        try {
            response = await fetch(
                `${API_BASE_URL}/login`,
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type':
                            'application/x-www-form-urlencoded;charset=UTF-8',
                        [this.csrfHeaderName]: this.csrfToken
                    },
                    body: formData.toString()
                }
            );
        } catch {
            throw new Error(
                'Unable to connect to the authentication server.'
            );
        }

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                'Unexpected login response from the server.'
            );
        }

        if (!response.ok) {
            throw new Error(
                response.status === 401
                    ? 'Invalid username or password.'
                    : 'Unable to log in. Please try again.'
            );
        }

        // Login is managed by the server-side session.
        // Never store the password or session ID in localStorage.
        return data;
    }


    // VERIFY CURRENT PLAYER SESSION

    async getCurrentPlayer() {

        let response;

        try {
            response = await fetch(
                `${API_BASE_URL}/me`,
                {
                    method: 'GET',
                    credentials: 'same-origin',
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );
        } catch {
            throw new Error(
                'Unable to connect to the authentication server.'
            );
        }

        if (!response.ok) {
            throw new Error(
                'Player session is not authenticated.'
            );
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
    async logout() {
        const { token, headerName } = await this.getCsrfToken();

        const response = await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                [headerName]: token,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Unable to log out. Please try again.');
        }

        this.csrfToken = null;
        this.csrfHeaderName = null;

        return response.json();
    }


}

// EXPORT SHARED SERVICE INSTANCE

const authenticationService = new AuthenticationService();

export default authenticationService;

/**
 * Banana Sky Rescue
 * Authenticated Player Profile API
 */

export async function fetchPlayerProfile() {

    const response = await fetch('/api/profile/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
            Accept: 'application/json'
        },
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error(
            `Unable to load player profile. HTTP ${response.status}`
        );
    }

    const profile = await response.json();

    if (
        typeof profile.username !== 'string' ||
        typeof profile.email !== 'string' ||
        !Array.isArray(profile.levelScores)
    ) {
        throw new Error('Invalid player profile response.');
    }

    return profile;
}


/**
 * Update the authenticated player's display name.
 */
export async function updatePlayerDisplayName(displayName) {

    const name = displayName.trim();

    if (name.length < 1 || name.length > 40) {
        throw new Error(
            'Display name must contain 1 to 40 characters.'
        );
    }

    // Obtain CSRF token from Spring Boot.
    const csrfResponse = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
    });

    if (!csrfResponse.ok) {
        throw new Error('Unable to retrieve CSRF token.');
    }

    const csrf = await csrfResponse.json();

    if (!csrf.headerName || !csrf.token) {
        throw new Error('Invalid CSRF token.');
    }

    // Save the display name against the logged-in account.
    const response = await fetch(
        '/api/profile/display-name',
        {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                [csrf.headerName]: csrf.token
            },
            body: JSON.stringify({
                displayName: name
            })
        }
    );

    if (!response.ok) {
        throw new Error(
            `Unable to update display name. HTTP ${response.status}`
        );
    }

    const result = await response.json();

    if (typeof result.displayName !== 'string') {
        throw new Error('Invalid profile update response.');
    }

    return result;
}


/*
 * Upload the authenticated player's profile picture.
 */
export async function uploadPlayerAvatar(file) {

    if (!file) {
        throw new Error('Please select an image.');
    }

    const allowedTypes = [
        'image/png',
        'image/jpeg'
    ];

    if (!allowedTypes.includes(file.type)) {
        throw new Error('Only PNG and JPEG images are allowed.');
    }

    if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image must be smaller than 2 MB.');
    }

    // Obtain CSRF token.
    const csrfResponse = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
    });

    if (!csrfResponse.ok) {
        throw new Error('Unable to retrieve CSRF token.');
    }

    const csrf = await csrfResponse.json();

    if (!csrf.headerName || !csrf.token) {
        throw new Error('Invalid CSRF token.');
    }

    // Prepare multipart image upload.
    const formData = new FormData();

    formData.append('file', file);

    const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            [csrf.headerName]: csrf.token
        },
        body: formData
    });


    if (!response.ok) {
        throw new Error(
            `Profile picture upload failed. HTTP ${response.status}`
        );
    }

    const result = await response.json();

    if (result.uploaded !== true) {
        throw new Error('Server did not confirm the upload.');
    }

    return result;
}

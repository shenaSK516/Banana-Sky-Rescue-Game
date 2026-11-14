
/**
 * Banana Puzzle API Service
 *
 * Connects the Phaser frontend to the
 * Spring Boot Banana Puzzle endpoints.
 *
 * The correct solution is never received
 * directly from the external Banana API.
 */

const API_BASE = '/api/banana-puzzles';

// Get CSRF token from the existing backend.
async function getCsrfToken() {

    const response = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error('Unable to retrieve CSRF token.');
    }

    return await response.json();
}

// Shared authenticated POST request.
async function postPuzzle(endpoint, data = null) {

    const csrf = await getCsrfToken();

    const headers = {
        Accept: 'application/json',
        [csrf.headerName]: csrf.token
    };

    if (data !== null) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(
        `${API_BASE}${endpoint}`,
        {
            method: 'POST',
            credentials: 'include',
            headers,
            body: data === null
                ? undefined
                : JSON.stringify(data)
        }
    );

    if (!response.ok) {

        if (response.status === 401) {
            throw new Error(
                'Your session expired. Please log in again.'
            );
        }

        throw new Error(
            `Banana Puzzle request failed (HTTP ${response.status}).`
        );
    }

    return await response.json();
}

// Request a new mathematical puzzle.
export async function startBananaPuzzle() {

    const result = await postPuzzle('/start');

    if (
        !result ||
        typeof result.puzzleId !== 'string' ||
        !result.puzzleId ||
        typeof result.imageUrl !== 'string' ||
        !result.imageUrl
    ) {
        throw new Error('Invalid puzzle response.');
    }

    return result;
}

// Submit the player's answer for validation.
export async function submitBananaPuzzleAnswer(
    puzzleId,
    answer
) {

    if (
        typeof puzzleId !== 'string' ||
        !puzzleId ||
        !Number.isSafeInteger(answer)
    ) {
        throw new Error('Invalid puzzle answer.');
    }

    const result = await postPuzzle('/submit', {
        puzzleId,
        answer
    });

    if (
        typeof result?.correct !== 'boolean' ||
        ![0, 20].includes(result.energyReward) ||
        result.energyReward !== (result.correct ? 20 : 0)
    ) {
        throw new Error('Invalid answer validation response.');
    }

    return result;
}

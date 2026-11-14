/**
 * Banana Sky Rescue Player Score API Service
 *
 * Saves authenticated players' completed-level scores
 * through the Spring Boot backend.
 */

// GET CSRF TOKEN

async function getCsrfToken() {

    const response = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error('Unable to retrieve CSRF token.');
    }

    const csrf = await response.json();

    if (
        !csrf.headerName ||
        !csrf.token
    ) {
        throw new Error('Invalid CSRF token response.');
    }

    return csrf;
}

// SAVE COMPLETED LEVEL SCORE

export async function saveCompletedLevelScore({
    mainLevelId,
    sublevelId,
    rescuedAnimals,
    activeSeconds,
    remainingEnergy
}) {

    const csrf = await getCsrfToken();

    const response = await fetch('/api/scores/complete', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            [csrf.headerName]: csrf.token
        },
        body: JSON.stringify({
            mainLevelId,
            sublevelId,
            rescuedAnimals,
            activeSeconds,
            remainingEnergy
        })
    });

    if (!response.ok) {
        throw new Error(
            `Unable to save player score. HTTP ${response.status}`
        );
    }

    const result = await response.json();

    if (
        !Number.isInteger(result.submittedScore) ||
        !Number.isInteger(result.bestScore) ||
        typeof result.newPersonalBest !== 'boolean'
    ) {
        throw new Error('Invalid score response from server.');
    }

    return result;
}




/**
 * Retrieve the Top 10 leaderboard for a level.
 */
export async function fetchLevelLeaderboard(
    mainLevelId = 1,
    sublevelId = 1
) {
    const params = new URLSearchParams({
        mainLevelId: String(mainLevelId),
        sublevelId: String(sublevelId)
    });

    const response = await fetch(
        `/api/scores/leaderboard?${params.toString()}`,
        {
            method: 'GET',
            credentials: 'include',
            headers: {
                Accept: 'application/json'
            },
            cache: 'no-store'
        }
    );

    if (!response.ok) {
        throw new Error(
            `Failed to load leaderboard. HTTP ${response.status}`
        );
    }

    const leaderboard = await response.json();

    if (!Array.isArray(leaderboard)) {
        throw new Error('Invalid leaderboard response.');
    }

    return leaderboard;


}


export async function fetchOverallLeaderboard() {

    const response = await fetch('/api/scores/overall', {
        method: 'GET',
        credentials: 'include',
        headers: {
            Accept: 'application/json'
        },
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error(
            `Failed to load overall leaderboard: ${response.status}`
        );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
        throw new Error('Invalid overall leaderboard response.');
    }

    return data;
}

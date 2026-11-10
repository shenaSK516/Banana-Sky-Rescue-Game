
/**
 - Player Progress API retrieves the authenticated player's level progress from the Spring Boot backend.
 *
 - This module does not update completion records, unlock levels, or award points.
 */

const PROGRESS_ENDPOINT = '/api/progress';

const MAIN_LEVEL_COUNT = 4;
const SUBLEVEL_COUNT = 3;

/**
 - Validate the progress returned by the backend.
 - We do not trust missing or malformed data to determine whether a level should be unlocked.
 */
function validateProgress(data) {
    if (!Array.isArray(data) ||
        data.length !== MAIN_LEVEL_COUNT) {
        throw new Error('Invalid main-level progress data.');
    }

    const mainLevelIds = new Set();

    for (const mainLevel of data) {
        if (
            !mainLevel ||
            !Number.isInteger(mainLevel.mainLevelId) ||
            mainLevel.mainLevelId < 1 ||
            mainLevel.mainLevelId > MAIN_LEVEL_COUNT ||
            typeof mainLevel.unlocked !== 'boolean' ||
            !Array.isArray(mainLevel.sublevels) ||
            mainLevel.sublevels.length !== SUBLEVEL_COUNT
        ) {
            throw new Error('Invalid main-level progress structure.');
        }

        if (mainLevelIds.has(mainLevel.mainLevelId)) {
            throw new Error('Duplicate main-level ID.');
        }

        mainLevelIds.add(mainLevel.mainLevelId);

        const sublevelIds = new Set();

        for (const sublevel of mainLevel.sublevels) {
            if (
                !sublevel ||
                !Number.isInteger(sublevel.sublevelId) ||
                sublevel.sublevelId < 1 ||
                sublevel.sublevelId > SUBLEVEL_COUNT ||
                typeof sublevel.unlocked !== 'boolean' ||
                typeof sublevel.completed !== 'boolean'
            ) {
                throw new Error('Invalid sublevel progress structure.');
            }

            if (sublevelIds.has(sublevel.sublevelId)) {
                throw new Error('Duplicate sublevel ID.');
            }

            sublevelIds.add(sublevel.sublevelId);
        }
    }

    return data;
}

/**
  Fetch the currently authenticated player's saved progress.
 */
export async function fetchPlayerProgress() {
    const response = await fetch(PROGRESS_ENDPOINT, {
        method: 'GET',
        credentials: 'include',
        headers: {
            Accept: 'application/json'
        },
        cache: 'no-store'
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error(
                'Your session has expired. Please log in again.'
            );
        }

        throw new Error(
            `Unable to load player progress (HTTP ${response.status}).`
        );
    }

    const data = await response.json();

    return validateProgress(data);
}

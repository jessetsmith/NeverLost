export const DEFAULT_SCENE_SETTINGS = {
    backgroundColor: '#1a1035',
    groundColor: '#3d2f6b',
    skyColor: '#ddd6fe',
    lightColor: '#ffffff',
    lightIntensity: 1.4,
    ambientIntensity: 0.45,
    accentColor: '#00f5d4',
    fillLightColor: '#c4b5fd',
    fogEnabled: true,
};

const SCENE_SETTING_KEYS = Object.keys(DEFAULT_SCENE_SETTINGS);

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function normalizeSceneSettings(raw) {
    if (!raw || typeof raw !== 'object') {
        return { ...DEFAULT_SCENE_SETTINGS };
    }

    return {
        backgroundColor: typeof raw.backgroundColor === 'string' && raw.backgroundColor ?
            raw.backgroundColor :
            DEFAULT_SCENE_SETTINGS.backgroundColor,
        groundColor: typeof raw.groundColor === 'string' && raw.groundColor ?
            raw.groundColor :
            DEFAULT_SCENE_SETTINGS.groundColor,
        skyColor: typeof raw.skyColor === 'string' && raw.skyColor ?
            raw.skyColor :
            DEFAULT_SCENE_SETTINGS.skyColor,
        lightColor: typeof raw.lightColor === 'string' && raw.lightColor ?
            raw.lightColor :
            DEFAULT_SCENE_SETTINGS.lightColor,
        lightIntensity: clamp(
            Number(raw.lightIntensity ?? DEFAULT_SCENE_SETTINGS.lightIntensity),
            0.2,
            3,
        ),
        ambientIntensity: clamp(
            Number(raw.ambientIntensity ?? DEFAULT_SCENE_SETTINGS.ambientIntensity),
            0,
            1.5,
        ),
        accentColor: typeof raw.accentColor === 'string' && raw.accentColor ?
            raw.accentColor :
            DEFAULT_SCENE_SETTINGS.accentColor,
        fillLightColor: typeof raw.fillLightColor === 'string' && raw.fillLightColor ?
            raw.fillLightColor :
            DEFAULT_SCENE_SETTINGS.fillLightColor,
        fogEnabled: typeof raw.fogEnabled === 'boolean' ?
            raw.fogEnabled :
            DEFAULT_SCENE_SETTINGS.fogEnabled,
    };
}

export function serializeSceneSettings(settings) {
    const normalized = normalizeSceneSettings(settings);
    return SCENE_SETTING_KEYS.reduce((acc, key) => {
        acc[key] = normalized[key];
        return acc;
    }, {});
}

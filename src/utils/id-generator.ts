const prefixes = {
    files: 'file',
    user: 'user',
} as const;

function createUuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export const generateId = (prefix: keyof typeof prefixes | string) => {
    const resolvedPrefix = (prefix in prefixes) ? prefixes[prefix as keyof typeof prefixes] : prefix;
    return `${resolvedPrefix}_${createUuid()}`;
}

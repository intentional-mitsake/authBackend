export const ROLES = {
    ADMIN: 'ADMIN',
    MOD : 'MOD',
    USER: 'USER'
}
// permissions for after authentication
export const PERMISSIONS = {
    [ROLES.ADMIN]: [
        'user:list', 'user:delete', 
        'user:restore', 'user:promote', 
        'profile:read', 'profile:update',
        'content:moderate','audit:read'
    ],

    [ROLES.MOD]: [
        'profile:read', 'profile:update',
        'content:moderate','user:list'
    ],

    [ROLES.USER]: [ 
        'profile:read', 'profile:update'
    ]
}
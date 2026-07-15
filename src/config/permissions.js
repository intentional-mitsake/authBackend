export const ROLES = {
    ADMIN: "admin",
    USER: "user"
}
// permissions for after authentication
export const PERMISSIONS = {
    [ROLES.ADMIN]: [
        'user:list', 'user:delete', 
        'user:restore', 'user:promote', 
        'profile:read', 'profile:update',
        'content:moderate','audit:read'
    ],

    [ROLES.USER]: [ 
        'profile:read', 'profile:update'
    ]
}
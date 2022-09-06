// helper salt function
export function salt(n: number, charset?: string): string {
    let res = '';
    let chars =
        charset || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charLen = chars.length;

    for (var i = 0; i < n; i++) {
        res += chars.charAt(Math.floor(Math.random() * charLen));
    }

    return res;
}
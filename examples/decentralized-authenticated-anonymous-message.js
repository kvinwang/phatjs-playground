function hex(bytes) {
    return Array.from(bytes, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}

(function () {
    const message = scriptArgs[0];
    const authorized_accounts = [
        '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
        '0x398f0c28f98885e046333d4a41c19cee4c37368a9832c6502f6cfd182e2aef89',
        '0x78ee463a625e651f8491b1f27662f581a11ec5543469e827f4f194a475f32a5f',
    ];
    if (!authorized_accounts.includes(env.caller)) {
        throw new Error(`Unauthorized account ${env.caller}`);
    }
    const userFingerPrint = pink.deriveSecret(`${env.caller}|${env.jsCodeHash}`);
    const id = hex(pink.hash('sha256', userFingerPrint)).slice(0, 16);
    return `[${new Date().toISOString()}](user_${id}): ${message}`;
}())
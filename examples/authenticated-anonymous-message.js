function hex(bytes) {
    return Array.from(bytes, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}
function getUserInfo(token) {
    const response = pink.httpRequest({
        url: 'https://api.github.com/user',
        headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': 'Bearer ' + token,
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Phat-Script',
        },
        method: 'GET',
        returnTextBody: true,
    });
    const info = JSON.parse(response.body);
    info.date = response.headers.date;
    return info;
}
(function () {
    const token = scriptArgs[0];
    const message = scriptArgs[1];
    const info = getUserInfo(token);
    const authorized_github_accounts = ['kvinwang', 'phatnguyenuit'];
    if (!authorized_github_accounts.includes(info.login)) {
        throw new Error(`Unauthorized github user ${info.login}`);
    }
    const userFingerPrint = pink.deriveSecret(`${info.login}@github|${thisCodeHash}`);
    const id = hex(pink.hash('sha256', userFingerPrint)).slice(0, 16);
    return `User ${id} says: ${message} - ${info.date}`;
}())

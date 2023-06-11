function hex(bytes) {
    return Array.from(bytes, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}
function githubApiGet(url, token) {
    const headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Phat-Witness',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = pink.httpRequest({
        url,
        headers,
        method: 'GET',
        returnTextBody: true,
    });
    if (response.statusCode !== 200) {
        throw new Error(`Bad status code: ${response.statusCode}`);
    }
    return {
        date: response.headers.date,
        body: JSON.parse(response.body),
    };
}
(function () {
    const token = scriptArgs[0];
    const message = scriptArgs[1];
    const authorized_github_accounts = ['kvinwang', 'phatnguyenuit'];
    const { date, body: user } = githubApiGet('https://api.github.com/user', token);
    if (authorized_github_accounts.indexOf(user.login) === -1) {
        throw new Error(`Unauthorized github user ${user.login}`);
    }
    const userFingerPrint = pink.deriveSecret(`${user.login}@github|${thisCodeHash}`);
    const id = hex(pink.hash('sha256', userFingerPrint)).slice(0, 16);
    return `User ${id}: ${message} - ${date}`;
}())